export type Room = "A" | "B" | "C";
export type Slot = 1 | 2 | 3 | 4;
export type Topic = "NLP" | "Health" | "Robotics";
export type ConcretizationLevel = "A" | "B" | "C";
export type StudyTrialNumber = 1 | 2 | 3;
export type StudyTrialOrder = StudyTrialNumber;

export const STUDY_TASK_IDS = [
  "symposium",
  "delivery",
  "clinic",
] as const;

export type StudyTaskId =
  (typeof STUDY_TASK_IDS)[number];

export type ProbeDisplayMode = "persistent" | "transient";

export const STUDY_TRIAL_NUMBERS = [1, 2, 3] as const;

export const TRIALS_PER_TASK = STUDY_TRIAL_NUMBERS.length;
export const TOTAL_TASK_DOMAINS = STUDY_TASK_IDS.length;
export const TOTAL_STUDY_TRIALS =
  TOTAL_TASK_DOMAINS * TRIALS_PER_TASK;

export const CONDITION_ORDERS = [
  "ABC",
  "ACB",
  "BAC",
  "BCA",
  "CAB",
  "CBA",
] as const;

export type ConditionOrder =
  (typeof CONDITION_ORDERS)[number];

export const DEFAULT_CONDITION_ORDER: ConditionOrder = "ABC";

export interface RoomDetails {
  capacity: number;
  hasProjector: boolean;
}

export interface Talk {
  id: string;
  title: string;
  topic: Topic;
  demo: boolean;
  speaker?: string;
  allowedSlots: Slot[];
  allowedRooms: Room[];
}

export interface Cell {
  room: Room;
  slot: Slot;
}

export interface Placement extends Cell {
  talkId: string;
}

export type DragOrigin = "grid" | "tray";

export interface SchedulerState {
  level: ConcretizationLevel;
  trialNumber: StudyTrialNumber;
  placements: Placement[];
  unassignedTalkIds: string[];
  activeTalkId: string | null;

  /*
   * Optional fields preserve compatibility with existing store consumers
   * while allowing every schedule to carry its task-domain identity and
   * trial-control state explicitly.
   */
  taskId?: StudyTaskId;
  trialOrder?: StudyTrialOrder | number;
  conditionOrder?: ConditionOrder;
  activeDragOrigin?: DragOrigin | null;
  scheduleRevision?: number;
  allowTrayUnplace?: boolean;
  trialLocked?: boolean;
}

export type ConstraintViolationType =
  | "speaker_conflict"
  | "room_restriction"
  | "slot_restriction"
  | "projector_requirement"
  | "capacity_requirement"
  | "post_probe_projector_requirement"
  | "missing_assignment"
  | "duplicate_assignment"
  | "actor_conflict"
  | "resource_restriction"
  | "period_restriction"
  | "equipment_requirement"
  | "post_probe_equipment_requirement";

export interface ConstraintViolation {
  id: string;
  type?: ConstraintViolationType;
  message: string;
  talkIds?: string[];
  room?: Room;
  slot?: Slot;
}

export interface ProbeEvent {
  active: boolean;
  acknowledged: boolean;
  collapsed?: boolean;
  message: string;
  displayMode?: ProbeDisplayMode;
  shownAt?: number;
  collapsedAt?: number;
  openedAt?: number;
  acknowledgedAt?: number;
  latencyMs?: number | null;
}

export type ScheduleMoveAction = "move" | "swap";

export type IllegalMoveReason =
  | "trial_locked"
  | "talk_not_found"
  | "source_not_found"
  | "same_cell"
  | "target_room_not_allowed"
  | "target_slot_not_allowed"
  | "target_projector_required"
  | "target_capacity_insufficient"
  | "displaced_talk_room_not_allowed"
  | "displaced_talk_slot_not_allowed"
  | "displaced_talk_projector_required"
  | "displaced_talk_capacity_insufficient"
  | "tray_unplace_disabled";

export interface ScheduleMove {
  talkId: string;
  fromRoom?: Room;
  fromSlot?: Slot;
  toRoom: Room;
  toSlot: Slot;
  action: ScheduleMoveAction;
  displacedTalkId?: string;
  success: boolean;
  illegalReason?: IllegalMoveReason;
}

export interface MoveValidationResult {
  valid: boolean;
  action: ScheduleMoveAction;
  talkId: string;
  target: Cell;
  displacedTalkId?: string;
  reason?: IllegalMoveReason;
}

export interface StudyTrialDefinition {
  trialNumber: StudyTrialNumber;
  taskId: StudyTaskId;
  condition: ConcretizationLevel;
  participantLabel: string;
}

/*
 * Retained as a compatibility name for existing imports. The same trial
 * definition is now used by Symposium, Delivery, and Clinic tasks.
 */
export interface SymposiumTrialDefinition
  extends StudyTrialDefinition {}

export interface OrderedStudyTrialDefinition
  extends StudyTrialDefinition {
  trialOrder: StudyTrialOrder;
  conditionOrder: ConditionOrder;
}

/* Retained for compatibility with the original Symposium-only code. */
export interface OrderedSymposiumTrialDefinition
  extends OrderedStudyTrialDefinition {}

export interface CompositeStudyTrialDefinition
  extends OrderedStudyTrialDefinition {
  outerTaskNumber: number;
  globalTrialNumber: number;
  trialId: string;
}

export function isStudyTrialNumber(
  value: unknown,
): value is StudyTrialNumber {
  return value === 1 || value === 2 || value === 3;
}

export function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return STUDY_TASK_IDS.includes(
    value as StudyTaskId,
  );
}

export function isConcretizationLevel(
  value: unknown,
): value is ConcretizationLevel {
  return value === "A" || value === "B" || value === "C";
}

export function isConditionOrder(
  value: unknown,
): value is ConditionOrder {
  return CONDITION_ORDERS.includes(
    value as ConditionOrder,
  );
}

/*
 * trialNumber is the stable internal identity:
 * 1 = condition A, 2 = condition B, 3 = condition C.
 */
export function getConditionForTrial(
  trialNumber: StudyTrialNumber,
): ConcretizationLevel {
  switch (trialNumber) {
    case 1:
      return "A";
    case 2:
      return "B";
    case 3:
      return "C";
  }
}

export function getTrialNumberForCondition(
  condition: ConcretizationLevel,
): StudyTrialNumber {
  switch (condition) {
    case "A":
      return 1;
    case "B":
      return 2;
    case "C":
      return 3;
  }
}

export function getConditionForTrialOrder(
  trialOrder: StudyTrialOrder,
  conditionOrder: ConditionOrder,
): ConcretizationLevel {
  const condition = conditionOrder[
    trialOrder - 1
  ];

  if (!isConcretizationLevel(condition)) {
    throw new Error(
      `No condition is configured for trial order ${trialOrder} in order ${conditionOrder}.`,
    );
  }

  return condition;
}

export function getTaskNumber(
  taskId: StudyTaskId,
): number {
  const taskIndex = STUDY_TASK_IDS.indexOf(taskId);

  if (taskIndex < 0) {
    throw new Error(`Unknown study task: ${taskId}.`);
  }

  return taskIndex + 1;
}

export function getGlobalTrialNumber(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): number {
  return (
    (getTaskNumber(taskId) - 1) * TRIALS_PER_TASK +
    trialNumber
  );
}

export function createCompositeTrialId(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `${taskId}-${getConditionForTrial(trialNumber)}`;
}

export function createTaskTrials(
  taskId: StudyTaskId,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): OrderedStudyTrialDefinition[] {
  return STUDY_TRIAL_NUMBERS.map((trialOrder) => {
    const condition = getConditionForTrialOrder(
      trialOrder,
      conditionOrder,
    );

    const trialNumber =
      getTrialNumberForCondition(condition);

    return {
      trialNumber,
      trialOrder,
      taskId,
      condition,
      participantLabel: `Task ${trialNumber}`,
      conditionOrder,
    };
  });
}

export function createSymposiumTrials(
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): OrderedSymposiumTrialDefinition[] {
  return createTaskTrials(
    "symposium",
    conditionOrder,
  ).map((trial) => ({
    ...trial,
    taskId: "symposium",
  }));
}

export function createStudyTrials(
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): CompositeStudyTrialDefinition[] {
  return STUDY_TASK_IDS.flatMap((taskId) =>
    createTaskTrials(taskId, conditionOrder).map((trial) => ({
      ...trial,
      outerTaskNumber: getTaskNumber(taskId),
      globalTrialNumber: getGlobalTrialNumber(
        taskId,
        trial.trialNumber,
      ),
      trialId: createCompositeTrialId(
        taskId,
        trial.trialNumber,
      ),
    })),
  );
}

export const SYMPOSIUM_TRIALS:
  OrderedSymposiumTrialDefinition[] =
    createSymposiumTrials();

export const STUDY_TRIALS:
  CompositeStudyTrialDefinition[] =
    createStudyTrials();

export function getTrialDefinition(
  trialNumber: StudyTrialNumber,
  taskId: StudyTaskId = "symposium",
): StudyTrialDefinition {
  const definition = createTaskTrials(taskId).find(
    (trial) => trial.trialNumber === trialNumber,
  );

  if (!definition) {
    throw new Error(
      `No ${taskId} trial is configured for trial ${trialNumber}.`,
    );
  }

  return { ...definition };
}

export function getTrialDefinitionByOrder(
  trialOrder: StudyTrialOrder,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
  taskId: StudyTaskId = "symposium",
): OrderedStudyTrialDefinition {
  const definition = createTaskTrials(
    taskId,
    conditionOrder,
  ).find((trial) => trial.trialOrder === trialOrder);

  if (!definition) {
    throw new Error(
      `No ${taskId} trial is configured for order ${trialOrder}.`,
    );
  }

  return { ...definition };
}
