import {
  create,
} from "zustand";

import {
  createDefaultFinalQuestionnaireResponse,
  createDefaultTrialQuestionnaireResponse,
  getFinalQuestionnaireValidationMessage as validateFinalQuestionnaire,
  isFinalQuestionnaireComplete as finalQuestionnaireIsComplete,
  isLikertRating,
  isNasaTlxValue,
  isProbeRecognitionChoice,
  isTrialQuestionnaireComplete as trialQuestionnaireIsComplete,
} from "../types/questionnaire";

import type {
  AttributionCheckResponses,
  FinalQuestionnaireResponse,
  FunneledDebriefResponses,
  LikertRating,
  ManipulationCheckDimension,
  ManipulationCheckRatings,
  NasaTlxDimension,
  NasaTlxRating,
  NasaTlxRatings,
  ProbeRecallResponses,
  TrialExperienceDimension,
  TrialExperienceRatings,
  TrialQuestionnaireResponse,
} from "../types/questionnaire";

import {
  getConditionForTrial,
} from "../types/scheduler";

import type {
  ConcretizationLevel,
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

export type {
  AttributionCheckResponses,
  FinalQuestionnaireResponse,
  FunneledDebriefResponses,
  ManipulationCheckRatings,
  NasaTlxRatings,
  ProbeRecallResponses,
  TrialExperienceRatings,
  TrialQuestionnaireResponse,
} from "../types/questionnaire";

interface QuestionnaireState {
  trialResponses:
    TrialQuestionnaireResponse[];

  finalQuestionnaire:
    FinalQuestionnaireResponse;
}

interface QuestionnaireStore
  extends QuestionnaireState {
  initializeTrialResponse: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,

    condition?:
      ConcretizationLevel,
  ) => TrialQuestionnaireResponse;

  getTrialResponse: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | TrialQuestionnaireResponse
    | undefined;

  setNasaTlxValue: (
    trialNumber:
      StudyTrialNumber,

    dimension:
      NasaTlxDimension,

    value:
      Exclude<
        NasaTlxRating,
        null
      >,

    taskId?:
      StudyTaskId,
  ) => void;

  setExperienceRating: (
    trialNumber:
      StudyTrialNumber,

    dimension:
      TrialExperienceDimension,

    value:
      LikertRating,

    taskId?:
      StudyTaskId,
  ) => void;

  setManipulationCheckValue: (
    trialNumber:
      StudyTrialNumber,

    dimension:
      ManipulationCheckDimension,

    value:
      LikertRating,

    taskId?:
      StudyTaskId,
  ) => void;

  setProbeRecallValue: <
    Key extends keyof ProbeRecallResponses,
  >(
    trialNumber:
      StudyTrialNumber,

    dimension:
      Key,

    value:
      ProbeRecallResponses[Key],

    taskId?:
      StudyTaskId,
  ) => void;

  submitTrialQuestionnaire: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | TrialQuestionnaireResponse
    | undefined;

  markTrialQuestionnaireExported: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | TrialQuestionnaireResponse
    | undefined;

  isTrialQuestionnaireComplete: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  areAllTrialQuestionnairesSubmitted:
    () => boolean;

  initializeFinalQuestionnaire:
    () => FinalQuestionnaireResponse;

  getFinalQuestionnaire:
    () => FinalQuestionnaireResponse;

  setAttributionCheckValue: <
    Key extends keyof AttributionCheckResponses,
  >(
    dimension:
      Key,

    value:
      AttributionCheckResponses[Key],
  ) => void;

  setFunneledDebriefValue: <
    Key extends keyof FunneledDebriefResponses,
  >(
    dimension:
      Key,

    value:
      FunneledDebriefResponses[Key],
  ) => void;

  getFinalQuestionnaireValidationMessage:
    () => string;

  submitFinalQuestionnaire:
    () =>
      | FinalQuestionnaireResponse
      | undefined;

  markFinalQuestionnaireExported:
    () =>
      | FinalQuestionnaireResponse
      | undefined;

  isFinalQuestionnaireComplete:
    () => boolean;

  resetTrialResponse: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => void;

  resetQuestionnaires:
    () => void;

  resetForNewParticipant:
    () => void;
}

/*
 * Each participant submits exactly three trial questionnaires:
 * one for Symposium, one for Delivery, and one for Clinic.
 * The other six task-condition options are selectable alternatives,
 * not additional required questionnaire responses.
 */
const TOTAL_REQUIRED_TRIAL_QUESTIONNAIRES =
  3;

const STUDY_TASK_IDS = [
  "symposium",
  "delivery",
  "clinic",
] as const;

const LEGACY_STORAGE_KEYS = [
  "attentionTunnelingQuestionnaires",
  "attention-tunneling-questionnaires",
];

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
    try {
      window.localStorage.removeItem(
        key,
      );

      window.sessionStorage.removeItem(
        key,
      );
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }
}

removeLegacyPersistedState();

function normalizeTaskId(
  value:
    unknown,

  fallback:
    StudyTaskId =
      "symposium",
): StudyTaskId {
  if (
    value ===
      "symposium" ||
    value ===
      "delivery" ||
    value ===
      "clinic"
  ) {
    return value as
      StudyTaskId;
  }

  return fallback;
}

function getTaskOrder(
  taskId:
    StudyTaskId,
): number {
  switch (
    taskId as string
  ) {
    case "delivery":
      return 2;

    case "clinic":
      return 3;

    case "symposium":
    default:
      return 1;
  }
}

function responseMatchesTrial(
  response:
    TrialQuestionnaireResponse,

  trialNumber:
    StudyTrialNumber,

  taskId:
    StudyTaskId,
): boolean {
  return (
    response.trialNumber ===
      trialNumber &&
    normalizeTaskId(
      response.taskId,
    ) ===
      taskId
  );
}

function sortTrialResponses(
  responses:
    TrialQuestionnaireResponse[],
): TrialQuestionnaireResponse[] {
  return [
    ...responses,
  ].sort(
    (
      first,
      second,
    ) => {
      const taskDifference =
        getTaskOrder(
          normalizeTaskId(
            first.taskId,
          ),
        ) -
        getTaskOrder(
          normalizeTaskId(
            second.taskId,
          ),
        );

      if (
        taskDifference !==
        0
      ) {
        return taskDifference;
      }

      return (
        first.trialNumber -
        second.trialNumber
      );
    },
  );
}

function normalizeNasaTlxRating(
  value:
    NasaTlxRating,
): NasaTlxRating {
  return isNasaTlxValue(
    value,
  )
    ? value
    : null;
}

function normalizeLikertRating(
  value:
    LikertRating | null,
): LikertRating | null {
  return isLikertRating(
    value,
  )
    ? value
    : null;
}

function cloneNasaTlxRatings(
  values:
    NasaTlxRatings,
): NasaTlxRatings {
  return {
    mentalDemand:
      normalizeNasaTlxRating(
        values.mentalDemand,
      ),

    physicalDemand:
      normalizeNasaTlxRating(
        values.physicalDemand,
      ),

    temporalDemand:
      normalizeNasaTlxRating(
        values.temporalDemand,
      ),

    performance:
      normalizeNasaTlxRating(
        values.performance,
      ),

    effort:
      normalizeNasaTlxRating(
        values.effort,
      ),

    frustration:
      normalizeNasaTlxRating(
        values.frustration,
      ),
  };
}

function cloneExperienceRatings(
  values:
    TrialExperienceRatings,
): TrialExperienceRatings {
  return {
    scheduleCompleteness:
      normalizeLikertRating(
        values.scheduleCompleteness,
      ),

    aiHelpfulness:
      normalizeLikertRating(
        values.aiHelpfulness,
      ),

    aiCompetence:
      normalizeLikertRating(
        values.aiCompetence,
      ),
  };
}

function cloneManipulationCheckRatings(
  values:
    ManipulationCheckRatings,
): ManipulationCheckRatings {
  return {
    recommendationSpecificity:
      normalizeLikertRating(
        values.recommendationSpecificity,
      ),

    recommendationDetail:
      normalizeLikertRating(
        values.recommendationDetail,
      ),

    solutionConcreteness:
      normalizeLikertRating(
        values.solutionConcreteness,
      ),

    solutionCompleteness:
      normalizeLikertRating(
        values.solutionCompleteness,
      ),

    directUsability:
      normalizeLikertRating(
        values.directUsability,
      ),

    solutionActionability:
      normalizeLikertRating(
        values.solutionActionability,
      ),
  };
}

function cloneProbeRecallResponses(
  values:
    ProbeRecallResponses,
): ProbeRecallResponses {
  return {
    noticedUpdate:
      values.noticedUpdate ??
      "",

    updateDescription:
      values.updateDescription ??
      "",

    affectedRoom:
      values.affectedRoom ??
      "",

    recallConfidence:
      normalizeLikertRating(
        values.recallConfidence,
      ),

    recognitionChoice:
      values.recognitionChoice ??
      "",
  };
}

function cloneTrialResponse(
  response:
    TrialQuestionnaireResponse,
): TrialQuestionnaireResponse {
  const expectedCondition =
    getConditionForTrial(
      response.trialNumber,
    );

  return {
    ...response,

    taskId:
      normalizeTaskId(
        response.taskId,
      ),

    condition:
      response.condition ===
        expectedCondition
        ? response.condition
        : expectedCondition,

    nasaTlx:
      cloneNasaTlxRatings(
        response.nasaTlx,
      ),

    experienceRatings:
      cloneExperienceRatings(
        response.experienceRatings,
      ),

    manipulationCheck:
      cloneManipulationCheckRatings(
        response.manipulationCheck,
      ),

    probeRecall:
      cloneProbeRecallResponses(
        response.probeRecall,
      ),
  };
}

function cloneFinalQuestionnaire(
  response:
    FinalQuestionnaireResponse,
): FinalQuestionnaireResponse {
  return {
    ...response,

    attributionCheck: {
      ...response.attributionCheck,

      aiInfluence:
        normalizeLikertRating(
          response.attributionCheck
            .aiInfluence,
        ),

      aiReliance:
        normalizeLikertRating(
          response.attributionCheck
            .aiReliance,
        ),

      decisionConfidence:
        normalizeLikertRating(
          response.attributionCheck
            .decisionConfidence,
        ),

      perceivedAiCompetence:
        normalizeLikertRating(
          response.attributionCheck
            .perceivedAiCompetence,
        ),
    },

    funneledDebrief: {
      ...response.funneledDebrief,
    },
  };
}

function createInitialState():
  QuestionnaireState {
  return {
    trialResponses:
      [],

    finalQuestionnaire:
      createDefaultFinalQuestionnaireResponse(),
  };
}

function responseIsSubmitted(
  response:
    TrialQuestionnaireResponse,
): boolean {
  return (
    response.submittedAtIso !==
      null &&
    trialQuestionnaireIsComplete(
      response,
    )
  );
}

function finalResponseIsSubmitted(
  response:
    FinalQuestionnaireResponse,
): boolean {
  return (
    response.submittedAtIso !==
      null &&
    finalQuestionnaireIsComplete(
      response,
    )
  );
}

function findTrialResponse(
  responses:
    TrialQuestionnaireResponse[],

  trialNumber:
    StudyTrialNumber,

  taskId:
    StudyTaskId,
): TrialQuestionnaireResponse | undefined {
  return responses.find(
    (response) =>
      responseMatchesTrial(
        response,
        trialNumber,
        taskId,
      ),
  );
}

function replaceTrialResponse(
  responses:
    TrialQuestionnaireResponse[],

  replacement:
    TrialQuestionnaireResponse,
): TrialQuestionnaireResponse[] {
  return sortTrialResponses(
    responses.map(
      (response) =>
        responseMatchesTrial(
          response,
          replacement.trialNumber,
          normalizeTaskId(
            replacement.taskId,
          ),
        )
          ? replacement
          : response,
    ),
  );
}

function hasEveryExpectedSubmittedResponse(
  responses:
    TrialQuestionnaireResponse[],
): boolean {
  const submittedResponses =
    responses.filter(
      responseIsSubmitted,
    );

  if (
    submittedResponses.length !==
    TOTAL_REQUIRED_TRIAL_QUESTIONNAIRES
  ) {
    return false;
  }

  return STUDY_TASK_IDS.every(
    (taskId) =>
      submittedResponses.filter(
        (response) =>
          normalizeTaskId(
            response.taskId,
          ) === taskId,
      ).length === 1,
  );
}

export const useQuestionnaireStore =
  create<QuestionnaireStore>(
    (
      set,
      get,
    ) => ({
      ...createInitialState(),

      initializeTrialResponse: (
        trialNumber,
        taskId =
          "symposium",
        condition =
          getConditionForTrial(
            trialNumber,
          ),
      ) => {
        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        const expectedCondition =
          getConditionForTrial(
            trialNumber,
          );

        const resolvedCondition =
          condition ===
            expectedCondition
            ? condition
            : expectedCondition;

        const existingResponse =
          findTrialResponse(
            get().trialResponses,
            trialNumber,
            resolvedTaskId,
          );

        if (
          existingResponse
        ) {
          const normalizedResponse =
            cloneTrialResponse(
              existingResponse,
            );

          set(
            (state) => ({
              trialResponses:
                replaceTrialResponse(
                  state.trialResponses,
                  normalizedResponse,
                ),
            }),
          );

          return cloneTrialResponse(
            normalizedResponse,
          );
        }

        const createdResponse =
          createDefaultTrialQuestionnaireResponse(
            trialNumber,
            resolvedTaskId,
            resolvedCondition,
          );

        const initializedResponse:
          TrialQuestionnaireResponse = {
            ...createdResponse,

            taskId:
              resolvedTaskId,

            condition:
              resolvedCondition,

            startedAtIso:
              createdResponse.startedAtIso ??
              new Date()
                .toISOString(),
          };

        set(
          (state) => ({
            trialResponses:
              sortTrialResponses([
                ...state.trialResponses.filter(
                  (response) =>
                    !responseMatchesTrial(
                      response,
                      trialNumber,
                      resolvedTaskId,
                    ),
                ),

                initializedResponse,
              ]),
          }),
        );

        return cloneTrialResponse(
          initializedResponse,
        );
      },

      getTrialResponse: (
        trialNumber,
        taskId =
          "symposium",
      ) => {
        const response =
          findTrialResponse(
            get().trialResponses,
            trialNumber,
            normalizeTaskId(
              taskId,
            ),
          );

        return response
          ? cloneTrialResponse(
              response,
            )
          : undefined;
      },

      setNasaTlxValue: (
        trialNumber,
        dimension,
        value,
        taskId =
          "symposium",
      ) => {
        if (
          !isNasaTlxValue(
            value,
          )
        ) {
          return;
        }

        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    !responseMatchesTrial(
                      response,
                      trialNumber,
                      resolvedTaskId,
                    ) ||
                    response.submittedAtIso !==
                      null
                  ) {
                    return response;
                  }

                  return {
                    ...response,

                    nasaTlx: {
                      ...response.nasaTlx,

                      [dimension]:
                        value,
                    },
                  };
                },
              ),
          }),
        );
      },

      setExperienceRating: (
        trialNumber,
        dimension,
        value,
        taskId =
          "symposium",
      ) => {
        if (
          !isLikertRating(
            value,
          )
        ) {
          return;
        }

        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    !responseMatchesTrial(
                      response,
                      trialNumber,
                      resolvedTaskId,
                    ) ||
                    response.submittedAtIso !==
                      null
                  ) {
                    return response;
                  }

                  return {
                    ...response,

                    experienceRatings: {
                      ...response.experienceRatings,

                      [dimension]:
                        value,
                    },
                  };
                },
              ),
          }),
        );
      },

      setManipulationCheckValue: (
        trialNumber,
        dimension,
        value,
        taskId =
          "symposium",
      ) => {
        if (
          !isLikertRating(
            value,
          )
        ) {
          return;
        }

        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    !responseMatchesTrial(
                      response,
                      trialNumber,
                      resolvedTaskId,
                    ) ||
                    response.submittedAtIso !==
                      null
                  ) {
                    return response;
                  }

                  return {
                    ...response,

                    manipulationCheck: {
                      ...response.manipulationCheck,

                      [dimension]:
                        value,
                    },
                  };
                },
              ),
          }),
        );
      },

      setProbeRecallValue: (
        trialNumber,
        dimension,
        value,
        taskId =
          "symposium",
      ) => {
        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    !responseMatchesTrial(
                      response,
                      trialNumber,
                      resolvedTaskId,
                    ) ||
                    response.submittedAtIso !==
                      null
                  ) {
                    return response;
                  }

                  if (
                    dimension ===
                      "recallConfidence" &&
                    !isLikertRating(
                      value,
                    )
                  ) {
                    return response;
                  }

                  if (
                    dimension ===
                      "recognitionChoice" &&
                    !isProbeRecognitionChoice(
                      value,
                    )
                  ) {
                    return response;
                  }

                  return {
                    ...response,

                    probeRecall: {
                      ...response.probeRecall,

                      [dimension]:
                        value,
                    },
                  };
                },
              ),
          }),
        );
      },

      submitTrialQuestionnaire: (
        trialNumber,
        taskId =
          "symposium",
      ) => {
        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        const response =
          findTrialResponse(
            get().trialResponses,
            trialNumber,
            resolvedTaskId,
          );

        if (
          !response
        ) {
          return undefined;
        }

        if (
          responseIsSubmitted(
            response,
          )
        ) {
          return cloneTrialResponse(
            response,
          );
        }

        if (
          !trialQuestionnaireIsComplete(
            response,
          )
        ) {
          return undefined;
        }

        const submittedAtIso =
          new Date()
            .toISOString();

        const submittedResponse:
          TrialQuestionnaireResponse = {
            ...response,

            startedAtIso:
              response.startedAtIso ??
              submittedAtIso,

            submittedAtIso,
          };

        set(
          (state) => ({
            trialResponses:
              replaceTrialResponse(
                state.trialResponses,
                submittedResponse,
              ),
          }),
        );

        return cloneTrialResponse(
          submittedResponse,
        );
      },

      markTrialQuestionnaireExported: (
        trialNumber,
        taskId =
          "symposium",
      ) => {
        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        const response =
          findTrialResponse(
            get().trialResponses,
            trialNumber,
            resolvedTaskId,
          );

        if (
          !response ||
          !responseIsSubmitted(
            response,
          )
        ) {
          return undefined;
        }

        if (
          response.exportedAtIso
        ) {
          return cloneTrialResponse(
            response,
          );
        }

        const exportedResponse:
          TrialQuestionnaireResponse = {
            ...response,

            exportedAtIso:
              new Date()
                .toISOString(),
          };

        set(
          (state) => ({
            trialResponses:
              replaceTrialResponse(
                state.trialResponses,
                exportedResponse,
              ),
          }),
        );

        return cloneTrialResponse(
          exportedResponse,
        );
      },

      isTrialQuestionnaireComplete: (
        trialNumber,
        taskId =
          "symposium",
      ) => {
        const response =
          findTrialResponse(
            get().trialResponses,
            trialNumber,
            normalizeTaskId(
              taskId,
            ),
          );

        return response
          ? responseIsSubmitted(
              response,
            )
          : false;
      },

      areAllTrialQuestionnairesSubmitted:
        () =>
          hasEveryExpectedSubmittedResponse(
            get().trialResponses,
          ),

      initializeFinalQuestionnaire:
        () => {
          const currentResponse =
            get().finalQuestionnaire;

          if (
            currentResponse.startedAtIso !==
            null
          ) {
            return cloneFinalQuestionnaire(
              currentResponse,
            );
          }

          const initializedResponse:
            FinalQuestionnaireResponse = {
              ...currentResponse,

              startedAtIso:
                new Date()
                  .toISOString(),
            };

          set({
            finalQuestionnaire:
              initializedResponse,
          });

          return cloneFinalQuestionnaire(
            initializedResponse,
          );
        },

      getFinalQuestionnaire:
        () =>
          cloneFinalQuestionnaire(
            get().finalQuestionnaire,
          ),

      setAttributionCheckValue: (
        dimension,
        value,
      ) => {
        set(
          (state) => {
            if (
              state.finalQuestionnaire
                .submittedAtIso !==
              null
            ) {
              return {};
            }

            if (
              dimension !==
                "primaryInfluence" &&
              !isLikertRating(
                value,
              )
            ) {
              return {};
            }

            return {
              finalQuestionnaire: {
                ...state.finalQuestionnaire,

                startedAtIso:
                  state.finalQuestionnaire
                    .startedAtIso ??
                  new Date()
                    .toISOString(),

                attributionCheck: {
                  ...state.finalQuestionnaire
                    .attributionCheck,

                  [dimension]:
                    value,
                },
              },
            };
          },
        );
      },

      setFunneledDebriefValue: (
        dimension,
        value,
      ) => {
        set(
          (state) => {
            if (
              state.finalQuestionnaire
                .submittedAtIso !==
              null
            ) {
              return {};
            }

            return {
              finalQuestionnaire: {
                ...state.finalQuestionnaire,

                startedAtIso:
                  state.finalQuestionnaire
                    .startedAtIso ??
                  new Date()
                    .toISOString(),

                funneledDebrief: {
                  ...state.finalQuestionnaire
                    .funneledDebrief,

                  [dimension]:
                    value,
                },
              },
            };
          },
        );
      },

      getFinalQuestionnaireValidationMessage:
        () =>
          validateFinalQuestionnaire(
            get().finalQuestionnaire,
          ),

      submitFinalQuestionnaire:
        () => {
          const state =
            get();

          if (
            !hasEveryExpectedSubmittedResponse(
              state.trialResponses,
            )
          ) {
            return undefined;
          }

          const response =
            state.finalQuestionnaire;

          if (
            finalResponseIsSubmitted(
              response,
            )
          ) {
            return cloneFinalQuestionnaire(
              response,
            );
          }

          if (
            !finalQuestionnaireIsComplete(
              response,
            )
          ) {
            return undefined;
          }

          const submittedAtIso =
            new Date()
              .toISOString();

          const submittedResponse:
            FinalQuestionnaireResponse = {
              ...response,

              startedAtIso:
                response.startedAtIso ??
                submittedAtIso,

              submittedAtIso,
            };

          set({
            finalQuestionnaire:
              submittedResponse,
          });

          return cloneFinalQuestionnaire(
            submittedResponse,
          );
        },

      markFinalQuestionnaireExported:
        () => {
          const response =
            get().finalQuestionnaire;

          if (
            !finalResponseIsSubmitted(
              response,
            )
          ) {
            return undefined;
          }

          if (
            response.exportedAtIso
          ) {
            return cloneFinalQuestionnaire(
              response,
            );
          }

          const exportedResponse:
            FinalQuestionnaireResponse = {
              ...response,

              exportedAtIso:
                new Date()
                  .toISOString(),
            };

          set({
            finalQuestionnaire:
              exportedResponse,
          });

          return cloneFinalQuestionnaire(
            exportedResponse,
          );
        },

      isFinalQuestionnaireComplete:
        () =>
          finalResponseIsSubmitted(
            get().finalQuestionnaire,
          ),

      resetTrialResponse: (
        trialNumber,
        taskId =
          "symposium",
      ) => {
        const resolvedTaskId =
          normalizeTaskId(
            taskId,
          );

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.filter(
                (response) =>
                  !responseMatchesTrial(
                    response,
                    trialNumber,
                    resolvedTaskId,
                  ),
              ),
          }),
        );
      },

      resetQuestionnaires:
        () => {
          removeLegacyPersistedState();

          set(
            createInitialState(),
          );
        },

      resetForNewParticipant:
        () => {
          removeLegacyPersistedState();

          set(
            createInitialState(),
          );
        },
    }),
  );
