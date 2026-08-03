import {
  STUDY_TASK_IDS,
  STUDY_TRIAL_NUMBERS,
  TOTAL_STUDY_TRIALS,
  createCompositeTrialId,
} from "./scheduler";

import type {
  ConcretizationLevel,
  ConditionOrder,
  ProbeDisplayMode,
  Room,
  StudyTaskId,
  StudyTrialNumber,
  StudyTrialOrder,
} from "./scheduler";

export const STUDY_SESSION_STAGES = [
  "procedure",
  "task_assignment",
  "task",
  "trial_questionnaire",
  "post_experiment",
  "disclosure",
  "complete",
] as const;

export type StudySessionStage =
  (typeof STUDY_SESSION_STAGES)[number];

export const TRIAL_PROGRESS_STATUSES = [
  "pending",
  "active",
  "submitted",
  "questionnaire_complete",
] as const;

export type TrialProgressStatus =
  (typeof TRIAL_PROGRESS_STATUSES)[number];

export type StudyCompletionStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export const TRIAL_EXPORT_STATUSES = [
  "not_ready",
  "ready",
  "exporting",
  "exported",
  "failed",
] as const;

export type TrialExportStatus =
  (typeof TRIAL_EXPORT_STATUSES)[number];

export type StudyTrialEndReason =
  | "submitted"
  | "timeout";

export interface StudyParticipant {
  participantId: string;
  participantToken?: string;
  sessionId: string;
  createdAtIso: string;
}

/**
 * A trial is identified by the pair (taskId, trialNumber).
 * trialNumber remains the within-task condition identity (1–3), while
 * trialOrder may span the complete nine-trial study (1–9).
 */
export interface StudyTrialAssignment {
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrder | number;
  taskId: StudyTaskId;
  condition: ConcretizationLevel;
  conditionOrder: ConditionOrder | number;
  participantLabel: string;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;

  /* Additive fields used by task-aware logging and exports. */
  trialId?: string;
  outerTaskNumber?: number;
  innerTaskNumber?: StudyTrialNumber;
  globalTrialNumber?: number;
}

export interface StudyTrialProgress
  extends StudyTrialAssignment {
  status: TrialProgressStatus;

  startedAtIso: string | null;
  assistantAnalysisRequestedAtIso: string | null;
  assistantAnalysisStartedAtIso: string | null;
  assistantAnalysisCompletedAtIso?: string | null;
  assistantRecommendationShownAtIso: string | null;

  timerStartedAtIso: string | null;
  probeShownAtIso: string | null;
  probeCollapsedAtIso?: string | null;
  probeAcknowledgedAtIso: string | null;

  submittedAtIso: string | null;
  trialEndedAtIso?: string | null;
  trialEndReason?: StudyTrialEndReason | null;

  questionnaireStartedAtIso: string | null;
  questionnaireCompletedAtIso: string | null;

  eventsCsvExportStatus: TrialExportStatus;
  summaryCsvExportStatus: TrialExportStatus;
  eventsCsvExportedAtIso: string | null;
  summaryCsvExportedAtIso: string | null;

  exportErrorMessage?: string;
}

export interface StudySession {
  participantId: string;
  participantToken?: string;
  sessionId: string | null;

  stage: StudySessionStage;
  assignments: StudyTrialAssignment[];
  trials: StudyTrialProgress[];
  currentTrialNumber: StudyTrialNumber | null;

  /*
   * The task domain disambiguates the repeated within-task trial numbers.
   * It is optional for compatibility with previously stored sessions.
   */
  currentTaskId?: StudyTaskId | null;

  conditionOrder?: ConditionOrder;

  procedureAccepted: boolean;
  postExperimentCompleted: boolean;
  disclosureViewed: boolean;
  studyCompleted: boolean;

  sessionCreatedAtIso: string | null;
  sessionStartedAtIso: string | null;
  procedureAcceptedAtIso: string | null;

  postExperimentStartedAtIso: string | null;
  postExperimentCompletedAtIso: string | null;
  postExperimentCsvExportStatus: TrialExportStatus;
  postExperimentCsvExportedAtIso: string | null;

  sessionCsvExportStatus?: TrialExportStatus;
  sessionCsvExportedAtIso?: string | null;
  sessionCsvExportErrorMessage?: string;

  disclosureViewedAtIso: string | null;
  studyCompletedAtIso: string | null;
}

export interface StudySessionSummary {
  participantId: string;
  participantToken?: string;
  sessionId: string | null;
  stage: StudySessionStage;

  completedTrialCount: number;
  totalTrialCount: number;
  currentTrialNumber: StudyTrialNumber | null;
  currentTaskId?: StudyTaskId | null;
  currentTrialId?: string | null;

  completionStatus: StudyCompletionStatus;
  allTrialCsvFilesExported: boolean;
  postExperimentCsvExported: boolean;
  sessionCsvExported?: boolean;
}

export interface ActiveStudyTrial {
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrder | number;
  totalTrials: number;
  taskId: StudyTaskId;
  condition: ConcretizationLevel;
  conditionOrder: ConditionOrder | number;
  participantLabel: string;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;
  status: TrialProgressStatus;

  trialId?: string;
  outerTaskNumber?: number;
  innerTaskNumber?: StudyTrialNumber;
  globalTrialNumber?: number;
}

export interface TaskRouteState {
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrder | number;
  totalTrials: number;
  taskId: StudyTaskId;
  condition: ConcretizationLevel;
  conditionOrder: ConditionOrder | number;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;

  trialId?: string;
  outerTaskNumber?: number;
  innerTaskNumber?: StudyTrialNumber;
  globalTrialNumber?: number;
}

export interface TrialQuestionnaireRouteState {
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrder | number;
  totalTrials: number;
  taskId: StudyTaskId;
  condition: ConcretizationLevel;
  conditionOrder: ConditionOrder | number;
  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;

  trialId?: string;
  outerTaskNumber?: number;
  innerTaskNumber?: StudyTrialNumber;
  globalTrialNumber?: number;
}

export interface StudyRedirectState {
  redirectedFrom?: string;
}

export interface StudyCompletionSummary {
  participantId: string;
  participantToken?: string;
  sessionId: string | null;

  completedTrials: number;
  totalTrials: number;

  /*
   * Legacy number arrays are retained. Across the complete study they may
   * contain repeated 1–3 values because each task has three inner trials.
   */
  completedTrialNumbers: StudyTrialNumber[];
  exportedTrialNumbers: StudyTrialNumber[];

  /* Composite IDs are the unambiguous task-aware representation. */
  completedTrialIds?: string[];
  exportedTrialIds?: string[];

  startedAtIso: string | null;
  completedAtIso: string | null;
}

export interface TaskPresentationLabels {
  itemSingular: string;
  itemPlural: string;
  locationSingular: string;
  locationPlural: string;
  periodSingular: string;
  periodPlural: string;
}

export interface TaskAssistantRecommendation {
  name: string;
  statusLabel: string;
  recommendationLabel: string;
  recommendation: string;
  prefillAcknowledgment?: string | null;
  contentVersion?: string;
}

export interface SemanticProbeUpdate {
  id: string;
  version?: string;
  taskId?: StudyTaskId;
  title: string;
  message: string;
  collapsedLabel: string;
  shownAfterSeconds: number;
  collapseAfterSeconds: number;
  displayMode?: ProbeDisplayMode;

  /*
   * Existing Symposium-specific fields are preserved for compatibility.
   * The generic aliases support vans, wards, shipments, and duties without
   * changing the shared three-by-four scheduler geometry.
   */
  affectedRoom?: Room;
  requiredProjectorRoom?: Room;
  requiredTalkIds?: string[];
  affectedResource?: Room;
  requiredEquipmentResource?: Room;
  requiredItemIds?: string[];

  semanticOnly: boolean;
}

export function isStudySessionStage(
  value: unknown,
): value is StudySessionStage {
  return STUDY_SESSION_STAGES.includes(
    value as StudySessionStage,
  );
}

export function isTrialProgressStatus(
  value: unknown,
): value is TrialProgressStatus {
  return TRIAL_PROGRESS_STATUSES.includes(
    value as TrialProgressStatus,
  );
}

export function isTrialExportStatus(
  value: unknown,
): value is TrialExportStatus {
  return TRIAL_EXPORT_STATUSES.includes(
    value as TrialExportStatus,
  );
}

export function isTrialComplete(
  trial: StudyTrialProgress,
): boolean {
  return trial.status === "questionnaire_complete";
}

export function isTrialCsvExportComplete(
  trial: StudyTrialProgress,
): boolean {
  return (
    trial.eventsCsvExportStatus === "exported" &&
    trial.summaryCsvExportStatus === "exported"
  );
}

export function getStudyTrialId(
  trial: Pick<
    StudyTrialAssignment,
    "taskId" | "trialNumber" | "trialId"
  >,
): string {
  return (
    trial.trialId ??
    createCompositeTrialId(
      trial.taskId,
      trial.trialNumber,
    )
  );
}

export function studyTrialsHaveSameIdentity(
  first: Pick<
    StudyTrialAssignment,
    "taskId" | "trialNumber"
  >,
  second: Pick<
    StudyTrialAssignment,
    "taskId" | "trialNumber"
  >,
): boolean {
  return (
    first.taskId === second.taskId &&
    first.trialNumber === second.trialNumber
  );
}

export function getCompletedTrialCount(
  trials: StudyTrialProgress[],
): number {
  return trials.filter(isTrialComplete).length;
}

export function getCompletedTrialNumbers(
  trials: StudyTrialProgress[],
  taskId?: StudyTaskId,
): StudyTrialNumber[] {
  return trials
    .filter(
      (trial) =>
        isTrialComplete(trial) &&
        (taskId === undefined || trial.taskId === taskId),
    )
    .map((trial) => trial.trialNumber);
}

export function getCompletedTrialIds(
  trials: StudyTrialProgress[],
): string[] {
  return trials
    .filter(isTrialComplete)
    .map(getStudyTrialId);
}

export function getExportedTrialNumbers(
  trials: StudyTrialProgress[],
  taskId?: StudyTaskId,
): StudyTrialNumber[] {
  return trials
    .filter(
      (trial) =>
        isTrialCsvExportComplete(trial) &&
        (taskId === undefined || trial.taskId === taskId),
    )
    .map((trial) => trial.trialNumber);
}

export function getExportedTrialIds(
  trials: StudyTrialProgress[],
): string[] {
  return trials
    .filter(isTrialCsvExportComplete)
    .map(getStudyTrialId);
}

export function getCurrentTrial(
  trials: StudyTrialProgress[],
): StudyTrialProgress | undefined {
  return [...trials]
    .sort(
      (first, second) =>
        Number(first.trialOrder) -
        Number(second.trialOrder),
    )
    .find(
      (trial) =>
        trial.status === "active" ||
        trial.status === "submitted",
    );
}

export function getPendingTrials(
  trials: StudyTrialProgress[],
  taskId?: StudyTaskId,
): StudyTrialProgress[] {
  return trials.filter(
    (trial) =>
      trial.status === "pending" &&
      (taskId === undefined || trial.taskId === taskId),
  );
}

export function getTrialByNumber(
  trials: StudyTrialProgress[],
  trialNumber: StudyTrialNumber,
  taskId: StudyTaskId = "symposium",
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) =>
      trial.taskId === taskId &&
      trial.trialNumber === trialNumber,
  );
}

export function getTrialByIdentity(
  trials: StudyTrialProgress[],
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): StudyTrialProgress | undefined {
  return getTrialByNumber(
    trials,
    trialNumber,
    taskId,
  );
}

export function getTrialById(
  trials: StudyTrialProgress[],
  trialId: string,
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) => getStudyTrialId(trial) === trialId,
  );
}

export function getTaskTrials(
  trials: StudyTrialProgress[],
  taskId: StudyTaskId,
): StudyTrialProgress[] {
  return trials.filter(
    (trial) => trial.taskId === taskId,
  );
}

function hasEveryExpectedTrial(
  trials: StudyTrialProgress[],
  predicate: (trial: StudyTrialProgress) => boolean,
): boolean {
  if (trials.length !== TOTAL_STUDY_TRIALS) {
    return false;
  }

  return STUDY_TASK_IDS.every((taskId) =>
    STUDY_TRIAL_NUMBERS.every((trialNumber) => {
      const matchingTrials = trials.filter(
        (trial) =>
          trial.taskId === taskId &&
          trial.trialNumber === trialNumber,
      );

      return (
        matchingTrials.length === 1 &&
        predicate(matchingTrials[0])
      );
    }),
  );
}

export function allTrialsComplete(
  trials: StudyTrialProgress[],
): boolean {
  return hasEveryExpectedTrial(
    trials,
    isTrialComplete,
  );
}

export function allTrialCsvFilesExported(
  trials: StudyTrialProgress[],
): boolean {
  return hasEveryExpectedTrial(
    trials,
    isTrialCsvExportComplete,
  );
}

export function allTaskTrialsComplete(
  trials: StudyTrialProgress[],
  taskId: StudyTaskId,
): boolean {
  const taskTrials = getTaskTrials(
    trials,
    taskId,
  );

  return (
    taskTrials.length === STUDY_TRIAL_NUMBERS.length &&
    STUDY_TRIAL_NUMBERS.every((trialNumber) => {
      const matchingTrials = taskTrials.filter(
        (trial) => trial.trialNumber === trialNumber,
      );

      return (
        matchingTrials.length === 1 &&
        isTrialComplete(matchingTrials[0])
      );
    })
  );
}

export function getStudyCompletionStatus(
  procedureAccepted: boolean,
  studyCompleted: boolean,
): StudyCompletionStatus {
  if (studyCompleted) {
    return "completed";
  }

  if (procedureAccepted) {
    return "in_progress";
  }

  return "not_started";
}

export function createStudySessionSummary(
  session: StudySession,
): StudySessionSummary {
  const currentTrial = getCurrentTrial(
    session.trials,
  );

  return {
    participantId: session.participantId,
    participantToken: session.participantToken,
    sessionId: session.sessionId,
    stage: session.stage,
    completedTrialCount:
      getCompletedTrialCount(session.trials),
    totalTrialCount: session.trials.length,
    currentTrialNumber:
      currentTrial?.trialNumber ??
      session.currentTrialNumber,
    currentTaskId:
      currentTrial?.taskId ??
      session.currentTaskId ??
      null,
    currentTrialId:
      currentTrial
        ? getStudyTrialId(currentTrial)
        : null,
    completionStatus: getStudyCompletionStatus(
      session.procedureAccepted,
      session.studyCompleted,
    ),
    allTrialCsvFilesExported:
      allTrialCsvFilesExported(session.trials),
    postExperimentCsvExported:
      session.postExperimentCsvExportStatus ===
      "exported",
    sessionCsvExported:
      session.sessionCsvExportStatus === "exported",
  };
}

export function createStudyCompletionSummary(
  session: StudySession,
): StudyCompletionSummary {
  return {
    participantId: session.participantId,
    participantToken: session.participantToken,
    sessionId: session.sessionId,
    completedTrials:
      getCompletedTrialCount(session.trials),
    totalTrials: session.trials.length,
    completedTrialNumbers:
      getCompletedTrialNumbers(session.trials),
    exportedTrialNumbers:
      getExportedTrialNumbers(session.trials),
    completedTrialIds:
      getCompletedTrialIds(session.trials),
    exportedTrialIds:
      getExportedTrialIds(session.trials),
    startedAtIso: session.sessionStartedAtIso,
    completedAtIso: session.studyCompletedAtIso,
  };
}
