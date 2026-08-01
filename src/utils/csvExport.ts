import type {
  ConditionOrder,
  ConcretizationLevel,
  StudyTrialNumber,
} from "../types/scheduler";

export type CsvPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined;

export type CsvCellValue =
  | CsvPrimitive
  | Date
  | bigint
  | unknown[]
  | Record<string, unknown>;

export type CsvRow = Record<string, CsvCellValue>;

export interface CsvExportOptions {
  preferredHeaders?: string[];
  includeUtf8Bom?: boolean;
}

const CSV_MIME_TYPE = "text/csv;charset=utf-8";
const UTF8_BYTE_ORDER_MARK = "\uFEFF";
const OBJECT_URL_REVOKE_DELAY_MS = 1500;

function sanitizeFilePart(value: string): string {
  const sanitizedValue = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitizedValue.length > 0
    ? sanitizedValue
    : "unknown";
}

function normalizeFileName(fileName: string): string {
  const trimmedFileName = fileName.trim();

  const safeFileName =
    trimmedFileName.length > 0
      ? trimmedFileName
      : "study_data.csv";

  return safeFileName.toLowerCase().endsWith(".csv")
    ? safeFileName
    : `${safeFileName}.csv`;
}

function serializeObject(value: object): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeCsvValue(
  value: CsvCellValue,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? String(value)
      : "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return serializeObject(value);
}

function escapeCsvValue(
  value: CsvCellValue,
): string {
  const normalizedValue = normalizeCsvValue(value);
  const escapedValue = normalizedValue.replace(
    /"/g,
    '""',
  );

  const requiresQuotes =
    escapedValue.includes(",") ||
    escapedValue.includes('"') ||
    escapedValue.includes("\n") ||
    escapedValue.includes("\r");

  return requiresQuotes
    ? `"${escapedValue}"`
    : escapedValue;
}

function isCsvRow(value: unknown): value is CsvRow {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getCsvHeaders(
  rows: CsvRow[],
  preferredHeaders: string[] = [],
): string[] {
  const headers: string[] = [];
  const knownHeaders = new Set<string>();

  for (const header of preferredHeaders) {
    const normalizedHeader = header.trim();

    if (
      normalizedHeader.length === 0 ||
      knownHeaders.has(normalizedHeader)
    ) {
      continue;
    }

    knownHeaders.add(normalizedHeader);
    headers.push(normalizedHeader);
  }

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (knownHeaders.has(key)) {
        continue;
      }

      knownHeaders.add(key);
      headers.push(key);
    }
  }

  return headers;
}

export function rowsToCsv(
  rows: CsvRow[],
  options: CsvExportOptions = {},
): string {
  if (!Array.isArray(rows)) {
    throw new Error(
      "CSV rows must be provided as an array.",
    );
  }

  if (!rows.every(isCsvRow)) {
    throw new Error(
      "Every CSV row must be an object.",
    );
  }

  if (rows.length === 0) {
    return "";
  }

  const headers = getCsvHeaders(
    rows,
    options.preferredHeaders,
  );

  if (headers.length === 0) {
    return "";
  }

  const headerLine = headers
    .map(escapeCsvValue)
    .join(",");

  const dataLines = rows.map((row) =>
    headers
      .map((header) =>
        escapeCsvValue(row[header]),
      )
      .join(","),
  );

  const csv = [headerLine, ...dataLines].join(
    "\r\n",
  );

  return options.includeUtf8Bom
    ? `${UTF8_BYTE_ORDER_MARK}${csv}`
    : csv;
}

function triggerFileDownload(
  fileName: string,
  content: string,
  includeUtf8Bom: boolean,
): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined"
  ) {
    throw new Error(
      "CSV downloads are only available in a browser.",
    );
  }

  if (!document.body) {
    throw new Error(
      "The page is not ready to download the CSV file.",
    );
  }

  if (typeof URL.createObjectURL !== "function") {
    throw new Error(
      "This browser does not support CSV file downloads.",
    );
  }

  const normalizedFileName =
    normalizeFileName(fileName);

  const blob = new Blob(
    [
      includeUtf8Bom
        ? UTF8_BYTE_ORDER_MARK
        : "",
      content,
    ],
    {
      type: CSV_MIME_TYPE,
    },
  );

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = normalizedFileName;
  link.style.display = "none";
  link.setAttribute("aria-hidden", "true");

  document.body.appendChild(link);

  try {
    link.click();
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    link.remove();
    throw error;
  }

  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, OBJECT_URL_REVOKE_DELAY_MS);
}

export function downloadCsv(
  fileName: string,
  rows: CsvRow[],
  options: CsvExportOptions = {},
): void {
  /*
   * The BOM is added by triggerFileDownload so it can never be added
   * twice when rowsToCsv is also used independently.
   */
  const csvContent = rowsToCsv(rows, {
    ...options,
    includeUtf8Bom: false,
  });

  triggerFileDownload(
    fileName,
    csvContent,
    options.includeUtf8Bom ?? true,
  );
}

/*
 * Canonical experiment export:
 * one event CSV for the entire participant session.
 */
export function getSessionCsvFileName(
  participantToken: string,
  sessionId: string,
  conditionOrder?: ConditionOrder,
): string {
  const safeParticipantToken =
    sanitizeFilePart(participantToken);
  const safeSessionId =
    sanitizeFilePart(sessionId);

  const orderSuffix = conditionOrder
    ? `_${conditionOrder}`
    : "";

  return `${safeParticipantToken}_${safeSessionId}${orderSuffix}_session_events.csv`;
}

export function getSessionEventsCsvFileName(
  participantToken: string,
  sessionId: string,
  conditionOrder?: ConditionOrder,
): string {
  return getSessionCsvFileName(
    participantToken,
    sessionId,
    conditionOrder,
  );
}

export function downloadSessionCsv(
  participantToken: string,
  sessionId: string,
  rows: CsvRow[],
  conditionOrder?: ConditionOrder,
  options: CsvExportOptions = {},
): void {
  downloadCsv(
    getSessionCsvFileName(
      participantToken,
      sessionId,
      conditionOrder,
    ),
    rows,
    options,
  );
}

/*
 * Explicit alias for callers that refer to the canonical file as the
 * session events CSV. The existing downloadSessionCsv export remains.
 */
export function downloadSessionEventsCsv(
  participantToken: string,
  sessionId: string,
  rows: CsvRow[],
  conditionOrder?: ConditionOrder,
  options: CsvExportOptions = {},
): void {
  downloadSessionCsv(
    participantToken,
    sessionId,
    rows,
    conditionOrder,
    options,
  );
}

/*
 * Legacy per-trial exports are retained while the existing pages are
 * migrated to the single-session CSV.
 */
export function getTrialEventsCsvFileName(
  participantToken: string,
  trialNumber: StudyTrialNumber,
  condition: ConcretizationLevel,
): string {
  const safeParticipantToken =
    sanitizeFilePart(participantToken);

  return `${safeParticipantToken}_T${trialNumber}_${condition}_events.csv`;
}

export function getTrialSummaryCsvFileName(
  participantToken: string,
  trialNumber: StudyTrialNumber,
  condition: ConcretizationLevel,
): string {
  const safeParticipantToken =
    sanitizeFilePart(participantToken);

  return `${safeParticipantToken}_T${trialNumber}_${condition}_summary.csv`;
}

export function getPostExperimentQuestionnaireCsvFileName(
  participantToken: string,
): string {
  const safeParticipantToken =
    sanitizeFilePart(participantToken);

  return `${safeParticipantToken}_post_experiment_questionnaire.csv`;
}

/*
 * Compatibility alias for the previous misleading file name.
 */
export function getPostTaskQuestionnaireCsvFileName(
  participantToken: string,
): string {
  return getPostExperimentQuestionnaireCsvFileName(
    participantToken,
  );
}
