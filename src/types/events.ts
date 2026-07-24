import type {
  ConcretizationLevel,
  Room,
  Slot,
  StudyTaskId,
  StudyTrialNumber,
} from "./scheduler";

export type StudyEventType =
  | "study_started"
  | "procedure_viewed"
  | "task_selected"
  | "assistant_analysis_requested"
  | "assistant_analysis_started"
  | "assistant_analysis_completed"
  | "assistant_recommendation_shown"
  | "task_details_opened"
  | "task_details_closed"
  | "trial_start"
  | "drag_start"
  | "drop"
  | "illegal_drop"
  | "drag_cancel"
  | "probe_shown"
  | "probe_notification_opened"
  | "probe_acknowledged"
  | "timer_expired"
  | "submit_attempt"
  | "trial_submitted"
  | "questionnaire_started"
  | "questionnaire_submitted"
  | "trial_csv_exported"
  | "post_experiment_started"
  | "post_experiment_submitted"
  | "post_experiment_csv_exported"
  | "disclosure_viewed"
  | "study_completed";

export type StudyPhase =
  | "pre_ai"
  | "pre_probe"
  | "post_probe"
  | "submitted"
  | "questionnaire"
  | "post_experiment"
  | "disclosure"
  | "complete";

export type ScheduleAction =
  | "assign"
  | "move"
  | "swap"
  | "unassign"
  | "no_op";

export type DragSource =
  | "unassigned_tray"
  | "schedule_grid";

export type EditCategory =
  | "within_room_swap"
  | "cross_room_swap"
  | "move_between_rooms"
  | "move_within_room"
  | "move_to_unassigned"
  | "move_from_unassigned"
  | "demo_into_room_a"
  | "non_demo_out_of_room_a"
  | "return_to_previous_state"
  | "immediate_reversal"
  | "illegal_edit"
  | "other";

export type StudyEventMetadata =
  Record<
    string,
    unknown
  >;

interface StudyEventMeasurements {
  talkId?:
    string;

  fromRoom?:
    Room;

  fromSlot?:
    Slot;

  toRoom?:
    Room;

  toSlot?:
    Slot;

  source?:
    DragSource;

  action?:
    ScheduleAction;

  success?:
    boolean;

  dragDurationMs?:
    number;

  probeLatencyMs?:
    number | null;

  scheduleBefore?:
    string;

  scheduleAfter?:
    string;

  stateHashBefore?:
    string;

  stateHashAfter?:
    string;

  structuralSignatureBefore?:
    string;

  structuralSignatureAfter?:
    string;

  scoreBefore?:
    number;

  scoreAfter?:
    number;

  scoreDelta?:
    number;

  speakerConflictsBefore?:
    number;

  speakerConflictsAfter?:
    number;

  hammingDistanceFromAIBefore?:
    number;

  hammingDistanceFromAIAfter?:
    number;

  hammingDistanceFromAI?:
    number;

  insideAIFamilyBefore?:
    boolean;

  insideAIFamilyAfter?:
    boolean;

  statePreviouslyVisited?:
    boolean;

  isImmediateReversal?:
    boolean;

  isBacktracking?:
    boolean;

  editCategory?:
    EditCategory;

  isSalvageAttempt?:
    boolean;

  isNonImprovingEdit?:
    boolean;

  isPlateauEdit?:
    boolean;

  isDestructiveEdit?:
    boolean;

  transitionId?:
    string;

  isOptimalDestructiveTransition?:
    boolean;

  strategySwitchTriggered?:
    boolean;

  probeVisible?:
    boolean;

  probeAcknowledged?:
    boolean;

  integrationConsistentEdit?:
    boolean;

  probeIntegrationDetected?:
    boolean;

  postProbeFeasibleBefore?:
    boolean;

  postProbeFeasibleAfter?:
    boolean;

  resultingViolations?:
    unknown[];

  violationCount?:
    number;

  structuralSignature?:
    string;

  moatCrossed?:
    boolean;
}

export interface StudyEvent
  extends StudyEventMeasurements {
  eventId:
    string;

  eventIndex:
    number;

  participantId:
    string;

  sessionId:
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

  taskId:
    StudyTaskId;

  taskInstanceVersion?:
    string;

  appVersion?:
    string;

  eventType:
    StudyEventType;

  phase:
    StudyPhase;

  timestampIso:
    string;

  elapsedMs:
    number;

  metadata?:
    StudyEventMetadata;
}

export interface CreateStudyEventInput
  extends StudyEventMeasurements {
  eventType:
    StudyEventType;

  eventIndex?:
    number;

  trialNumber?:
    StudyTrialNumber;

  trialOrder?:
    number;

  condition?:
    ConcretizationLevel;

  conditionOrder?:
    number;

  isFirstTrial?:
    boolean;

  probeExposureNumber?:
    number;

  probeNaive?:
    boolean;

  taskId?:
    StudyTaskId;

  taskInstanceVersion?:
    string;

  appVersion?:
    string;

  phase?:
    StudyPhase;

  metadata?:
    StudyEventMetadata;
}

export function isStudyEventType(
  value:
    unknown,
): value is StudyEventType {
  return (
    value ===
      "study_started" ||
    value ===
      "procedure_viewed" ||
    value ===
      "task_selected" ||
    value ===
      "assistant_analysis_requested" ||
    value ===
      "assistant_analysis_started" ||
    value ===
      "assistant_analysis_completed" ||
    value ===
      "assistant_recommendation_shown" ||
    value ===
      "task_details_opened" ||
    value ===
      "task_details_closed" ||
    value ===
      "trial_start" ||
    value ===
      "drag_start" ||
    value ===
      "drop" ||
    value ===
      "illegal_drop" ||
    value ===
      "drag_cancel" ||
    value ===
      "probe_shown" ||
    value ===
      "probe_notification_opened" ||
    value ===
      "probe_acknowledged" ||
    value ===
      "timer_expired" ||
    value ===
      "submit_attempt" ||
    value ===
      "trial_submitted" ||
    value ===
      "questionnaire_started" ||
    value ===
      "questionnaire_submitted" ||
    value ===
      "trial_csv_exported" ||
    value ===
      "post_experiment_started" ||
    value ===
      "post_experiment_submitted" ||
    value ===
      "post_experiment_csv_exported" ||
    value ===
      "disclosure_viewed" ||
    value ===
      "study_completed"
  );
}

export function isStudyPhase(
  value:
    unknown,
): value is StudyPhase {
  return (
    value ===
      "pre_ai" ||
    value ===
      "pre_probe" ||
    value ===
      "post_probe" ||
    value ===
      "submitted" ||
    value ===
      "questionnaire" ||
    value ===
      "post_experiment" ||
    value ===
      "disclosure" ||
    value ===
      "complete"
  );
}

export function isScheduleAction(
  value:
    unknown,
): value is ScheduleAction {
  return (
    value ===
      "assign" ||
    value ===
      "move" ||
    value ===
      "swap" ||
    value ===
      "unassign" ||
    value ===
      "no_op"
  );
}