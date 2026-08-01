import { create } from "zustand";

import {
  SYMPOSIUM_TASK_VERSION,
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
  StudyTrialOrder,
} from "../types/scheduler";

type ConditionOrderValue = ConditionOrder | number;

interface StartTrialInput {
  trialId?: string;
  trialNumber: StudyTrialNumber;
  trialOrder?: StudyTrialOrder | number;
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
}

interface TrialEventMetadata {
  trialId: string;
  trialOrder: number;
  conditionOrder: ConditionOrderValue;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;
  startedAt: number;
}

interface EventLogStore {
  sessionId: string;
  participantId: string;
  participantToken: string;

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
    Record<StudyTrialNumber, TrialEventMetadata>
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
  ) => string;

  downloadEvents: (
    trialNumber?: StudyTrialNumber,
  ) => void;
}

const APP_VERSION =
  "attention-tunneling-software-v2";
const DEFAULT_PARTICIPANT_ID = "P001";

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

function cloneOptionalArray<T>(
  value: T[] | null | undefined,
): T[] | null | undefined {
  return Array.isArray(value) ? [...value] : value;
}

function getStartedTrialNumbers(
  events: StudyEvent[],
  sessionId: string,
): Set<StudyTrialNumber> {
  const startedTrialNumbers =
    new Set<StudyTrialNumber>();

  for (const event of events) {
    if (event.sessionId !== sessionId) {
      continue;
    }

    if (
      event.eventType === "task_selected" ||
      event.eventType === "trial_start" ||
      event.eventType ===
        "assistant_analysis_requested" ||
      event.eventType ===
        "assistant_analysis_started" ||
      event.eventType ===
        "assistant_recommendation_shown" ||
      event.eventType === "ai_message_shown"
    ) {
      startedTrialNumbers.add(event.trialNumber);
    }
  }

  return startedTrialNumbers;
}

function inferTrialOrder(
  events: StudyEvent[],
  sessionId: string,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue,
): number {
  const existingTrialEvent = events.find(
    (event) =>
      event.sessionId === sessionId &&
      event.trialNumber === trialNumber &&
      event.trialOrder > 0,
  );

  if (existingTrialEvent) {
    return existingTrialEvent.trialOrder;
  }

  const orderFromCondition =
    getOrderFromConditionOrder(
      trialNumber,
      conditionOrder,
    );

  if (orderFromCondition) {
    return orderFromCondition;
  }

  const startedTrialNumbers =
    getStartedTrialNumbers(events, sessionId);

  if (startedTrialNumbers.has(trialNumber)) {
    return Math.max(1, startedTrialNumbers.size);
  }

  return startedTrialNumbers.size + 1;
}

function getDefaultTrialMetadata(
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrderValue =
    DEFAULT_CONDITION_ORDER,
  trialOrder?: number,
): Omit<TrialEventMetadata, "trialId" | "startedAt"> {
  const orderFromCondition =
    getOrderFromConditionOrder(
      trialNumber,
      conditionOrder,
    );

  const normalizedTrialOrder =
    normalizePositiveInteger(
      trialOrder,
      orderFromCondition ?? trialNumber,
    );

  return {
    trialOrder: normalizedTrialOrder,
    conditionOrder,
    isFirstTrial: normalizedTrialOrder === 1,
    probeExposureNumber: normalizedTrialOrder,
    probeNaive: normalizedTrialOrder === 1,
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
  trialNumber: StudyTrialNumber,
): boolean {
  return events.some(
    (event) =>
      event.sessionId === sessionId &&
      event.trialNumber === trialNumber &&
      event.eventType === "probe_shown",
  );
}

function inferPhase(
  input: CreateStudyEventInput,
  events: StudyEvent[],
  sessionId: string,
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
  const trialNumber: StudyTrialNumber = 1;
  const conditionOrder = normalizeConditionOrder(
    input?.conditionOrder,
    DEFAULT_CONDITION_ORDER,
  );
  const sessionStartedAt = getCurrentTimeMs();
  const defaultMetadata = getDefaultTrialMetadata(
    trialNumber,
    conditionOrder,
  );
  const trialId = "symposium-trial-1";

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
      [trialNumber]: {
        trialId,
        ...defaultMetadata,
        startedAt: sessionStartedAt,
      },
    } as Partial<
      Record<StudyTrialNumber, TrialEventMetadata>
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
        state.trialNumber,
        normalized,
      );

      set({
        conditionOrder: normalized,
        trialOrder,
        isFirstTrial: trialOrder === 1,
        probeExposureNumber: trialOrder,
        probeNaive: trialOrder === 1,
      });
    },

    startTrial: ({
      trialId,
      trialNumber,
      trialOrder,
      conditionOrder,
      isFirstTrial,
      probeExposureNumber,
      probeNaive,
    }) => {
      const state = get();
      const existingMetadata =
        state.trialMetadata[trialNumber];
      const resolvedConditionOrder =
        normalizeConditionOrder(
          conditionOrder,
          existingMetadata?.conditionOrder ??
            state.conditionOrder,
        );
      const inferredOrder = inferTrialOrder(
        state.events,
        state.sessionId,
        trialNumber,
        resolvedConditionOrder,
      );
      const normalizedTrialOrder =
        normalizePositiveInteger(
          trialOrder,
          existingMetadata?.trialOrder ??
            inferredOrder,
        );
      const defaultMetadata =
        getDefaultTrialMetadata(
          trialNumber,
          resolvedConditionOrder,
          normalizedTrialOrder,
        );
      const resolvedStartedAt =
        existingMetadata?.startedAt ??
        getCurrentTimeMs();
      const resolvedTrialId =
        trialId ??
        existingMetadata?.trialId ??
        `symposium-trial-${trialNumber}`;

      const resolvedMetadata: TrialEventMetadata = {
        trialId: resolvedTrialId,
        trialOrder: normalizedTrialOrder,
        conditionOrder: resolvedConditionOrder,
        isFirstTrial:
          isFirstTrial ??
          existingMetadata?.isFirstTrial ??
          defaultMetadata.isFirstTrial,
        probeExposureNumber:
          normalizePositiveInteger(
            probeExposureNumber,
            existingMetadata
              ?.probeExposureNumber ??
              defaultMetadata
                .probeExposureNumber,
          ),
        probeNaive:
          probeNaive ??
          existingMetadata?.probeNaive ??
          defaultMetadata.probeNaive,
        startedAt: resolvedStartedAt,
      };

      set({
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
          [trialNumber]: resolvedMetadata,
        },
      });
    },

    addEvent: (input) => {
      const state = get();
      const trialNumber =
        input.trialNumber ?? state.trialNumber;
      const condition =
        input.condition ??
        getConditionForTrial(trialNumber);
      const storedMetadata =
        state.trialMetadata[trialNumber];
      const conditionOrder =
        normalizeConditionOrder(
          input.conditionOrder,
          storedMetadata?.conditionOrder ??
            state.conditionOrder,
        );
      const inferredOrder = inferTrialOrder(
        state.events,
        state.sessionId,
        trialNumber,
        conditionOrder,
      );
      const normalizedTrialOrder =
        normalizePositiveInteger(
          input.trialOrder,
          storedMetadata?.trialOrder ??
            (trialNumber === state.trialNumber
              ? state.trialOrder
              : inferredOrder),
        );
      const defaultMetadata =
        getDefaultTrialMetadata(
          trialNumber,
          conditionOrder,
          normalizedTrialOrder,
        );
      const isFirstTrial =
        input.isFirstTrial ??
        storedMetadata?.isFirstTrial ??
        (trialNumber === state.trialNumber
          ? state.isFirstTrial
          : defaultMetadata.isFirstTrial);
      const probeExposureNumber =
        normalizePositiveInteger(
          input.probeExposureNumber,
          storedMetadata?.probeExposureNumber ??
            (trialNumber === state.trialNumber
              ? state.probeExposureNumber
              : defaultMetadata
                  .probeExposureNumber),
        );
      const probeNaive =
        input.probeNaive ??
        storedMetadata?.probeNaive ??
        (trialNumber === state.trialNumber
          ? state.probeNaive
          : defaultMetadata.probeNaive);
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
        trialNumber,
      );
      const currentTime = getCurrentTimeMs();
      const startedAt =
        storedMetadata?.startedAt ??
        (trialNumber === state.trialNumber
          ? state.trialStartedAt
          : currentTime);
      const resolvedTrialId =
        storedMetadata?.trialId ??
        (trialNumber === state.trialNumber
          ? state.trialId
          : `symposium-trial-${trialNumber}`);

      const event: StudyEvent = {
        ...input,
        eventId: createId(),
        eventIndex,
        participantId: state.participantId,
        participantToken:
          input.participantToken ??
          state.participantToken,
        sessionId: state.sessionId,
        trialId: resolvedTrialId,
        trialNumber,
        trialOrder: normalizedTrialOrder,
        trialIndex:
          input.trialIndex ?? normalizedTrialOrder,
        taskId: input.taskId ?? "symposium",
        skin: input.skin ?? "symposium",
        condition,
        conditionOrder,
        isFirstTrial,
        probeExposureNumber,
        probeNaive,
        taskInstanceVersion:
          input.taskInstanceVersion ??
          SYMPOSIUM_TASK_VERSION,
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
        metadata: input.metadata
          ? { ...input.metadata }
          : undefined,
        payload: input.payload
          ? { ...input.payload }
          : undefined,
      };

      set((currentState) => ({
        events: [...currentState.events, event],
        trialMetadata:
          currentState.trialMetadata[trialNumber]
            ? currentState.trialMetadata
            : {
                ...currentState.trialMetadata,
                [trialNumber]: {
                  trialId: resolvedTrialId,
                  trialOrder:
                    normalizedTrialOrder,
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

    getEventsForTrial: (trialNumber) => {
      const state = get();

      return state.events
        .filter(
          (event) =>
            event.sessionId === state.sessionId &&
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
      const metadata = getDefaultTrialMetadata(
        state.trialNumber,
        state.conditionOrder,
        state.trialOrder,
      );

      set({
        events: [],
        sessionStartedAt: startedAt,
        trialStartedAt: startedAt,
        trialMetadata: {
          [state.trialNumber]: {
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

    exportEvents: (trialNumber) => {
      const state = get();
      const events = state.events
        .filter(
          (event) =>
            event.sessionId === state.sessionId &&
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
          trialNumber: trialNumber ?? null,
          exportedAtIso: new Date().toISOString(),
          eventCount: events.length,
          events,
        },
        null,
        2,
      );
    },

    downloadEvents: (trialNumber) => {
      const state = get();
      const safeParticipant = sanitizeFilePart(
        state.participantToken,
      );
      const fileName =
        trialNumber === undefined
          ? `${safeParticipant}_study_events.json`
          : `${safeParticipant}_T${trialNumber}_${getConditionForTrial(
              trialNumber,
            )}_events.json`;

      downloadTextFile(
        fileName,
        state.exportEvents(trialNumber),
        "application/json;charset=utf-8",
      );
    },
  }));
