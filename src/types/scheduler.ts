export type Room =
  | "A"
  | "B"
  | "C";

export type Slot =
  | 1
  | 2
  | 3
  | 4;

export type Topic =
  | "NLP"
  | "Health"
  | "Robotics";

export type ConcretizationLevel =
  | "A"
  | "B"
  | "C";

export type StudyTrialNumber =
  | 1
  | 2
  | 3;

export type StudyTaskId =
  "symposium";

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

export interface Placement
  extends Cell {
  talkId: string;
}

export interface SchedulerState {
  level: ConcretizationLevel;

  trialNumber:
    StudyTrialNumber;

  placements:
    Placement[];

  unassignedTalkIds:
    string[];

  activeTalkId:
    string | null;
}

export type ConstraintViolationType =
  | "speaker_conflict"
  | "room_restriction"
  | "slot_restriction"
  | "projector_requirement"
  | "capacity_requirement"
  | "missing_assignment"
  | "duplicate_assignment";

export interface ConstraintViolation {
  id: string;

  type?:
    ConstraintViolationType;

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

  shownAt?: number;
  openedAt?: number;
  acknowledgedAt?: number;

  latencyMs?: number | null;
}

export interface ScheduleMove {
  talkId: string;

  fromRoom?: Room;
  fromSlot?: Slot;

  toRoom: Room;
  toSlot: Slot;

  action:
    | "move"
    | "swap";

  success: boolean;
}

export interface SymposiumTrialDefinition {
  trialNumber:
    StudyTrialNumber;

  taskId:
    StudyTaskId;

  condition:
    ConcretizationLevel;

  participantLabel: string;
}

export const SYMPOSIUM_TRIALS:
  SymposiumTrialDefinition[] = [
    {
      trialNumber: 1,
      taskId: "symposium",
      condition: "A",
      participantLabel: "Task 1",
    },
    {
      trialNumber: 2,
      taskId: "symposium",
      condition: "B",
      participantLabel: "Task 2",
    },
    {
      trialNumber: 3,
      taskId: "symposium",
      condition: "C",
      participantLabel: "Task 3",
    },
  ];

export function isStudyTrialNumber(
  value: unknown,
): value is StudyTrialNumber {
  return (
    value === 1 ||
    value === 2 ||
    value === 3
  );
}

export function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return value === "symposium";
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

export function getTrialDefinition(
  trialNumber: StudyTrialNumber,
): SymposiumTrialDefinition {
  const definition =
    SYMPOSIUM_TRIALS.find(
      (trial) =>
        trial.trialNumber ===
        trialNumber,
    );

  if (!definition) {
    throw new Error(
      `No Symposium trial is configured for trial ${trialNumber}.`,
    );
  }

  return {
    ...definition,
  };
}