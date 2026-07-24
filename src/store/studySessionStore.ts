import {
  create,
} from "zustand";

import {
  SYMPOSIUM_TRIALS,
} from "../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

import type {
  StudySessionStage,
  StudyTrialAssignment,
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

export const TOTAL_STUDY_TRIALS =
  3;

interface StudySessionState {
  participantId:
    string;

  sessionId:
    string;

  assignments:
    StudyTrialAssignment[];

  trials:
    StudyTrialProgress[];

  stage:
    StudySessionStage;

  procedureAccepted:
    boolean;

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
  ) => void;

  ensureSession: (
    participantId:
      string,
  ) => void;

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
  ) =>
    | StudyTrialAssignment
    | undefined;

  markAssistantAnalysisRequested: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  markAssistantAnalysisStarted: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  markAssistantRecommendationShown: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  markTrialTimerStarted: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  markProbeShown: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  markProbeAcknowledged: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  markTrialSubmitted: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  openTrialQuestionnaire: (
    trialNumber?:
      StudyTrialNumber,
  ) => boolean;

  completeTrialQuestionnaire: (
    trialNumber?:
      StudyTrialNumber,
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
  ) => boolean;

  markTrialEventsCsvExported: (
    trialNumber:
      StudyTrialNumber,
  ) => boolean;

  markTrialSummaryCsvExported: (
    trialNumber:
      StudyTrialNumber,
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
  ) => void;

  resetForNewParticipant: (
    participantId?:
      string,
  ) => void;
}

type TrialTimestampField =
  | "assistantAnalysisRequestedAtIso"
  | "assistantAnalysisStartedAtIso"
  | "assistantRecommendationShownAtIso"
  | "timerStartedAtIso"
  | "probeShownAtIso"
  | "probeAcknowledgedAtIso";

const LEGACY_STORAGE_KEYS = [
  "attentionTunnelingStudySession",
  "attention-tunneling-study-session",
];

const DEFAULT_PARTICIPANT_ID =
  "P001";

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

function createAssignments():
  StudyTrialAssignment[] {
  return SYMPOSIUM_TRIALS.map(
    (trial) => ({
      trialNumber:
        trial.trialNumber,

      trialOrder:
        0,

      taskId:
        trial.taskId,

      condition:
        trial.condition,

      conditionOrder:
        0,

      participantLabel:
        trial.participantLabel,

      isFirstTrial:
        false,

      probeExposureNumber:
        0,

      probeNaive:
        false,
    }),
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

    assistantRecommendationShownAtIso:
      null,

    timerStartedAtIso:
      null,

    probeShownAtIso:
      null,

    probeAcknowledgedAtIso:
      null,

    submittedAtIso:
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
): StudySessionState {
  const createdAtIso =
    new Date()
      .toISOString();

  const assignments =
    createAssignments();

  return {
    participantId:
      normalizeParticipantId(
        participantId,
      ),

    sessionId:
      createSessionId(),

    assignments,

    trials:
      assignments.map(
        createTrialProgress,
      ),

    stage:
      "procedure",

    procedureAccepted:
      false,

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
  return (
    trials.length ===
      TOTAL_STUDY_TRIALS &&
    trials.every(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    )
  );
}

function getAssignmentForTrial(
  assignments:
    StudyTrialAssignment[],

  trialNumber:
    StudyTrialNumber,
): StudyTrialAssignment | undefined {
  const assignment =
    assignments.find(
      (item) =>
        item.trialNumber ===
        trialNumber,
    );

  return assignment
    ? cloneAssignment(
        assignment,
      )
    : undefined;
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
          first.trialNumber -
          second.trialNumber,
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

  return getAssignmentForTrial(
    assignments,
    pendingTrial.trialNumber,
  );
}

function getNextActualTrialOrder(
  trials:
    StudyTrialProgress[],
): number {
  const maximumOrder =
    trials.reduce(
      (
        currentMaximum,
        trial,
      ) =>
        Math.max(
          currentMaximum,
          trial.trialOrder,
        ),
      0,
    );

  return maximumOrder + 1;
}

function sessionConfigurationIsValid(
  assignments:
    StudyTrialAssignment[],

  trials:
    StudyTrialProgress[],
): boolean {
  if (
    assignments.length !==
      TOTAL_STUDY_TRIALS ||
    trials.length !==
      TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  return SYMPOSIUM_TRIALS.every(
    (definition) => {
      const assignment =
        assignments.find(
          (item) =>
            item.trialNumber ===
            definition.trialNumber,
        );

      const trial =
        trials.find(
          (item) =>
            item.trialNumber ===
            definition.trialNumber,
        );

      return (
        assignment?.taskId ===
          "symposium" &&
        assignment.condition ===
          definition.condition &&
        assignment.participantLabel ===
          definition.participantLabel &&
        trial?.taskId ===
          "symposium" &&
        trial.condition ===
          definition.condition &&
        trial.participantLabel ===
          definition.participantLabel
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
      function resolveTrialNumber(
        trialNumber?:
          StudyTrialNumber,
      ): StudyTrialNumber | null {
        return (
          trialNumber ??
          get().currentTrialNumber
        );
      }

      function markTrialTimestamp(
        field:
          TrialTimestampField,

        trialNumber?:
          StudyTrialNumber,
      ): boolean {
        const state =
          get();

        const resolvedTrialNumber =
          resolveTrialNumber(
            trialNumber,
          );

        if (
          resolvedTrialNumber ===
          null
        ) {
          return false;
        }

        const trial =
          state.trials.find(
            (item) =>
              item.trialNumber ===
              resolvedTrialNumber,
          );

        if (
          !trial
        ) {
          return false;
        }

        if (
          trial[field]
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
                item.trialNumber ===
                resolvedTrialNumber
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
        ) => {
          removeLegacyPersistedState();

          set(
            createStateForParticipant(
              participantId,
            ),
          );
        },

        ensureSession: (
          participantId,
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
            sessionConfigurationIsValid(
              state.assignments,
              state.trials,
            );

          if (
            sessionIsValid
          ) {
            return;
          }

          set(
            createStateForParticipant(
              normalizedParticipantId,
            ),
          );
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
            );
          },

        startTrial: (
          trialNumber,
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

          const currentAssignment =
            getAssignmentForTrial(
              state.assignments,
              trialNumber,
            );

          if (
            !currentAssignment
          ) {
            return undefined;
          }

          const requestedTrial =
            state.trials.find(
              (trial) =>
                trial.trialNumber ===
                trialNumber,
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
                trial.trialNumber !==
                  trialNumber &&
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

          const previouslyStarted =
            requestedTrial.trialOrder >
            0;

          const trialOrder =
            previouslyStarted
              ? requestedTrial.trialOrder
              : getNextActualTrialOrder(
                  state.trials,
                );

          const conditionOrder =
            previouslyStarted
              ? requestedTrial.conditionOrder
              : trialOrder;

          const isFirstTrial =
            previouslyStarted
              ? requestedTrial.isFirstTrial
              : trialOrder ===
                1;

          const probeExposureNumber =
            previouslyStarted
              ? requestedTrial.probeExposureNumber
              : trialOrder;

          const probeNaive =
            previouslyStarted
              ? requestedTrial.probeNaive
              : trialOrder ===
                1;

          const updatedAssignment:
            StudyTrialAssignment = {
              ...currentAssignment,

              trialOrder,

              conditionOrder,

              isFirstTrial,

              probeExposureNumber,

              probeNaive,
            };

          set({
            currentTrialNumber:
              trialNumber,

            stage:
              requestedTrial.status ===
                "submitted"
                ? "trial_questionnaire"
                : "task",

            assignments:
              state.assignments.map(
                (assignment) =>
                  assignment.trialNumber ===
                  trialNumber
                    ? updatedAssignment
                    : assignment,
              ),

            trials:
              state.trials.map(
                (trial) =>
                  trial.trialNumber ===
                  trialNumber
                    ? {
                        ...trial,

                        ...updatedAssignment,

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
            updatedAssignment,
          );
        },

        markAssistantAnalysisRequested: (
          trialNumber,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisRequestedAtIso",
            trialNumber,
          ),

        markAssistantAnalysisStarted: (
          trialNumber,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisStartedAtIso",
            trialNumber,
          ),

        markAssistantRecommendationShown: (
          trialNumber,
        ) =>
          markTrialTimestamp(
            "assistantRecommendationShownAtIso",
            trialNumber,
          ),

        markTrialTimerStarted: (
          trialNumber,
        ) =>
          markTrialTimestamp(
            "timerStartedAtIso",
            trialNumber,
          ),

        markProbeShown: (
          trialNumber,
        ) =>
          markTrialTimestamp(
            "probeShownAtIso",
            trialNumber,
          ),

        markProbeAcknowledged: (
          trialNumber,
        ) =>
          markTrialTimestamp(
            "probeAcknowledgedAtIso",
            trialNumber,
          ),

        markTrialSubmitted: (
          trialNumber,
        ) => {
          const state =
            get();

          const resolvedTrialNumber =
            resolveTrialNumber(
              trialNumber,
            );

          if (
            resolvedTrialNumber ===
            null
          ) {
            return false;
          }

          const trial =
            state.trials.find(
              (item) =>
                item.trialNumber ===
                resolvedTrialNumber,
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

          set({
            currentTrialNumber:
              resolvedTrialNumber,

            stage:
              "trial_questionnaire",

            trials:
              state.trials.map(
                (item) =>
                  item.trialNumber ===
                  resolvedTrialNumber
                    ? {
                        ...item,

                        status:
                          "submitted",

                        submittedAtIso,
                      }
                    : item,
              ),
          });

          return true;
        },

        openTrialQuestionnaire: (
          trialNumber,
        ) => {
          const state =
            get();

          const resolvedTrialNumber =
            resolveTrialNumber(
              trialNumber,
            );

          if (
            resolvedTrialNumber ===
            null
          ) {
            return false;
          }

          const trial =
            state.trials.find(
              (item) =>
                item.trialNumber ===
                resolvedTrialNumber,
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
            currentTrialNumber:
              resolvedTrialNumber,

            stage:
              "trial_questionnaire",

            trials:
              state.trials.map(
                (item) =>
                  item.trialNumber ===
                  resolvedTrialNumber
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
        ) => {
          const state =
            get();

          const resolvedTrialNumber =
            resolveTrialNumber(
              trialNumber,
            );

          if (
            resolvedTrialNumber ===
            null
          ) {
            return false;
          }

          const trial =
            state.trials.find(
              (item) =>
                item.trialNumber ===
                resolvedTrialNumber,
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
                  item.trialNumber ===
                  resolvedTrialNumber
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
        ) => {
          const state =
            get();

          const trialExists =
            state.trials.some(
              (trial) =>
                trial.trialNumber ===
                trialNumber,
            );

          if (
            !trialExists
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
                    trial.trialNumber !==
                    trialNumber
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
        ) =>
          get().setTrialCsvExportStatus(
            trialNumber,
            "events",
            "exported",
          ),

        markTrialSummaryCsvExported: (
          trialNumber,
        ) =>
          get().setTrialCsvExportStatus(
            trialNumber,
            "summary",
            "exported",
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
              null
            ) {
              return undefined;
            }

            return getAssignmentForTrial(
              state.assignments,
              state.currentTrialNumber,
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
        ) => {
          const trial =
            get().trials.find(
              (item) =>
                item.trialNumber ===
                trialNumber,
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
        ) => {
          removeLegacyPersistedState();

          const currentParticipantId =
            get().participantId;

          set(
            createStateForParticipant(
              participantId ??
                currentParticipantId,
            ),
          );
        },

        resetForNewParticipant: (
          participantId,
        ) => {
          removeLegacyPersistedState();

          set(
            createStateForParticipant(
              participantId ??
                DEFAULT_PARTICIPANT_ID,
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