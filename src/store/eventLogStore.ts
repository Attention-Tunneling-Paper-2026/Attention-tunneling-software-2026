import {
  create,
} from "zustand";

import {
  SYMPOSIUM_TASK_VERSION,
} from "../data/symposium";

import type {
  CreateStudyEventInput,
  StudyEvent,
  StudyPhase,
} from "../types/events";

import type {
  ConcretizationLevel,
  StudyTrialNumber,
} from "../types/scheduler";

import {
  getConditionForTrial,
} from "../types/scheduler";

interface StartTrialInput {
  trialId?:
    string;

  trialNumber:
    StudyTrialNumber;

  trialOrder?:
    number;

  conditionOrder?:
    number;

  isFirstTrial?:
    boolean;

  probeExposureNumber?:
    number;

  probeNaive?:
    boolean;
}

interface ResetEventLogInput {
  participantId?:
    string;

  sessionId?:
    string;
}

interface TrialEventMetadata {
  trialId:
    string;

  trialOrder:
    number;

  conditionOrder:
    number;

  isFirstTrial:
    boolean;

  probeExposureNumber:
    number;

  probeNaive:
    boolean;

  startedAt:
    number;
}

interface EventLogStore {
  sessionId:
    string;

  participantId:
    string;

  trialId:
    string;

  trialNumber:
    StudyTrialNumber;

  trialOrder:
    number;

  condition:
    ConcretizationLevel;

  conditionOrder:
    number;

  isFirstTrial:
    boolean;

  probeExposureNumber:
    number;

  probeNaive:
    boolean;

  trialStartedAt:
    number;

  trialMetadata:
    Partial<
      Record<
        StudyTrialNumber,
        TrialEventMetadata
      >
    >;

  events:
    StudyEvent[];

  setParticipantId: (
    participantId:
      string,
  ) => void;

  setSessionId: (
    sessionId:
      string,
  ) => void;

  startTrial: (
    input:
      StartTrialInput,
  ) => void;

  addEvent: (
    input:
      CreateStudyEventInput,
  ) => StudyEvent;

  getEventsForTrial: (
    trialNumber:
      StudyTrialNumber,
  ) => StudyEvent[];

  clearEvents:
    () => void;

  resetForNewParticipant: (
    input?:
      ResetEventLogInput,
  ) => void;

  exportEvents: (
    trialNumber?:
      StudyTrialNumber,
  ) => string;

  downloadEvents: (
    trialNumber?:
      StudyTrialNumber,
  ) => void;
}

const APP_VERSION =
  "attention-tunneling-software-v1";

const DEFAULT_PARTICIPANT_ID =
  "P001";

function createId():
  string {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now()
      .toString(
        36,
      ),

    Math.random()
      .toString(
        36,
      )
      .slice(
        2,
        10,
      ),
  ].join(
    "_",
  );
}

function createSessionId():
  string {
  return `SESSION_${createId()}`;
}

function getCurrentTimeMs():
  number {
  if (
    typeof performance !==
    "undefined"
  ) {
    return performance.now();
  }

  return Date.now();
}

function normalizePositiveInteger(
  value:
    number | undefined,

  fallback:
    number,
): number {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    ) &&
    value >
      0
  ) {
    return Math.floor(
      value,
    );
  }

  return fallback;
}

function getStartedTrialNumbers(
  events:
    StudyEvent[],

  sessionId:
    string,
): Set<StudyTrialNumber> {
  const startedTrialNumbers =
    new Set<StudyTrialNumber>();

  for (
    const event of
    events
  ) {
    if (
      event.sessionId !==
      sessionId
    ) {
      continue;
    }

    if (
      event.eventType ===
        "task_selected" ||
      event.eventType ===
        "trial_start" ||
      event.eventType ===
        "assistant_analysis_requested" ||
      event.eventType ===
        "assistant_analysis_started" ||
      event.eventType ===
        "assistant_recommendation_shown"
    ) {
      startedTrialNumbers.add(
        event.trialNumber,
      );
    }
  }

  return startedTrialNumbers;
}

function inferTrialOrder(
  events:
    StudyEvent[],

  sessionId:
    string,

  trialNumber:
    StudyTrialNumber,
): number {
  const existingTrialEvent =
    events.find(
      (event) =>
        event.sessionId ===
          sessionId &&
        event.trialNumber ===
          trialNumber &&
        event.trialOrder >
          0,
    );

  if (
    existingTrialEvent
  ) {
    return existingTrialEvent.trialOrder;
  }

  const startedTrialNumbers =
    getStartedTrialNumbers(
      events,
      sessionId,
    );

  if (
    startedTrialNumbers.has(
      trialNumber,
    )
  ) {
    return Math.max(
      1,
      startedTrialNumbers.size,
    );
  }

  return (
    startedTrialNumbers.size +
    1
  );
}

function getDefaultTrialMetadata(
  trialNumber:
    StudyTrialNumber,

  trialOrder:
    number = trialNumber,
): Omit<
  TrialEventMetadata,
  "trialId" |
  "startedAt"
> {
  const normalizedTrialOrder =
    normalizePositiveInteger(
      trialOrder,
      trialNumber,
    );

  return {
    trialOrder:
      normalizedTrialOrder,

    conditionOrder:
      normalizedTrialOrder,

    isFirstTrial:
      normalizedTrialOrder ===
      1,

    probeExposureNumber:
      normalizedTrialOrder,

    probeNaive:
      normalizedTrialOrder ===
      1,
  };
}

function getTrialEventIndex(
  events:
    StudyEvent[],

  sessionId:
    string,

  trialNumber:
    StudyTrialNumber,
): number {
  return (
    events.filter(
      (event) =>
        event.sessionId ===
          sessionId &&
        event.trialNumber ===
          trialNumber,
    ).length +
    1
  );
}

function trialHasProbeStarted(
  events:
    StudyEvent[],

  sessionId:
    string,

  trialNumber:
    StudyTrialNumber,
): boolean {
  return events.some(
    (event) =>
      event.sessionId ===
        sessionId &&
      event.trialNumber ===
        trialNumber &&
      event.eventType ===
        "probe_shown",
  );
}

function inferPhase(
  input:
    CreateStudyEventInput,

  events:
    StudyEvent[],

  sessionId:
    string,

  trialNumber:
    StudyTrialNumber,
): StudyPhase {
  if (
    input.phase
  ) {
    return input.phase;
  }

  switch (
    input.eventType
  ) {
    case "study_started":
    case "procedure_viewed":
    case "task_selected":
    case "assistant_analysis_requested":
    case "assistant_analysis_started":
      return "pre_ai";

    case "assistant_analysis_completed":
    case "assistant_recommendation_shown":
      return "pre_probe";

    case "questionnaire_started":
    case "questionnaire_submitted":
    case "trial_csv_exported":
      return "questionnaire";

    case "post_experiment_started":
    case "post_experiment_submitted":
    case "post_experiment_csv_exported":
      return "post_experiment";

    case "disclosure_viewed":
      return "disclosure";

    case "study_completed":
      return "complete";

    case "submit_attempt":
    case "trial_submitted":
    case "timer_expired":
      return "submitted";

    case "probe_shown":
    case "probe_notification_opened":
    case "probe_acknowledged":
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

function downloadTextFile(
  fileName:
    string,

  content:
    string,

  mimeType:
    string,
): void {
  if (
    typeof document ===
      "undefined" ||
    typeof URL ===
      "undefined"
  ) {
    return;
  }

  const blob =
    new Blob(
      [
        content,
      ],
      {
        type:
          mimeType,
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
    fileName;

  link.style.display =
    "none";

  document.body.appendChild(
    link,
  );

  link.click();

  link.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    },
    0,
  );
}

function createInitialState() {
  const trialNumber:
    StudyTrialNumber =
      1;

  const startedAt =
    getCurrentTimeMs();

  const defaultMetadata =
    getDefaultTrialMetadata(
      trialNumber,
    );

  const trialId =
    "symposium-trial-1";

  return {
    sessionId:
      createSessionId(),

    participantId:
      DEFAULT_PARTICIPANT_ID,

    trialId,

    trialNumber,

    trialOrder:
      defaultMetadata.trialOrder,

    condition:
      getConditionForTrial(
        trialNumber,
      ),

    conditionOrder:
      defaultMetadata.conditionOrder,

    isFirstTrial:
      defaultMetadata.isFirstTrial,

    probeExposureNumber:
      defaultMetadata.probeExposureNumber,

    probeNaive:
      defaultMetadata.probeNaive,

    trialStartedAt:
      startedAt,

    trialMetadata: {
      [trialNumber]: {
        trialId,

        ...defaultMetadata,

        startedAt,
      },
    } as Partial<
      Record<
        StudyTrialNumber,
        TrialEventMetadata
      >
    >,

    events:
      [] as StudyEvent[],
  };
}

export const useEventLogStore =
  create<EventLogStore>(
    (
      set,
      get,
    ) => ({
      ...createInitialState(),

      setParticipantId: (
        participantId,
      ) => {
        const normalizedParticipantId =
          participantId.trim();

        if (
          normalizedParticipantId.length ===
          0
        ) {
          return;
        }

        set({
          participantId:
            normalizedParticipantId,
        });
      },

      setSessionId: (
        sessionId,
      ) => {
        const normalizedSessionId =
          sessionId.trim();

        if (
          normalizedSessionId.length ===
          0
        ) {
          return;
        }

        set({
          sessionId:
            normalizedSessionId,
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
        const state =
          get();

        const existingMetadata =
          state.trialMetadata[
            trialNumber
          ];

        const inferredOrder =
          inferTrialOrder(
            state.events,
            state.sessionId,
            trialNumber,
          );

        const normalizedTrialOrder =
          normalizePositiveInteger(
            trialOrder,
            existingMetadata
              ?.trialOrder ??
              inferredOrder,
          );

        const defaultMetadata =
          getDefaultTrialMetadata(
            trialNumber,
            normalizedTrialOrder,
          );

        const normalizedConditionOrder =
          normalizePositiveInteger(
            conditionOrder,
            existingMetadata
              ?.conditionOrder ??
              defaultMetadata
                .conditionOrder,
          );

        const resolvedStartedAt =
          existingMetadata
            ?.startedAt ??
          getCurrentTimeMs();

        const resolvedTrialId =
          trialId ??
          existingMetadata
            ?.trialId ??
          `symposium-trial-${trialNumber}`;

        const resolvedMetadata:
          TrialEventMetadata = {
            trialId:
              resolvedTrialId,

            trialOrder:
              normalizedTrialOrder,

            conditionOrder:
              normalizedConditionOrder,

            isFirstTrial:
              isFirstTrial ??
              existingMetadata
                ?.isFirstTrial ??
              (
                normalizedTrialOrder ===
                1
              ),

            probeExposureNumber:
              normalizePositiveInteger(
                probeExposureNumber,
                existingMetadata
                  ?.probeExposureNumber ??
                  normalizedTrialOrder,
              ),

            probeNaive:
              probeNaive ??
              existingMetadata
                ?.probeNaive ??
              (
                normalizedTrialOrder ===
                1
              ),

            startedAt:
              resolvedStartedAt,
          };

        set({
          trialId:
            resolvedMetadata.trialId,

          trialNumber,

          trialOrder:
            resolvedMetadata.trialOrder,

          condition:
            getConditionForTrial(
              trialNumber,
            ),

          conditionOrder:
            resolvedMetadata.conditionOrder,

          isFirstTrial:
            resolvedMetadata.isFirstTrial,

          probeExposureNumber:
            resolvedMetadata.probeExposureNumber,

          probeNaive:
            resolvedMetadata.probeNaive,

          trialStartedAt:
            resolvedMetadata.startedAt,

          trialMetadata: {
            ...state.trialMetadata,

            [trialNumber]:
              resolvedMetadata,
          },
        });
      },

      addEvent: (
        input,
      ) => {
        const state =
          get();

        const trialNumber =
          input.trialNumber ??
          state.trialNumber;

        const condition =
          input.condition ??
          getConditionForTrial(
            trialNumber,
          );

        const storedMetadata =
          state.trialMetadata[
            trialNumber
          ];

        const inferredOrder =
          inferTrialOrder(
            state.events,
            state.sessionId,
            trialNumber,
          );

        const normalizedTrialOrder =
          normalizePositiveInteger(
            input.trialOrder,
            storedMetadata
              ?.trialOrder ??
              (
                trialNumber ===
                state.trialNumber
                  ? state.trialOrder
                  : inferredOrder
              ),
          );

        const defaultMetadata =
          getDefaultTrialMetadata(
            trialNumber,
            normalizedTrialOrder,
          );

        const conditionOrder =
          normalizePositiveInteger(
            input.conditionOrder,
            storedMetadata
              ?.conditionOrder ??
              (
                trialNumber ===
                state.trialNumber
                  ? state.conditionOrder
                  : defaultMetadata
                      .conditionOrder
              ),
          );

        const isFirstTrial =
          input.isFirstTrial ??
          storedMetadata
            ?.isFirstTrial ??
          (
            trialNumber ===
            state.trialNumber
              ? state.isFirstTrial
              : normalizedTrialOrder ===
                1
          );

        const probeExposureNumber =
          normalizePositiveInteger(
            input.probeExposureNumber,
            storedMetadata
              ?.probeExposureNumber ??
              (
                trialNumber ===
                state.trialNumber
                  ? state
                      .probeExposureNumber
                  : normalizedTrialOrder
              ),
          );

        const probeNaive =
          input.probeNaive ??
          storedMetadata
            ?.probeNaive ??
          (
            trialNumber ===
            state.trialNumber
              ? state.probeNaive
              : normalizedTrialOrder ===
                1
          );

        const eventIndex =
          input.eventIndex ??
          getTrialEventIndex(
            state.events,
            state.sessionId,
            trialNumber,
          );

        const phase =
          inferPhase(
            input,
            state.events,
            state.sessionId,
            trialNumber,
          );

        const currentTime =
          getCurrentTimeMs();

        const startedAt =
          storedMetadata
            ?.startedAt ??
          (
            trialNumber ===
            state.trialNumber
              ? state.trialStartedAt
              : currentTime
          );

        const resolvedTrialId =
          storedMetadata
            ?.trialId ??
          (
            trialNumber ===
            state.trialNumber
              ? state.trialId
              : `symposium-trial-${trialNumber}`
          );

        const event:
          StudyEvent = {
            ...input,

            eventId:
              createId(),

            eventIndex,

            participantId:
              state.participantId,

            sessionId:
              state.sessionId,

            trialId:
              resolvedTrialId,

            trialNumber,

            trialOrder:
              normalizedTrialOrder,

            taskId:
              "symposium",

            condition,

            conditionOrder,

            isFirstTrial,

            probeExposureNumber,

            probeNaive,

            taskInstanceVersion:
              input.taskInstanceVersion ??
              SYMPOSIUM_TASK_VERSION,

            appVersion:
              input.appVersion ??
              APP_VERSION,

            eventType:
              input.eventType,

            phase,

            timestampIso:
              new Date()
                .toISOString(),

            elapsedMs:
              Math.max(
                0,
                currentTime -
                  startedAt,
              ),

            metadata:
              input.metadata
                ? {
                    ...input.metadata,
                  }
                : undefined,
          };

        set(
          (
            currentState,
          ) => ({
            events: [
              ...currentState.events,
              event,
            ],

            trialMetadata:
              currentState
                .trialMetadata[
                trialNumber
              ]
                ? currentState
                    .trialMetadata
                : {
                    ...currentState
                      .trialMetadata,

                    [trialNumber]: {
                      trialId:
                        resolvedTrialId,

                      trialOrder:
                        normalizedTrialOrder,

                      conditionOrder,

                      isFirstTrial,

                      probeExposureNumber,

                      probeNaive,

                      startedAt,
                    },
                  },
          }),
        );

        console.log(
          "[STUDY EVENT]",
          event,
        );

        return event;
      },

      getEventsForTrial: (
        trialNumber,
      ) => {
        const state =
          get();

        return state.events
          .filter(
            (event) =>
              event.sessionId ===
                state.sessionId &&
              event.trialNumber ===
                trialNumber,
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.eventIndex -
              second.eventIndex,
          );
      },

      clearEvents:
        () => {
          const state =
            get();

          const startedAt =
            getCurrentTimeMs();

          const currentMetadata =
            state.trialMetadata[
              state.trialNumber
            ];

          set({
            events:
              [],

            trialStartedAt:
              startedAt,

            trialMetadata: {
              [state.trialNumber]: {
                trialId:
                  currentMetadata
                    ?.trialId ??
                  state.trialId,

                trialOrder:
                  currentMetadata
                    ?.trialOrder ??
                  state.trialOrder,

                conditionOrder:
                  currentMetadata
                    ?.conditionOrder ??
                  state.conditionOrder,

                isFirstTrial:
                  currentMetadata
                    ?.isFirstTrial ??
                  state.isFirstTrial,

                probeExposureNumber:
                  currentMetadata
                    ?.probeExposureNumber ??
                  state
                    .probeExposureNumber,

                probeNaive:
                  currentMetadata
                    ?.probeNaive ??
                  state.probeNaive,

                startedAt,
              },
            },
          });
        },

      resetForNewParticipant: (
        input,
      ) => {
        const freshState =
          createInitialState();

        const participantId =
          input?.participantId
            ?.trim();

        const sessionId =
          input?.sessionId
            ?.trim();

        set({
          ...freshState,

          participantId:
            participantId &&
            participantId.length >
              0
              ? participantId
              : DEFAULT_PARTICIPANT_ID,

          sessionId:
            sessionId &&
            sessionId.length >
              0
              ? sessionId
              : freshState
                  .sessionId,
        });
      },

      exportEvents: (
        trialNumber,
      ) => {
        const state =
          get();

        const events =
          trialNumber ===
          undefined
            ? state.events.filter(
                (event) =>
                  event.sessionId ===
                  state.sessionId,
              )
            : state.events.filter(
                (event) =>
                  event.sessionId ===
                    state.sessionId &&
                  event.trialNumber ===
                    trialNumber,
              );

        return JSON.stringify(
          {
            participantId:
              state.participantId,

            sessionId:
              state.sessionId,

            trialNumber:
              trialNumber ??
              null,

            exportedAtIso:
              new Date()
                .toISOString(),

            eventCount:
              events.length,

            events,
          },
          null,
          2,
        );
      },

      downloadEvents: (
        trialNumber,
      ) => {
        const state =
          get();

        const safeParticipantId =
          sanitizeFilePart(
            state.participantId,
          );

        const fileName =
          trialNumber ===
          undefined
            ? `${safeParticipantId}_study_events.json`
            : `${safeParticipantId}_T${trialNumber}_${getConditionForTrial(
                trialNumber,
              )}_events.json`;

        downloadTextFile(
          fileName,
          state.exportEvents(
            trialNumber,
          ),
          "application/json;charset=utf-8",
        );
      },
    }),
  );