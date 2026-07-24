import {
  AI_FULL_ARTIFACT,
  AI_ROOM_TRACK_TOPICS,
  POST_PROBE_REQUIRED_ROOM_A_TALKS,
  ROOMS,
  SLOTS,
  SPEAKER_CONFLICT_PAIRS,
  SYMPOSIUM_SCORING,
  TALKS,
  VERIFIED_BEST_POST_PROBE_SOLUTION,
  VERIFIED_PRE_PROBE_OPTIMUM,
  getTalkById,
  isDemoTalk,
} from "../data/symposium";

import type {
  Placement,
  Room,
  Slot,
  Topic,
} from "../types/scheduler";

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
  canonicalSchedule: string;

  stateHash: string;

  structuralSignature: string;

  roomCompositionSignature: string;

  hammingDistanceFromAI: number;

  distanceToBestPostProbeSolution: number;

  insideAIFamily: boolean;

  roomADemoCount: number;

  roomANonDemoCount: number;

  roomAContainsExactDemoSet: boolean;

  structurallyLegal: boolean;

  completeAssignment: boolean;

  postProbeFeasible: boolean;

  resultingViolations: SpeakerViolation[];

  violationCount: number;

  speakerConflictPairCount: number;

  score: ScheduleScore;
}

export interface SchedulerMetrics
  extends ScheduleSnapshot {
  previousCanonicalSchedule: string;

  previousStateHash: string;

  previousStructuralSignature: string;

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

  probeIntegrationDetected: boolean;

  integrationConsistentEdit: boolean;

  postProbeFeasibleBefore: boolean;

  postProbeFeasibleAfter: boolean;

  isSalvageAttempt: boolean;

  isNonImprovingEdit: boolean;

  isPlateauEdit: boolean;

  isScoreDecreasingEdit: boolean;

  isDestructiveEdit: boolean;

  destructiveEditMagnitude: number;

  isOptimalDestructiveTransition: boolean;
}

const TOPIC_CODES: Record<
  Topic,
  string
> = {
  NLP: "N",

  Health: "H",

  Robotics: "R",
};

function getPlacementForTalk(
  placements: Placement[],
  talkId: string,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.talkId ===
      talkId,
  );
}

function getPlacementAt(
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

function getCellLabel(
  placement: Placement | undefined,
): string {
  if (!placement) {
    return "UNASSIGNED";
  }

  return `${placement.room}${placement.slot}`;
}

function chooseTwo(
  count: number,
): number {
  if (count < 2) {
    return 0;
  }

  return (
    count *
    (count - 1)
  ) / 2;
}

function hashString(
  value: string,
): string {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index,
      );

    hash = Math.imul(
      hash,
      16777619,
    );
  }

  return (
    hash >>> 0
  )
    .toString(16)
    .padStart(
      8,
      "0",
    );
}

function arraysContainSameValues(
  first: string[],
  second: string[],
): boolean {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  const sortedFirst = [
    ...first,
  ].sort();

  const sortedSecond = [
    ...second,
  ].sort();

  return sortedFirst.every(
    (
      value,
      index,
    ) =>
      value ===
      sortedSecond[index],
  );
}

function getTopicCodeForTalk(
  talkId: string,
): string {
  const topic =
    getTalkById(
      talkId,
    )?.topic;

  if (!topic) {
    return "?";
  }

  return TOPIC_CODES[
    topic
  ];
}

export function serializePlacements(
  placements: Placement[],
): string {
  return ROOMS.flatMap(
    (room) =>
      SLOTS.map(
        (slot) => {
          const placement =
            getPlacementAt(
              placements,
              room,
              slot,
            );

          return `${room}${slot}=${
            placement?.talkId ??
            "EMPTY"
          }`;
        },
      ),
  ).join("|");
}

export function getScheduleStateHash(
  placements: Placement[],
): string {
  return hashString(
    serializePlacements(
      placements,
    ),
  );
}

export function getSpeakerViolations(
  placements: Placement[],
): SpeakerViolation[] {
  const violations:
    SpeakerViolation[] = [];

  for (const slot of SLOTS) {
    const speakerTalks =
      new Map<
        string,
        string[]
      >();

    for (
      const placement of
      placements
    ) {
      if (
        placement.slot !==
        slot
      ) {
        continue;
      }

      const talk =
        getTalkById(
          placement.talkId,
        );

      if (!talk?.speaker) {
        continue;
      }

      const talkIds =
        speakerTalks.get(
          talk.speaker,
        ) ?? [];

      talkIds.push(
        talk.id,
      );

      speakerTalks.set(
        talk.speaker,
        talkIds,
      );
    }

    for (
      const [
        speaker,
        talkIds,
      ] of speakerTalks
    ) {
      if (
        talkIds.length < 2
      ) {
        continue;
      }

      violations.push({
        speaker,

        slot,

        talkIds: [
          ...talkIds,
        ].sort(),
      });
    }
  }

  return violations;
}

export function getSpeakerPairCheckCounts(
  placements: Placement[],
): {
  satisfied: number;
  violated: number;
  unresolved: number;
} {
  let satisfied = 0;

  let violated = 0;

  let unresolved = 0;

  for (
    const pair of
    SPEAKER_CONFLICT_PAIRS
  ) {
    const firstPlacement =
      getPlacementForTalk(
        placements,
        pair.firstTalkId,
      );

    const secondPlacement =
      getPlacementForTalk(
        placements,
        pair.secondTalkId,
      );

    if (
      !firstPlacement ||
      !secondPlacement
    ) {
      unresolved += 1;

      continue;
    }

    if (
      firstPlacement.slot ===
      secondPlacement.slot
    ) {
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
): number {
  return getSpeakerPairCheckCounts(
    placements,
  ).violated;
}

export function getHammingDistance(
  placements: Placement[],
  referencePlacements: Placement[],
): number {
  return referencePlacements.reduce(
    (
      distance,
      referencePlacement,
    ) => {
      const currentPlacement =
        getPlacementForTalk(
          placements,
          referencePlacement.talkId,
        );

      const matchesReference =
        currentPlacement?.room ===
          referencePlacement.room &&
        currentPlacement.slot ===
          referencePlacement.slot;

      return matchesReference
        ? distance
        : distance + 1;
    },
    0,
  );
}

export function getHammingDistanceFromAI(
  placements: Placement[],
): number {
  return getHammingDistance(
    placements,
    AI_FULL_ARTIFACT,
  );
}

export function getDistanceToBestPostProbeSolution(
  placements: Placement[],
): number {
  return getHammingDistance(
    placements,
    VERIFIED_BEST_POST_PROBE_SOLUTION,
  );
}

function getTopicAt(
  placements: Placement[],
  room: Room,
  slot: Slot,
): Topic | "Empty" {
  const placement =
    getPlacementAt(
      placements,
      room,
      slot,
    );

  if (!placement) {
    return "Empty";
  }

  return (
    getTalkById(
      placement.talkId,
    )?.topic ??
    "Empty"
  );
}

function getTopicCodeAt(
  placements: Placement[],
  room: Room,
  slot: Slot,
): string {
  const topic =
    getTopicAt(
      placements,
      room,
      slot,
    );

  if (
    topic === "Empty"
  ) {
    return "E";
  }

  return TOPIC_CODES[
    topic
  ];
}

export function getStructuralSignature(
  placements: Placement[],
): string {
  return ROOMS.map(
    (room) => {
      const slotTopics =
        SLOTS.map(
          (slot) =>
            getTopicCodeAt(
              placements,
              room,
              slot,
            ),
        );

      return `${room}=${slotTopics.join(
        "",
      )}`;
    },
  ).join("|");
}

export function getRoomCompositionSignature(
  placements: Placement[],
): string {
  return ROOMS.map(
    (room) => {
      const topicCodes =
        placements
          .filter(
            (placement) =>
              placement.room ===
              room,
          )
          .map(
            (placement) =>
              getTopicCodeForTalk(
                placement.talkId,
              ),
          )
          .sort();

      while (
        topicCodes.length <
        SLOTS.length
      ) {
        topicCodes.push(
          "E",
        );
      }

      return `${room}=${topicCodes.join(
        "",
      )}`;
    },
  ).join("|");
}

export function isInsideAIFamily(
  placements: Placement[],
): boolean {
  return placements.every(
    (placement) => {
      const talk =
        getTalkById(
          placement.talkId,
        );

      if (!talk) {
        return false;
      }

      return (
        AI_ROOM_TRACK_TOPICS[
          placement.room
        ] ===
        talk.topic
      );
    },
  );
}

export function getSameTopicPairsSharingRoom(
  placements: Placement[],
): number {
  let pairCount = 0;

  for (const room of ROOMS) {
    const topicCounts =
      new Map<
        Topic,
        number
      >();

    for (
      const placement of
      placements
    ) {
      if (
        placement.room !==
        room
      ) {
        continue;
      }

      const topic =
        getTalkById(
          placement.talkId,
        )?.topic;

      if (!topic) {
        continue;
      }

      topicCounts.set(
        topic,
        (
          topicCounts.get(
            topic,
          ) ?? 0
        ) + 1,
      );
    }

    for (
      const count of
      topicCounts.values()
    ) {
      pairCount +=
        chooseTwo(
          count,
        );
    }
  }

  return pairCount;
}

export function calculateScheduleScore(
  placements: Placement[],
): ScheduleScore {
  const speakerChecks =
    getSpeakerPairCheckCounts(
      placements,
    );

  const sameTopicPairsSharingRoom =
    getSameTopicPairsSharingRoom(
      placements,
    );

  const keynotePlacement =
    getPlacementForTalk(
      placements,
      SYMPOSIUM_SCORING
        .keynoteTalkId,
    );

  const keynoteBonusEarned =
    keynotePlacement?.room ===
    SYMPOSIUM_SCORING
      .keynoteRequiredRoom;

  const speakerScore =
    speakerChecks.satisfied *
    SYMPOSIUM_SCORING
      .speakerPairWeight;

  const topicCoherenceScore =
    sameTopicPairsSharingRoom *
    SYMPOSIUM_SCORING
      .sameTopicPairWeight;

  const keynoteScore =
    keynoteBonusEarned
      ? SYMPOSIUM_SCORING
          .keynoteBonus
      : 0;

  const totalScore =
    speakerScore +
    topicCoherenceScore +
    keynoteScore;

  const maximumScore =
    SYMPOSIUM_SCORING
      .maximumScore;

  const scoreProportion =
    maximumScore > 0
      ? totalScore /
        maximumScore
      : 0;

  return {
    satisfiedSpeakerPairChecks:
      speakerChecks.satisfied,

    violatedSpeakerPairChecks:
      speakerChecks.violated,

    unresolvedSpeakerPairChecks:
      speakerChecks.unresolved,

    sameTopicPairsSharingRoom,

    keynoteBonusEarned,

    speakerScore,

    topicCoherenceScore,

    keynoteScore,

    totalScore,

    maximumScore,

    scoreProportion,

    scorePercentage:
      scoreProportion *
      100,
  };
}

export function hasCompleteAssignment(
  placements: Placement[],
): boolean {
  if (
    placements.length !==
    TALKS.length
  ) {
    return false;
  }

  const talkIds =
    new Set(
      placements.map(
        (placement) =>
          placement.talkId,
      ),
    );

  const cells =
    new Set(
      placements.map(
        (placement) =>
          `${placement.room}${placement.slot}`,
      ),
    );

  return (
    talkIds.size ===
      TALKS.length &&
    cells.size ===
      TALKS.length &&
    TALKS.every(
      (talk) =>
        talkIds.has(
          talk.id,
        ),
    )
  );
}

export function isStructurallyLegalSchedule(
  placements: Placement[],
): boolean {
  const usedTalkIds =
    new Set<string>();

  const usedCells =
    new Set<string>();

  for (
    const placement of
    placements
  ) {
    const talk =
      getTalkById(
        placement.talkId,
      );

    if (!talk) {
      return false;
    }

    const cellKey =
      `${placement.room}${placement.slot}`;

    if (
      usedTalkIds.has(
        placement.talkId,
      ) ||
      usedCells.has(
        cellKey,
      )
    ) {
      return false;
    }

    if (
      !talk.allowedRooms.includes(
        placement.room,
      ) ||
      !talk.allowedSlots.includes(
        placement.slot,
      )
    ) {
      return false;
    }

    usedTalkIds.add(
      placement.talkId,
    );

    usedCells.add(
      cellKey,
    );
  }

  return true;
}

export function getRoomADemoCount(
  placements: Placement[],
): number {
  return placements.filter(
    (placement) =>
      placement.room ===
        "A" &&
      isDemoTalk(
        placement.talkId,
      ),
  ).length;
}

export function getRoomANonDemoCount(
  placements: Placement[],
): number {
  return placements.filter(
    (placement) =>
      placement.room ===
        "A" &&
      !isDemoTalk(
        placement.talkId,
      ),
  ).length;
}

export function roomAContainsExactDemoSet(
  placements: Placement[],
): boolean {
  const roomATalkIds =
    placements
      .filter(
        (placement) =>
          placement.room ===
          "A",
      )
      .map(
        (placement) =>
          placement.talkId,
      );

  return arraysContainSameValues(
    roomATalkIds,
    [
      ...POST_PROBE_REQUIRED_ROOM_A_TALKS,
    ],
  );
}

export function isPostProbeFeasible(
  placements: Placement[],
): boolean {
  return (
    hasCompleteAssignment(
      placements,
    ) &&
    isStructurallyLegalSchedule(
      placements,
    ) &&
    roomAContainsExactDemoSet(
      placements,
    ) &&
    getViolatedSpeakerPairCount(
      placements,
    ) === 0
  );
}

export function getChangedTalkIds(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): string[] {
  const talkIds =
    new Set<string>([
      ...previousPlacements.map(
        (placement) =>
          placement.talkId,
      ),

      ...nextPlacements.map(
        (placement) =>
          placement.talkId,
      ),
    ]);

  return Array.from(
    talkIds,
  )
    .filter(
      (talkId) => {
        const previousPlacement =
          getPlacementForTalk(
            previousPlacements,
            talkId,
          );

        const nextPlacement =
          getPlacementForTalk(
            nextPlacements,
            talkId,
          );

        return (
          previousPlacement?.room !==
            nextPlacement?.room ||
          previousPlacement?.slot !==
            nextPlacement?.slot
        );
      },
    )
    .sort();
}

export function getTransitionId(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): string {
  const changedTalkIds =
    getChangedTalkIds(
      previousPlacements,
      nextPlacements,
    );

  if (
    changedTalkIds.length === 0
  ) {
    return "no_change";
  }

  return changedTalkIds
    .map(
      (talkId) => {
        const previousPlacement =
          getPlacementForTalk(
            previousPlacements,
            talkId,
          );

        const nextPlacement =
          getPlacementForTalk(
            nextPlacements,
            talkId,
          );

        return `${talkId}:${getCellLabel(
          previousPlacement,
        )}>${getCellLabel(
          nextPlacement,
        )}`;
      },
    )
    .join(";");
}

export function hasProbeIntegration(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  probeActive: boolean,
): boolean {
  if (!probeActive) {
    return false;
  }

  const changedTalkIds =
    getChangedTalkIds(
      previousPlacements,
      nextPlacements,
    );

  return changedTalkIds.some(
    (talkId) => {
      const previousPlacement =
        getPlacementForTalk(
          previousPlacements,
          talkId,
        );

      const nextPlacement =
        getPlacementForTalk(
          nextPlacements,
          talkId,
        );

      if (
        isDemoTalk(
          talkId,
        )
      ) {
        return (
          previousPlacement?.room !==
            "A" &&
          nextPlacement?.room ===
            "A"
        );
      }

      return (
        previousPlacement?.room ===
          "A" &&
        nextPlacement?.room !==
          "A"
      );
    },
  );
}

export function isSalvageAttempt(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): boolean {
  const previousViolations =
    getSpeakerViolations(
      previousPlacements,
    );

  if (
    previousViolations.length === 0
  ) {
    return false;
  }

  const changedTalkIds =
    getChangedTalkIds(
      previousPlacements,
      nextPlacements,
    );

  const conflictingTalkIds =
    new Set(
      previousViolations.flatMap(
        (violation) =>
          violation.talkIds,
      ),
    );

  const editsConflictTalk =
    changedTalkIds.some(
      (talkId) =>
        conflictingTalkIds.has(
          talkId,
        ),
    );

  if (!editsConflictTalk) {
    return false;
  }

  const previousScore =
    calculateScheduleScore(
      previousPlacements,
    );

  const nextScore =
    calculateScheduleScore(
      nextPlacements,
    );

  return (
    isInsideAIFamily(
      previousPlacements,
    ) &&
    isInsideAIFamily(
      nextPlacements,
    ) &&
    nextScore.totalScore <=
      previousScore.totalScore
  );
}

export function isVerifiedOptimalDestructiveTransition(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
): boolean {
  const changedTalkIds =
    getChangedTalkIds(
      previousPlacements,
      nextPlacements,
    );

  if (
    !arraysContainSameValues(
      changedTalkIds,
      [
        "H1",
        "N4",
      ],
    )
  ) {
    return false;
  }

  const targetH1 =
    getPlacementForTalk(
      VERIFIED_PRE_PROBE_OPTIMUM,
      "H1",
    );

  const targetN4 =
    getPlacementForTalk(
      VERIFIED_PRE_PROBE_OPTIMUM,
      "N4",
    );

  const nextH1 =
    getPlacementForTalk(
      nextPlacements,
      "H1",
    );

  const nextN4 =
    getPlacementForTalk(
      nextPlacements,
      "N4",
    );

  return (
    nextH1?.room ===
      targetH1?.room &&
    nextH1?.slot ===
      targetH1?.slot &&
    nextN4?.room ===
      targetN4?.room &&
    nextN4?.slot ===
      targetN4?.slot
  );
}

export function createScheduleSnapshot(
  placements: Placement[],
): ScheduleSnapshot {
  const resultingViolations =
    getSpeakerViolations(
      placements,
    );

  const score =
    calculateScheduleScore(
      placements,
    );

  const roomADemoCount =
    getRoomADemoCount(
      placements,
    );

  const roomANonDemoCount =
    getRoomANonDemoCount(
      placements,
    );

  const exactDemoSet =
    roomAContainsExactDemoSet(
      placements,
    );

  const structurallyLegal =
    isStructurallyLegalSchedule(
      placements,
    );

  const completeAssignment =
    hasCompleteAssignment(
      placements,
    );

  return {
    canonicalSchedule:
      serializePlacements(
        placements,
      ),

    stateHash:
      getScheduleStateHash(
        placements,
      ),

    structuralSignature:
      getStructuralSignature(
        placements,
      ),

    roomCompositionSignature:
      getRoomCompositionSignature(
        placements,
      ),

    hammingDistanceFromAI:
      getHammingDistanceFromAI(
        placements,
      ),

    distanceToBestPostProbeSolution:
      getDistanceToBestPostProbeSolution(
        placements,
      ),

    insideAIFamily:
      isInsideAIFamily(
        placements,
      ),

    roomADemoCount,

    roomANonDemoCount,

    roomAContainsExactDemoSet:
      exactDemoSet,

    structurallyLegal,

    completeAssignment,

    postProbeFeasible:
      completeAssignment &&
      structurallyLegal &&
      exactDemoSet &&
      score.violatedSpeakerPairChecks ===
        0,

    resultingViolations,

    violationCount:
      resultingViolations.length,

    speakerConflictPairCount:
      score.violatedSpeakerPairChecks,

    score,
  };
}

export function calculateSchedulerMetrics(
  previousPlacements: Placement[],
  nextPlacements: Placement[],
  probeActive: boolean,
): SchedulerMetrics {
  const previousSnapshot =
    createScheduleSnapshot(
      previousPlacements,
    );

  const nextSnapshot =
    createScheduleSnapshot(
      nextPlacements,
    );

  const changedTalkIds =
    getChangedTalkIds(
      previousPlacements,
      nextPlacements,
    );

  const stateChanged =
    previousSnapshot.stateHash !==
    nextSnapshot.stateHash;

  const scoreDelta =
    nextSnapshot
      .score
      .totalScore -
    previousSnapshot
      .score
      .totalScore;

  const moatCrossed =
    previousSnapshot
      .hammingDistanceFromAI <=
      TALKS.length / 2 &&
    nextSnapshot
      .hammingDistanceFromAI >
      TALKS.length / 2;

  const integrationConsistentEdit =
    hasProbeIntegration(
      previousPlacements,
      nextPlacements,
      probeActive,
    );

  const structuralDeparture =
    previousSnapshot
      .insideAIFamily &&
    !nextSnapshot
      .insideAIFamily;

  const destructiveEditMagnitude =
    Math.max(
      0,
      nextSnapshot
        .hammingDistanceFromAI -
        previousSnapshot
          .hammingDistanceFromAI,
    );

  return {
    ...nextSnapshot,

    previousCanonicalSchedule:
      previousSnapshot
        .canonicalSchedule,

    previousStateHash:
      previousSnapshot
        .stateHash,

    previousStructuralSignature:
      previousSnapshot
        .structuralSignature,

    previousRoomCompositionSignature:
      previousSnapshot
        .roomCompositionSignature,

    previousHammingDistanceFromAI:
      previousSnapshot
        .hammingDistanceFromAI,

    previousDistanceToBestPostProbeSolution:
      previousSnapshot
        .distanceToBestPostProbeSolution,

    previousInsideAIFamily:
      previousSnapshot
        .insideAIFamily,

    previousScore:
      previousSnapshot
        .score,

    scoreDelta,

    changedTalkIds,

    transitionId:
      getTransitionId(
        previousPlacements,
        nextPlacements,
      ),

    stateChanged,

    moatCrossed,

    strategySwitchTriggered:
      moatCrossed,

    structuralDeparture,

    probeIntegrationDetected:
      integrationConsistentEdit,

    integrationConsistentEdit,

    postProbeFeasibleBefore:
      previousSnapshot
        .postProbeFeasible,

    postProbeFeasibleAfter:
      nextSnapshot
        .postProbeFeasible,

    isSalvageAttempt:
      stateChanged &&
      isSalvageAttempt(
        previousPlacements,
        nextPlacements,
      ),

    isNonImprovingEdit:
      stateChanged &&
      scoreDelta <= 0,

    isPlateauEdit:
      stateChanged &&
      scoreDelta === 0,

    isScoreDecreasingEdit:
      stateChanged &&
      scoreDelta < 0,

    isDestructiveEdit:
      stateChanged &&
      structuralDeparture,

    destructiveEditMagnitude,

    isOptimalDestructiveTransition:
      stateChanged &&
      isVerifiedOptimalDestructiveTransition(
        previousPlacements,
        nextPlacements,
      ),
  };
}