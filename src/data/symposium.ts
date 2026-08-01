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

export const SYMPOSIUM_TASK_VERSION = "symposium-v3";
export const AI_ARTIFACT_VERSION = "symposium-ai-artifact-v1";
export const AI_MESSAGE_VERSION = "symposium-ai-message-v2";
export const SEMANTIC_PROBE_VERSION = "room-c-projector-failure-v2";
export const SCORING_VERSION = "symposium-score-v3";

export const SYMPOSIUM_TASK = {
  id: "symposium" as const,
  title: "Symposium Scheduler",
  shortTitle: "Symposium",
  description:
    "Arrange twelve symposium talks across three rooms and four time slots while satisfying the scheduling requirements.",
  totalTalks: 12,
  totalRooms: 3,
  totalSlots: 4,
  durationSeconds: 15 * 60,
  taskVersion: SYMPOSIUM_TASK_VERSION,
  artifactVersion: AI_ARTIFACT_VERSION,
  messageVersion: AI_MESSAGE_VERSION,
  probeVersion: SEMANTIC_PROBE_VERSION,
  scoringVersion: SCORING_VERSION,
};

export interface SymposiumConstraintDefinition {
  id:
    | "projector_requirement"
    | "capacity_requirement"
    | "speaker_availability";
  number: 1 | 2 | 3;
  text: string;
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

export interface SymposiumPreferenceDefinition {
  id: "topic_grouping" | "keynote_opening";
  number: 1 | 2;
  text: string;
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
 * Internal speaker names intentionally match verify_trap.py.
 * Participant-facing labels are provided separately below.
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

export const SPEAKER_DISPLAY_LABELS: Record<string, string> = {
  Osei: "Dr. Osei",
  Kim: "Dr. Chaky",
  Laurent: "Dr. Laurent",
};

export function getSpeakerDisplayLabel(
  speaker: string | undefined,
): string {
  if (!speaker) {
    return "No shared speaker constraint";
  }

  return SPEAKER_DISPLAY_LABELS[speaker] ?? `Dr. ${speaker}`;
}

export const TALK_IDS = TALKS.map((talk) => talk.id);

export const DEMO_TALK_IDS = [
  "N1",
  "R1",
  "R2",
  "R3",
] as const;

export const POST_PROBE_AFFECTED_ROOM = "C" as const;
export const POST_PROBE_REQUIRED_PROJECTOR_ROOM = "A" as const;

export const POST_PROBE_REQUIRED_ROOM_A_TALKS = [
  "N1",
  "R1",
  "R2",
  "R3",
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

export function getVerifiedGlobalOptimumScore(
  probeActive: boolean,
): number {
  return probeActive
    ? SYMPOSIUM_ANALYSIS_BENCHMARKS
        .verifiedPostProbeGlobalOptimumScore
    : SYMPOSIUM_ANALYSIS_BENCHMARKS
        .verifiedPreProbeGlobalOptimumScore;
}

export function calculateParetoEfficiencyProportion(
  submittedScore: number,
  probeActive: boolean,
): number | null {
  if (!Number.isFinite(submittedScore)) {
    return null;
  }

  const referenceScore =
    getVerifiedGlobalOptimumScore(probeActive);

  return referenceScore > 0
    ? submittedScore / referenceScore
    : null;
}

export function calculateParetoEfficiencyPercentage(
  submittedScore: number,
  probeActive: boolean,
): number | null {
  const proportion =
    calculateParetoEfficiencyProportion(
      submittedScore,
      probeActive,
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

const SHARED_AI_RECOMMENDATION =
  "I recommend organizing the symposium into topic tracks: NLP talks in Room A, Health talks in Room B, and Robotics talks in Room C. Arrange the talks according to speaker availability and room requirements.";

export const AI_RECOMMENDATION_BY_LEVEL: Record<
  ConcretizationLevel,
  {
    heading: string;
    message: string;
    prefillAcknowledgment: string | null;
  }
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

export const SEMANTIC_PROBE = {
  id: "room-c-projector-failure",
  version: SEMANTIC_PROBE_VERSION,
  title: "Facilities update",
  message:
    "The projector in Room C is broken for the rest of the day.",
  collapsedLabel: "Facilities update",
  shownAfterSeconds: 7 * 60,
  collapseAfterSeconds: 10,
  displayMode: "transient" as const,
  affectedRoom: POST_PROBE_AFFECTED_ROOM,
  requiredProjectorRoom:
    POST_PROBE_REQUIRED_PROJECTOR_ROOM,
  requiredTalkIds: [
    ...POST_PROBE_REQUIRED_ROOM_A_TALKS,
  ],
  semanticOnly: true,
};

function getRoomForTalk(
  placements: Placement[],
  talkId: string,
): Room | undefined {
  return placements.find(
    (placement) => placement.talkId === talkId,
  )?.room;
}

export function getUnresolvedPostProbeTalkIds(
  placements: Placement[],
): PostProbeRequiredTalkId[] {
  return POST_PROBE_REQUIRED_ROOM_A_TALKS.filter(
    (talkId) =>
      getRoomForTalk(placements, talkId) !==
      POST_PROBE_REQUIRED_PROJECTOR_ROOM,
  );
}

export function getPostProbeConstraintState(
  placements: Placement[],
): PostProbeConstraintState {
  const unresolvedDemoTalkIds =
    getUnresolvedPostProbeTalkIds(placements);

  const roomATalkIds = placements
    .filter(
      (placement) =>
        placement.room ===
        POST_PROBE_REQUIRED_PROJECTOR_ROOM,
    )
    .map((placement) => placement.talkId);

  const roomAContainsOnlyRequiredTalks =
    roomATalkIds.length ===
      POST_PROBE_REQUIRED_ROOM_A_TALKS.length &&
    roomATalkIds.every((talkId) =>
      POST_PROBE_REQUIRED_ROOM_A_TALKS.includes(
        talkId as PostProbeRequiredTalkId,
      ),
    );

  return {
    postProbeFeasible:
      placements.length === TALKS.length &&
      unresolvedDemoTalkIds.length === 0 &&
      roomAContainsOnlyRequiredTalks,
    unresolvedDemoTalkIds,
  };
}

export function getPostProbeIntegrationTalkIds(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): string[] {
  const integratedTalkIds = new Set<string>();

  for (const talk of TALKS) {
    const previousRoom = getRoomForTalk(
      previousPlacements,
      talk.id,
    );
    const nextRoom = getRoomForTalk(
      nextPlacements,
      talk.id,
    );

    const demoMovedIntoRoomA =
      talk.demo &&
      previousRoom !==
        POST_PROBE_REQUIRED_PROJECTOR_ROOM &&
      nextRoom === POST_PROBE_REQUIRED_PROJECTOR_ROOM;

    const nonDemoMovedOutOfRoomA =
      !talk.demo &&
      previousRoom ===
        POST_PROBE_REQUIRED_PROJECTOR_ROOM &&
      nextRoom !== POST_PROBE_REQUIRED_PROJECTOR_ROOM;

    if (
      demoMovedIntoRoomA ||
      nonDemoMovedOutOfRoomA
    ) {
      integratedTalkIds.add(talk.id);
    }
  }

  return [...integratedTalkIds];
}

export function isPostProbeIntegrationConsistentEdit(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): boolean {
  return (
    getPostProbeIntegrationTalkIds(
      previousPlacements,
      nextPlacements,
    ).length > 0
  );
}

function clonePlacements(
  placements: Placement[],
): Placement[] {
  return placements.map((placement) => ({
    ...placement,
  }));
}

export function getInitialPlacements(
  level: ConcretizationLevel,
): Placement[] {
  switch (level) {
    case "A":
      return clonePlacements(
        AI_STRATEGY_ARTIFACT,
      );

    case "B":
      return clonePlacements(
        AI_PARTIAL_ARTIFACT,
      );

    case "C":
      return clonePlacements(
        AI_FULL_ARTIFACT,
      );
  }
}

export function getInitialPlacementsForTrial(
  trialNumber: StudyTrialNumber,
): Placement[] {
  return getInitialPlacements(
    getConditionForTrial(trialNumber),
  );
}

export function getExpectedInitialPlacementCount(
  level: ConcretizationLevel,
): number {
  return EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL[
    level
  ];
}

export function getAssistantRecommendation(
  level: ConcretizationLevel,
): {
  heading: string;
  message: string;
  prefillAcknowledgment: string | null;
} {
  return {
    ...AI_RECOMMENDATION_BY_LEVEL[level],
  };
}

export function getTalkById(
  talkId: string,
): Talk | undefined {
  return TALKS.find((talk) => talk.id === talkId);
}

export function isDemoTalk(
  talkId: string,
): boolean {
  return DEMO_TALK_IDS.some(
    (demoTalkId) => demoTalkId === talkId,
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
): Placement | undefined {
  return getPlacementAt(
    AI_FULL_ARTIFACT,
    room,
    slot,
  );
}

export function formatAllowedSlots(
  slots: Slot[],
): string {
  if (slots.length === SLOTS.length) {
    return "Any slot";
  }

  return slots
    .map((slot) => `Slot ${slot}`)
    .join(", ");
}

export function formatAllowedRooms(
  rooms: Room[],
): string {
  if (rooms.length === ROOMS.length) {
    return "Any room";
  }

  return rooms
    .map((room) => `Room ${room}`)
    .join(", ");
}
