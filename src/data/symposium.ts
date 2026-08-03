import type {
  ConcretizationLevel,
  Placement,
  Room,
  RoomDetails,
  Slot,
  StudyTrialNumber,
  Talk,
  Topic,
} from "../types/scheduler";
import { getConditionForTrial } from "../types/scheduler";

export type SupportedStudyTaskId =
  | "symposium"
  | "delivery"
  | "clinic";

export const STUDY_TASK_IDS: readonly SupportedStudyTaskId[] = [
  "symposium",
  "delivery",
  "clinic",
];

export function isSupportedStudyTaskId(
  value: unknown,
): value is SupportedStudyTaskId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

export const SYMPOSIUM_TASK_VERSION = "symposium-v3";
export const AI_ARTIFACT_VERSION = "symposium-ai-artifact-v1";
export const AI_MESSAGE_VERSION = "symposium-ai-message-v2";
export const SEMANTIC_PROBE_VERSION = "room-c-projector-failure-v2";
export const SCORING_VERSION = "symposium-score-v3";

export const DELIVERY_TASK_VERSION = "delivery-v1";
export const DELIVERY_AI_ARTIFACT_VERSION =
  "delivery-ai-artifact-v1";
export const DELIVERY_AI_MESSAGE_VERSION =
  "delivery-ai-message-v1";
export const DELIVERY_SEMANTIC_PROBE_VERSION =
  "van-c-refrigeration-failure-v1";
export const DELIVERY_SCORING_VERSION = "delivery-score-v1";

export const CLINIC_TASK_VERSION = "clinic-v1";
export const CLINIC_AI_ARTIFACT_VERSION =
  "clinic-ai-artifact-v1";
export const CLINIC_AI_MESSAGE_VERSION =
  "clinic-ai-message-v1";
export const CLINIC_SEMANTIC_PROBE_VERSION =
  "ward-c-icu-certification-loss-v1";
export const CLINIC_SCORING_VERSION = "clinic-score-v1";

export interface StudyTaskDefinition {
  id: SupportedStudyTaskId;
  title: string;
  shortTitle: string;
  description: string;
  totalItems: number;
  totalResources: number;
  totalPeriods: number;
  durationSeconds: number;
  taskVersion: string;
  artifactVersion: string;
  messageVersion: string;
  probeVersion: string;
  scoringVersion: string;
}

export const SYMPOSIUM_TASK = {
  id: "symposium" as const,
  title: "Symposium Scheduler",
  shortTitle: "Symposium",
  description:
    "Arrange twelve symposium talks across three rooms and four time slots while satisfying the scheduling requirements.",
  totalTalks: 12,
  totalRooms: 3,
  totalSlots: 4,
  totalItems: 12,
  totalResources: 3,
  totalPeriods: 4,
  durationSeconds: 15 * 60,
  taskVersion: SYMPOSIUM_TASK_VERSION,
  artifactVersion: AI_ARTIFACT_VERSION,
  messageVersion: AI_MESSAGE_VERSION,
  probeVersion: SEMANTIC_PROBE_VERSION,
  scoringVersion: SCORING_VERSION,
};

export const DELIVERY_TASK = {
  id: "delivery" as const,
  title: "Delivery Dispatch",
  shortTitle: "Delivery",
  description:
    "Arrange twelve shipments across three vans and four route windows while satisfying the dispatch requirements.",
  totalShipments: 12,
  totalVans: 3,
  totalWindows: 4,
  totalItems: 12,
  totalResources: 3,
  totalPeriods: 4,
  durationSeconds: 15 * 60,
  taskVersion: DELIVERY_TASK_VERSION,
  artifactVersion: DELIVERY_AI_ARTIFACT_VERSION,
  messageVersion: DELIVERY_AI_MESSAGE_VERSION,
  probeVersion: DELIVERY_SEMANTIC_PROBE_VERSION,
  scoringVersion: DELIVERY_SCORING_VERSION,
};

export const CLINIC_TASK = {
  id: "clinic" as const,
  title: "Clinic Roster",
  shortTitle: "Clinic",
  description:
    "Arrange twelve clinical duties across three wards and four shifts while satisfying the roster requirements.",
  totalDuties: 12,
  totalWards: 3,
  totalShifts: 4,
  totalItems: 12,
  totalResources: 3,
  totalPeriods: 4,
  durationSeconds: 15 * 60,
  taskVersion: CLINIC_TASK_VERSION,
  artifactVersion: CLINIC_AI_ARTIFACT_VERSION,
  messageVersion: CLINIC_AI_MESSAGE_VERSION,
  probeVersion: CLINIC_SEMANTIC_PROBE_VERSION,
  scoringVersion: CLINIC_SCORING_VERSION,
};

export const STUDY_TASKS: readonly StudyTaskDefinition[] = [
  SYMPOSIUM_TASK,
  DELIVERY_TASK,
  CLINIC_TASK,
];

export const STUDY_TASK_BY_ID: Record<
  SupportedStudyTaskId,
  StudyTaskDefinition
> = {
  symposium: SYMPOSIUM_TASK,
  delivery: DELIVERY_TASK,
  clinic: CLINIC_TASK,
};

export function getStudyTaskDefinition(
  taskId: SupportedStudyTaskId,
): StudyTaskDefinition {
  return {
    ...STUDY_TASK_BY_ID[taskId],
  };
}

export interface TaskConstraintDefinition {
  id: string;
  number: 1 | 2 | 3;
  text: string;
}

export interface SymposiumConstraintDefinition
  extends TaskConstraintDefinition {
  id:
    | "projector_requirement"
    | "capacity_requirement"
    | "speaker_availability";
}

export const SYMPOSIUM_CONSTRAINTS: SymposiumConstraintDefinition[] = [
  {
    id: "projector_requirement",
    number: 1,
    text:
      "Demo talks N1, R1, R2, and R3 require a projector. They may only use Room A or Room C.",
  },
  {
    id: "capacity_requirement",
    number: 2,
    text:
      "Talk N3 requires at least 80 seats. It may only use Room A or Room B.",
  },
  {
    id: "speaker_availability",
    number: 3,
    text:
      "A speaker cannot present more than one talk during the same slot.",
  },
];

export const DELIVERY_CONSTRAINTS: TaskConstraintDefinition[] = [
  {
    id: "refrigeration_requirement",
    number: 1,
    text:
      "Cold-chain shipments N1, R1, R2, and R3 require refrigeration. They may only use Van A or Van C.",
  },
  {
    id: "van_capacity_requirement",
    number: 2,
    text:
      "Shipment N3 requires a van capacity of at least 80 units. It may only use Van A or Van B.",
  },
  {
    id: "driver_availability",
    number: 3,
    text:
      "A driver cannot handle more than one shipment during the same route window.",
  },
];

export const CLINIC_CONSTRAINTS: TaskConstraintDefinition[] = [
  {
    id: "icu_requirement",
    number: 1,
    text:
      "ICU-required duties N1, R1, R2, and R3 must use an ICU-certified ward. They may only use Ward A or Ward C.",
  },
  {
    id: "ward_capacity_requirement",
    number: 2,
    text:
      "Duty N3 requires a ward capacity of at least 80 patients. It may only use Ward A or Ward B.",
  },
  {
    id: "nurse_availability",
    number: 3,
    text:
      "A nurse cannot perform more than one duty during the same shift.",
  },
];

export interface TaskPreferenceDefinition {
  id: string;
  number: 1 | 2;
  text: string;
}

export interface SymposiumPreferenceDefinition
  extends TaskPreferenceDefinition {
  id: "topic_grouping" | "keynote_opening";
}

export const SYMPOSIUM_PREFERENCES: SymposiumPreferenceDefinition[] = [
  {
    id: "topic_grouping",
    number: 1,
    text:
      "Where possible, keep talks from the same topic grouped in the same room.",
  },
  {
    id: "keynote_opening",
    number: 2,
    text: "Prefer keynote N1 in Room A during Slot 1.",
  },
];

export const DELIVERY_PREFERENCES: TaskPreferenceDefinition[] = [
  {
    id: "region_grouping",
    number: 1,
    text:
      "Where possible, keep shipments from the same region grouped on the same van.",
  },
  {
    id: "priority_dispatch",
    number: 2,
    text:
      "Prefer priority shipment N1 in Van A during Window 1.",
  },
];

export const CLINIC_PREFERENCES: TaskPreferenceDefinition[] = [
  {
    id: "specialty_grouping",
    number: 1,
    text:
      "Where possible, keep duties from the same specialty grouped in the same ward.",
  },
  {
    id: "priority_duty",
    number: 2,
    text:
      "Prefer priority duty N1 in Ward A during Shift 1.",
  },
];

export const TASK_CONSTRAINTS_BY_ID: Record<
  SupportedStudyTaskId,
  readonly TaskConstraintDefinition[]
> = {
  symposium: SYMPOSIUM_CONSTRAINTS,
  delivery: DELIVERY_CONSTRAINTS,
  clinic: CLINIC_CONSTRAINTS,
};

export const TASK_PREFERENCES_BY_ID: Record<
  SupportedStudyTaskId,
  readonly TaskPreferenceDefinition[]
> = {
  symposium: SYMPOSIUM_PREFERENCES,
  delivery: DELIVERY_PREFERENCES,
  clinic: CLINIC_PREFERENCES,
};

export function getTaskConstraints(
  taskId: SupportedStudyTaskId,
): readonly TaskConstraintDefinition[] {
  return TASK_CONSTRAINTS_BY_ID[taskId];
}

export function getTaskPreferences(
  taskId: SupportedStudyTaskId,
): readonly TaskPreferenceDefinition[] {
  return TASK_PREFERENCES_BY_ID[taskId];
}

export const ROOMS: Room[] = ["A", "B", "C"];
export const SLOTS: Slot[] = [1, 2, 3, 4];

export const ROOM_DETAILS: Record<Room, RoomDetails> = {
  A: {
    capacity: 120,
    hasProjector: true,
  },
  B: {
    capacity: 80,
    hasProjector: false,
  },
  C: {
    capacity: 60,
    hasProjector: true,
  },
};

/*
 * The shared RoomDetails shape is intentionally reused by the two
 * isomorphic task skins. In delivery, hasProjector means refrigeration.
 * In clinic, it means ICU certification.
 */
export const DELIVERY_VAN_DETAILS: Record<Room, RoomDetails> = {
  A: {
    capacity: 120,
    hasProjector: true,
  },
  B: {
    capacity: 80,
    hasProjector: false,
  },
  C: {
    capacity: 60,
    hasProjector: true,
  },
};

export const CLINIC_WARD_DETAILS: Record<Room, RoomDetails> = {
  A: {
    capacity: 120,
    hasProjector: true,
  },
  B: {
    capacity: 80,
    hasProjector: false,
  },
  C: {
    capacity: 60,
    hasProjector: true,
  },
};

export const TASK_RESOURCE_DETAILS_BY_ID: Record<
  SupportedStudyTaskId,
  Record<Room, RoomDetails>
> = {
  symposium: ROOM_DETAILS,
  delivery: DELIVERY_VAN_DETAILS,
  clinic: CLINIC_WARD_DETAILS,
};

/*
 * Internal category and person keys intentionally remain identical across
 * all three skins. This preserves the verified constraint geometry while
 * participant-facing helpers provide task-appropriate labels.
 */
export const TALKS: Talk[] = [
  {
    id: "N1",
    title: "NLP Keynote",
    topic: "NLP",
    demo: true,
    allowedSlots: [1],
    allowedRooms: ["A", "C"],
  },
  {
    id: "N2",
    title: "NLP Invited Talk",
    topic: "NLP",
    demo: false,
    speaker: "Osei",
    allowedSlots: [3],
    allowedRooms: ["A", "B", "C"],
  },
  {
    id: "N3",
    title: "Advanced NLP",
    topic: "NLP",
    demo: false,
    speaker: "Kim",
    allowedSlots: [2, 3],
    allowedRooms: ["A", "B"],
  },
  {
    id: "N4",
    title: "Language Models",
    topic: "NLP",
    demo: false,
    allowedSlots: [3, 4],
    allowedRooms: ["A", "B", "C"],
  },
  {
    id: "H1",
    title: "Digital Health",
    topic: "Health",
    demo: false,
    speaker: "Kim",
    allowedSlots: [2, 3, 4],
    allowedRooms: ["A", "B", "C"],
  },
  {
    id: "H2",
    title: "Health Analytics",
    topic: "Health",
    demo: false,
    speaker: "Osei",
    allowedSlots: [2, 3],
    allowedRooms: ["A", "B", "C"],
  },
  {
    id: "H3",
    title: "Health Systems",
    topic: "Health",
    demo: false,
    allowedSlots: [1, 2, 3, 4],
    allowedRooms: ["A", "B", "C"],
  },
  {
    id: "H4",
    title: "Closing Panel",
    topic: "Health",
    demo: false,
    speaker: "Laurent",
    allowedSlots: [4],
    allowedRooms: ["A", "B", "C"],
  },
  {
    id: "R1",
    title: "Robotics Demo",
    topic: "Robotics",
    demo: true,
    allowedSlots: [1, 2],
    allowedRooms: ["A", "C"],
  },
  {
    id: "R2",
    title: "Robot Control",
    topic: "Robotics",
    demo: true,
    speaker: "Kim",
    allowedSlots: [2, 3],
    allowedRooms: ["A", "C"],
  },
  {
    id: "R3",
    title: "Industrial Robotics",
    topic: "Robotics",
    demo: true,
    allowedSlots: [1, 2, 3, 4],
    allowedRooms: ["A", "C"],
  },
  {
    id: "R4",
    title: "Robotics Future",
    topic: "Robotics",
    demo: false,
    speaker: "Laurent",
    allowedSlots: [1, 2, 3, 4],
    allowedRooms: ["A", "B", "C"],
  },
];

const DELIVERY_TITLES: Record<string, string> = {
  N1: "Northern Vaccine Shipment",
  N2: "Northern Priority Parcel",
  N3: "Northern Medical Supplies",
  N4: "Northern Retail Delivery",
  H1: "Central Hospital Supplies",
  H2: "Central Grocery Delivery",
  H3: "Central General Freight",
  H4: "Central Closing Dispatch",
  R1: "Southern Frozen Goods",
  R2: "Southern Biologics Shipment",
  R3: "Southern Cold Storage Load",
  R4: "Southern General Freight",
};

const CLINIC_TITLES: Record<string, string> = {
  N1: "Emergency ICU Intake",
  N2: "Emergency Medication Round",
  N3: "Emergency High-Demand Duty",
  N4: "Emergency Follow-Up",
  H1: "General Medicine Intake",
  H2: "General Medicine Round",
  H3: "General Ward Support",
  H4: "General Discharge Review",
  R1: "Critical Care Assessment",
  R2: "Critical Care Monitoring",
  R3: "Critical Care Procedure",
  R4: "Critical Care Follow-Up",
};

function createRelabelledItems(
  titles: Record<string, string>,
): Talk[] {
  return TALKS.map((talk) => ({
    ...talk,
    title: titles[talk.id] ?? talk.title,
    allowedSlots: [...talk.allowedSlots],
    allowedRooms: [...talk.allowedRooms],
  }));
}

export const DELIVERY_SHIPMENTS: Talk[] =
  createRelabelledItems(DELIVERY_TITLES);

export const CLINIC_DUTIES: Talk[] =
  createRelabelledItems(CLINIC_TITLES);

export const TASK_ITEMS_BY_ID: Record<
  SupportedStudyTaskId,
  readonly Talk[]
> = {
  symposium: TALKS,
  delivery: DELIVERY_SHIPMENTS,
  clinic: CLINIC_DUTIES,
};

export function getTaskItems(
  taskId: SupportedStudyTaskId,
): readonly Talk[] {
  return TASK_ITEMS_BY_ID[taskId];
}

export const SPEAKER_DISPLAY_LABELS: Record<string, string> = {
  Osei: "Dr. Osei",
  Kim: "Dr. Chaky",
  Laurent: "Dr. Laurent",
};

export const DRIVER_DISPLAY_LABELS: Record<string, string> = {
  Osei: "Driver Osei",
  Kim: "Driver Chaky",
  Laurent: "Driver Laurent",
};

export const NURSE_DISPLAY_LABELS: Record<string, string> = {
  Osei: "Nurse Osei",
  Kim: "Nurse Chaky",
  Laurent: "Nurse Laurent",
};

export function getSpeakerDisplayLabel(
  speaker: string | undefined,
): string {
  if (!speaker) {
    return "No shared speaker constraint";
  }

  return SPEAKER_DISPLAY_LABELS[speaker] ?? `Dr. ${speaker}`;
}

export function getPersonDisplayLabel(
  taskId: SupportedStudyTaskId,
  person: string | undefined,
): string {
  if (!person) {
    switch (taskId) {
      case "delivery":
        return "No shared driver constraint";
      case "clinic":
        return "No shared nurse constraint";
      case "symposium":
      default:
        return "No shared speaker constraint";
    }
  }

  switch (taskId) {
    case "delivery":
      return DRIVER_DISPLAY_LABELS[person] ?? `Driver ${person}`;
    case "clinic":
      return NURSE_DISPLAY_LABELS[person] ?? `Nurse ${person}`;
    case "symposium":
    default:
      return getSpeakerDisplayLabel(person);
  }
}

export const CATEGORY_DISPLAY_LABELS_BY_TASK: Record<
  SupportedStudyTaskId,
  Record<string, string>
> = {
  symposium: {
    NLP: "NLP",
    Health: "Health",
    Robotics: "Robotics",
  },
  delivery: {
    NLP: "North",
    Health: "Central",
    Robotics: "South",
  },
  clinic: {
    NLP: "Emergency Care",
    Health: "General Medicine",
    Robotics: "Critical Care",
  },
};

export function getCategoryDisplayLabel(
  taskId: SupportedStudyTaskId,
  topic: Topic,
): string {
  return (
    CATEGORY_DISPLAY_LABELS_BY_TASK[taskId][topic] ??
    topic
  );
}

export const TALK_IDS = TALKS.map((talk) => talk.id);
export const DELIVERY_SHIPMENT_IDS = DELIVERY_SHIPMENTS.map(
  (shipment) => shipment.id,
);
export const CLINIC_DUTY_IDS = CLINIC_DUTIES.map(
  (duty) => duty.id,
);

export const DEMO_TALK_IDS = [
  "N1",
  "R1",
  "R2",
  "R3",
] as const;

export const COLD_CHAIN_SHIPMENT_IDS = [
  ...DEMO_TALK_IDS,
] as const;

export const ICU_REQUIRED_DUTY_IDS = [
  ...DEMO_TALK_IDS,
] as const;

export const POST_PROBE_AFFECTED_ROOM = "C" as const;
export const POST_PROBE_REQUIRED_PROJECTOR_ROOM = "A" as const;

export const POST_PROBE_REQUIRED_ROOM_A_TALKS = [
  "N1",
  "R1",
  "R2",
  "R3",
] as const;

export const POST_PROBE_REQUIRED_VAN_A_SHIPMENTS = [
  ...POST_PROBE_REQUIRED_ROOM_A_TALKS,
] as const;

export const POST_PROBE_REQUIRED_WARD_A_DUTIES = [
  ...POST_PROBE_REQUIRED_ROOM_A_TALKS,
] as const;

export type PostProbeRequiredTalkId =
  (typeof POST_PROBE_REQUIRED_ROOM_A_TALKS)[number];

export interface PostProbeConstraintState {
  postProbeFeasible: boolean;
  unresolvedDemoTalkIds: PostProbeRequiredTalkId[];
}

export const AI_ROOM_TRACK_TOPICS: Record<Room, Topic> = {
  A: "NLP",
  B: "Health",
  C: "Robotics",
};

export const AI_VAN_REGION_LABELS: Record<Room, string> = {
  A: "North",
  B: "Central",
  C: "South",
};

export const AI_WARD_SPECIALTY_LABELS: Record<Room, string> = {
  A: "Emergency Care",
  B: "General Medicine",
  C: "Critical Care",
};

export interface SpeakerConflictPair {
  id: string;
  speaker: string;
  firstTalkId: string;
  secondTalkId: string;
}

export const SPEAKER_CONFLICT_PAIRS: SpeakerConflictPair[] = [
  {
    id: "osei-n2-h2",
    speaker: "Osei",
    firstTalkId: "N2",
    secondTalkId: "H2",
  },
  {
    id: "kim-n3-h1",
    speaker: "Kim",
    firstTalkId: "N3",
    secondTalkId: "H1",
  },
  {
    id: "kim-n3-r2",
    speaker: "Kim",
    firstTalkId: "N3",
    secondTalkId: "R2",
  },
  {
    id: "kim-h1-r2",
    speaker: "Kim",
    firstTalkId: "H1",
    secondTalkId: "R2",
  },
  {
    id: "laurent-h4-r4",
    speaker: "Laurent",
    firstTalkId: "H4",
    secondTalkId: "R4",
  },
];

export const DRIVER_CONFLICT_PAIRS: SpeakerConflictPair[] =
  SPEAKER_CONFLICT_PAIRS.map((pair) => ({ ...pair }));

export const NURSE_CONFLICT_PAIRS: SpeakerConflictPair[] =
  SPEAKER_CONFLICT_PAIRS.map((pair) => ({ ...pair }));

export const TASK_CONFLICT_PAIRS_BY_ID: Record<
  SupportedStudyTaskId,
  readonly SpeakerConflictPair[]
> = {
  symposium: SPEAKER_CONFLICT_PAIRS,
  delivery: DRIVER_CONFLICT_PAIRS,
  clinic: NURSE_CONFLICT_PAIRS,
};

export const SYMPOSIUM_SCORING = {
  scoreUnit: "weighted_points" as const,
  theoreticalMaximumScore: 89,
  maximumScore: 89,
  totalSpeakerPairChecks: 5,
  speakerPairWeight: 12,
  totalSameTopicPairs: 18,
  sameTopicPairWeight: 1.5,
  keynoteBonus: 2,
  keynoteTalkId: "N1",
  keynoteRequiredRoom: "A" as Room,
  aiArtifactScore: 77,
  aiArtifactScoreProportionOfTheoreticalMaximum: 77 / 89,
  aiArtifactScorePercentageOfTheoreticalMaximum:
    (77 / 89) * 100,

  /*
   * Legacy field retained so existing interface code does not break.
   * Its value is a proportion from zero to one.
   */
  aiArtifactScorePercentage: 77 / 89,
};

/*
 * The three tasks are isomorphic, so their verified score landscape and
 * placement coordinates are intentionally identical.
 */
export const DELIVERY_SCORING = {
  ...SYMPOSIUM_SCORING,
};

export const CLINIC_SCORING = {
  ...SYMPOSIUM_SCORING,
};

export const TASK_SCORING_BY_ID = {
  symposium: SYMPOSIUM_SCORING,
  delivery: DELIVERY_SCORING,
  clinic: CLINIC_SCORING,
} as const;

function clonePlacements(
  placements: readonly Placement[],
): Placement[] {
  return placements.map((placement) => ({
    ...placement,
  }));
}

export const AI_STRATEGY_ARTIFACT: Placement[] = [];

export const AI_PARTIAL_ARTIFACT: Placement[] = [
  { talkId: "N1", room: "A", slot: 1 },
  { talkId: "H4", room: "B", slot: 4 },
  { talkId: "R1", room: "C", slot: 1 },
  { talkId: "R2", room: "C", slot: 2 },
];

export const AI_FULL_ARTIFACT: Placement[] = [
  { talkId: "N1", room: "A", slot: 1 },
  { talkId: "N3", room: "A", slot: 2 },
  { talkId: "N2", room: "A", slot: 3 },
  { talkId: "N4", room: "A", slot: 4 },
  { talkId: "H3", room: "B", slot: 1 },
  { talkId: "H2", room: "B", slot: 2 },
  { talkId: "H1", room: "B", slot: 3 },
  { talkId: "H4", room: "B", slot: 4 },
  { talkId: "R1", room: "C", slot: 1 },
  { talkId: "R2", room: "C", slot: 2 },
  { talkId: "R4", room: "C", slot: 3 },
  { talkId: "R3", room: "C", slot: 4 },
];

export const DELIVERY_AI_STRATEGY_ARTIFACT: Placement[] = [];
export const DELIVERY_AI_PARTIAL_ARTIFACT: Placement[] =
  clonePlacements(AI_PARTIAL_ARTIFACT);
export const DELIVERY_AI_FULL_ARTIFACT: Placement[] =
  clonePlacements(AI_FULL_ARTIFACT);

export const CLINIC_AI_STRATEGY_ARTIFACT: Placement[] = [];
export const CLINIC_AI_PARTIAL_ARTIFACT: Placement[] =
  clonePlacements(AI_PARTIAL_ARTIFACT);
export const CLINIC_AI_FULL_ARTIFACT: Placement[] =
  clonePlacements(AI_FULL_ARTIFACT);

export const AI_ARTIFACTS_BY_TASK: Record<
  SupportedStudyTaskId,
  Record<ConcretizationLevel, readonly Placement[]>
> = {
  symposium: {
    A: AI_STRATEGY_ARTIFACT,
    B: AI_PARTIAL_ARTIFACT,
    C: AI_FULL_ARTIFACT,
  },
  delivery: {
    A: DELIVERY_AI_STRATEGY_ARTIFACT,
    B: DELIVERY_AI_PARTIAL_ARTIFACT,
    C: DELIVERY_AI_FULL_ARTIFACT,
  },
  clinic: {
    A: CLINIC_AI_STRATEGY_ARTIFACT,
    B: CLINIC_AI_PARTIAL_ARTIFACT,
    C: CLINIC_AI_FULL_ARTIFACT,
  },
};

export const VERIFIED_PRE_PROBE_OPTIMUM: Placement[] = [
  { talkId: "N1", room: "A", slot: 1 },
  { talkId: "N3", room: "A", slot: 2 },
  { talkId: "N2", room: "A", slot: 3 },
  { talkId: "H1", room: "A", slot: 4 },
  { talkId: "H3", room: "B", slot: 1 },
  { talkId: "H2", room: "B", slot: 2 },
  { talkId: "N4", room: "B", slot: 3 },
  { talkId: "H4", room: "B", slot: 4 },
  { talkId: "R1", room: "C", slot: 1 },
  { talkId: "R4", room: "C", slot: 2 },
  { talkId: "R2", room: "C", slot: 3 },
  { talkId: "R3", room: "C", slot: 4 },
];

export const VERIFIED_BEST_POST_PROBE_SOLUTION: Placement[] = [
  { talkId: "N1", room: "A", slot: 1 },
  { talkId: "R1", room: "A", slot: 2 },
  { talkId: "R2", room: "A", slot: 3 },
  { talkId: "R3", room: "A", slot: 4 },
  { talkId: "R4", room: "B", slot: 1 },
  { talkId: "N3", room: "B", slot: 2 },
  { talkId: "N2", room: "B", slot: 3 },
  { talkId: "H4", room: "B", slot: 4 },
  { talkId: "H3", room: "C", slot: 1 },
  { talkId: "H2", room: "C", slot: 2 },
  { talkId: "N4", room: "C", slot: 3 },
  { talkId: "H1", room: "C", slot: 4 },
];

export const VERIFIED_PRE_PROBE_OPTIMUM_BY_TASK: Record<
  SupportedStudyTaskId,
  readonly Placement[]
> = {
  symposium: VERIFIED_PRE_PROBE_OPTIMUM,
  delivery: VERIFIED_PRE_PROBE_OPTIMUM,
  clinic: VERIFIED_PRE_PROBE_OPTIMUM,
};

export const VERIFIED_BEST_POST_PROBE_SOLUTION_BY_TASK: Record<
  SupportedStudyTaskId,
  readonly Placement[]
> = {
  symposium: VERIFIED_BEST_POST_PROBE_SOLUTION,
  delivery: VERIFIED_BEST_POST_PROBE_SOLUTION,
  clinic: VERIFIED_BEST_POST_PROBE_SOLUTION,
};

export const SYMPOSIUM_ANALYSIS_BENCHMARKS = {
  benchmarkVersion: SCORING_VERSION,
  scoreUnit: SYMPOSIUM_SCORING.scoreUnit,
  theoreticalMaximumScore:
    SYMPOSIUM_SCORING.theoreticalMaximumScore,

  totalStructurallyLegalAssignments: 17_296,
  totalPreProbeHardFeasibleAssignments: 3_040,

  aiArtifactScore: SYMPOSIUM_SCORING.aiArtifactScore,
  aiArtifactHardChecksSatisfied: 4,
  aiArtifactTotalHardChecks: 5,
  aiArtifactCoherencePairsSatisfied: 18,
  aiArtifactVisibleConflictCount: 1,
  aiArtifactProportionOfTheoreticalMaximum: 77 / 89,
  aiArtifactPercentageOfTheoreticalMaximum:
    (77 / 89) * 100,

  legalSwapCountFromAiArtifact: 15,
  worseningLegalSwapCountFromAiArtifact: 14,
  plateauLegalSwapCountFromAiArtifact: 1,
  improvingLegalSwapCountFromAiArtifact: 0,

  verifiedPreProbeGlobalOptimumScore: 80,
  verifiedPreProbeGlobalOptimumProportionOfTheoreticalMaximum:
    80 / 89,
  verifiedPreProbeGlobalOptimumPercentageOfTheoreticalMaximum:
    (80 / 89) * 100,
  minimumEscapeSwapCount: 2,

  verifiedPostProbeGlobalOptimumScore: 72.5,
  verifiedPostProbeGlobalOptimumProportionOfTheoreticalMaximum:
    72.5 / 89,
  verifiedPostProbeGlobalOptimumPercentageOfTheoreticalMaximum:
    (72.5 / 89) * 100,
  verifiedPostProbeFeasibleSolutionCount: 8,
  minimumPostProbeHammingDistance: 9,
  bestPostProbeHammingDistance: 10,
  bestInsideAiFamilyPostProbePercentage: 46.1,

  paretoEfficiencyReference:
    "verified_global_optimum_for_active_problem_instance" as const,
  totalAssignments: 12,
  strategySwitchThresholdProportion: 0.5,
  strategySwitchThresholdAssignments: 6,
  strategySwitchMinimumHammingDistance: 7,
  salvageCountingAnchorEventType: "trial_start" as const,
  salvageMacroStructureDefinition:
    "room_majority_topic_mapping_ignoring_slot_order" as const,
} as const;

export const DELIVERY_ANALYSIS_BENCHMARKS = {
  ...SYMPOSIUM_ANALYSIS_BENCHMARKS,
  benchmarkVersion: DELIVERY_SCORING_VERSION,
  salvageMacroStructureDefinition:
    "van_majority_region_mapping_ignoring_window_order" as const,
};

export const CLINIC_ANALYSIS_BENCHMARKS = {
  ...SYMPOSIUM_ANALYSIS_BENCHMARKS,
  benchmarkVersion: CLINIC_SCORING_VERSION,
  salvageMacroStructureDefinition:
    "ward_majority_specialty_mapping_ignoring_shift_order" as const,
};

export const TASK_ANALYSIS_BENCHMARKS_BY_ID = {
  symposium: SYMPOSIUM_ANALYSIS_BENCHMARKS,
  delivery: DELIVERY_ANALYSIS_BENCHMARKS,
  clinic: CLINIC_ANALYSIS_BENCHMARKS,
} as const;

export function getVerifiedGlobalOptimumScore(
  probeActive: boolean,
  taskId: SupportedStudyTaskId = "symposium",
): number {
  const benchmarks =
    TASK_ANALYSIS_BENCHMARKS_BY_ID[taskId];

  return probeActive
    ? benchmarks.verifiedPostProbeGlobalOptimumScore
    : benchmarks.verifiedPreProbeGlobalOptimumScore;
}

export function calculateParetoEfficiencyProportion(
  submittedScore: number,
  probeActive: boolean,
  taskId: SupportedStudyTaskId = "symposium",
): number | null {
  if (!Number.isFinite(submittedScore)) {
    return null;
  }

  const referenceScore =
    getVerifiedGlobalOptimumScore(
      probeActive,
      taskId,
    );

  return referenceScore > 0
    ? submittedScore / referenceScore
    : null;
}

export function calculateParetoEfficiencyPercentage(
  submittedScore: number,
  probeActive: boolean,
  taskId: SupportedStudyTaskId = "symposium",
): number | null {
  const proportion =
    calculateParetoEfficiencyProportion(
      submittedScore,
      probeActive,
      taskId,
    );

  return proportion === null
    ? null
    : proportion * 100;
}

export const EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL: Record<
  ConcretizationLevel,
  number
> = {
  A: 0,
  B: AI_PARTIAL_ARTIFACT.length,
  C: AI_FULL_ARTIFACT.length,
};

export const EXPECTED_INITIAL_PLACEMENT_COUNT_BY_TASK: Record<
  SupportedStudyTaskId,
  Record<ConcretizationLevel, number>
> = {
  symposium: {
    ...EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL,
  },
  delivery: {
    A: 0,
    B: DELIVERY_AI_PARTIAL_ARTIFACT.length,
    C: DELIVERY_AI_FULL_ARTIFACT.length,
  },
  clinic: {
    A: 0,
    B: CLINIC_AI_PARTIAL_ARTIFACT.length,
    C: CLINIC_AI_FULL_ARTIFACT.length,
  },
};

export interface AssistantRecommendation {
  heading: string;
  message: string;
  prefillAcknowledgment: string | null;
}

const SHARED_AI_RECOMMENDATION =
  "I recommend organizing the symposium into topic tracks: NLP talks in Room A, Health talks in Room B, and Robotics talks in Room C. Arrange the talks according to speaker availability and room requirements.";

const SHARED_DELIVERY_AI_RECOMMENDATION =
  "I recommend organizing the delivery plan by region: North shipments in Van A, Central shipments in Van B, and South shipments in Van C. Arrange the shipments according to driver availability and vehicle requirements.";

const SHARED_CLINIC_AI_RECOMMENDATION =
  "I recommend organizing the clinic roster by specialty: Emergency Care duties in Ward A, General Medicine duties in Ward B, and Critical Care duties in Ward C. Arrange the duties according to nurse availability and ward requirements.";

export const AI_RECOMMENDATION_BY_LEVEL: Record<
  ConcretizationLevel,
  AssistantRecommendation
> = {
  A: {
    heading: "Scheduling recommendation",
    message: SHARED_AI_RECOMMENDATION,
    prefillAcknowledgment: null,
  },
  B: {
    heading: "Scheduling recommendation",
    message: SHARED_AI_RECOMMENDATION,
    prefillAcknowledgment:
      "I placed four starting talks in the suggested structure.",
  },
  C: {
    heading: "Scheduling recommendation",
    message: SHARED_AI_RECOMMENDATION,
    prefillAcknowledgment:
      "I placed a complete proposed schedule in the suggested structure.",
  },
};

export const DELIVERY_AI_RECOMMENDATION_BY_LEVEL: Record<
  ConcretizationLevel,
  AssistantRecommendation
> = {
  A: {
    heading: "Dispatch recommendation",
    message: SHARED_DELIVERY_AI_RECOMMENDATION,
    prefillAcknowledgment: null,
  },
  B: {
    heading: "Dispatch recommendation",
    message: SHARED_DELIVERY_AI_RECOMMENDATION,
    prefillAcknowledgment:
      "I placed four starting shipments in the suggested structure.",
  },
  C: {
    heading: "Dispatch recommendation",
    message: SHARED_DELIVERY_AI_RECOMMENDATION,
    prefillAcknowledgment:
      "I placed a complete proposed dispatch plan in the suggested structure.",
  },
};

export const CLINIC_AI_RECOMMENDATION_BY_LEVEL: Record<
  ConcretizationLevel,
  AssistantRecommendation
> = {
  A: {
    heading: "Roster recommendation",
    message: SHARED_CLINIC_AI_RECOMMENDATION,
    prefillAcknowledgment: null,
  },
  B: {
    heading: "Roster recommendation",
    message: SHARED_CLINIC_AI_RECOMMENDATION,
    prefillAcknowledgment:
      "I placed four starting duties in the suggested structure.",
  },
  C: {
    heading: "Roster recommendation",
    message: SHARED_CLINIC_AI_RECOMMENDATION,
    prefillAcknowledgment:
      "I placed a complete proposed roster in the suggested structure.",
  },
};

export const AI_RECOMMENDATION_BY_TASK: Record<
  SupportedStudyTaskId,
  Record<ConcretizationLevel, AssistantRecommendation>
> = {
  symposium: AI_RECOMMENDATION_BY_LEVEL,
  delivery: DELIVERY_AI_RECOMMENDATION_BY_LEVEL,
  clinic: CLINIC_AI_RECOMMENDATION_BY_LEVEL,
};

export interface SemanticProbeDefinition {
  id: string;
  version: string;
  title: string;
  message: string;
  collapsedLabel: string;
  shownAfterSeconds: number;
  collapseAfterSeconds: number;
  displayMode: "transient";
  affectedRoom: Room;
  requiredProjectorRoom: Room;
  requiredTalkIds: string[];
  semanticOnly: true;
}

export const SEMANTIC_PROBE: SemanticProbeDefinition = {
  id: "room-c-projector-failure",
  version: SEMANTIC_PROBE_VERSION,
  title: "Facilities update",
  message:
    "The projector in Room C is broken for the rest of the day.",
  collapsedLabel: "Facilities update",
  shownAfterSeconds: 7 * 60,
  collapseAfterSeconds: 10,
  displayMode: "transient",
  affectedRoom: POST_PROBE_AFFECTED_ROOM,
  requiredProjectorRoom:
    POST_PROBE_REQUIRED_PROJECTOR_ROOM,
  requiredTalkIds: [
    ...POST_PROBE_REQUIRED_ROOM_A_TALKS,
  ],
  semanticOnly: true,
};

export const DELIVERY_SEMANTIC_PROBE: SemanticProbeDefinition = {
  id: "van-c-refrigeration-failure",
  version: DELIVERY_SEMANTIC_PROBE_VERSION,
  title: "Vehicle update",
  message:
    "The refrigeration unit in Van C has failed for the rest of the dispatch period.",
  collapsedLabel: "Vehicle update",
  shownAfterSeconds: 7 * 60,
  collapseAfterSeconds: 10,
  displayMode: "transient",
  affectedRoom: "C",
  requiredProjectorRoom: "A",
  requiredTalkIds: [
    ...POST_PROBE_REQUIRED_VAN_A_SHIPMENTS,
  ],
  semanticOnly: true,
};

export const CLINIC_SEMANTIC_PROBE: SemanticProbeDefinition = {
  id: "ward-c-icu-certification-loss",
  version: CLINIC_SEMANTIC_PROBE_VERSION,
  title: "Ward update",
  message:
    "Ward C has lost ICU certification for the remainder of the roster period.",
  collapsedLabel: "Ward update",
  shownAfterSeconds: 7 * 60,
  collapseAfterSeconds: 10,
  displayMode: "transient",
  affectedRoom: "C",
  requiredProjectorRoom: "A",
  requiredTalkIds: [
    ...POST_PROBE_REQUIRED_WARD_A_DUTIES,
  ],
  semanticOnly: true,
};

export const SEMANTIC_PROBE_BY_TASK: Record<
  SupportedStudyTaskId,
  SemanticProbeDefinition
> = {
  symposium: SEMANTIC_PROBE,
  delivery: DELIVERY_SEMANTIC_PROBE,
  clinic: CLINIC_SEMANTIC_PROBE,
};

export function getSemanticProbe(
  taskId: SupportedStudyTaskId,
): SemanticProbeDefinition {
  const probe = SEMANTIC_PROBE_BY_TASK[taskId];

  return {
    ...probe,
    requiredTalkIds: [...probe.requiredTalkIds],
  };
}

function getRoomForTalk(
  placements: readonly Placement[],
  talkId: string,
): Room | undefined {
  return placements.find(
    (placement) => placement.talkId === talkId,
  )?.room;
}

export function getUnresolvedPostProbeTalkIds(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): PostProbeRequiredTalkId[] {
  const requiredRoom =
    SEMANTIC_PROBE_BY_TASK[taskId].requiredProjectorRoom;

  return POST_PROBE_REQUIRED_ROOM_A_TALKS.filter(
    (talkId) =>
      getRoomForTalk(placements, talkId) !== requiredRoom,
  );
}

export function getPostProbeConstraintState(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): PostProbeConstraintState {
  const probe = SEMANTIC_PROBE_BY_TASK[taskId];
  const items = TASK_ITEMS_BY_ID[taskId];
  const unresolvedDemoTalkIds =
    getUnresolvedPostProbeTalkIds(
      placements,
      taskId,
    );

  const requiredRoomTalkIds = placements
    .filter(
      (placement) =>
        placement.room === probe.requiredProjectorRoom,
    )
    .map((placement) => placement.talkId);

  const requiredRoomContainsOnlyRequiredTalks =
    requiredRoomTalkIds.length ===
      POST_PROBE_REQUIRED_ROOM_A_TALKS.length &&
    requiredRoomTalkIds.every((talkId) =>
      POST_PROBE_REQUIRED_ROOM_A_TALKS.includes(
        talkId as PostProbeRequiredTalkId,
      ),
    );

  return {
    postProbeFeasible:
      placements.length === items.length &&
      unresolvedDemoTalkIds.length === 0 &&
      requiredRoomContainsOnlyRequiredTalks,
    unresolvedDemoTalkIds,
  };
}

export function getPostProbeIntegrationTalkIds(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): string[] {
  const integratedTalkIds = new Set<string>();
  const probe = SEMANTIC_PROBE_BY_TASK[taskId];
  const items = TASK_ITEMS_BY_ID[taskId];

  for (const talk of items) {
    const previousRoom = getRoomForTalk(
      previousPlacements,
      talk.id,
    );
    const nextRoom = getRoomForTalk(
      nextPlacements,
      talk.id,
    );

    const requiredItemMovedIntoRequiredRoom =
      talk.demo &&
      previousRoom !== probe.requiredProjectorRoom &&
      nextRoom === probe.requiredProjectorRoom;

    const nonRequiredItemMovedOutOfRequiredRoom =
      !talk.demo &&
      previousRoom === probe.requiredProjectorRoom &&
      nextRoom !== probe.requiredProjectorRoom;

    if (
      requiredItemMovedIntoRequiredRoom ||
      nonRequiredItemMovedOutOfRequiredRoom
    ) {
      integratedTalkIds.add(talk.id);
    }
  }

  return [...integratedTalkIds];
}

export function isPostProbeIntegrationConsistentEdit(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  return (
    getPostProbeIntegrationTalkIds(
      previousPlacements,
      nextPlacements,
      taskId,
    ).length > 0
  );
}

export function getInitialPlacements(
  level: ConcretizationLevel,
  taskId: SupportedStudyTaskId = "symposium",
): Placement[] {
  return clonePlacements(
    AI_ARTIFACTS_BY_TASK[taskId][level],
  );
}

export function getInitialPlacementsForTrial(
  trialNumber: StudyTrialNumber,
  taskId: SupportedStudyTaskId = "symposium",
): Placement[] {
  return getInitialPlacements(
    getConditionForTrial(trialNumber),
    taskId,
  );
}

export function getExpectedInitialPlacementCount(
  level: ConcretizationLevel,
  taskId: SupportedStudyTaskId = "symposium",
): number {
  return EXPECTED_INITIAL_PLACEMENT_COUNT_BY_TASK[
    taskId
  ][level];
}

export function getAssistantRecommendation(
  level: ConcretizationLevel,
  taskId: SupportedStudyTaskId = "symposium",
): AssistantRecommendation {
  return {
    ...AI_RECOMMENDATION_BY_TASK[taskId][level],
  };
}

export function getTalkById(
  talkId: string,
  taskId: SupportedStudyTaskId = "symposium",
): Talk | undefined {
  return TASK_ITEMS_BY_ID[taskId].find(
    (talk) => talk.id === talkId,
  );
}

export function isDemoTalk(
  talkId: string,
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  return Boolean(
    getTalkById(talkId, taskId)?.demo,
  );
}

export function getPlacementAt(
  placements: Placement[],
  room: Room,
  slot: Slot,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.room === room &&
      placement.slot === slot,
  );
}

export function getTalkAt(
  room: Room,
  slot: Slot,
  taskId: SupportedStudyTaskId = "symposium",
): Placement | undefined {
  return getPlacementAt(
    getInitialPlacements("C", taskId),
    room,
    slot,
  );
}

export function getTaskResourceDetails(
  taskId: SupportedStudyTaskId,
): Record<Room, RoomDetails> {
  return TASK_RESOURCE_DETAILS_BY_ID[taskId];
}

export function formatAllowedSlots(
  slots: Slot[],
  taskId: SupportedStudyTaskId = "symposium",
): string {
  const periodLabel =
    taskId === "delivery"
      ? "Window"
      : taskId === "clinic"
        ? "Shift"
        : "Slot";

  if (slots.length === SLOTS.length) {
    return `Any ${periodLabel.toLowerCase()}`;
  }

  return slots
    .map((slot) => `${periodLabel} ${slot}`)
    .join(", ");
}

export function formatAllowedRooms(
  rooms: Room[],
  taskId: SupportedStudyTaskId = "symposium",
): string {
  const resourceLabel =
    taskId === "delivery"
      ? "Van"
      : taskId === "clinic"
        ? "Ward"
        : "Room";

  if (rooms.length === ROOMS.length) {
    return `Any ${resourceLabel.toLowerCase()}`;
  }

  return rooms
    .map((room) => `${resourceLabel} ${room}`)
    .join(", ");
}
