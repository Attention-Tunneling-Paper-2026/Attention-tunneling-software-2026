import type {
  ConcretizationLevel,
  StudyTrialNumber,
} from "../types/scheduler";

export type CsvCellValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | unknown[]
  | Record<
      string,
      unknown
    >;

export type CsvRow =
  Record<
    string,
    unknown
  >;

const CSV_MIME_TYPE =
  "text/csv;charset=utf-8";

const UTF8_BYTE_ORDER_MARK =
  "\uFEFF";

const OBJECT_URL_REVOKE_DELAY_MS =
  1500;

function sanitizeFilePart(
  value:
    string,
): string {
  const sanitizedValue =
    value
      .trim()
      .replace(
        /[^a-zA-Z0-9_]/g,
        "_",
      )
      .replace(
        /_+/g,
        "_",
      )
      .replace(
        /^_+|_+$/g,
        "",
      );

  return sanitizedValue.length >
    0
    ? sanitizedValue
    : "participant";
}

function normalizeFileName(
  fileName:
    string,
): string {
  const trimmedFileName =
    fileName.trim();

  const safeFileName =
    trimmedFileName.length >
      0
      ? trimmedFileName
      : "study_data.csv";

  return safeFileName
    .toLowerCase()
    .endsWith(
      ".csv",
    )
    ? safeFileName
    : `${safeFileName}.csv`;
}

function serializeObject(
  value:
    object,
): string {
  try {
    return JSON.stringify(
      value,
    );
  } catch {
    return String(
      value,
    );
  }
}

function normalizeCsvValue(
  value:
    unknown,
): string {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }

  if (
    typeof value ===
      "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? String(
          value,
        )
      : "";
  }

  if (
    typeof value ===
      "boolean"
  ) {
    return value
      ? "true"
      : "false";
  }

  if (
    value instanceof
    Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value ===
      "bigint"
  ) {
    return value.toString();
  }

  if (
    typeof value ===
      "object"
  ) {
    return serializeObject(
      value,
    );
  }

  return String(
    value,
  );
}

function escapeCsvValue(
  value:
    unknown,
): string {
  const normalizedValue =
    normalizeCsvValue(
      value,
    );

  const escapedValue =
    normalizedValue.replace(
      /"/g,
      '""',
    );

  const requiresQuotes =
    escapedValue.includes(
      ",",
    ) ||
    escapedValue.includes(
      '"',
    ) ||
    escapedValue.includes(
      "\n",
    ) ||
    escapedValue.includes(
      "\r",
    );

  return requiresQuotes
    ? `"${escapedValue}"`
    : escapedValue;
}

function getCsvHeaders(
  rows:
    CsvRow[],
): string[] {
  const headers:
    string[] = [];

  const knownHeaders =
    new Set<string>();

  for (
    const row of
    rows
  ) {
    for (
      const key of
      Object.keys(
        row,
      )
    ) {
      if (
        knownHeaders.has(
          key,
        )
      ) {
        continue;
      }

      knownHeaders.add(
        key,
      );

      headers.push(
        key,
      );
    }
  }

  return headers;
}

export function rowsToCsv(
  rows:
    CsvRow[],
): string {
  if (
    rows.length ===
    0
  ) {
    return "";
  }

  const headers =
    getCsvHeaders(
      rows,
    );

  if (
    headers.length ===
    0
  ) {
    return "";
  }

  const headerLine =
    headers
      .map(
        escapeCsvValue,
      )
      .join(
        ",",
      );

  const dataLines =
    rows.map(
      (row) =>
        headers
          .map(
            (header) =>
              escapeCsvValue(
                row[
                  header
                ],
              ),
          )
          .join(
            ",",
          ),
    );

  return [
    headerLine,
    ...dataLines,
  ].join(
    "\r\n",
  );
}

function triggerFileDownload(
  fileName:
    string,

  content:
    string,
): void {
  if (
    typeof window ===
      "undefined" ||
    typeof document ===
      "undefined" ||
    typeof URL ===
      "undefined"
  ) {
    throw new Error(
      "CSV downloads are only available in a browser.",
    );
  }

  if (
    !document.body
  ) {
    throw new Error(
      "The page is not ready to download the CSV file.",
    );
  }

  if (
    typeof URL.createObjectURL !==
    "function"
  ) {
    throw new Error(
      "This browser does not support CSV file downloads.",
    );
  }

  const normalizedFileName =
    normalizeFileName(
      fileName,
    );

  const blob =
    new Blob(
      [
        UTF8_BYTE_ORDER_MARK,
        content,
      ],
      {
        type:
          CSV_MIME_TYPE,
      },
    );

  const objectUrl =
    URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement(
      "a",
    );

  link.href =
    objectUrl;

  link.download =
    normalizedFileName;

  link.style.display =
    "none";

  link.setAttribute(
    "aria-hidden",
    "true",
  );

  document.body.appendChild(
    link,
  );

  try {
    link.click();
  } catch (
    error
  ) {
    URL.revokeObjectURL(
      objectUrl,
    );

    link.remove();

    throw error;
  }

  link.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    },
    OBJECT_URL_REVOKE_DELAY_MS,
  );
}

export function downloadCsv(
  fileName:
    string,

  rows:
    CsvRow[],
): void {
  if (
    !Array.isArray(
      rows,
    )
  ) {
    throw new Error(
      "CSV rows must be provided as an array.",
    );
  }

  const csvContent =
    rowsToCsv(
      rows,
    );

  triggerFileDownload(
    fileName,
    csvContent,
  );
}

export function getTrialEventsCsvFileName(
  participantId:
    string,

  trialNumber:
    StudyTrialNumber,

  condition:
    ConcretizationLevel,
): string {
  const safeParticipantId =
    sanitizeFilePart(
      participantId,
    );

  return `${safeParticipantId}_T${trialNumber}_${condition}_events.csv`;
}

export function getTrialSummaryCsvFileName(
  participantId:
    string,

  trialNumber:
    StudyTrialNumber,

  condition:
    ConcretizationLevel,
): string {
  const safeParticipantId =
    sanitizeFilePart(
      participantId,
    );

  return `${safeParticipantId}_T${trialNumber}_${condition}_summary.csv`;
}

export function getPostTaskQuestionnaireCsvFileName(
  participantId:
    string,
): string {
  const safeParticipantId =
    sanitizeFilePart(
      participantId,
    );

  return `${safeParticipantId}_post_task_questionnaire.csv`;
}