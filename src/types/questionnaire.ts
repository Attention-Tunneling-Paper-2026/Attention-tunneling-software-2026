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
  | 5
  | 6
  | 7;

export const LIKERT_RATINGS:
  readonly LikertRating[] = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
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

export interface NasaTlxRatings {
  mentalDemand:
    number;

  physicalDemand:
    number;

  temporalDemand:
    number;

  performance:
    number;

  effort:
    number;

  frustration:
    number;
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
  | "solutionConcreteness"
  | "solutionCompleteness"
  | "recommendationDetail"
  | "directUsability"
  | "solutionActionability";

export const MANIPULATION_CHECK_DIMENSIONS:
  readonly ManipulationCheckDimension[] = [
    "recommendationSpecificity",
    "solutionConcreteness",
    "solutionCompleteness",
    "recommendationDetail",
    "directUsability",
    "solutionActionability",
  ];

export interface ManipulationCheckRatings {
  recommendationSpecificity:
    LikertRating | null;

  solutionConcreteness:
    LikertRating | null;

  solutionCompleteness:
    LikertRating | null;

  recommendationDetail:
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

export interface ProbeRecallResponses {
  noticedUpdate:
    YesNoUnsure;

  updateDescription:
    string;

  affectedRoom:
    ProbeRecallRoom;

  recallConfidence:
    LikertRating | null;
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
      50,

    physicalDemand:
      50,

    temporalDemand:
      50,

    performance:
      50,

    effort:
      50,

    frustration:
      50,
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

    solutionConcreteness:
      null,

    solutionCompleteness:
      null,

    recommendationDetail:
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
      7
  );
}

export function isNasaTlxValue(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    ) &&
    value >=
      0 &&
    value <=
      100 &&
    value %
      5 ===
      0
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
): boolean {
  return (
    values.noticedUpdate ===
      "yes" &&
    values.affectedRoom ===
      "C"
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

  if (
    !isYesNoUnsureResponse(
      response.probeRecall
        .noticedUpdate,
    )
  ) {
    return "Please indicate whether you noticed the facilities update.";
  }

  if (
    response.probeRecall
      .noticedUpdate ===
      "yes" &&
    response.probeRecall
      .updateDescription
      .trim()
      .length ===
      0
  ) {
    return "Please briefly describe the facilities update you remember.";
  }

  if (
    !isProbeRecallRoom(
      response.probeRecall
        .affectedRoom,
    )
  ) {
    return "Please select which room was affected by the facilities update.";
  }

  if (
    !isLikertRating(
      response.probeRecall
        .recallConfidence,
    )
  ) {
    return "Please provide your recall confidence rating.";
  }

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