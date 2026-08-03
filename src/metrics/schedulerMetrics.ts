import {
  AI_ARTIFACTS_BY_TASK,
  AI_ROOM_TRACK_TOPICS,
  ROOMS,
  SEMANTIC_PROBE_BY_TASK,
  SLOTS,
  TASK_ANALYSIS_BENCHMARKS_BY_ID,
  TASK_CONFLICT_PAIRS_BY_ID,
  TASK_ITEMS_BY_ID,
  TASK_SCORING_BY_ID,
  VERIFIED_BEST_POST_PROBE_SOLUTION_BY_TASK,
  VERIFIED_PRE_PROBE_OPTIMUM_BY_TASK,
  getPostProbeConstraintState,
  getPostProbeIntegrationTalkIds,
  getTalkById,
  isDemoTalk,
} from "../data/symposium";

import type {
  PostProbeRequiredTalkId,
  SupportedStudyTaskId,
} from "../data/symposium";

import type {
  TheoreticalEditCategory,
} from "../types/events";

import type {
  Placement,
  Room,
  Slot,
  Topic,
} from "../types/scheduler";

export type MacroStructureDefinition =
  | "room_majority_topic_mapping_ignoring_slot_order"
  | "van_majority_region_mapping_ignoring_window_order"
  | "ward_majority_specialty_mapping_ignoring_shift_order";

export interface SpeakerViolation {
  speaker: string;
  slot: Slot;
  talkIds: string[];
}

export interface ScheduleScore {
  satisfiedSpeakerPairChecks: number;
  violatedSpeakerPairChecks: number;
  unresolvedSpeakerPairChecks: number;
  sameTopicPairsSharingRoom: number;
  keynoteBonusEarned: boolean;
  speakerScore: number;
  topicCoherenceScore: number;
  keynoteScore: number;
  totalScore: number;
  maximumScore: number;
  scoreProportion: number;
  scorePercentage: number;
}

export interface ScheduleSnapshot {
  taskId: SupportedStudyTaskId;
  canonicalSchedule: string;
  stateHash: string;
  structuralSignature: string;
  macroStructureSignature: string;
  macroStructureDefinition: MacroStructureDefinition;
  roomCompositionSignature: string;
  hammingDistanceFromAI: number;
  distanceToBestPostProbeSolution: number;
  insideAIFamily: boolean;
  roomADemoCount: number;
  roomANonDemoCount: number;
  roomAContainsExactDemoSet: boolean;
  structurallyLegal: boolean;
  completeAssignment: boolean;
  preProbeFeasible: boolean;
  semanticProbeCompliant: boolean;
  postProbeFeasible: boolean;
  unresolvedDemoTalkIds: PostProbeRequiredTalkId[];
  resultingViolations: SpeakerViolation[];
  violationCount: number;
  speakerConflictPairCount: number;
  score: ScheduleScore;
}

export interface SchedulerMetrics extends ScheduleSnapshot {
  previousCanonicalSchedule: string;
  previousStateHash: string;
  previousStructuralSignature: string;
  previousMacroStructureSignature: string;
  previousRoomCompositionSignature: string;
  previousHammingDistanceFromAI: number;
  previousDistanceToBestPostProbeSolution: number;
  previousInsideAIFamily: boolean;
  previousScore: ScheduleScore;
  scoreDelta: number;
  changedTalkIds: string[];
  transitionId: string;
  stateChanged: boolean;
  moatCrossed: boolean;
  strategySwitchTriggered: boolean;
  structuralDeparture: boolean;
  theoreticalEditCategory: TheoreticalEditCategory | null;
  probeIntegrationDetected: boolean;
  integrationConsistentEdit: boolean;
  integrationTalkIds: string[];
  postProbeFeasibleBefore: boolean | null;
  postProbeFeasibleAfter: boolean | null;
  unresolvedDemoTalkIdsBefore: PostProbeRequiredTalkId[] | null;
  unresolvedDemoTalkIdsAfter: PostProbeRequiredTalkId[] | null;
  isSalvageAttempt: boolean;
  isNonImprovingEdit: boolean;
  isPlateauEdit: boolean;
  isScoreDecreasingEdit: boolean;
  isDestructiveEdit: boolean;
  destructiveEditMagnitude: number;
  isOptimalDestructiveTransition: boolean;
}

const TOPIC_CODES: Record<Topic, string> = {
  NLP: "N",
  Health: "H",
  Robotics: "R",
};

const TOPIC_ORDER: Topic[] = [
  "NLP",
  "Health",
  "Robotics",
];

function getMacroStructureDefinition(
  taskId: SupportedStudyTaskId,
): MacroStructureDefinition {
  return TASK_ANALYSIS_BENCHMARKS_BY_ID[taskId]
    .salvageMacroStructureDefinition;
}

function getPlacementForTalk(
  placements: readonly Placement[],
  talkId: string,
): Placement | undefined {
  return placements.find(
    (placement) => placement.talkId === talkId,
  );
}

function getPlacementAt(
  placements: readonly Placement[],
  room: Room,
  slot: Slot,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.room === room &&
      placement.slot === slot,
  );
}

function getCellLabel(
  placement: Placement | undefined,
): string {
  if (!placement) {
    return "UNASSIGNED";
  }

  return `${placement.room}${placement.slot}`;
}

function chooseTwo(count: number): number {
  if (count < 2) {
    return 0;
  }

  return (count * (count - 1)) / 2;
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0)
    .toString(16)
    .padStart(8, "0");
}

function arraysContainSameValues(
  first: readonly string[],
  second: readonly string[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const sortedFirst = [...first].sort();
  const sortedSecond = [...second].sort();

  return sortedFirst.every(
    (value, index) => value === sortedSecond[index],
  );
}

function getTopicCodeForTalk(
  talkId: string,
  taskId: SupportedStudyTaskId,
): string {
  const topic = getTalkById(talkId, taskId)?.topic;

  if (!topic) {
    return "?";
  }

  return TOPIC_CODES[topic];
}

export function serializePlacements(
  placements: Placement[],
): string {
  return ROOMS.flatMap((room) =>
    SLOTS.map((slot) => {
      const placement = getPlacementAt(
        placements,
        room,
        slot,
      );

      return `${room}${slot}=${
        placement?.talkId ?? "EMPTY"
      }`;
    }),
  ).join("|");
}

export function getScheduleStateHash(
  placements: Placement[],
): string {
  return hashString(serializePlacements(placements));
}

export function getSpeakerViolations(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): SpeakerViolation[] {
  const violations: SpeakerViolation[] = [];

  for (const slot of SLOTS) {
    const speakerTalks = new Map<string, string[]>();

    for (const placement of placements) {
      if (placement.slot !== slot) {
        continue;
      }

      const talk = getTalkById(
        placement.talkId,
        taskId,
      );

      if (!talk?.speaker) {
        continue;
      }

      const talkIds =
        speakerTalks.get(talk.speaker) ?? [];

      talkIds.push(talk.id);
      speakerTalks.set(talk.speaker, talkIds);
    }

    for (const [speaker, talkIds] of speakerTalks) {
      if (talkIds.length < 2) {
        continue;
      }

      violations.push({
        speaker,
        slot,
        talkIds: [...talkIds].sort(),
      });
    }
  }

  return violations;
}

export function getSpeakerPairCheckCounts(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): {
  satisfied: number;
  violated: number;
  unresolved: number;
} {
  let satisfied = 0;
  let violated = 0;
  let unresolved = 0;

  for (const pair of TASK_CONFLICT_PAIRS_BY_ID[taskId]) {
    const firstPlacement = getPlacementForTalk(
      placements,
      pair.firstTalkId,
    );
    const secondPlacement = getPlacementForTalk(
      placements,
      pair.secondTalkId,
    );

    if (!firstPlacement || !secondPlacement) {
      unresolved += 1;
      continue;
    }

    if (firstPlacement.slot === secondPlacement.slot) {
      violated += 1;
    } else {
      satisfied += 1;
    }
  }

  return {
    satisfied,
    violated,
    unresolved,
  };
}

export function getViolatedSpeakerPairCount(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): number {
  return getSpeakerPairCheckCounts(
    placements,
    taskId,
  ).violated;
}

export function getHammingDistance(
  placements: Placement[],
  referencePlacements: readonly Placement[],
): number {
  return referencePlacements.reduce(
    (distance, referencePlacement) => {
      const currentPlacement = getPlacementForTalk(
        placements,
        referencePlacement.talkId,
      );

      const matchesReference =
        currentPlacement?.room === referencePlacement.room &&
        currentPlacement.slot === referencePlacement.slot;

      return matchesReference
        ? distance
        : distance + 1;
    },
    0,
  );
}

export function getHammingDistanceFromAI(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): number {
  return getHammingDistance(
    placements,
    AI_ARTIFACTS_BY_TASK[taskId].C,
  );
}

export function getDistanceToBestPostProbeSolution(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): number {
  return getHammingDistance(
    placements,
    VERIFIED_BEST_POST_PROBE_SOLUTION_BY_TASK[taskId],
  );
}

function getTopicAt(
  placements: Placement[],
  room: Room,
  slot: Slot,
  taskId: SupportedStudyTaskId,
): Topic | "Empty" {
  const placement = getPlacementAt(
    placements,
    room,
    slot,
  );

  if (!placement) {
    return "Empty";
  }

  return (
    getTalkById(placement.talkId, taskId)?.topic ??
    "Empty"
  );
}

function getTopicCodeAt(
  placements: Placement[],
  room: Room,
  slot: Slot,
  taskId: SupportedStudyTaskId,
): string {
  const topic = getTopicAt(
    placements,
    room,
    slot,
    taskId,
  );

  if (topic === "Empty") {
    return "E";
  }

  return TOPIC_CODES[topic];
}

export function getStructuralSignature(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): string {
  return ROOMS.map((room) => {
    const slotTopics = SLOTS.map((slot) =>
      getTopicCodeAt(
        placements,
        room,
        slot,
        taskId,
      ),
    );

    return `${room}=${slotTopics.join("")}`;
  }).join("|");
}

export function getRoomCompositionSignature(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): string {
  return ROOMS.map((room) => {
    const topicCodes = placements
      .filter((placement) => placement.room === room)
      .map((placement) =>
        getTopicCodeForTalk(
          placement.talkId,
          taskId,
        ),
      )
      .sort();

    while (topicCodes.length < SLOTS.length) {
      topicCodes.push("E");
    }

    return `${room}=${topicCodes.join("")}`;
  }).join("|");
}

function getDominantTopicForRoom(
  placements: Placement[],
  room: Room,
  taskId: SupportedStudyTaskId,
): Topic | "Mixed" | "Empty" {
  const counts = new Map<Topic, number>(
    TOPIC_ORDER.map((topic) => [topic, 0]),
  );

  for (const placement of placements) {
    if (placement.room !== room) {
      continue;
    }

    const topic = getTalkById(
      placement.talkId,
      taskId,
    )?.topic;

    if (topic) {
      counts.set(
        topic,
        (counts.get(topic) ?? 0) + 1,
      );
    }
  }

  const highestCount = Math.max(
    ...TOPIC_ORDER.map(
      (topic) => counts.get(topic) ?? 0,
    ),
  );

  if (highestCount === 0) {
    return "Empty";
  }

  const dominantTopics = TOPIC_ORDER.filter(
    (topic) =>
      (counts.get(topic) ?? 0) === highestCount,
  );

  return dominantTopics.length === 1
    ? dominantTopics[0]
    : "Mixed";
}

export function getMacroStructureSignature(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): string {
  return ROOMS.map(
    (room) =>
      `${room}=${getDominantTopicForRoom(
        placements,
        room,
        taskId,
      )}`,
  ).join("|");
}

export function isInsideAIFamily(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  return ROOMS.every(
    (room) =>
      getDominantTopicForRoom(
        placements,
        room,
        taskId,
      ) === AI_ROOM_TRACK_TOPICS[room],
  );
}

export function getSameTopicPairsSharingRoom(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): number {
  let pairCount = 0;

  for (const room of ROOMS) {
    const topicCounts = new Map<Topic, number>();

    for (const placement of placements) {
      if (placement.room !== room) {
        continue;
      }

      const topic = getTalkById(
        placement.talkId,
        taskId,
      )?.topic;

      if (!topic) {
        continue;
      }

      topicCounts.set(
        topic,
        (topicCounts.get(topic) ?? 0) + 1,
      );
    }

    for (const count of topicCounts.values()) {
      pairCount += chooseTwo(count);
    }
  }

  return pairCount;
}

export function calculateScheduleScore(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): ScheduleScore {
  const scoring = TASK_SCORING_BY_ID[taskId];
  const speakerChecks = getSpeakerPairCheckCounts(
    placements,
    taskId,
  );
  const sameTopicPairsSharingRoom =
    getSameTopicPairsSharingRoom(
      placements,
      taskId,
    );
  const keynotePlacement = getPlacementForTalk(
    placements,
    scoring.keynoteTalkId,
  );
  const keynoteBonusEarned =
    keynotePlacement?.room === scoring.keynoteRequiredRoom &&
    keynotePlacement.slot === 1;
  const speakerScore =
    speakerChecks.satisfied * scoring.speakerPairWeight;
  const topicCoherenceScore =
    sameTopicPairsSharingRoom *
    scoring.sameTopicPairWeight;
  const keynoteScore = keynoteBonusEarned
    ? scoring.keynoteBonus
    : 0;
  const totalScore =
    speakerScore +
    topicCoherenceScore +
    keynoteScore;
  const maximumScore = scoring.maximumScore;
  const scoreProportion =
    maximumScore > 0
      ? totalScore / maximumScore
      : 0;

  return {
    satisfiedSpeakerPairChecks: speakerChecks.satisfied,
    violatedSpeakerPairChecks: speakerChecks.violated,
    unresolvedSpeakerPairChecks: speakerChecks.unresolved,
    sameTopicPairsSharingRoom,
    keynoteBonusEarned,
    speakerScore,
    topicCoherenceScore,
    keynoteScore,
    totalScore,
    maximumScore,
    scoreProportion,
    scorePercentage: scoreProportion * 100,
  };
}

export function hasCompleteAssignment(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  const items = TASK_ITEMS_BY_ID[taskId];

  if (placements.length !== items.length) {
    return false;
  }

  const talkIds = new Set(
    placements.map((placement) => placement.talkId),
  );
  const cells = new Set(
    placements.map(
      (placement) =>
        `${placement.room}${placement.slot}`,
    ),
  );

  return (
    talkIds.size === items.length &&
    cells.size === items.length &&
    items.every((talk) => talkIds.has(talk.id))
  );
}

export function isStructurallyLegalSchedule(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  const usedTalkIds = new Set<string>();
  const usedCells = new Set<string>();

  for (const placement of placements) {
    const talk = getTalkById(
      placement.talkId,
      taskId,
    );

    if (!talk) {
      return false;
    }

    const cellKey =
      `${placement.room}${placement.slot}`;

    if (
      usedTalkIds.has(placement.talkId) ||
      usedCells.has(cellKey)
    ) {
      return false;
    }

    if (
      !talk.allowedRooms.includes(placement.room) ||
      !talk.allowedSlots.includes(placement.slot)
    ) {
      return false;
    }

    usedTalkIds.add(placement.talkId);
    usedCells.add(cellKey);
  }

  return true;
}

export function getRoomADemoCount(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): number {
  return placements.filter(
    (placement) =>
      placement.room === "A" &&
      isDemoTalk(placement.talkId, taskId),
  ).length;
}

export function getRoomANonDemoCount(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): number {
  return placements.filter(
    (placement) =>
      placement.room === "A" &&
      !isDemoTalk(placement.talkId, taskId),
  ).length;
}

export function roomAContainsExactDemoSet(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  const requiredRoom =
    SEMANTIC_PROBE_BY_TASK[taskId].requiredProjectorRoom;
  const requiredTalkIds =
    SEMANTIC_PROBE_BY_TASK[taskId].requiredTalkIds;
  const roomATalkIds = placements
    .filter(
      (placement) => placement.room === requiredRoom,
    )
    .map((placement) => placement.talkId);

  return arraysContainSameValues(
    roomATalkIds,
    requiredTalkIds,
  );
}

export function isPostProbeFeasible(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  const speakerChecks = getSpeakerPairCheckCounts(
    placements,
    taskId,
  );

  return (
    hasCompleteAssignment(placements, taskId) &&
    isStructurallyLegalSchedule(placements, taskId) &&
    speakerChecks.violated === 0 &&
    getPostProbeConstraintState(
      placements,
      taskId,
    ).postProbeFeasible
  );
}

export function getChangedTalkIds(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): string[] {
  const talkIds = new Set<string>([
    ...previousPlacements.map(
      (placement) => placement.talkId,
    ),
    ...nextPlacements.map(
      (placement) => placement.talkId,
    ),
  ]);

  return Array.from(talkIds)
    .filter((talkId) => {
      const previousPlacement = getPlacementForTalk(
        previousPlacements,
        talkId,
      );
      const nextPlacement = getPlacementForTalk(
        nextPlacements,
        talkId,
      );

      return (
        previousPlacement?.room !== nextPlacement?.room ||
        previousPlacement?.slot !== nextPlacement?.slot
      );
    })
    .sort();
}

/**
 * The theoretical edit taxonomy used for edit sequence entropy.
 *
 * A first exit from the AI family is structure breaking.
 * Any other change to resource-level category composition is cross-cluster.
 * A change that preserves resource-level category composition is within-cluster.
 */
export function getTheoreticalEditCategory(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): TheoreticalEditCategory | null {
  const changedTalkIds = getChangedTalkIds(
    previousPlacements,
    nextPlacements,
  );

  if (changedTalkIds.length === 0) {
    return null;
  }

  const structuralDeparture =
    isInsideAIFamily(previousPlacements, taskId) &&
    !isInsideAIFamily(nextPlacements, taskId);

  if (structuralDeparture) {
    return "structure_breaking";
  }

  const previousMacroStructure =
    getMacroStructureSignature(
      previousPlacements,
      taskId,
    );
  const nextMacroStructure =
    getMacroStructureSignature(
      nextPlacements,
      taskId,
    );

  return previousMacroStructure === nextMacroStructure
    ? "within_cluster"
    : "cross_cluster";
}

export function getTransitionId(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): string {
  const changedTalkIds = getChangedTalkIds(
    previousPlacements,
    nextPlacements,
  );

  if (changedTalkIds.length === 0) {
    return "no_change";
  }

  return changedTalkIds
    .map((talkId) => {
      const previousPlacement = getPlacementForTalk(
        previousPlacements,
        talkId,
      );
      const nextPlacement = getPlacementForTalk(
        nextPlacements,
        talkId,
      );

      return `${talkId}:${getCellLabel(
        previousPlacement,
      )}>${getCellLabel(nextPlacement)}`;
    })
    .join(";");
}

export function getProbeIntegrationTalkIds(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  probeActive: boolean,
  taskId: SupportedStudyTaskId = "symposium",
): string[] {
  if (!probeActive) {
    return [];
  }

  return getPostProbeIntegrationTalkIds(
    previousPlacements,
    nextPlacements,
    taskId,
  );
}

export function hasProbeIntegration(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  probeActive: boolean,
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  return (
    getProbeIntegrationTalkIds(
      previousPlacements,
      nextPlacements,
      probeActive,
      taskId,
    ).length > 0
  );
}

export function isSalvageAttempt(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  const previousViolations = getSpeakerViolations(
    previousPlacements,
    taskId,
  );

  if (previousViolations.length === 0) {
    return false;
  }

  const changedTalkIds = getChangedTalkIds(
    previousPlacements,
    nextPlacements,
  );
  const conflictingTalkIds = new Set(
    previousViolations.flatMap(
      (violation) => violation.talkIds,
    ),
  );
  const editsConflictTalk = changedTalkIds.some(
    (talkId) => conflictingTalkIds.has(talkId),
  );

  if (!editsConflictTalk) {
    return false;
  }

  const previousScore = calculateScheduleScore(
    previousPlacements,
    taskId,
  );
  const nextScore = calculateScheduleScore(
    nextPlacements,
    taskId,
  );

  return (
    isInsideAIFamily(previousPlacements, taskId) &&
    isInsideAIFamily(nextPlacements, taskId) &&
    nextScore.totalScore <= previousScore.totalScore
  );
}

export function isVerifiedOptimalDestructiveTransition(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): boolean {
  const changedTalkIds = getChangedTalkIds(
    previousPlacements,
    nextPlacements,
  );

  if (
    !arraysContainSameValues(
      changedTalkIds,
      ["H1", "N4"],
    )
  ) {
    return false;
  }

  const verifiedOptimum =
    VERIFIED_PRE_PROBE_OPTIMUM_BY_TASK[taskId];
  const targetH1 = getPlacementForTalk(
    verifiedOptimum,
    "H1",
  );
  const targetN4 = getPlacementForTalk(
    verifiedOptimum,
    "N4",
  );
  const nextH1 = getPlacementForTalk(
    nextPlacements,
    "H1",
  );
  const nextN4 = getPlacementForTalk(
    nextPlacements,
    "N4",
  );

  return (
    nextH1?.room === targetH1?.room &&
    nextH1?.slot === targetH1?.slot &&
    nextN4?.room === targetN4?.room &&
    nextN4?.slot === targetN4?.slot
  );
}

export function createScheduleSnapshot(
  placements: Placement[],
  taskId: SupportedStudyTaskId = "symposium",
): ScheduleSnapshot {
  const resultingViolations = getSpeakerViolations(
    placements,
    taskId,
  );
  const score = calculateScheduleScore(
    placements,
    taskId,
  );
  const roomADemoCount = getRoomADemoCount(
    placements,
    taskId,
  );
  const roomANonDemoCount = getRoomANonDemoCount(
    placements,
    taskId,
  );
  const exactDemoSet = roomAContainsExactDemoSet(
    placements,
    taskId,
  );
  const structurallyLegal =
    isStructurallyLegalSchedule(
      placements,
      taskId,
    );
  const completeAssignment = hasCompleteAssignment(
    placements,
    taskId,
  );
  const postProbeConstraintState =
    getPostProbeConstraintState(
      placements,
      taskId,
    );
  const preProbeFeasible =
    completeAssignment &&
    structurallyLegal &&
    score.violatedSpeakerPairChecks === 0;
  const semanticProbeCompliant = exactDemoSet;
  const postProbeFeasible =
    preProbeFeasible && semanticProbeCompliant;

  return {
    taskId,
    canonicalSchedule: serializePlacements(placements),
    stateHash: getScheduleStateHash(placements),
    structuralSignature: getStructuralSignature(
      placements,
      taskId,
    ),
    macroStructureSignature: getMacroStructureSignature(
      placements,
      taskId,
    ),
    macroStructureDefinition:
      getMacroStructureDefinition(taskId),
    roomCompositionSignature:
      getRoomCompositionSignature(
        placements,
        taskId,
      ),
    hammingDistanceFromAI: getHammingDistanceFromAI(
      placements,
      taskId,
    ),
    distanceToBestPostProbeSolution:
      getDistanceToBestPostProbeSolution(
        placements,
        taskId,
      ),
    insideAIFamily: isInsideAIFamily(
      placements,
      taskId,
    ),
    roomADemoCount,
    roomANonDemoCount,
    roomAContainsExactDemoSet: exactDemoSet,
    structurallyLegal,
    completeAssignment,
    preProbeFeasible,
    semanticProbeCompliant,
    postProbeFeasible,
    unresolvedDemoTalkIds: [
      ...postProbeConstraintState.unresolvedDemoTalkIds,
    ],
    resultingViolations,
    violationCount: resultingViolations.length,
    speakerConflictPairCount:
      score.violatedSpeakerPairChecks,
    score,
  };
}

export function calculateSchedulerMetrics(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  probeActive: boolean,
  taskId: SupportedStudyTaskId = "symposium",
): SchedulerMetrics {
  const previousSnapshot = createScheduleSnapshot(
    previousPlacements,
    taskId,
  );
  const nextSnapshot = createScheduleSnapshot(
    nextPlacements,
    taskId,
  );
  const changedTalkIds = getChangedTalkIds(
    previousPlacements,
    nextPlacements,
  );
  const stateChanged =
    previousSnapshot.stateHash !== nextSnapshot.stateHash;
  const scoreDelta =
    nextSnapshot.score.totalScore -
    previousSnapshot.score.totalScore;
  const totalItems = TASK_ITEMS_BY_ID[taskId].length;
  const moatCrossed =
    previousSnapshot.hammingDistanceFromAI <=
      totalItems / 2 &&
    nextSnapshot.hammingDistanceFromAI >
      totalItems / 2;
  const integrationTalkIds =
    getProbeIntegrationTalkIds(
      previousPlacements,
      nextPlacements,
      probeActive,
      taskId,
    );
  const integrationConsistentEdit =
    stateChanged && integrationTalkIds.length > 0;
  const structuralDeparture =
    previousSnapshot.insideAIFamily &&
    !nextSnapshot.insideAIFamily;
  const theoreticalEditCategory = stateChanged
    ? getTheoreticalEditCategory(
        previousPlacements,
        nextPlacements,
        taskId,
      )
    : null;
  const destructiveEditMagnitude = Math.max(
    0,
    nextSnapshot.hammingDistanceFromAI -
      previousSnapshot.hammingDistanceFromAI,
  );

  return {
    ...nextSnapshot,
    previousCanonicalSchedule:
      previousSnapshot.canonicalSchedule,
    previousStateHash: previousSnapshot.stateHash,
    previousStructuralSignature:
      previousSnapshot.structuralSignature,
    previousMacroStructureSignature:
      previousSnapshot.macroStructureSignature,
    previousRoomCompositionSignature:
      previousSnapshot.roomCompositionSignature,
    previousHammingDistanceFromAI:
      previousSnapshot.hammingDistanceFromAI,
    previousDistanceToBestPostProbeSolution:
      previousSnapshot.distanceToBestPostProbeSolution,
    previousInsideAIFamily:
      previousSnapshot.insideAIFamily,
    previousScore: previousSnapshot.score,
    scoreDelta,
    changedTalkIds,
    transitionId: getTransitionId(
      previousPlacements,
      nextPlacements,
    ),
    stateChanged,
    moatCrossed,
    strategySwitchTriggered: moatCrossed,
    structuralDeparture,
    theoreticalEditCategory,
    probeIntegrationDetected:
      integrationConsistentEdit,
    integrationConsistentEdit,
    integrationTalkIds: [...integrationTalkIds],
    postProbeFeasibleBefore: probeActive
      ? previousSnapshot.postProbeFeasible
      : null,
    postProbeFeasibleAfter: probeActive
      ? nextSnapshot.postProbeFeasible
      : null,
    unresolvedDemoTalkIdsBefore: probeActive
      ? [...previousSnapshot.unresolvedDemoTalkIds]
      : null,
    unresolvedDemoTalkIdsAfter: probeActive
      ? [...nextSnapshot.unresolvedDemoTalkIds]
      : null,
    isSalvageAttempt:
      stateChanged &&
      isSalvageAttempt(
        previousPlacements,
        nextPlacements,
        taskId,
      ),
    isNonImprovingEdit:
      stateChanged && scoreDelta <= 0,
    isPlateauEdit:
      stateChanged && scoreDelta === 0,
    isScoreDecreasingEdit:
      stateChanged && scoreDelta < 0,
    isDestructiveEdit:
      stateChanged && structuralDeparture,
    destructiveEditMagnitude,
    isOptimalDestructiveTransition:
      stateChanged &&
      isVerifiedOptimalDestructiveTransition(
        previousPlacements,
        nextPlacements,
        taskId,
      ),
  };
}

