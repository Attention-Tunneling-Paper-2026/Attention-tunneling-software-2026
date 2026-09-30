import type {
  ConcretizationLevel,
  StudyTaskId,
  StudyTrialNumber,
} from "./scheduler";

export type LikertRating =
  | 1
  | 2
  | 3
  | 4
  | 5;

export const LIKERT_RATINGS:
  readonly LikertRating[] = [
    1,
    2,
    3,
    4,
    5,
  ];

export type YesNoUnsure =
  | ""
  | "yes"
  | "no"
  | "unsure";

export type NasaTlxDimension =
  | "mentalDemand"
  | "physicalDemand"
  | "temporalDemand"
  | "performance"
  | "effort"
  | "frustration";

export const NASA_TLX_DIMENSIONS:
  readonly NasaTlxDimension[] = [
    "mentalDemand",
    "physicalDemand",
    "temporalDemand",
    "performance",
    "effort",
    "frustration",
  ];

export type NasaTlxRating =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | null;

export const NASA_TLX_RATINGS:
  readonly Exclude<
    NasaTlxRating,
    null
  >[] = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
  ];

export interface NasaTlxRatings {
  mentalDemand:
    NasaTlxRating;

  physicalDemand:
    NasaTlxRating;

  temporalDemand:
    NasaTlxRating;

  performance:
    NasaTlxRating;

  effort:
    NasaTlxRating;

  frustration:
    NasaTlxRating;
}

export type TrialExperienceDimension =
  | "scheduleCompleteness"
  | "aiHelpfulness"
  | "aiCompetence";

export const TRIAL_EXPERIENCE_DIMENSIONS:
  readonly TrialExperienceDimension[] = [
    "scheduleCompleteness",
    "aiHelpfulness",
    "aiCompetence",
  ];

export interface TrialExperienceRatings {
  scheduleCompleteness:
    LikertRating | null;

  aiHelpfulness:
    LikertRating | null;

  aiCompetence:
    LikertRating | null;
}

export type ManipulationCheckDimension =
  | "recommendationSpecificity"
  | "recommendationDetail"
  | "solutionConcreteness"
  | "solutionCompleteness"
  | "directUsability"
  | "solutionActionability";

export const MANIPULATION_CHECK_DIMENSIONS:
  readonly ManipulationCheckDimension[] = [
    "recommendationSpecificity",
    "recommendationDetail",
    "solutionConcreteness",
    "solutionCompleteness",
    "directUsability",
    "solutionActionability",
  ];

export interface ManipulationCheckRatings {
  recommendationSpecificity:
    LikertRating | null;

  recommendationDetail:
    LikertRating | null;

  solutionConcreteness:
    LikertRating | null;

  solutionCompleteness:
    LikertRating | null;

  directUsability:
    LikertRating | null;

  solutionActionability:
    LikertRating | null;
}

export type ProbeRecallRoom =
  | ""
  | "A"
  | "B"
  | "C"
  | "none"
  | "unsure";

export type ProbeRecognitionChoice =
  | ""
  /*
   * Symposium values retained for compatibility with existing UI and
   * previously exported datasets.
   */
  | "room_c_projector_failure"
  | "room_a_projector_failure"
  | "room_b_unavailable"
  | "session_time_changed"
  /*
   * Domain-specific values allow the delivery and clinic questionnaires to
   * use semantically accurate identifiers when their UI is migrated.
   */
  | "van_c_refrigeration_failure"
  | "van_a_refrigeration_failure"
  | "van_b_unavailable"
  | "shipment_route_window_changed"
  | "ward_c_icu_certification_loss"
  | "ward_a_icu_certification_loss"
  | "ward_b_unavailable"
  | "duty_shift_changed"
  | "no_update"
  | "unsure";

export const PROBE_RECOGNITION_CHOICES:
  readonly ProbeRecognitionChoice[] = [
    "room_c_projector_failure",
    "room_a_projector_failure",
    "room_b_unavailable",
    "session_time_changed",
    "van_c_refrigeration_failure",
    "van_a_refrigeration_failure",
    "van_b_unavailable",
    "shipment_route_window_changed",
    "ward_c_icu_certification_loss",
    "ward_a_icu_certification_loss",
    "ward_b_unavailable",
    "duty_shift_changed",
    "no_update",
    "unsure",
  ];

interface ProbeQuestionnaireCopy {
  updateLabel:
    string;

  locationSingular:
    string;

  correctLocation:
    Exclude<
      ProbeRecallRoom,
      "" | "none" | "unsure"
    >;

  correctRecognitionChoices:
    readonly Exclude<
      ProbeRecognitionChoice,
      ""
    >[];
}

function getProbeQuestionnaireCopy(
  taskId:
    StudyTaskId,
): ProbeQuestionnaireCopy {
  switch (
    taskId as string
  ) {
    case "delivery":
      return {
        updateLabel:
          "vehicle update",

        locationSingular:
          "van",

        correctLocation:
          "C",

        /*
         * The Symposium identifier is accepted as a compatibility alias
         * because the current questionnaire UI uses a shared option value
         * while rendering delivery-specific text.
         */
        correctRecognitionChoices: [
          "van_c_refrigeration_failure",
          "room_c_projector_failure",
        ],
      };

    case "clinic":
      return {
        updateLabel:
          "staffing update",

        locationSingular:
          "ward",

        correctLocation:
          "C",

        /*
         * The Symposium identifier is accepted as a compatibility alias
         * because the current questionnaire UI uses a shared option value
         * while rendering clinic-specific text.
         */
        correctRecognitionChoices: [
          "ward_c_icu_certification_loss",
          "room_c_projector_failure",
        ],
      };

    case "symposium":
    default:
      return {
        updateLabel:
          "facilities update",

        locationSingular:
          "room",

        correctLocation:
          "C",

        correctRecognitionChoices: [
          "room_c_projector_failure",
        ],
      };
  }
}

export interface ProbeRecallResponses {
  noticedUpdate:
    YesNoUnsure;

  updateDescription:
    string;

  affectedRoom:
    ProbeRecallRoom;

  recallConfidence:
    LikertRating | null;

  recognitionChoice:
    ProbeRecognitionChoice;
}

export interface TrialQuestionnaireResponse {
  trialNumber:
    StudyTrialNumber;

  taskId:
    StudyTaskId;

  condition:
    ConcretizationLevel;

  nasaTlx:
    NasaTlxRatings;

  experienceRatings:
    TrialExperienceRatings;

  manipulationCheck:
    ManipulationCheckRatings;

  probeRecall:
    ProbeRecallResponses;

  startedAtIso:
    string | null;

  submittedAtIso:
    string | null;

  exportedAtIso:
    string | null;
}

export type PrimaryInfluence =
  | ""
  | "own_reasoning"
  | "ai_recommendation"
  | "task_rules"
  | "task_update"
  | "time_pressure"
  | "combination";

export interface AttributionCheckResponses {
  primaryInfluence:
    PrimaryInfluence;

  aiInfluence:
    LikertRating | null;

  aiReliance:
    LikertRating | null;

  decisionConfidence:
    LikertRating | null;

  perceivedAiCompetence:
    LikertRating | null;
}

export interface FunneledDebriefResponses {
  perceivedPurpose:
    string;

  noticedAiDifferences:
    YesNoUnsure;

  aiDifferenceDescription:
    string;

  taskUpdateImpact:
    YesNoUnsure;

  taskUpdateDescription:
    string;

  noticedAnythingUnusual:
    YesNoUnsure;

  suspicionDescription:
    string;

  priorStudyKnowledge:
    YesNoUnsure;

  priorKnowledgeDescription:
    string;

  additionalFeedback:
    string;
}

export interface FinalQuestionnaireResponse {
  attributionCheck:
    AttributionCheckResponses;

  funneledDebrief:
    FunneledDebriefResponses;

  startedAtIso:
    string | null;

  submittedAtIso:
    string | null;

  exportedAtIso:
    string | null;
}

export interface QuestionnaireState {
  trialResponses:
    TrialQuestionnaireResponse[];

  finalQuestionnaire:
    FinalQuestionnaireResponse;
}

export function createDefaultNasaTlxRatings():
  NasaTlxRatings {
  return {
    mentalDemand:
      null,

    physicalDemand:
      null,

    temporalDemand:
      null,

    performance:
      null,

    effort:
      null,

    frustration:
      null,
  };
}

export function createDefaultTrialExperienceRatings():
  TrialExperienceRatings {
  return {
    scheduleCompleteness:
      null,

    aiHelpfulness:
      null,

    aiCompetence:
      null,
  };
}

export function createDefaultManipulationCheckRatings():
  ManipulationCheckRatings {
  return {
    recommendationSpecificity:
      null,

    recommendationDetail:
      null,

    solutionConcreteness:
      null,

    solutionCompleteness:
      null,

    directUsability:
      null,

    solutionActionability:
      null,
  };
}

export function createDefaultProbeRecallResponses():
  ProbeRecallResponses {
  return {
    noticedUpdate:
      "",

    updateDescription:
      "",

    affectedRoom:
      "",

    recallConfidence:
      null,

    recognitionChoice:
      "",
  };
}

export function createDefaultAttributionCheckResponses():
  AttributionCheckResponses {
  return {
    primaryInfluence:
      "",

    aiInfluence:
      null,

    aiReliance:
      null,

    decisionConfidence:
      null,

    perceivedAiCompetence:
      null,
  };
}

export function createDefaultFunneledDebriefResponses():
  FunneledDebriefResponses {
  return {
    perceivedPurpose:
      "",

    noticedAiDifferences:
      "",

    aiDifferenceDescription:
      "",

    taskUpdateImpact:
      "",

    taskUpdateDescription:
      "",

    noticedAnythingUnusual:
      "",

    suspicionDescription:
      "",

    priorStudyKnowledge:
      "",

    priorKnowledgeDescription:
      "",

    additionalFeedback:
      "",
  };
}

export function createDefaultFinalQuestionnaireResponse():
  FinalQuestionnaireResponse {
  return {
    attributionCheck:
      createDefaultAttributionCheckResponses(),

    funneledDebrief:
      createDefaultFunneledDebriefResponses(),

    startedAtIso:
      null,

    submittedAtIso:
      null,

    exportedAtIso:
      null,
  };
}

export function createDefaultTrialQuestionnaireResponse(
  trialNumber:
    StudyTrialNumber,

  taskId:
    StudyTaskId,

  condition:
    ConcretizationLevel,
): TrialQuestionnaireResponse {
  return {
    trialNumber,

    taskId,

    condition,

    nasaTlx:
      createDefaultNasaTlxRatings(),

    experienceRatings:
      createDefaultTrialExperienceRatings(),

    manipulationCheck:
      createDefaultManipulationCheckRatings(),

    probeRecall:
      createDefaultProbeRecallResponses(),

    startedAtIso:
      new Date()
        .toISOString(),

    submittedAtIso:
      null,

    exportedAtIso:
      null,
  };
}

export function isLikertRating(
  value:
    unknown,
): value is LikertRating {
  return (
    typeof value ===
      "number" &&
    Number.isInteger(
      value,
    ) &&
    value >=
      1 &&
    value <=
      5
  );
}

export function isNasaTlxValue(
  value:
    unknown,
): value is Exclude<
  NasaTlxRating,
  null
> {
  return (
    typeof value ===
      "number" &&
    Number.isInteger(
      value,
    ) &&
    value >=
      1 &&
    value <=
      7
  );
}

export function isYesNoUnsureResponse(
  value:
    unknown,
): value is Exclude<
  YesNoUnsure,
  ""
> {
  return (
    value ===
      "yes" ||
    value ===
      "no" ||
    value ===
      "unsure"
  );
}

export function isProbeRecallRoom(
  value:
    unknown,
): value is Exclude<
  ProbeRecallRoom,
  ""
> {
  return (
    value ===
      "A" ||
    value ===
      "B" ||
    value ===
      "C" ||
    value ===
      "none" ||
    value ===
      "unsure"
  );
}

export function isProbeRecognitionChoice(
  value:
    unknown,
): value is Exclude<
  ProbeRecognitionChoice,
  ""
> {
  return (
    typeof value ===
      "string" &&
    value !==
      "" &&
    PROBE_RECOGNITION_CHOICES.includes(
      value as ProbeRecognitionChoice,
    )
  );
}

export function isTrialExperienceComplete(
  values:
    TrialExperienceRatings,
): boolean {
  return TRIAL_EXPERIENCE_DIMENSIONS.every(
    (dimension) =>
      isLikertRating(
        values[
          dimension
        ],
      ),
  );
}

export function isManipulationCheckComplete(
  values:
    ManipulationCheckRatings,
): boolean {
  return MANIPULATION_CHECK_DIMENSIONS.every(
    (dimension) =>
      isLikertRating(
        values[
          dimension
        ],
      ),
  );
}

export function isProbeRecallComplete(
  values:
    ProbeRecallResponses,
): boolean {
  if (
    !isYesNoUnsureResponse(
      values.noticedUpdate,
    )
  ) {
    return false;
  }

  if (
    !isProbeRecallRoom(
      values.affectedRoom,
    )
  ) {
    return false;
  }

  if (
    !isLikertRating(
      values.recallConfidence,
    )
  ) {
    return false;
  }

  if (
    !isProbeRecognitionChoice(
      values.recognitionChoice,
    )
  ) {
    return false;
  }

  if (
    values.noticedUpdate ===
      "yes" &&
    values.updateDescription
      .trim()
      .length ===
      0
  ) {
    return false;
  }

  return true;
}

export function getProbeRecallCorrect(
  values:
    ProbeRecallResponses,

  taskId?:
    StudyTaskId,
): boolean {
  const taskCopy =
    getProbeQuestionnaireCopy(
      taskId ??
        "symposium",
    );

  return (
    values.noticedUpdate ===
      "yes" &&
    values.affectedRoom ===
      taskCopy.correctLocation
  );
}

export function getProbeRecognitionCorrect(
  values:
    ProbeRecallResponses,

  taskId?:
    StudyTaskId,
): boolean {
  const recognitionChoice =
    values.recognitionChoice as Exclude<
      ProbeRecognitionChoice,
      ""
    >;

  if (
    taskId ===
    undefined
  ) {
    return [
      "room_c_projector_failure",
      "van_c_refrigeration_failure",
      "ward_c_icu_certification_loss",
    ].includes(
      recognitionChoice,
    );
  }

  return getProbeQuestionnaireCopy(
    taskId,
  ).correctRecognitionChoices.includes(
    recognitionChoice,
  );
}

export function getTrialQuestionnaireValidationMessage(
  response:
    TrialQuestionnaireResponse,
): string {
  const workloadComplete =
    NASA_TLX_DIMENSIONS.every(
      (dimension) =>
        isNasaTlxValue(
          response.nasaTlx[
            dimension
          ],
        ),
    );

  if (
    !workloadComplete
  ) {
    return "Please provide a valid workload rating for every item.";
  }

  if (
    !isTrialExperienceComplete(
      response.experienceRatings,
    )
  ) {
    return "Please answer every task and AI rating.";
  }

  if (
    !isManipulationCheckComplete(
      response.manipulationCheck,
    )
  ) {
    return "Please answer every AI presentation rating.";
  }

  // ADVISER FIX: Probe recall is validated only after all three trials.
  return "";
}

export function isTrialQuestionnaireComplete(
  response:
    TrialQuestionnaireResponse,
): boolean {
  return (
    getTrialQuestionnaireValidationMessage(
      response,
    ).length ===
    0
  );
}

export function getFinalQuestionnaireValidationMessage(
  response:
    FinalQuestionnaireResponse,
): string {
  const {
    attributionCheck,
    funneledDebrief,
  } = response;

  if (
    attributionCheck
      .primaryInfluence ===
      "" ||
    !isLikertRating(
      attributionCheck
        .aiInfluence,
    ) ||
    !isLikertRating(
      attributionCheck
        .aiReliance,
    ) ||
    !isLikertRating(
      attributionCheck
        .decisionConfidence,
    ) ||
    !isLikertRating(
      attributionCheck
        .perceivedAiCompetence,
    )
  ) {
    return "Please answer all decision attribution questions.";
  }

  if (
    funneledDebrief
      .perceivedPurpose
      .trim()
      .length ===
      0
  ) {
    return "Please describe what you think the study was investigating.";
  }

  if (
    !isYesNoUnsureResponse(
      funneledDebrief
        .noticedAiDifferences,
    )
  ) {
    return "Please indicate whether you noticed differences in the AI assistance.";
  }

  if (
    funneledDebrief
      .noticedAiDifferences ===
      "yes" &&
    funneledDebrief
      .aiDifferenceDescription
      .trim()
      .length ===
      0
  ) {
    return "Please describe the differences you noticed in the AI assistance.";
  }

  if (
    !isYesNoUnsureResponse(
      funneledDebrief
        .taskUpdateImpact,
    )
  ) {
    return "Please indicate whether a task update affected your approach.";
  }

  if (
    funneledDebrief
      .taskUpdateImpact ===
      "yes" &&
    funneledDebrief
      .taskUpdateDescription
      .trim()
      .length ===
      0
  ) {
    return "Please describe how the task update affected your approach.";
  }

  if (
    !isYesNoUnsureResponse(
      funneledDebrief
        .noticedAnythingUnusual,
    )
  ) {
    return "Please indicate whether you noticed anything unusual.";
  }

  if (
    funneledDebrief
      .noticedAnythingUnusual ===
      "yes" &&
    funneledDebrief
      .suspicionDescription
      .trim()
      .length ===
      0
  ) {
    return "Please describe what appeared unusual or what you suspected.";
  }

  if (
    !isYesNoUnsureResponse(
      funneledDebrief
        .priorStudyKnowledge,
    )
  ) {
    return "Please indicate whether you had prior knowledge of the study.";
  }

  if (
    funneledDebrief
      .priorStudyKnowledge ===
      "yes" &&
    funneledDebrief
      .priorKnowledgeDescription
      .trim()
      .length ===
      0
  ) {
    return "Please describe what you knew about the study before participating.";
  }

  return "";
}

export function isFinalQuestionnaireComplete(
  response:
    FinalQuestionnaireResponse,
): boolean {
  return (
    getFinalQuestionnaireValidationMessage(
      response,
    ).length ===
    0
  );
}