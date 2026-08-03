import {
  create,
} from "zustand";

import {
  DEFAULT_CONDITION_ORDER,
  createSymposiumTrials,
  isConditionOrder,
} from "../types/scheduler";

import type {
  ConditionOrder,
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

import type {
  StudySessionStage,
  StudyTrialAssignment,
  StudyTrialEndReason,
  StudyTrialProgress,
  TrialExportStatus,
  TrialProgressStatus,
} from "../types/study";

export type {
  StudySessionStage,
  TrialProgressStatus,
};

export type TrialAssignment =
  StudyTrialAssignment;

export type TrialProgress =
  StudyTrialProgress;

export type TrialCsvExportType =
  | "events"
  | "summary";

type SupportedStudyTaskId =
  | "symposium"
  | "delivery"
  | "clinic";

interface StudyTaskDefinition {
  taskId:
    SupportedStudyTaskId;

  outerTaskNumber:
    number;
}

interface TrialIdentity {
  taskId:
    SupportedStudyTaskId;

  trialNumber:
    StudyTrialNumber;
}

const STUDY_TASKS:
  readonly StudyTaskDefinition[] = [
    {
      taskId:
        "symposium",

      outerTaskNumber:
        1,
    },
    {
      taskId:
        "delivery",

      outerTaskNumber:
        2,
    },
    {
      taskId:
        "clinic",

      outerTaskNumber:
        3,
    },
  ];

export const TOTAL_TASK_DOMAINS =
  STUDY_TASKS.length;

export const TRIALS_PER_TASK =
  3;

export const TOTAL_STUDY_TRIALS =
  TOTAL_TASK_DOMAINS *
  TRIALS_PER_TASK;

interface StudySessionState {
  participantId:
    string;

  sessionId:
    string;

  conditionOrder:
    ConditionOrder;

  assignments:
    StudyTrialAssignment[];

  trials:
    StudyTrialProgress[];

  stage:
    StudySessionStage;

  procedureAccepted:
    boolean;

  currentTaskId:
    StudyTaskId | null;

  currentTrialNumber:
    StudyTrialNumber | null;

  postExperimentCompleted:
    boolean;

  disclosureViewed:
    boolean;

  studyCompleted:
    boolean;

  sessionCreatedAtIso:
    string | null;

  sessionStartedAtIso:
    string | null;

  procedureAcceptedAtIso:
    string | null;

  postExperimentStartedAtIso:
    string | null;

  postExperimentCompletedAtIso:
    string | null;

  postExperimentCsvExportStatus:
    TrialExportStatus;

  postExperimentCsvExportedAtIso:
    string | null;

  disclosureViewedAtIso:
    string | null;

  studyCompletedAtIso:
    string | null;
}

interface StudySessionStore
  extends StudySessionState {
  initializeSession: (
    participantId:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;

  ensureSession: (
    participantId:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;

  setConditionOrder: (
    conditionOrder:
      ConditionOrder,
  ) => boolean;

  setParticipantId: (
    participantId:
      string,
  ) => void;

  acceptProcedure:
    () => void;

  startNextTrial:
    () =>
      | StudyTrialAssignment
      | undefined;

  startTrial: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | StudyTrialAssignment
    | undefined;

  markAssistantAnalysisRequested: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markAssistantAnalysisStarted: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markAssistantAnalysisCompleted: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markAssistantRecommendationShown: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markTrialTimerStarted: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markProbeShown: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markProbeCollapsed: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markProbeAcknowledged: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markTrialSubmitted: (
    trialNumber?:
      StudyTrialNumber,

    reason?:
      StudyTrialEndReason,

    taskId?:
      StudyTaskId,
  ) => boolean;

  openTrialQuestionnaire: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  completeTrialQuestionnaire: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  setTrialCsvExportStatus: (
    trialNumber:
      StudyTrialNumber,

    exportType:
      TrialCsvExportType,

    status:
      TrialExportStatus,

    errorMessage?:
      string,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markTrialEventsCsvExported: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markTrialSummaryCsvExported: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  openPostExperiment:
    () => boolean;

  completePostExperiment:
    () => boolean;

  setPostExperimentCsvExportStatus: (
    status:
      TrialExportStatus,
  ) => boolean;

  markPostExperimentCsvExported:
    () => boolean;

  markDisclosureViewed:
    () => boolean;

  completeStudy:
    () => boolean;

  getCurrentAssignment:
    () =>
      | StudyTrialAssignment
      | undefined;

  getNextAssignment:
    () =>
      | StudyTrialAssignment
      | undefined;

  getTrialProgress: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | StudyTrialProgress
    | undefined;

  getCompletedTrialCount:
    () => number;

  areAllTrialsComplete:
    () => boolean;

  resetSession: (
    participantId?:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;

  resetForNewParticipant: (
    participantId?:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;
}

type TrialTimestampField =
  | "assistantAnalysisRequestedAtIso"
  | "assistantAnalysisStartedAtIso"
  | "assistantAnalysisCompletedAtIso"
  | "assistantRecommendationShownAtIso"
  | "timerStartedAtIso"
  | "probeShownAtIso"
  | "probeCollapsedAtIso"
  | "probeAcknowledgedAtIso";

const LEGACY_STORAGE_KEYS = [
  "attentionTunnelingStudySession",
  "attention-tunneling-study-session",
];

const DEFAULT_PARTICIPANT_ID =
  "P001";

function isSupportedStudyTaskId(
  value:
    unknown,
): value is SupportedStudyTaskId {
  return (
    value ===
      "symposium" ||
    value ===
      "delivery" ||
    value ===
      "clinic"
  );
}

function normalizeTaskId(
  value:
    unknown,

  fallback:
    SupportedStudyTaskId =
      "symposium",
): SupportedStudyTaskId {
  return isSupportedStudyTaskId(
    value,
  )
    ? value
    : fallback;
}

function toStudyTaskId(
  taskId:
    SupportedStudyTaskId,
): StudyTaskId {
  return taskId as unknown as StudyTaskId;
}

function getTaskIdFromAssignment(
  assignment:
    Pick<
      StudyTrialAssignment,
      "taskId"
    >,
): SupportedStudyTaskId {
  return normalizeTaskId(
    assignment.taskId,
  );
}

function trialMatchesIdentity(
  trial:
    Pick<
      StudyTrialAssignment,
      "taskId" | "trialNumber"
    >,

  identity:
    TrialIdentity,
): boolean {
  return (
    getTaskIdFromAssignment(
      trial,
    ) ===
      identity.taskId &&
    trial.trialNumber ===
      identity.trialNumber
  );
}

function getGlobalTrialNumber(
  taskId:
    SupportedStudyTaskId,

  trialNumber:
    StudyTrialNumber,
): number {
  const taskIndex =
    STUDY_TASKS.findIndex(
      (task) =>
        task.taskId ===
        taskId,
    );

  return (
    Math.max(
      0,
      taskIndex,
    ) *
      TRIALS_PER_TASK +
    trialNumber
  );
}

function removeLegacyPersistedState():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  for (
    const key of
    LEGACY_STORAGE_KEYS
  ) {
    window.localStorage.removeItem(
      key,
    );

    window.sessionStorage.removeItem(
      key,
    );
  }
}

removeLegacyPersistedState();

function normalizeParticipantId(
  participantId:
    string,
): string {
  const normalized =
    participantId.trim();

  return normalized.length >
    0
    ? normalized
    : DEFAULT_PARTICIPANT_ID;
}

function createSessionId():
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
    "session",
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

function cloneAssignment(
  assignment:
    StudyTrialAssignment,
): StudyTrialAssignment {
  return {
    ...assignment,
  };
}

function cloneTrialProgress(
  trial:
    StudyTrialProgress,
): StudyTrialProgress {
  return {
    ...trial,
  };
}

function createAssignments(
  conditionOrder:
    ConditionOrder,
): StudyTrialAssignment[] {
  const innerTrialDefinitions =
    createSymposiumTrials(
      conditionOrder,
    );

  return STUDY_TASKS.flatMap(
    (task) =>
      innerTrialDefinitions.map(
        (definition) => {
          const globalTrialNumber =
            getGlobalTrialNumber(
              task.taskId,
              definition.trialNumber,
            );

          return {
            trialNumber:
              definition.trialNumber,

            trialOrder:
              globalTrialNumber,

            taskId:
              toStudyTaskId(
                task.taskId,
              ),

            condition:
              definition.condition,

            conditionOrder:
              definition.conditionOrder,

            participantLabel:
              `Task ${definition.trialNumber}`,

            isFirstTrial:
              globalTrialNumber ===
              1,

            probeExposureNumber:
              globalTrialNumber,

            probeNaive:
              globalTrialNumber ===
              1,
          } satisfies StudyTrialAssignment;
        },
      ),
  );
}

function createTrialProgress(
  assignment:
    StudyTrialAssignment,
): StudyTrialProgress {
  return {
    ...cloneAssignment(
      assignment,
    ),

    status:
      "pending",

    startedAtIso:
      null,

    assistantAnalysisRequestedAtIso:
      null,

    assistantAnalysisStartedAtIso:
      null,

    assistantAnalysisCompletedAtIso:
      null,

    assistantRecommendationShownAtIso:
      null,

    timerStartedAtIso:
      null,

    probeShownAtIso:
      null,

    probeCollapsedAtIso:
      null,

    probeAcknowledgedAtIso:
      null,

    submittedAtIso:
      null,

    trialEndedAtIso:
      null,

    trialEndReason:
      null,

    questionnaireStartedAtIso:
      null,

    questionnaireCompletedAtIso:
      null,

    eventsCsvExportStatus:
      "not_ready",

    eventsCsvExportedAtIso:
      null,

    summaryCsvExportStatus:
      "not_ready",

    summaryCsvExportedAtIso:
      null,

    exportErrorMessage:
      undefined,
  };
}

function createStateForParticipant(
  participantId:
    string,

  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
): StudySessionState {
  const createdAtIso =
    new Date()
      .toISOString();

  const assignments =
    createAssignments(
      conditionOrder,
    );

  return {
    participantId:
      normalizeParticipantId(
        participantId,
      ),

    sessionId:
      createSessionId(),

    conditionOrder,

    assignments,

    trials:
      assignments.map(
        createTrialProgress,
      ),

    stage:
      "procedure",

    procedureAccepted:
      false,

    currentTaskId:
      null,

    currentTrialNumber:
      null,

    postExperimentCompleted:
      false,

    disclosureViewed:
      false,

    studyCompleted:
      false,

    sessionCreatedAtIso:
      createdAtIso,

    sessionStartedAtIso:
      null,

    procedureAcceptedAtIso:
      null,

    postExperimentStartedAtIso:
      null,

    postExperimentCompletedAtIso:
      null,

    postExperimentCsvExportStatus:
      "not_ready",

    postExperimentCsvExportedAtIso:
      null,

    disclosureViewedAtIso:
      null,

    studyCompletedAtIso:
      null,
  };
}

function getCompletedTrialCountFromTrials(
  trials:
    StudyTrialProgress[],
): number {
  return trials.filter(
    (trial) =>
      trial.status ===
      "questionnaire_complete",
  ).length;
}

function areAllTrialsCompleteFromTrials(
  trials:
    StudyTrialProgress[],
): boolean {
  if (
    trials.length !==
    TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  return STUDY_TASKS.every(
    (task) =>
      (
        [
          1,
          2,
          3,
        ] as const
      ).every(
        (trialNumber) =>
          trials.some(
            (trial) =>
              trialMatchesIdentity(
                trial,
                {
                  taskId:
                    task.taskId,

                  trialNumber,
                },
              ) &&
              trial.status ===
                "questionnaire_complete",
          ),
      ),
  );
}

function getAssignmentForIdentity(
  assignments:
    StudyTrialAssignment[],

  identity:
    TrialIdentity,
): StudyTrialAssignment | undefined {
  const assignment =
    assignments.find(
      (item) =>
        trialMatchesIdentity(
          item,
          identity,
        ),
    );

  return assignment
    ? cloneAssignment(
        assignment,
      )
    : undefined;
}

function getTrialForIdentity(
  trials:
    StudyTrialProgress[],

  identity:
    TrialIdentity,
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) =>
      trialMatchesIdentity(
        trial,
        identity,
      ),
  );
}

function getNextPendingAssignment(
  assignments:
    StudyTrialAssignment[],

  trials:
    StudyTrialProgress[],
): StudyTrialAssignment | undefined {
  const pendingTrial =
    [...trials]
      .sort(
        (
          first,
          second,
        ) =>
          Number(
            first.trialOrder,
          ) -
          Number(
            second.trialOrder,
          ),
      )
      .find(
        (trial) =>
          trial.status ===
          "pending",
      );

  if (
    !pendingTrial
  ) {
    return undefined;
  }

  return getAssignmentForIdentity(
    assignments,
    {
      taskId:
        getTaskIdFromAssignment(
          pendingTrial,
        ),

      trialNumber:
        pendingTrial.trialNumber,
    },
  );
}

function sessionConfigurationIsValid(
  assignments:
    StudyTrialAssignment[],

  trials:
    StudyTrialProgress[],

  conditionOrder:
    ConditionOrder,
): boolean {
  if (
    assignments.length !==
      TOTAL_STUDY_TRIALS ||
    trials.length !==
      TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  const definitions =
    createAssignments(
      conditionOrder,
    );

  return definitions.every(
    (definition) => {
      const identity:
        TrialIdentity = {
          taskId:
            getTaskIdFromAssignment(
              definition,
            ),

          trialNumber:
            definition.trialNumber,
        };

      const assignment =
        assignments.find(
          (item) =>
            trialMatchesIdentity(
              item,
              identity,
            ),
        );

      const trial =
        trials.find(
          (item) =>
            trialMatchesIdentity(
              item,
              identity,
            ),
        );

      return (
        assignment?.condition ===
          definition.condition &&
        assignment?.participantLabel ===
          definition.participantLabel &&
        Number(
          assignment?.trialOrder,
        ) ===
          Number(
            definition.trialOrder,
          ) &&
        assignment?.conditionOrder ===
          definition.conditionOrder &&
        trial?.condition ===
          definition.condition &&
        trial?.participantLabel ===
          definition.participantLabel &&
        Number(
          trial?.trialOrder,
        ) ===
          Number(
            definition.trialOrder,
          ) &&
        trial?.conditionOrder ===
          definition.conditionOrder
      );
    },
  );
}

const initialState =
  createStateForParticipant(
    DEFAULT_PARTICIPANT_ID,
  );

export const useStudySessionStore =
  create<StudySessionStore>(
    (
      set,
      get,
    ) => {
      function resolveIdentity(
        trialNumber?:
          StudyTrialNumber,

        taskId?:
          StudyTaskId,
      ): TrialIdentity | null {
        const state =
          get();

        const resolvedTrialNumber =
          trialNumber ??
          state.currentTrialNumber;

        if (
          resolvedTrialNumber ===
          null
        ) {
          return null;
        }

        if (
          isSupportedStudyTaskId(
            taskId,
          )
        ) {
          return {
            taskId,
            trialNumber:
              resolvedTrialNumber,
          };
        }

        if (
          state.currentTrialNumber ===
            resolvedTrialNumber &&
          isSupportedStudyTaskId(
            state.currentTaskId,
          )
        ) {
          return {
            taskId:
              state.currentTaskId,

            trialNumber:
              resolvedTrialNumber,
          };
        }

        const openMatches =
          state.trials.filter(
            (trial) =>
              trial.trialNumber ===
                resolvedTrialNumber &&
              (
                trial.status ===
                  "active" ||
                trial.status ===
                  "submitted"
              ),
          );

        if (
          openMatches.length ===
          1
        ) {
          return {
            taskId:
              getTaskIdFromAssignment(
                openMatches[
                  0
                ],
              ),

            trialNumber:
              resolvedTrialNumber,
          };
        }

        return {
          taskId:
            "symposium",

          trialNumber:
            resolvedTrialNumber,
        };
      }

      function markTrialTimestamp(
        field:
          TrialTimestampField,

        trialNumber?:
          StudyTrialNumber,

        taskId?:
          StudyTaskId,
      ): boolean {
        const state =
          get();

        const identity =
          resolveIdentity(
            trialNumber,
            taskId,
          );

        if (
          !identity
        ) {
          return false;
        }

        const trial =
          getTrialForIdentity(
            state.trials,
            identity,
          );

        if (
          !trial ||
          trial.status ===
            "questionnaire_complete"
        ) {
          return false;
        }

        if (
          trial[
            field
          ]
        ) {
          return true;
        }

        const timestampIso =
          new Date()
            .toISOString();

        set({
          trials:
            state.trials.map(
              (item) =>
                trialMatchesIdentity(
                  item,
                  identity,
                )
                  ? {
                      ...item,

                      [field]:
                        timestampIso,
                    }
                  : item,
            ),
        });

        return true;
      }

      return {
        ...initialState,

        initializeSession: (
          participantId,
          conditionOrder =
            DEFAULT_CONDITION_ORDER,
        ) => {
          removeLegacyPersistedState();

          set(
            createStateForParticipant(
              participantId,
              conditionOrder,
            ),
          );
        },

        ensureSession: (
          participantId,
          conditionOrder =
            get().conditionOrder,
        ) => {
          const normalizedParticipantId =
            normalizeParticipantId(
              participantId,
            );

          const state =
            get();

          const sessionIsValid =
            state.participantId ===
              normalizedParticipantId &&
            state.sessionId.length >
              0 &&
            state.conditionOrder ===
              conditionOrder &&
            sessionConfigurationIsValid(
              state.assignments,
              state.trials,
              conditionOrder,
            );

          if (
            sessionIsValid
          ) {
            return;
          }

          set(
            createStateForParticipant(
              normalizedParticipantId,
              conditionOrder,
            ),
          );
        },

        setConditionOrder: (
          conditionOrder,
        ) => {
          if (
            !isConditionOrder(
              conditionOrder,
            )
          ) {
            return false;
          }

          const state =
            get();

          if (
            state.procedureAccepted ||
            state.currentTrialNumber !==
              null
          ) {
            return false;
          }

          set(
            createStateForParticipant(
              state.participantId,
              conditionOrder,
            ),
          );

          return true;
        },

        setParticipantId: (
          participantId,
        ) => {
          set({
            participantId:
              normalizeParticipantId(
                participantId,
              ),
          });
        },

        acceptProcedure:
          () => {
            const state =
              get();

            if (
              state.studyCompleted
            ) {
              return;
            }

            const acceptedAtIso =
              new Date()
                .toISOString();

            set({
              procedureAccepted:
                true,

              stage:
                "task_assignment",

              sessionStartedAtIso:
                state.sessionStartedAtIso ??
                acceptedAtIso,

              procedureAcceptedAtIso:
                state.procedureAcceptedAtIso ??
                acceptedAtIso,
            });
          },

        startNextTrial:
          () => {
            const state =
              get();

            const assignment =
              getNextPendingAssignment(
                state.assignments,
                state.trials,
              );

            if (
              !assignment
            ) {
              return undefined;
            }

            return get().startTrial(
              assignment.trialNumber,
              assignment.taskId,
            );
          },

        startTrial: (
          trialNumber,
          taskId,
        ) => {
          const state =
            get();

          if (
            !state.procedureAccepted ||
            state.studyCompleted ||
            state.postExperimentCompleted
          ) {
            return undefined;
          }

          const resolvedTaskId =
            normalizeTaskId(
              taskId,
              "symposium",
            );

          const identity:
            TrialIdentity = {
              taskId:
                resolvedTaskId,

              trialNumber,
            };

          const currentAssignment =
            getAssignmentForIdentity(
              state.assignments,
              identity,
            );

          if (
            !currentAssignment
          ) {
            return undefined;
          }

          const requestedTrial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !requestedTrial ||
            requestedTrial.status ===
              "questionnaire_complete"
          ) {
            return undefined;
          }

          const otherOpenTrial =
            state.trials.find(
              (trial) =>
                !trialMatchesIdentity(
                  trial,
                  identity,
                ) &&
                (
                  trial.status ===
                    "active" ||
                  trial.status ===
                    "submitted"
                ),
            );

          if (
            otherOpenTrial
          ) {
            return undefined;
          }

          const startedAtIso =
            requestedTrial.startedAtIso ??
            new Date()
              .toISOString();

          set({
            currentTaskId:
              currentAssignment.taskId,

            currentTrialNumber:
              trialNumber,

            stage:
              requestedTrial.status ===
                "submitted"
                ? "trial_questionnaire"
                : "task",

            trials:
              state.trials.map(
                (trial) =>
                  trialMatchesIdentity(
                    trial,
                    identity,
                  )
                    ? {
                        ...trial,

                        ...currentAssignment,

                        status:
                          trial.status ===
                          "pending"
                            ? "active"
                            : trial.status,

                        startedAtIso,
                      }
                    : trial,
              ),
          });

          return cloneAssignment(
            currentAssignment,
          );
        },

        markAssistantAnalysisRequested: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisRequestedAtIso",
            trialNumber,
            taskId,
          ),

        markAssistantAnalysisStarted: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisStartedAtIso",
            trialNumber,
            taskId,
          ),

        markAssistantAnalysisCompleted: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisCompletedAtIso",
            trialNumber,
            taskId,
          ),

        markAssistantRecommendationShown: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantRecommendationShownAtIso",
            trialNumber,
            taskId,
          ),

        markTrialTimerStarted: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "timerStartedAtIso",
            trialNumber,
            taskId,
          ),

        markProbeShown: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "probeShownAtIso",
            trialNumber,
            taskId,
          ),

        markProbeCollapsed: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "probeCollapsedAtIso",
            trialNumber,
            taskId,
          ),

        markProbeAcknowledged: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "probeAcknowledgedAtIso",
            trialNumber,
            taskId,
          ),

        markTrialSubmitted: (
          trialNumber,
          reason =
            "submitted",
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return false;
          }

          const trial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !trial ||
            (
              trial.status !==
                "active" &&
              trial.status !==
                "submitted"
            )
          ) {
            return false;
          }

          const submittedAtIso =
            trial.submittedAtIso ??
            new Date()
              .toISOString();

          const trialEndedAtIso =
            trial.trialEndedAtIso ??
            submittedAtIso;

          set({
            currentTaskId:
              toStudyTaskId(
                identity.taskId,
              ),

            currentTrialNumber:
              identity.trialNumber,

            stage:
              "trial_questionnaire",

            trials:
              state.trials.map(
                (item) =>
                  trialMatchesIdentity(
                    item,
                    identity,
                  )
                    ? {
                        ...item,

                        status:
                          "submitted",

                        submittedAtIso,

                        trialEndedAtIso,

                        trialEndReason:
                          item.trialEndReason ??
                          reason,
                      }
                    : item,
              ),
          });

          return true;
        },

        openTrialQuestionnaire: (
          trialNumber,
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return false;
          }

          const trial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !trial ||
            trial.status !==
              "submitted"
          ) {
            return false;
          }

          const questionnaireStartedAtIso =
            trial.questionnaireStartedAtIso ??
            new Date()
              .toISOString();

          set({
            currentTaskId:
              toStudyTaskId(
                identity.taskId,
              ),

            currentTrialNumber:
              identity.trialNumber,

            stage:
              "trial_questionnaire",

            trials:
              state.trials.map(
                (item) =>
                  trialMatchesIdentity(
                    item,
                    identity,
                  )
                    ? {
                        ...item,

                        questionnaireStartedAtIso,
                      }
                    : item,
              ),
          });

          return true;
        },

        completeTrialQuestionnaire: (
          trialNumber,
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return false;
          }

          const trial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !trial
          ) {
            return false;
          }

          if (
            trial.status ===
            "questionnaire_complete"
          ) {
            set({
              currentTaskId:
                null,

              currentTrialNumber:
                null,

              stage:
                "task_assignment",
            });

            return true;
          }

          if (
            trial.status !==
            "submitted"
          ) {
            return false;
          }

          const completedAtIso =
            trial.questionnaireCompletedAtIso ??
            new Date()
              .toISOString();

          set({
            trials:
              state.trials.map(
                (item) =>
                  trialMatchesIdentity(
                    item,
                    identity,
                  )
                    ? {
                        ...item,

                        status:
                          "questionnaire_complete",

                        questionnaireStartedAtIso:
                          item.questionnaireStartedAtIso ??
                          completedAtIso,

                        questionnaireCompletedAtIso:
                          completedAtIso,

                        eventsCsvExportStatus:
                          item.eventsCsvExportStatus ===
                          "exported"
                            ? "exported"
                            : "ready",

                        summaryCsvExportStatus:
                          item.summaryCsvExportStatus ===
                          "exported"
                            ? "exported"
                            : "ready",

                        exportErrorMessage:
                          undefined,
                      }
                    : item,
              ),

            currentTaskId:
              null,

            currentTrialNumber:
              null,

            stage:
              "task_assignment",
          });

          return true;
        },

        setTrialCsvExportStatus: (
          trialNumber,
          exportType,
          status,
          errorMessage,
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity ||
            !getTrialForIdentity(
              state.trials,
              identity,
            )
          ) {
            return false;
          }

          const timestampIso =
            new Date()
              .toISOString();

          set({
            trials:
              state.trials.map(
                (trial) => {
                  if (
                    !trialMatchesIdentity(
                      trial,
                      identity,
                    )
                  ) {
                    return trial;
                  }

                  if (
                    exportType ===
                    "events"
                  ) {
                    return {
                      ...trial,

                      eventsCsvExportStatus:
                        status,

                      eventsCsvExportedAtIso:
                        status ===
                          "exported"
                          ? trial.eventsCsvExportedAtIso ??
                            timestampIso
                          : trial.eventsCsvExportedAtIso,

                      exportErrorMessage:
                        status ===
                          "failed"
                          ? errorMessage ??
                            "Events CSV export failed."
                          : undefined,
                    };
                  }

                  return {
                    ...trial,

                    summaryCsvExportStatus:
                      status,

                    summaryCsvExportedAtIso:
                      status ===
                        "exported"
                        ? trial.summaryCsvExportedAtIso ??
                          timestampIso
                        : trial.summaryCsvExportedAtIso,

                    exportErrorMessage:
                      status ===
                        "failed"
                        ? errorMessage ??
                          "Summary CSV export failed."
                        : undefined,
                  };
                },
              ),
          });

          return true;
        },

        markTrialEventsCsvExported: (
          trialNumber,
          taskId,
        ) =>
          get().setTrialCsvExportStatus(
            trialNumber,
            "events",
            "exported",
            undefined,
            taskId,
          ),

        markTrialSummaryCsvExported: (
          trialNumber,
          taskId,
        ) =>
          get().setTrialCsvExportStatus(
            trialNumber,
            "summary",
            "exported",
            undefined,
            taskId,
          ),

        openPostExperiment:
          () => {
            const state =
              get();

            if (
              !areAllTrialsCompleteFromTrials(
                state.trials,
              ) ||
              state.studyCompleted ||
              state.postExperimentCompleted
            ) {
              return false;
            }

            set({
              currentTaskId:
                null,

              currentTrialNumber:
                null,

              stage:
                "post_experiment",

              postExperimentStartedAtIso:
                state.postExperimentStartedAtIso ??
                new Date()
                  .toISOString(),

              postExperimentCsvExportStatus:
                state.postExperimentCsvExportStatus ===
                  "exported"
                  ? "exported"
                  : "ready",
            });

            return true;
          },

        completePostExperiment:
          () => {
            const state =
              get();

            if (
              !areAllTrialsCompleteFromTrials(
                state.trials,
              )
            ) {
              return false;
            }

            if (
              state.postExperimentCompleted
            ) {
              set({
                stage:
                  "disclosure",
              });

              return true;
            }

            const completedAtIso =
              new Date()
                .toISOString();

            set({
              postExperimentCompleted:
                true,

              postExperimentStartedAtIso:
                state.postExperimentStartedAtIso ??
                completedAtIso,

              postExperimentCompletedAtIso:
                state.postExperimentCompletedAtIso ??
                completedAtIso,

              postExperimentCsvExportStatus:
                state.postExperimentCsvExportStatus ===
                  "exported"
                  ? "exported"
                  : state.postExperimentCsvExportStatus,

              stage:
                "disclosure",
            });

            return true;
          },

        setPostExperimentCsvExportStatus: (
          status,
        ) => {
          const state =
            get();

          const allTrialsComplete =
            areAllTrialsCompleteFromTrials(
              state.trials,
            );

          if (
            status !==
              "not_ready" &&
            !allTrialsComplete
          ) {
            return false;
          }

          const exportedAtIso =
            status ===
            "exported"
              ? state.postExperimentCsvExportedAtIso ??
                new Date()
                  .toISOString()
              : state.postExperimentCsvExportedAtIso;

          set({
            postExperimentCsvExportStatus:
              status,

            postExperimentCsvExportedAtIso:
              exportedAtIso,
          });

          return true;
        },

        markPostExperimentCsvExported:
          () =>
            get().setPostExperimentCsvExportStatus(
              "exported",
            ),

        markDisclosureViewed:
          () => {
            const state =
              get();

            if (
              !state.postExperimentCompleted
            ) {
              return false;
            }

            set({
              disclosureViewed:
                true,

              disclosureViewedAtIso:
                state.disclosureViewedAtIso ??
                new Date()
                  .toISOString(),

              stage:
                state.studyCompleted
                  ? "complete"
                  : "disclosure",
            });

            return true;
          },

        completeStudy:
          () => {
            const state =
              get();

            if (
              !state.postExperimentCompleted ||
              !state.disclosureViewed
            ) {
              return false;
            }

            set({
              studyCompleted:
                true,

              stage:
                "complete",

              studyCompletedAtIso:
                state.studyCompletedAtIso ??
                new Date()
                  .toISOString(),
            });

            return true;
          },

        getCurrentAssignment:
          () => {
            const state =
              get();

            if (
              state.currentTrialNumber ===
                null ||
              !isSupportedStudyTaskId(
                state.currentTaskId,
              )
            ) {
              return undefined;
            }

            return getAssignmentForIdentity(
              state.assignments,
              {
                taskId:
                  state.currentTaskId,

                trialNumber:
                  state.currentTrialNumber,
              },
            );
          },

        getNextAssignment:
          () => {
            const state =
              get();

            return getNextPendingAssignment(
              state.assignments,
              state.trials,
            );
          },

        getTrialProgress: (
          trialNumber,
          taskId,
        ) => {
          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return undefined;
          }

          const trial =
            getTrialForIdentity(
              get().trials,
              identity,
            );

          return trial
            ? cloneTrialProgress(
                trial,
              )
            : undefined;
        },

        getCompletedTrialCount:
          () =>
            getCompletedTrialCountFromTrials(
              get().trials,
            ),

        areAllTrialsComplete:
          () =>
            areAllTrialsCompleteFromTrials(
              get().trials,
            ),

        resetSession: (
          participantId,
          conditionOrder,
        ) => {
          removeLegacyPersistedState();

          const currentParticipantId =
            get().participantId;

          set(
            createStateForParticipant(
              participantId ??
                currentParticipantId,
              conditionOrder ??
                get().conditionOrder,
            ),
          );
        },

        resetForNewParticipant: (
          participantId,
          conditionOrder =
            DEFAULT_CONDITION_ORDER,
        ) => {
          removeLegacyPersistedState();

          set(
            createStateForParticipant(
              participantId ??
                DEFAULT_PARTICIPANT_ID,
              conditionOrder,
            ),
          );
        },
      };
    },
  );

export function isSymposiumTaskId(
  taskId:
    StudyTaskId,
): boolean {
  return taskId ===
    "symposium";
}
