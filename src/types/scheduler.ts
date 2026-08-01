export type Room = "A" | "B" | "C";
export type Slot = 1 | 2 | 3 | 4;
export type Topic = "NLP" | "Health" | "Robotics";
export type ConcretizationLevel = "A" | "B" | "C";
export type StudyTrialNumber = 1 | 2 | 3;
export type StudyTrialOrder = StudyTrialNumber;
export type StudyTaskId = "symposium";
export type ProbeDisplayMode = "persistent" | "transient";

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
   * Optional fields preserve compatibility with the existing store while
   * allowing later files to carry serial order and lock state explicitly.
   */
  trialOrder?: StudyTrialOrder;
  conditionOrder?: ConditionOrder;
  activeDragOrigin?: DragOrigin | null;
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
  | "duplicate_assignment";

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

export interface SymposiumTrialDefinition {
  trialNumber: StudyTrialNumber;
  taskId: StudyTaskId;
  condition: ConcretizationLevel;
  participantLabel: string;
}

export interface OrderedSymposiumTrialDefinition
  extends SymposiumTrialDefinition {
  trialOrder: StudyTrialOrder;
  conditionOrder: ConditionOrder;
}

export function isStudyTrialNumber(
  value: unknown,
): value is StudyTrialNumber {
  return value === 1 || value === 2 || value === 3;
}

export function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return value === "symposium";
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
  return conditionOrder[
    trialOrder - 1
  ] as ConcretizationLevel;
}

export function createSymposiumTrials(
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): OrderedSymposiumTrialDefinition[] {
  return ([1, 2, 3] as StudyTrialOrder[]).map(
    (trialOrder) => {
      const condition = getConditionForTrialOrder(
        trialOrder,
        conditionOrder,
      );

      return {
        trialNumber: getTrialNumberForCondition(condition),
        trialOrder,
        taskId: "symposium",
        condition,
        participantLabel: `Task ${trialOrder}`,
        conditionOrder,
      };
    },
  );
}

export const SYMPOSIUM_TRIALS:
  OrderedSymposiumTrialDefinition[] =
    createSymposiumTrials();

export function getTrialDefinition(
  trialNumber: StudyTrialNumber,
): SymposiumTrialDefinition {
  const definition = SYMPOSIUM_TRIALS.find(
    (trial) => trial.trialNumber === trialNumber,
  );

  if (!definition) {
    throw new Error(
      `No Symposium trial is configured for trial ${trialNumber}.`,
    );
  }

  return { ...definition };
}

export function getTrialDefinitionByOrder(
  trialOrder: StudyTrialOrder,
  conditionOrder: ConditionOrder =
    DEFAULT_CONDITION_ORDER,
): OrderedSymposiumTrialDefinition {
  const definition = createSymposiumTrials(
    conditionOrder,
  ).find((trial) => trial.trialOrder === trialOrder);

  if (!definition) {
    throw new Error(
      `No Symposium trial is configured for order ${trialOrder}.`,
    );
  }

  return { ...definition };
}
