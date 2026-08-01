import type {
  ConcretizationLevel,
  ConditionOrder,
  IllegalMoveReason,
  ProbeDisplayMode,
  Room,
  Slot,
  StudyTaskId,
  StudyTrialNumber,
  StudyTrialOrder,
} from "./scheduler";

export const STUDY_EVENT_TYPES = [
  "study_started",
  "procedure_viewed",
  "task_selected",
  "assistant_analysis_requested",
  "assistant_analysis_started",
  "assistant_analysis_completed",
  "assistant_recommendation_shown",
  "task_details_opened",
  "task_details_closed",
  "trial_start",
  "drag_start",
  "drop",
  "illegal_drop",
  "drag_cancel",
  "probe_shown",
  "probe_notification_opened",
  "probe_acknowledged",
  "timer_expired",
  "submit_attempt",
  "trial_submitted",
  "questionnaire_started",
  "questionnaire_submitted",
  "trial_csv_exported",
  "post_experiment_started",
  "post_experiment_submitted",
  "post_experiment_csv_exported",
  "disclosure_viewed",
  "study_completed",

  /* Canonical names from the study requirements. */
  "session_start",
  "screen_enter",
  "screen_exit",
  "ai_message_shown",
  "ai_prompt_sent",
  "ai_response_received",
  "ai_fallback_used",
  "move",
  "swap",
  "unplace",
  "illegal_hover",
  "probe_ack",
  "probe_collapsed",
  "violations_panel_hover",
  "idle",
  "timer_warning",
  "fullscreen_exit",
  "fullscreen_enter",
  "trial_end",
  "form_submitted",
  "session_end",
  "export_downloaded",
] as const;

export type StudyEventType =
  (typeof STUDY_EVENT_TYPES)[number];

export const STUDY_PHASES = [
  "pre_ai",
  "pre_probe",
  "post_probe",
  "submitted",
  "questionnaire",
  "post_experiment",
  "disclosure",
  "complete",
  "tutorial",
  "break",
] as const;

export type StudyPhase =
  (typeof STUDY_PHASES)[number];

export const SCHEDULE_ACTIONS = [
  "assign",
  "move",
  "swap",
  "unassign",
  "unplace",
  "no_op",
] as const;

export type ScheduleAction =
  (typeof SCHEDULE_ACTIONS)[number];

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

export const THEORETICAL_EDIT_CATEGORIES = [
  "within_cluster",
  "cross_cluster",
  "structure_breaking",
] as const;

export type TheoreticalEditCategory =
  (typeof THEORETICAL_EDIT_CATEGORIES)[number];

export type TimerWarningLevel = "amber" | "red";
export type TrialEndReason = "submitted" | "timeout";
export type ProbeAcknowledgmentSource = "banner_ok" | "bell";

export type StudyEventMetadata = Record<string, unknown>;
export type StudyEventPayload = Record<string, unknown>;

interface StudyEventMeasurements {
  talkId?: string;
  displacedTalkId?: string;

  fromRoom?: Room;
  fromSlot?: Slot;
  toRoom?: Room;
  toSlot?: Slot;

  source?: DragSource;
  action?: ScheduleAction;
  success?: boolean;
  illegalReason?: IllegalMoveReason;

  dragDurationMs?: number;
  probeLatencyMs?: number | null;
  latencyFromProbeMs?: number | null;

  scheduleBefore?: string;
  scheduleAfter?: string;

  stateHashBefore?: string;
  stateHashAfter?: string;

  structuralSignatureBefore?: string;
  structuralSignatureAfter?: string;

  macroStructureSignatureBefore?: string;
  macroStructureSignatureAfter?: string;

  roomCompositionSignatureBefore?: string;
  roomCompositionSignatureAfter?: string;

  scoreBefore?: number;
  scoreAfter?: number;
  scoreDelta?: number;

  speakerConflictsBefore?: number;
  speakerConflictsAfter?: number;

  hammingDistanceFromAIBefore?: number;
  hammingDistanceFromAIAfter?: number;
  hammingDistanceFromAI?: number;

  insideAIFamilyBefore?: boolean;
  insideAIFamilyAfter?: boolean;

  statePreviouslyVisited?: boolean;
  isImmediateReversal?: boolean;
  isBacktracking?: boolean;

  editCategory?: EditCategory;
  theoreticalEditCategory?: TheoreticalEditCategory;

  isSalvageAttempt?: boolean;
  isNonImprovingEdit?: boolean;
  isPlateauEdit?: boolean;
  isDestructiveEdit?: boolean;

  transitionId?: string;
  isOptimalDestructiveTransition?: boolean;
  strategySwitchTriggered?: boolean;

  probeVisible?: boolean;
  probeAcknowledged?: boolean | null;
  probeDisplayMode?: ProbeDisplayMode;
  probeAcknowledgmentSource?: ProbeAcknowledgmentSource;

  integrationConsistentEdit?: boolean;
  probeIntegrationDetected?: boolean | null;

  detectionMiss?: boolean | null;
  integrationMiss?: boolean | null;
  detectionWithoutIntegration?: boolean | null;

  postProbeFeasible?: boolean | null;
  postProbeFeasibleBefore?: boolean | null;
  postProbeFeasibleAfter?: boolean | null;

  unresolvedDemoTalkIds?: string[] | null;
  unresolvedDemoTalkIdsBefore?: string[] | null;
  unresolvedDemoTalkIdsAfter?: string[] | null;

  resultingViolations?: unknown[];
  violationCount?: number;

  structuralSignature?: string;
  macroStructureSignature?: string;
  roomCompositionSignature?: string;
  moatCrossed?: boolean;

  remainingMs?: number;
  timerWarningLevel?: TimerWarningLevel;
  accepted?: boolean;
  trialEndReason?: TrialEndReason;

  renderedText?: string;
  messageId?: string;
  contentVersion?: string;
  probeCompliant?: boolean | null;
}

export interface StudyEvent extends StudyEventMeasurements {
  eventId: string;
  eventIndex: number;

  participantId: string;
  participantToken?: string;
  sessionId: string;

  trialId: string;
  trialNumber: StudyTrialNumber;
  trialOrder: StudyTrialOrder | number;
  trialIndex?: number;

  condition: ConcretizationLevel;
  conditionOrder: ConditionOrder | number;

  isFirstTrial: boolean;
  probeExposureNumber: number;
  probeNaive: boolean;

  taskId: StudyTaskId;
  skin?: StudyTaskId;

  taskInstanceVersion?: string;
  appVersion?: string;
  buildHash?: string;

  eventType: StudyEventType;
  phase: StudyPhase;

  timestampIso: string;
  elapsedMs: number;
  tMs?: number;

  metadata?: StudyEventMetadata;
  payload?: StudyEventPayload;
}

export interface CreateStudyEventInput extends StudyEventMeasurements {
  eventType: StudyEventType;

  eventIndex?: number;

  trialNumber?: StudyTrialNumber;
  trialOrder?: StudyTrialOrder | number;
  trialIndex?: number;

  condition?: ConcretizationLevel;
  conditionOrder?: ConditionOrder | number;

  isFirstTrial?: boolean;
  probeExposureNumber?: number;
  probeNaive?: boolean;

  taskId?: StudyTaskId;
  skin?: StudyTaskId;

  taskInstanceVersion?: string;
  appVersion?: string;
  buildHash?: string;

  phase?: StudyPhase;
  tMs?: number;

  participantToken?: string;
  metadata?: StudyEventMetadata;
  payload?: StudyEventPayload;
}

export function isStudyEventType(
  value: unknown,
): value is StudyEventType {
  return STUDY_EVENT_TYPES.includes(
    value as StudyEventType,
  );
}

export function isStudyPhase(
  value: unknown,
): value is StudyPhase {
  return STUDY_PHASES.includes(
    value as StudyPhase,
  );
}

export function isScheduleAction(
  value: unknown,
): value is ScheduleAction {
  return SCHEDULE_ACTIONS.includes(
    value as ScheduleAction,
  );
}

export function isTheoreticalEditCategory(
  value: unknown,
): value is TheoreticalEditCategory {
  return THEORETICAL_EDIT_CATEGORIES.includes(
    value as TheoreticalEditCategory,
  );
}
