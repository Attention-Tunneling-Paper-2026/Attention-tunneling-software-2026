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
  completedTrialNumbers: StudyTrialNumber[];
  exportedTrialNumbers: StudyTrialNumber[];

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
  title: string;
  message: string;
  collapsedLabel: string;
  shownAfterSeconds: number;
  collapseAfterSeconds: number;
  displayMode?: ProbeDisplayMode;
  affectedRoom?: Room;
  requiredProjectorRoom?: Room;
  requiredTalkIds?: string[];
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

export function getCompletedTrialCount(
  trials: StudyTrialProgress[],
): number {
  return trials.filter(isTrialComplete).length;
}

export function getCompletedTrialNumbers(
  trials: StudyTrialProgress[],
): StudyTrialNumber[] {
  return trials
    .filter(isTrialComplete)
    .map((trial) => trial.trialNumber);
}

export function getExportedTrialNumbers(
  trials: StudyTrialProgress[],
): StudyTrialNumber[] {
  return trials
    .filter(isTrialCsvExportComplete)
    .map((trial) => trial.trialNumber);
}

export function getCurrentTrial(
  trials: StudyTrialProgress[],
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) =>
      trial.status === "active" ||
      trial.status === "submitted",
  );
}

export function getPendingTrials(
  trials: StudyTrialProgress[],
): StudyTrialProgress[] {
  return trials.filter(
    (trial) => trial.status === "pending",
  );
}

export function getTrialByNumber(
  trials: StudyTrialProgress[],
  trialNumber: StudyTrialNumber,
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) => trial.trialNumber === trialNumber,
  );
}

export function allTrialsComplete(
  trials: StudyTrialProgress[],
): boolean {
  return (
    trials.length === 3 &&
    trials.every(isTrialComplete)
  );
}

export function allTrialCsvFilesExported(
  trials: StudyTrialProgress[],
): boolean {
  return (
    trials.length === 3 &&
    trials.every(isTrialCsvExportComplete)
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
  return {
    participantId: session.participantId,
    participantToken: session.participantToken,
    sessionId: session.sessionId,
    stage: session.stage,
    completedTrialCount:
      getCompletedTrialCount(session.trials),
    totalTrialCount: session.trials.length,
    currentTrialNumber: session.currentTrialNumber,
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
    startedAtIso: session.sessionStartedAtIso,
    completedAtIso: session.studyCompletedAtIso,
  };
}
