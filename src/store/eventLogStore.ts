import { create } from "zustand";

import {
  getStudyTaskDefinition,
  isSupportedStudyTaskId,
} from "../data/symposium";

import type {
  SupportedStudyTaskId,
} from "../data/symposium";

import type {
  CreateStudyEventInput,
  StudyEvent,
  StudyPhase,
} from "../types/events";

import {
  DEFAULT_CONDITION_ORDER,
  getConditionForTrial,
  isConditionOrder,
} from "../types/scheduler";

import type {
  ConcretizationLevel,
  ConditionOrder,
  StudyTrialNumber,
} from "../types/scheduler";

type ConditionOrderValue = ConditionOrder | number;
type TrialMetadataKey = `${SupportedStudyTaskId}:${StudyTrialNumber}`;

const TASK_ORDER: Record<SupportedStudyTaskId, number> = {
  symposium: 1,
  delivery: 2,
  clinic: 3,
};

const TRIALS_PER_TASK = 3;

interface StartTrialInput {
  taskId?: SupportedStudyTaskId;
  trialId?: string;
  trialNumber: StudyTrialNumber;
  trialOrder?: number;
  conditionOrder?: ConditionOrderValue;
  isFirstTrial?: boolean;
  probeExposureNumber?: number;
  probeNaive?: boolean;
}

interface ResetEventLogInput {
  participantId?: string;
  participantToken?: string;
  sessionId?: string;
  conditionOrder?: ConditionOrderValue;
  taskId?: SupportedStudyTaskId;
}

interface TrialEventMetadata {
  taskId: SupportedStudyTaskId;
  trialId: string;
  trialNumber: StudyTrialNumber;
  trialOrder: number;
  conditionOrder: ConditionOrderValue;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;
  outerTaskNumber: number;
  innerTaskNumber: number;
  globalTrialNumber: number;
  startedAt: number;
}

interface EventLogStore {
  sessionId: string;
  participantId: string;
  participantToken: string;

  taskId: SupportedStudyTaskId;
  trialId: string;
  trialNumber: StudyTrialNumber;
  trialOrder: number;
  condition: ConcretizationLevel;
  conditionOrder: ConditionOrderValue;

  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;

  sessionStartedAt: number;
  trialStartedAt: number;
  trialMetadata: Partial<
    Record<TrialMetadataKey, TrialEventMetadata>
  >;

  events: StudyEvent[];

  setParticipantId: (participantId: string) => void;
  setParticipantToken: (participantToken: string) => void;
  setSessionId: (sessionId: string) => void;
  setConditionOrder: (
    conditionOrder: ConditionOrderValue,
  ) => void;

  startTrial: (input: StartTrialInput) => void;
  addEvent: (
    input: CreateStudyEventInput,
  ) => StudyEvent;

  getEventsForTrial: (
    trialNumber: StudyTrialNumber,
    taskId?: SupportedStudyTaskId,
  ) => StudyEvent[];

  /*
   * Retained for compatibility. It intentionally does not delete events,
   * because the study log is append-only across the full session.
   */
  clearEvents: () => void;
  clearAllEvents: () => void;

  resetForNewParticipant: (
    input?: ResetEventLogInput,
  ) => void;

  exportEvents: (
    trialNumber?: StudyTrialNumber,
    taskId?: SupportedStudyTaskId,
  ) => string;

  downloadEvents: (
    trialNumber?: StudyTrialNumber,
    taskId?: SupportedStudyTaskId,
  ) => void;
}

const APP_VERSION =
  "attention-tunneling-software-v3";
const DEFAULT_PARTICIPANT_ID = "P001";
const DEFAULT_TASK_ID: SupportedStudyTaskId = "symposium";
const DEFAULT_TRIAL_NUMBER: StudyTrialNumber = 1;

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("_");
}

function createSessionId(): string {
  return `SESSION_${createId()}`;
}

function getCurrentTimeMs(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function normalizeTrialOrderForTask(
  value: number | undefined,
  taskId: SupportedStudyTaskId,
  fallback: number,
): number {
  const normalized = normalizePositiveInteger(
    value,
    fallback,
  );

  if (
    taskId !== "symposium" &&
    normalized <= TRIALS_PER_TASK
  ) {
    return (
      (getOuterTaskNumber(taskId) - 1) *
        TRIALS_PER_TASK +
      normalized
    );
  }

  return normalized;
}

function normalizeConditionOrder(
  value: ConditionOrderValue | undefined,
  fallback: ConditionOrderValue,
): ConditionOrderValue {
  if (isConditionOrder(value)) {
    return value;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return Math.floor(value);
  }

  return fallback;
}

function getTrialMetadataKey(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): TrialMetadataKey {
  return `${taskId}:${trialNumber}`;
}

function getOuterTaskNumber(
  taskId: SupportedStudyTaskId,
): number {
  return TASK_ORDER[taskId];
}

function getGlobalTrialNumber(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): number {
  return (
    (getOuterTaskNumber(taskId) - 1) *
      TRIALS_PER_TASK +
    trialNumber
  );
}

function getOrderFromConditionOrder(
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue,
): number | undefined {
  if (typeof conditionOrder !== "string") {
    return undefined;
  }

  const condition = getConditionForTrial(trialNumber);
  const index = conditionOrder.indexOf(condition);

  return index >= 0 ? index + 1 : undefined;
}

function getGlobalOrderFromConditionOrder(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue,
): number | undefined {
  const innerOrder = getOrderFromConditionOrder(
    trialNumber,
    conditionOrder,
  );

  if (!innerOrder) {
    return undefined;
  }

  return (
    (getOuterTaskNumber(taskId) - 1) *
      TRIALS_PER_TASK +
    innerOrder
  );
}

function getCompositeTrialId(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `${taskId}-${getConditionForTrial(trialNumber)}`;
}

function isLegacyTrialId(
  value: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): boolean {
  return (
    value === `${taskId}-trial-${trialNumber}` ||
    value === `symposium-trial-${trialNumber}`
  );
}

function normalizeTrialId(
  value: string | undefined,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    isLegacyTrialId(
      normalizedValue,
      taskId,
      trialNumber,
    )
  ) {
    return getCompositeTrialId(taskId, trialNumber);
  }

  return normalizedValue;
}

function inferTaskIdFromTrialId(
  trialId: unknown,
): SupportedStudyTaskId | undefined {
  if (typeof trialId !== "string") {
    return undefined;
  }

  const prefix = trialId.split(/[-:]/, 1)[0];

  return isSupportedStudyTaskId(prefix)
    ? prefix
    : undefined;
}

function resolveTaskId(
  ...values: unknown[]
): SupportedStudyTaskId {
  for (const value of values) {
    if (isSupportedStudyTaskId(value)) {
      return value;
    }

    const inferredFromTrialId =
      inferTaskIdFromTrialId(value);

    if (inferredFromTrialId) {
      return inferredFromTrialId;
    }
  }

  return DEFAULT_TASK_ID;
}

function readInputTaskId(
  input: CreateStudyEventInput,
): unknown {
  return (
    input as unknown as {
      taskId?: unknown;
    }
  ).taskId;
}

function readInputMetadataTaskId(
  input: CreateStudyEventInput,
): unknown {
  const metadata = (
    input as unknown as {
      metadata?: unknown;
    }
  ).metadata;

  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return undefined;
  }

  return (
    metadata as Record<string, unknown>
  ).taskId;
}

function readInputTrialId(
  input: CreateStudyEventInput,
): unknown {
  return (
    input as unknown as {
      trialId?: unknown;
    }
  ).trialId;
}

function readInputParticipantToken(
  input: CreateStudyEventInput,
): string | undefined {
  const participantToken = (
    input as unknown as {
      participantToken?: unknown;
    }
  ).participantToken;

  return typeof participantToken === "string"
    ? participantToken
    : undefined;
}

function getEventTaskId(
  event: StudyEvent,
): SupportedStudyTaskId {
  const metadata =
    event.metadata &&
    typeof event.metadata === "object" &&
    !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};

  return resolveTaskId(
    event.taskId,
    metadata.taskId,
    event.trialId,
  );
}

function cloneOptionalArray<T>(
  value: T[] | null | undefined,
): T[] | null | undefined {
  return Array.isArray(value) ? [...value] : value;
}

function isTrialStartEvent(
  event: StudyEvent,
): boolean {
  return (
    event.eventType === "trial_start" ||
    event.eventType ===
      "assistant_analysis_requested" ||
    event.eventType ===
      "assistant_analysis_started" ||
    event.eventType ===
      "assistant_recommendation_shown" ||
    event.eventType === "ai_message_shown"
  );
}

function getStartedTrialKeys(
  events: StudyEvent[],
  sessionId: string,
): Set<TrialMetadataKey> {
  const startedTrialKeys =
    new Set<TrialMetadataKey>();

  for (const event of events) {
    if (
      event.sessionId !== sessionId ||
      !isTrialStartEvent(event)
    ) {
      continue;
    }

    const taskId = getEventTaskId(event);

    startedTrialKeys.add(
      getTrialMetadataKey(
        taskId,
        event.trialNumber,
      ),
    );
  }

  return startedTrialKeys;
}

function inferTrialOrder(
  events: StudyEvent[],
  sessionId: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue,
): number {
  const existingTrialEvent = events.find(
    (event) =>
      event.sessionId === sessionId &&
      getEventTaskId(event) === taskId &&
      event.trialNumber === trialNumber &&
      event.trialOrder > 0,
  );

  if (existingTrialEvent) {
    return existingTrialEvent.trialOrder;
  }

  const orderFromCondition =
    getGlobalOrderFromConditionOrder(
      taskId,
      trialNumber,
      conditionOrder,
    );

  if (orderFromCondition) {
    return orderFromCondition;
  }

  const startedTrialKeys = getStartedTrialKeys(
    events,
    sessionId,
  );

  const trialKey = getTrialMetadataKey(
    taskId,
    trialNumber,
  );

  if (startedTrialKeys.has(trialKey)) {
    return Math.max(1, startedTrialKeys.size);
  }

  return startedTrialKeys.size + 1;
}

function getDefaultTrialMetadata(
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue =
    DEFAULT_CONDITION_ORDER,
  trialOrder?: number,
): Omit<
  TrialEventMetadata,
  "trialId" | "startedAt"
> {
  const globalTrialNumber = getGlobalTrialNumber(
    taskId,
    trialNumber,
  );

  const orderFromCondition =
    getGlobalOrderFromConditionOrder(
      taskId,
      trialNumber,
      conditionOrder,
    );

  const normalizedTrialOrder =
    normalizeTrialOrderForTask(
      trialOrder,
      taskId,
      orderFromCondition ?? globalTrialNumber,
    );

  return {
    taskId,
    trialNumber,
    trialOrder: normalizedTrialOrder,
    conditionOrder,
    isFirstTrial: normalizedTrialOrder === 1,
    probeExposureNumber: normalizedTrialOrder,
    probeNaive: normalizedTrialOrder === 1,
    outerTaskNumber: getOuterTaskNumber(taskId),
    innerTaskNumber: trialNumber,
    globalTrialNumber,
  };
}

function getSessionEventIndex(
  events: StudyEvent[],
  sessionId: string,
): number {
  return (
    events.filter(
      (event) => event.sessionId === sessionId,
    ).length + 1
  );
}

function trialHasProbeStarted(
  events: StudyEvent[],
  sessionId: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): boolean {
  return events.some(
    (event) =>
      event.sessionId === sessionId &&
      getEventTaskId(event) === taskId &&
      event.trialNumber === trialNumber &&
      event.eventType === "probe_shown",
  );
}

function inferPhase(
  input: CreateStudyEventInput,
  events: StudyEvent[],
  sessionId: string,
  taskId: SupportedStudyTaskId,
  trialNumber: StudyTrialNumber,
): StudyPhase {
  if (input.phase) {
    return input.phase;
  }

  switch (input.eventType) {
    case "study_started":
    case "session_start":
    case "procedure_viewed":
    case "task_selected":
    case "assistant_analysis_requested":
    case "assistant_analysis_started":
    case "screen_enter":
    case "screen_exit":
      return "pre_ai";

    case "assistant_analysis_completed":
    case "assistant_recommendation_shown":
    case "ai_message_shown":
    case "ai_prompt_sent":
    case "ai_response_received":
    case "ai_fallback_used":
      return "pre_probe";

    case "questionnaire_started":
    case "questionnaire_submitted":
    case "trial_csv_exported":
    case "form_submitted":
      return "questionnaire";

    case "post_experiment_started":
    case "post_experiment_submitted":
    case "post_experiment_csv_exported":
      return "post_experiment";

    case "disclosure_viewed":
      return "disclosure";

    case "study_completed":
    case "session_end":
      return "complete";

    case "submit_attempt":
    case "trial_submitted":
    case "timer_expired":
    case "trial_end":
      return "submitted";

    case "probe_shown":
    case "probe_notification_opened":
    case "probe_acknowledged":
    case "probe_ack":
    case "probe_collapsed":
      return "post_probe";

    default:
      return trialHasProbeStarted(
        events,
        sessionId,
        taskId,
        trialNumber,
      )
        ? "post_probe"
        : "pre_probe";
  }
}

function sanitizeFilePart(value: string): string {
  const sanitizedValue = value
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitizedValue.length > 0
    ? sanitizedValue
    : "participant";
}

function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined"
  ) {
    return;
  }

  const blob = new Blob([content], {
    type: mimeType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function createInitialState(
  input?: ResetEventLogInput,
) {
  const taskId = resolveTaskId(
    input?.taskId,
    DEFAULT_TASK_ID,
  );
  const trialNumber = DEFAULT_TRIAL_NUMBER;
  const conditionOrder = normalizeConditionOrder(
    input?.conditionOrder,
    DEFAULT_CONDITION_ORDER,
  );
  const sessionStartedAt = getCurrentTimeMs();
  const defaultMetadata = getDefaultTrialMetadata(
    taskId,
    trialNumber,
    conditionOrder,
  );
  const trialId = getCompositeTrialId(
    taskId,
    trialNumber,
  );
  const trialKey = getTrialMetadataKey(
    taskId,
    trialNumber,
  );

  const participantValue =
    input?.participantToken?.trim() ||
    input?.participantId?.trim() ||
    DEFAULT_PARTICIPANT_ID;

  const sessionValue =
    input?.sessionId?.trim() || createSessionId();

  return {
    sessionId: sessionValue,
    participantId: participantValue,
    participantToken: participantValue,
    taskId,
    trialId,
    trialNumber,
    trialOrder: defaultMetadata.trialOrder,
    condition: getConditionForTrial(trialNumber),
    conditionOrder,
    isFirstTrial: defaultMetadata.isFirstTrial,
    probeExposureNumber:
      defaultMetadata.probeExposureNumber,
    probeNaive: defaultMetadata.probeNaive,
    sessionStartedAt,
    trialStartedAt: sessionStartedAt,
    trialMetadata: {
      [trialKey]: {
        trialId,
        ...defaultMetadata,
        startedAt: sessionStartedAt,
      },
    } as Partial<
      Record<TrialMetadataKey, TrialEventMetadata>
    >,
    events: [] as StudyEvent[],
  };
}

export const useEventLogStore =
  create<EventLogStore>((set, get) => ({
    ...createInitialState(),

    setParticipantId: (participantId) => {
      const normalized = participantId.trim();

      if (!normalized) {
        return;
      }

      set({
        participantId: normalized,
        participantToken: normalized,
      });
    },

    setParticipantToken: (participantToken) => {
      const normalized = participantToken.trim();

      if (!normalized) {
        return;
      }

      set({
        participantId: normalized,
        participantToken: normalized,
      });
    },

    setSessionId: (sessionId) => {
      const normalized = sessionId.trim();

      if (!normalized) {
        return;
      }

      set({ sessionId: normalized });
    },

    setConditionOrder: (conditionOrder) => {
      const state = get();
      const normalized = normalizeConditionOrder(
        conditionOrder,
        state.conditionOrder,
      );
      const trialOrder = inferTrialOrder(
        state.events,
        state.sessionId,
        state.taskId,
        state.trialNumber,
        normalized,
      );
      const trialKey = getTrialMetadataKey(
        state.taskId,
        state.trialNumber,
      );
      const existingMetadata =
        state.trialMetadata[trialKey];

      set({
        conditionOrder: normalized,
        trialOrder,
        isFirstTrial: trialOrder === 1,
        probeExposureNumber: trialOrder,
        probeNaive: trialOrder === 1,
        trialMetadata: existingMetadata
          ? {
              ...state.trialMetadata,
              [trialKey]: {
                ...existingMetadata,
                conditionOrder: normalized,
                trialOrder,
                isFirstTrial: trialOrder === 1,
                probeExposureNumber: trialOrder,
                probeNaive: trialOrder === 1,
              },
            }
          : state.trialMetadata,
      });
    },

    startTrial: ({
      taskId: requestedTaskId,
      trialId,
      trialNumber,
      trialOrder,
      conditionOrder,
    }) => {
      const state = get();
      const taskId = resolveTaskId(
        requestedTaskId,
        trialId,
        state.taskId,
      );
      const trialKey = getTrialMetadataKey(
        taskId,
        trialNumber,
      );
      const existingMetadata =
        state.trialMetadata[trialKey];
      const resolvedConditionOrder =
        normalizeConditionOrder(
          conditionOrder,
          existingMetadata?.conditionOrder ??
            state.conditionOrder,
        );
      const inferredOrder = inferTrialOrder(
        state.events,
        state.sessionId,
        taskId,
        trialNumber,
        resolvedConditionOrder,
      );
      const normalizedTrialOrder =
        normalizeTrialOrderForTask(
          trialOrder,
          taskId,
          existingMetadata?.trialOrder ??
            inferredOrder,
        );
      const defaultMetadata =
        getDefaultTrialMetadata(
          taskId,
          trialNumber,
          resolvedConditionOrder,
          normalizedTrialOrder,
        );
      const resolvedStartedAt =
        existingMetadata?.startedAt ??
        getCurrentTimeMs();
      const resolvedTrialId = normalizeTrialId(
        trialId ?? existingMetadata?.trialId,
        taskId,
        trialNumber,
      );

      const resolvedMetadata: TrialEventMetadata = {
        ...defaultMetadata,
        trialId: resolvedTrialId,
        isFirstTrial:
          normalizedTrialOrder === 1,
        probeExposureNumber:
          normalizedTrialOrder,
        probeNaive:
          normalizedTrialOrder === 1,
        startedAt: resolvedStartedAt,
      };

      set({
        taskId,
        trialId: resolvedMetadata.trialId,
        trialNumber,
        trialOrder: resolvedMetadata.trialOrder,
        condition: getConditionForTrial(trialNumber),
        conditionOrder:
          resolvedMetadata.conditionOrder,
        isFirstTrial:
          resolvedMetadata.isFirstTrial,
        probeExposureNumber:
          resolvedMetadata.probeExposureNumber,
        probeNaive: resolvedMetadata.probeNaive,
        trialStartedAt: resolvedMetadata.startedAt,
        trialMetadata: {
          ...state.trialMetadata,
          [trialKey]: resolvedMetadata,
        },
      });
    },

    addEvent: (input) => {
      const state = get();
      const trialNumber =
        input.trialNumber ?? state.trialNumber;
      const taskId = resolveTaskId(
        readInputTaskId(input),
        readInputMetadataTaskId(input),
        readInputTrialId(input),
        state.taskId,
      );
      const trialKey = getTrialMetadataKey(
        taskId,
        trialNumber,
      );
      const condition =
        input.condition ??
        getConditionForTrial(trialNumber);
      const storedMetadata =
        state.trialMetadata[trialKey];
      const conditionOrder =
        normalizeConditionOrder(
          input.conditionOrder,
          storedMetadata?.conditionOrder ??
            state.conditionOrder,
        );
      const inferredOrder = inferTrialOrder(
        state.events,
        state.sessionId,
        taskId,
        trialNumber,
        conditionOrder,
      );
      const normalizedTrialOrder =
        normalizeTrialOrderForTask(
          input.trialOrder,
          taskId,
          storedMetadata?.trialOrder ??
            (taskId === state.taskId &&
            trialNumber === state.trialNumber
              ? state.trialOrder
              : inferredOrder),
        );
      const defaultMetadata =
        getDefaultTrialMetadata(
          taskId,
          trialNumber,
          conditionOrder,
          normalizedTrialOrder,
        );
      const isFirstTrial =
        normalizedTrialOrder === 1;
      const probeExposureNumber =
        normalizedTrialOrder;
      const probeNaive =
        normalizedTrialOrder === 1;
      const eventIndex =
        input.eventIndex ??
        getSessionEventIndex(
          state.events,
          state.sessionId,
        );
      const phase = inferPhase(
        input,
        state.events,
        state.sessionId,
        taskId,
        trialNumber,
      );
      const currentTime = getCurrentTimeMs();
      const startedAt =
        storedMetadata?.startedAt ??
        (taskId === state.taskId &&
        trialNumber === state.trialNumber
          ? state.trialStartedAt
          : currentTime);
      const resolvedTrialId = normalizeTrialId(
        storedMetadata?.trialId ??
          (taskId === state.taskId &&
          trialNumber === state.trialNumber
            ? state.trialId
            : undefined),
        taskId,
        trialNumber,
      );
      const taskDefinition =
        getStudyTaskDefinition(taskId);
      const outerTaskNumber =
        getOuterTaskNumber(taskId);
      const globalTrialNumber =
        getGlobalTrialNumber(
          taskId,
          trialNumber,
        );

      const event = {
        ...input,
        eventId: createId(),
        eventIndex,
        participantId: state.participantId,
        participantToken:
          readInputParticipantToken(input) ??
          state.participantToken,
        sessionId: state.sessionId,
        trialId: resolvedTrialId,
        trialNumber,
        trialOrder: normalizedTrialOrder,
        trialIndex:
          input.trialIndex ?? globalTrialNumber,
        taskId,
        skin: taskId,
        condition,
        conditionOrder,
        isFirstTrial,
        probeExposureNumber,
        probeNaive,
        taskInstanceVersion:
          input.taskInstanceVersion ??
          taskDefinition.taskVersion,
        appVersion:
          input.appVersion ?? APP_VERSION,
        eventType: input.eventType,
        phase,
        timestampIso: new Date().toISOString(),
        elapsedMs: Math.max(
          0,
          currentTime - startedAt,
        ),
        tMs:
          input.tMs ??
          Math.max(
            0,
            currentTime - state.sessionStartedAt,
          ),
        resultingViolations:
          input.resultingViolations
            ? [...input.resultingViolations]
            : undefined,
        unresolvedDemoTalkIds:
          cloneOptionalArray(
            input.unresolvedDemoTalkIds,
          ),
        unresolvedDemoTalkIdsBefore:
          cloneOptionalArray(
            input.unresolvedDemoTalkIdsBefore,
          ),
        unresolvedDemoTalkIdsAfter:
          cloneOptionalArray(
            input.unresolvedDemoTalkIdsAfter,
          ),
        metadata: {
          ...(input.metadata
            ? { ...input.metadata }
            : {}),
          taskId,
          compositeTrialId: resolvedTrialId,
          outerTaskNumber,
          innerTaskNumber: trialNumber,
          globalTrialNumber,
        },
        payload: input.payload
          ? { ...input.payload }
          : undefined,
      } as unknown as StudyEvent;

      set((currentState) => ({
        events: [...currentState.events, event],
        trialMetadata:
          currentState.trialMetadata[trialKey]
            ? currentState.trialMetadata
            : {
                ...currentState.trialMetadata,
                [trialKey]: {
                  ...defaultMetadata,
                  trialId: resolvedTrialId,
                  trialOrder: normalizedTrialOrder,
                  conditionOrder,
                  isFirstTrial,
                  probeExposureNumber,
                  probeNaive,
                  startedAt,
                },
              },
      }));

      console.log("[STUDY EVENT]", event);
      return event;
    },

    getEventsForTrial: (
      trialNumber,
      requestedTaskId,
    ) => {
      const state = get();
      const taskId = resolveTaskId(
        requestedTaskId,
        state.taskId,
      );

      return state.events
        .filter(
          (event) =>
            event.sessionId === state.sessionId &&
            getEventTaskId(event) === taskId &&
            event.trialNumber === trialNumber,
        )
        .sort(
          (first, second) =>
            (first.tMs ?? first.elapsedMs) -
              (second.tMs ?? second.elapsedMs) ||
            first.eventIndex - second.eventIndex,
        );
    },

    clearEvents: () => {
      /*
       * Deliberately append-only. Existing callers may still call this
       * between trials, but deleting prior events would violate the
       * full-session logging requirement.
       */
    },

    clearAllEvents: () => {
      const state = get();
      const startedAt = getCurrentTimeMs();
      const trialKey = getTrialMetadataKey(
        state.taskId,
        state.trialNumber,
      );
      const metadata = getDefaultTrialMetadata(
        state.taskId,
        state.trialNumber,
        state.conditionOrder,
        state.trialOrder,
      );

      set({
        events: [],
        sessionStartedAt: startedAt,
        trialStartedAt: startedAt,
        trialMetadata: {
          [trialKey]: {
            trialId: state.trialId,
            ...metadata,
            startedAt,
          },
        },
      });
    },

    resetForNewParticipant: (input) => {
      set(createInitialState(input));
    },

    exportEvents: (
      trialNumber,
      requestedTaskId,
    ) => {
      const state = get();
      const taskId = requestedTaskId
        ? resolveTaskId(requestedTaskId)
        : trialNumber !== undefined
          ? state.taskId
          : undefined;
      const events = state.events
        .filter(
          (event) =>
            event.sessionId === state.sessionId &&
            (taskId === undefined ||
              getEventTaskId(event) === taskId) &&
            (trialNumber === undefined ||
              event.trialNumber === trialNumber),
        )
        .sort(
          (first, second) =>
            (first.tMs ?? first.elapsedMs) -
              (second.tMs ?? second.elapsedMs) ||
            first.eventIndex - second.eventIndex,
        );

      return JSON.stringify(
        {
          participantId: state.participantId,
          participantToken:
            state.participantToken,
          sessionId: state.sessionId,
          conditionOrder: state.conditionOrder,
          taskId: taskId ?? null,
          trialNumber: trialNumber ?? null,
          compositeTrialId:
            taskId && trialNumber
              ? getCompositeTrialId(
                  taskId,
                  trialNumber,
                )
              : null,
          outerTaskNumber: taskId
            ? getOuterTaskNumber(taskId)
            : null,
          innerTaskNumber:
            trialNumber ?? null,
          globalTrialNumber:
            taskId && trialNumber
              ? getGlobalTrialNumber(
                  taskId,
                  trialNumber,
                )
              : null,
          exportedAtIso: new Date().toISOString(),
          eventCount: events.length,
          events,
        },
        null,
        2,
      );
    },

    downloadEvents: (
      trialNumber,
      requestedTaskId,
    ) => {
      const state = get();
      const safeParticipant = sanitizeFilePart(
        state.participantToken,
      );
      const taskId = requestedTaskId
        ? resolveTaskId(requestedTaskId)
        : trialNumber !== undefined
          ? state.taskId
          : undefined;
      const fileName =
        trialNumber === undefined
          ? taskId
            ? `${safeParticipant}_${taskId}_events.json`
            : `${safeParticipant}_study_events.json`
          : `${safeParticipant}_${taskId ?? state.taskId}_T${trialNumber}_${getConditionForTrial(
              trialNumber,
            )}_events.json`;

      downloadTextFile(
        fileName,
        state.exportEvents(
          trialNumber,
          taskId,
        ),
        "application/json;charset=utf-8",
      );
    },
  }));
