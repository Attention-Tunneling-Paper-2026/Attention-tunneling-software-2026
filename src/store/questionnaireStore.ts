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
  ) => void;

  setExperienceRating: (
    trialNumber:
      StudyTrialNumber,

    dimension:
      TrialExperienceDimension,

    value:
      LikertRating,
  ) => void;

  setManipulationCheckValue: (
    trialNumber:
      StudyTrialNumber,

    dimension:
      ManipulationCheckDimension,

    value:
      LikertRating,
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
  ) => void;

  submitTrialQuestionnaire: (
    trialNumber:
      StudyTrialNumber,
  ) =>
    | TrialQuestionnaireResponse
    | undefined;

  markTrialQuestionnaireExported: (
    trialNumber:
      StudyTrialNumber,
  ) =>
    | TrialQuestionnaireResponse
    | undefined;

  isTrialQuestionnaireComplete: (
    trialNumber:
      StudyTrialNumber,
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
  ) => void;

  resetQuestionnaires:
    () => void;

  resetForNewParticipant:
    () => void;
}

const TOTAL_TRIALS =
  3;

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
    window.localStorage.removeItem(
      key,
    );

    window.sessionStorage.removeItem(
      key,
    );
  }
}

removeLegacyPersistedState();

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
  return {
    ...response,

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
        const expectedCondition =
          getConditionForTrial(
            trialNumber,
          );

        const existingResponse =
          get().trialResponses.find(
            (response) =>
              response.trialNumber ===
              trialNumber,
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
                state.trialResponses.map(
                  (response) =>
                    response.trialNumber ===
                    trialNumber
                      ? normalizedResponse
                      : response,
                ),
            }),
          );

          return normalizedResponse;
        }

        const createdResponse =
          createDefaultTrialQuestionnaireResponse(
            trialNumber,
            taskId ===
              "symposium"
              ? taskId
              : "symposium",
            condition ===
              expectedCondition
              ? condition
              : expectedCondition,
          );

        const initializedResponse:
          TrialQuestionnaireResponse = {
            ...createdResponse,

            startedAtIso:
              createdResponse.startedAtIso ??
              new Date()
                .toISOString(),
          };

        set(
          (state) => ({
            trialResponses: [
              ...state.trialResponses.filter(
                (response) =>
                  response.trialNumber !==
                  trialNumber,
              ),

              initializedResponse,
            ].sort(
              (
                first,
                second,
              ) =>
                first.trialNumber -
                second.trialNumber,
            ),
          }),
        );

        return cloneTrialResponse(
          initializedResponse,
        );
      },

      getTrialResponse: (
        trialNumber,
      ) => {
        const response =
          get().trialResponses.find(
            (item) =>
              item.trialNumber ===
              trialNumber,
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
      ) => {
        if (
          !isNasaTlxValue(
            value,
          )
        ) {
          return;
        }

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    response.trialNumber !==
                      trialNumber ||
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
      ) => {
        if (
          !isLikertRating(
            value,
          )
        ) {
          return;
        }

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    response.trialNumber !==
                      trialNumber ||
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
      ) => {
        if (
          !isLikertRating(
            value,
          )
        ) {
          return;
        }

        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    response.trialNumber !==
                      trialNumber ||
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
      ) => {
        set(
          (state) => ({
            trialResponses:
              state.trialResponses.map(
                (response) => {
                  if (
                    response.trialNumber !==
                      trialNumber ||
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
      ) => {
        const response =
          get().trialResponses.find(
            (item) =>
              item.trialNumber ===
              trialNumber,
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
              state.trialResponses.map(
                (item) =>
                  item.trialNumber ===
                  trialNumber
                    ? submittedResponse
                    : item,
              ),
          }),
        );

        return cloneTrialResponse(
          submittedResponse,
        );
      },

      markTrialQuestionnaireExported: (
        trialNumber,
      ) => {
        const response =
          get().trialResponses.find(
            (item) =>
              item.trialNumber ===
              trialNumber,
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
              state.trialResponses.map(
                (item) =>
                  item.trialNumber ===
                  trialNumber
                    ? exportedResponse
                    : item,
              ),
          }),
        );

        return cloneTrialResponse(
          exportedResponse,
        );
      },

      isTrialQuestionnaireComplete: (
        trialNumber,
      ) => {
        const response =
          get().trialResponses.find(
            (item) =>
              item.trialNumber ===
              trialNumber,
          );

        return response
          ? responseIsSubmitted(
              response,
            )
          : false;
      },

      areAllTrialQuestionnairesSubmitted:
        () => {
          const responses =
            get().trialResponses;

          return (
            responses.length ===
              TOTAL_TRIALS &&
            responses.every(
              responseIsSubmitted,
            )
          );
        },

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
          const response =
            get().finalQuestionnaire;

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
      ) => {
        set(
          (state) => ({
            trialResponses:
              state.trialResponses.filter(
                (response) =>
                  response.trialNumber !==
                  trialNumber,
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