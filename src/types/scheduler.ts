export type Room = "A" | "B" | "C";
export type Slot = 1 | 2 | 3 | 4;
export type Topic = "NLP" | "Health" | "Robotics";
export type ConcretizationLevel = "A" | "B" | "C";

/*
 * Stable condition-option identity inside a task domain:
 * 1 = condition A, 2 = condition B, 3 = condition C.
 */
export type StudyTrialNumber = 1 | 2 | 3;

/*
 * Actual chronological order of the three selected task-domain trials.
 * This value is assigned only when a selected option starts.
 */
export type StudyTrialOrder = 1 | 2 | 3;
export type UnassignedStudyTrialOrder = 0;
export type StudyTrialOrderValue =
  | UnassignedStudyTrialOrder
  | StudyTrialOrder;

/*
 * Display/order position of a condition option inside one task domain.
 * This is not the participant's chronological trial order.
 */
export type StudyConditionOptionOrder =
  StudyTrialNumber;

export const STUDY_TASK_IDS = [
  "symposium",
  "delivery",
  "clinic",
] as const;

export type StudyTaskId =
  (typeof STUDY_TASK_IDS)[number];

export type ProbeDisplayMode =
  | "persistent"
  | "transient";

export const STUDY_TRIAL_NUMBERS = [
  1,
  2,
  3,
] as const;

export const STUDY_TRIAL_ORDERS = [
  1,
  2,
  3,
] as const;

/*
 * There are nine selectable task-condition options, but each participant
 * completes exactly three trials: one Symposium, one Delivery, and one Clinic.
 */
export const CONDITION_OPTIONS_PER_TASK =
  STUDY_TRIAL_NUMBERS.length;
export const TRIALS_PER_TASK =
  CONDITION_OPTIONS_PER_TASK;
export const TOTAL_TASK_DOMAINS =
  STUDY_TASK_IDS.length;
export const REQUIRED_COMPLETED_TRIALS =
  TOTAL_TASK_DOMAINS;
export const TOTAL_STUDY_TRIALS =
  REQUIRED_COMPLETED_TRIALS;
export const TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS =
  TOTAL_TASK_DOMAINS *
  CONDITION_OPTIONS_PER_TASK;

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

export const DEFAULT_CONDITION_ORDER:
  ConditionOrder = "ABC";

export interface RoomDetails {
  capacity: number;

  /*
   * Shared structural flag:
   * Symposium = projector,
   * Delivery = refrigeration,
   * Clinic = ICU certification.
   */
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

export interface Placement
  extends Cell {
  talkId: string;
}

export type DragOrigin =
  | "grid"
  | "tray";

export interface SchedulerState {
  level: ConcretizationLevel;
  trialNumber: StudyTrialNumber;
  placements: Placement[];
  unassignedTalkIds: string[];
  activeTalkId: string | null;

  /*
   * Optional fields preserve compatibility while carrying task-aware
   * runtime state. trialOrder is 0 until the selected option starts.
   */
  taskId?: StudyTaskId;
  trialOrder?: StudyTrialOrderValue;
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

  /*
   * talkIds is retained for compatibility. itemIds is the task-neutral field
   * for Symposium talks, Delivery shipments, and Clinic duties.
   */
  talkIds?: string[];
  itemIds?: string[];

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

export type ScheduleMoveAction =
  | "move"
  | "swap";

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
 * One of the three selectable assistance-condition options inside a domain.
 * optionOrder is presentation/counterbalancing metadata, not chronology.
 */
export interface StudyTaskConditionOptionDefinition
  extends StudyTrialDefinition {
  optionOrder: StudyConditionOptionOrder;
  conditionOrder: ConditionOrder;
}

/*
 * A selected trial after it has started. trialOrder is the actual session
 * chronology and can only be 1, 2, or 3.
 */
export interface OrderedStudyTrialDefinition
  extends StudyTrialDefinition {
  trialOrder: StudyTrialOrder;
  conditionOrder: ConditionOrder;
}

/*
 * Retained as compatibility names for existing Symposium imports.
 */
export interface SymposiumTrialDefinition
  extends StudyTrialDefinition {}

export interface OrderedSymposiumTrialDefinition
  extends StudyTaskConditionOptionDefinition {
  /**
   * @deprecated This is the condition-option order, not runtime chronology.
   * Use optionOrder for new code.
   */
  trialOrder: StudyConditionOptionOrder;
}

/*
 * Stable metadata for one of the nine selectable task-condition options.
 * trialOrder remains 0 until the option is actually selected and started.
 */
export interface CompositeStudyTrialDefinition
  extends StudyTaskConditionOptionDefinition {
  outerTaskNumber: number;
  globalOptionNumber: number;

  /**
   * @deprecated Stable 1–9 option identifier retained for CSV compatibility.
   * It is not chronological trial order.
   */
  globalTrialNumber: number;

  trialId: string;
  trialOrder: UnassignedStudyTrialOrder;
}

export function isStudyTrialNumber(
  value: unknown,
): value is StudyTrialNumber {
  return (
    value === 1 ||
    value === 2 ||
    value === 3
  );
}

export function isStudyTrialOrder(
  value: unknown,
): value is StudyTrialOrder {
  return (
    value === 1 ||
    value === 2 ||
    value === 3
  );
}

export function isStudyTrialOrderValue(
  value: unknown,
): value is StudyTrialOrderValue {
  return (
    value === 0 ||
    isStudyTrialOrder(value)
  );
}

export function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

export function isConcretizationLevel(
  value: unknown,
): value is ConcretizationLevel {
  return (
    value === "A" ||
    value === "B" ||
    value === "C"
  );
}

export function isConditionOrder(
  value: unknown,
): value is ConditionOrder {
  return CONDITION_ORDERS.includes(
    value as ConditionOrder,
  );
}

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

export function getConditionForOptionOrder(
  optionOrder: StudyConditionOptionOrder,
  conditionOrder: ConditionOrder,
): ConcretizationLevel {
  const condition =
    conditionOrder[
      optionOrder - 1
    ];

  if (
    !isConcretizationLevel(
      condition,
    )
  ) {
    throw new Error(
      `No condition is configured for option order ${optionOrder} in order ${conditionOrder}.`,
    );
  }

  return condition;
}

/*
 * Compatibility alias. The argument is a condition-option order, not the
 * participant's actual chronological trial order.
 */
export function getConditionForTrialOrder(
  trialOrder: StudyConditionOptionOrder,
  conditionOrder: ConditionOrder,
): ConcretizationLevel {
  return getConditionForOptionOrder(
    trialOrder,
    conditionOrder,
  );
}

export function getTaskNumber(
  taskId: StudyTaskId,
): number {
  const taskIndex =
    STUDY_TASK_IDS.indexOf(
      taskId,
    );

  if (taskIndex < 0) {
    throw new Error(
      `Unknown study task: ${taskId}.`,
    );
  }

  return taskIndex + 1;
}

export function getGlobalOptionNumber(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): number {
  return (
    (getTaskNumber(taskId) - 1) *
      CONDITION_OPTIONS_PER_TASK +
    trialNumber
  );
}

/*
 * Compatibility alias for the stable 1–9 task-condition option identifier.
 * It must never be used as chronological trial order.
 */
export function getGlobalTrialNumber(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): number {
  return getGlobalOptionNumber(
    taskId,
    trialNumber,
  );
}

export function createCompositeTrialId(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `${taskId}-${getConditionForTrial(
    trialNumber,
  )}`;
}

export function createTaskConditionOptions(
  taskId: StudyTaskId,
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
): StudyTaskConditionOptionDefinition[] {
  return STUDY_TRIAL_NUMBERS.map(
    (optionOrder) => {
      const condition =
        getConditionForOptionOrder(
          optionOrder,
          conditionOrder,
        );

      const trialNumber =
        getTrialNumberForCondition(
          condition,
        );

      return {
        trialNumber,
        optionOrder,
        taskId,
        condition,
        participantLabel:
          `Task ${trialNumber}`,
        conditionOrder,
      };
    },
  );
}

/*
 * Compatibility helper for older code that expects trialOrder here.
 * The returned trialOrder is only an alias of optionOrder.
 */
export function createTaskTrials(
  taskId: StudyTaskId,
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
): OrderedSymposiumTrialDefinition[] {
  return createTaskConditionOptions(
    taskId,
    conditionOrder,
  ).map(
    (option) => ({
      ...option,
      trialOrder:
        option.optionOrder,
    }),
  );
}

export function createSymposiumTrials(
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
): OrderedSymposiumTrialDefinition[] {
  return createTaskTrials(
    "symposium",
    conditionOrder,
  ).map(
    (option) => ({
      ...option,
      taskId: "symposium",
    }),
  );
}

export function createStudyTaskConditionOptions(
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
): CompositeStudyTrialDefinition[] {
  return STUDY_TASK_IDS.flatMap(
    (taskId) =>
      createTaskConditionOptions(
        taskId,
        conditionOrder,
      ).map(
        (option) => {
          const globalOptionNumber =
            getGlobalOptionNumber(
              taskId,
              option.trialNumber,
            );

          return {
            ...option,
            outerTaskNumber:
              getTaskNumber(
                taskId,
              ),
            globalOptionNumber,
            globalTrialNumber:
              globalOptionNumber,
            trialId:
              createCompositeTrialId(
                taskId,
                option.trialNumber,
              ),
            trialOrder: 0,
          };
        },
      ),
  );
}

/*
 * Compatibility name. This creates the nine selectable options, not nine
 * participant trials. Each returned option has trialOrder = 0.
 */
export function createStudyTrials(
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
): CompositeStudyTrialDefinition[] {
  return createStudyTaskConditionOptions(
    conditionOrder,
  );
}

export const SYMPOSIUM_TRIALS:
  OrderedSymposiumTrialDefinition[] =
    createSymposiumTrials();

export const STUDY_TASK_CONDITION_OPTIONS:
  CompositeStudyTrialDefinition[] =
    createStudyTaskConditionOptions();

/*
 * Compatibility alias retained for existing imports.
 */
export const STUDY_TRIALS:
  CompositeStudyTrialDefinition[] =
    STUDY_TASK_CONDITION_OPTIONS.map(
      (option) => ({
        ...option,
      }),
    );

export function getTrialDefinition(
  trialNumber: StudyTrialNumber,
  taskId:
    StudyTaskId =
      "symposium",
): StudyTrialDefinition {
  const definition =
    createTaskConditionOptions(
      taskId,
    ).find(
      (option) =>
        option.trialNumber ===
        trialNumber,
    );

  if (!definition) {
    throw new Error(
      `No ${taskId} condition option is configured for trial number ${trialNumber}.`,
    );
  }

  return {
    trialNumber:
      definition.trialNumber,
    taskId:
      definition.taskId,
    condition:
      definition.condition,
    participantLabel:
      definition.participantLabel,
  };
}

export function getTrialDefinitionByOptionOrder(
  optionOrder:
    StudyConditionOptionOrder,
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
  taskId:
    StudyTaskId =
      "symposium",
): StudyTaskConditionOptionDefinition {
  const definition =
    createTaskConditionOptions(
      taskId,
      conditionOrder,
    ).find(
      (option) =>
        option.optionOrder ===
        optionOrder,
    );

  if (!definition) {
    throw new Error(
      `No ${taskId} condition option is configured for option order ${optionOrder}.`,
    );
  }

  return {
    ...definition,
  };
}

/*
 * Compatibility helper. The argument refers to condition-option order.
 */
export function getTrialDefinitionByOrder(
  trialOrder:
    StudyConditionOptionOrder,
  conditionOrder:
    ConditionOrder =
      DEFAULT_CONDITION_ORDER,
  taskId:
    StudyTaskId =
      "symposium",
): OrderedSymposiumTrialDefinition {
  const definition =
    getTrialDefinitionByOptionOrder(
      trialOrder,
      conditionOrder,
      taskId,
    );

  return {
    ...definition,
    trialOrder:
      definition.optionOrder,
  };
}
