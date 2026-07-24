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

import {
  getConditionForTrial,
} from "../types/scheduler";

export const SYMPOSIUM_TASK_VERSION =
  "symposium-v1";

export const AI_ARTIFACT_VERSION =
  "symposium-ai-artifact-v1";

export const AI_MESSAGE_VERSION =
  "symposium-ai-message-v1";

export const SEMANTIC_PROBE_VERSION =
  "room-c-projector-failure-v1";

export const SCORING_VERSION =
  "symposium-score-v1";

export const SYMPOSIUM_TASK = {
  id:
    "symposium" as const,

  title:
    "Symposium Scheduler",

  shortTitle:
    "Symposium",

  description:
    "Arrange twelve symposium talks across three rooms and four time slots while satisfying the scheduling requirements.",

  totalTalks:
    12,

  totalRooms:
    3,

  totalSlots:
    4,

  durationSeconds:
    15 * 60,

  taskVersion:
    SYMPOSIUM_TASK_VERSION,

  artifactVersion:
    AI_ARTIFACT_VERSION,

  messageVersion:
    AI_MESSAGE_VERSION,

  probeVersion:
    SEMANTIC_PROBE_VERSION,

  scoringVersion:
    SCORING_VERSION,
};

export interface SymposiumConstraintDefinition {
  id:
    | "complete_assignment"
    | "unique_room_slot"
    | "allowed_placement"
    | "projector_requirement"
    | "capacity_requirement"
    | "speaker_availability";

  number:
    1 | 2 | 3 | 4 | 5 | 6;

  text:
    string;
}

export const SYMPOSIUM_CONSTRAINTS:
  SymposiumConstraintDefinition[] = [
    {
      id:
        "complete_assignment",

      number:
        1,

      text:
        "Schedule every talk exactly once.",
    },

    {
      id:
        "unique_room_slot",

      number:
        2,

      text:
        "Each room and slot can contain only one talk.",
    },

    {
      id:
        "allowed_placement",

      number:
        3,

      text:
        "Talks may only use their allowed rooms and available slots. Unavailable cells cannot be used.",
    },

    {
      id:
        "projector_requirement",

      number:
        4,

      text:
        "Demo talks N1, R1, R2, and R3 require a projector. They may only use Room A or Room C.",
    },

    {
      id:
        "capacity_requirement",

      number:
        5,

      text:
        "Talk N3 requires at least 80 seats. It may only use Room A or Room B.",
    },

    {
      id:
        "speaker_availability",

      number:
        6,

      text:
        "A speaker cannot present more than one talk during the same slot.",
    },
  ];

export interface SymposiumPreferenceDefinition {
  id:
    | "topic_grouping"
    | "keynote_opening";

  text:
    string;
}

export const SYMPOSIUM_PREFERENCES:
  SymposiumPreferenceDefinition[] = [
    {
      id:
        "topic_grouping",

      text:
        "Keep talks from the same topic grouped in the same room.",
    },

    {
      id:
        "keynote_opening",

      text:
        "Place keynote N1 in Room A during Slot 1.",
    },
  ];

export const ROOMS:
  Room[] = [
    "A",
    "B",
    "C",
  ];

export const SLOTS:
  Slot[] = [
    1,
    2,
    3,
    4,
  ];

export const ROOM_DETAILS:
  Record<
    Room,
    RoomDetails
  > = {
    A: {
      capacity:
        120,

      hasProjector:
        true,
    },

    B: {
      capacity:
        80,

      hasProjector:
        false,
    },

    C: {
      capacity:
        60,

      hasProjector:
        true,
    },
  };

export const TALKS:
  Talk[] = [
    {
      id:
        "N1",

      title:
        "NLP Keynote",

      topic:
        "NLP",

      demo:
        true,

      allowedSlots: [
        1,
      ],

      allowedRooms: [
        "A",
        "C",
      ],
    },

    {
      id:
        "N2",

      title:
        "NLP Invited Talk",

      topic:
        "NLP",

      demo:
        false,

      speaker:
        "Osei",

      allowedSlots: [
        3,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },

    {
      id:
        "N3",

      title:
        "Advanced NLP",

      topic:
        "NLP",

      demo:
        false,

      speaker:
        "Kim",

      allowedSlots: [
        2,
        3,
      ],

      allowedRooms: [
        "A",
        "B",
      ],
    },

    {
      id:
        "N4",

      title:
        "Language Models",

      topic:
        "NLP",

      demo:
        false,

      allowedSlots: [
        3,
        4,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },

    {
      id:
        "H1",

      title:
        "Digital Health",

      topic:
        "Health",

      demo:
        false,

      speaker:
        "Kim",

      allowedSlots: [
        2,
        3,
        4,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },

    {
      id:
        "H2",

      title:
        "Health Analytics",

      topic:
        "Health",

      demo:
        false,

      speaker:
        "Osei",

      allowedSlots: [
        2,
        3,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },

    {
      id:
        "H3",

      title:
        "Health Systems",

      topic:
        "Health",

      demo:
        false,

      allowedSlots: [
        1,
        2,
        3,
        4,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },

    {
      id:
        "H4",

      title:
        "Closing Panel",

      topic:
        "Health",

      demo:
        false,

      speaker:
        "Laurent",

      allowedSlots: [
        4,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },

    {
      id:
        "R1",

      title:
        "Robotics Demo",

      topic:
        "Robotics",

      demo:
        true,

      allowedSlots: [
        1,
        2,
      ],

      allowedRooms: [
        "A",
        "C",
      ],
    },

    {
      id:
        "R2",

      title:
        "Robot Control",

      topic:
        "Robotics",

      demo:
        true,

      speaker:
        "Kim",

      allowedSlots: [
        2,
        3,
      ],

      allowedRooms: [
        "A",
        "C",
      ],
    },

    {
      id:
        "R3",

      title:
        "Industrial Robotics",

      topic:
        "Robotics",

      demo:
        true,

      allowedSlots: [
        1,
        2,
        3,
        4,
      ],

      allowedRooms: [
        "A",
        "C",
      ],
    },

    {
      id:
        "R4",

      title:
        "Robotics Future",

      topic:
        "Robotics",

      demo:
        false,

      speaker:
        "Laurent",

      allowedSlots: [
        1,
        2,
        3,
        4,
      ],

      allowedRooms: [
        "A",
        "B",
        "C",
      ],
    },
  ];

export const TALK_IDS =
  TALKS.map(
    (talk) =>
      talk.id,
  );

export const DEMO_TALK_IDS = [
  "N1",
  "R1",
  "R2",
  "R3",
] as const;

export const POST_PROBE_REQUIRED_ROOM_A_TALKS = [
  "N1",
  "R1",
  "R2",
  "R3",
] as const;

export const AI_ROOM_TRACK_TOPICS:
  Record<
    Room,
    Topic
  > = {
    A:
      "NLP",

    B:
      "Health",

    C:
      "Robotics",
  };

export interface SpeakerConflictPair {
  id:
    string;

  speaker:
    string;

  firstTalkId:
    string;

  secondTalkId:
    string;
}

export const SPEAKER_CONFLICT_PAIRS:
  SpeakerConflictPair[] = [
    {
      id:
        "osei-n2-h2",

      speaker:
        "Osei",

      firstTalkId:
        "N2",

      secondTalkId:
        "H2",
    },

    {
      id:
        "kim-n3-h1",

      speaker:
        "Kim",

      firstTalkId:
        "N3",

      secondTalkId:
        "H1",
    },

    {
      id:
        "kim-n3-r2",

      speaker:
        "Kim",

      firstTalkId:
        "N3",

      secondTalkId:
        "R2",
    },

    {
      id:
        "kim-h1-r2",

      speaker:
        "Kim",

      firstTalkId:
        "H1",

      secondTalkId:
        "R2",
    },

    {
      id:
        "laurent-h4-r4",

      speaker:
        "Laurent",

      firstTalkId:
        "H4",

      secondTalkId:
        "R4",
    },
  ];

export const SYMPOSIUM_SCORING = {
  maximumScore:
    89,

  totalSpeakerPairChecks:
    5,

  speakerPairWeight:
    12,

  totalSameTopicPairs:
    18,

  sameTopicPairWeight:
    1.5,

  keynoteBonus:
    2,

  keynoteTalkId:
    "N1",

  keynoteRequiredRoom:
    "A" as Room,

  aiArtifactScore:
    77,

  aiArtifactScorePercentage:
    77 / 89,
};

export const AI_STRATEGY_ARTIFACT:
  Placement[] = [];

export const AI_PARTIAL_ARTIFACT:
  Placement[] = [
    {
      talkId:
        "N1",

      room:
        "A",

      slot:
        1,
    },

    {
      talkId:
        "N4",

      room:
        "A",

      slot:
        4,
    },

    {
      talkId:
        "H4",

      room:
        "B",

      slot:
        4,
    },

    {
      talkId:
        "R1",

      room:
        "C",

      slot:
        1,
    },
  ];

export const AI_FULL_ARTIFACT:
  Placement[] = [
    {
      talkId:
        "N1",

      room:
        "A",

      slot:
        1,
    },

    {
      talkId:
        "N3",

      room:
        "A",

      slot:
        2,
    },

    {
      talkId:
        "N2",

      room:
        "A",

      slot:
        3,
    },

    {
      talkId:
        "N4",

      room:
        "A",

      slot:
        4,
    },

    {
      talkId:
        "H3",

      room:
        "B",

      slot:
        1,
    },

    {
      talkId:
        "H2",

      room:
        "B",

      slot:
        2,
    },

    {
      talkId:
        "H1",

      room:
        "B",

      slot:
        3,
    },

    {
      talkId:
        "H4",

      room:
        "B",

      slot:
        4,
    },

    {
      talkId:
        "R1",

      room:
        "C",

      slot:
        1,
    },

    {
      talkId:
        "R2",

      room:
        "C",

      slot:
        2,
    },

    {
      talkId:
        "R4",

      room:
        "C",

      slot:
        3,
    },

    {
      talkId:
        "R3",

      room:
        "C",

      slot:
        4,
    },
  ];

export const VERIFIED_PRE_PROBE_OPTIMUM:
  Placement[] = [
    {
      talkId:
        "N1",

      room:
        "A",

      slot:
        1,
    },

    {
      talkId:
        "N3",

      room:
        "A",

      slot:
        2,
    },

    {
      talkId:
        "N2",

      room:
        "A",

      slot:
        3,
    },

    {
      talkId:
        "H1",

      room:
        "A",

      slot:
        4,
    },

    {
      talkId:
        "H3",

      room:
        "B",

      slot:
        1,
    },

    {
      talkId:
        "H2",

      room:
        "B",

      slot:
        2,
    },

    {
      talkId:
        "N4",

      room:
        "B",

      slot:
        3,
    },

    {
      talkId:
        "H4",

      room:
        "B",

      slot:
        4,
    },

    {
      talkId:
        "R1",

      room:
        "C",

      slot:
        1,
    },

    {
      talkId:
        "R4",

      room:
        "C",

      slot:
        2,
    },

    {
      talkId:
        "R2",

      room:
        "C",

      slot:
        3,
    },

    {
      talkId:
        "R3",

      room:
        "C",

      slot:
        4,
    },
  ];

export const VERIFIED_BEST_POST_PROBE_SOLUTION:
  Placement[] = [
    {
      talkId:
        "N1",

      room:
        "A",

      slot:
        1,
    },

    {
      talkId:
        "R1",

      room:
        "A",

      slot:
        2,
    },

    {
      talkId:
        "R2",

      room:
        "A",

      slot:
        3,
    },

    {
      talkId:
        "R3",

      room:
        "A",

      slot:
        4,
    },

    {
      talkId:
        "R4",

      room:
        "B",

      slot:
        1,
    },

    {
      talkId:
        "N3",

      room:
        "B",

      slot:
        2,
    },

    {
      talkId:
        "N2",

      room:
        "B",

      slot:
        3,
    },

    {
      talkId:
        "H4",

      room:
        "B",

      slot:
        4,
    },

    {
      talkId:
        "H3",

      room:
        "C",

      slot:
        1,
    },

    {
      talkId:
        "H2",

      room:
        "C",

      slot:
        2,
    },

    {
      talkId:
        "N4",

      room:
        "C",

      slot:
        3,
    },

    {
      talkId:
        "H1",

      room:
        "C",

      slot:
        4,
    },
  ];

export const EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL:
  Record<
    ConcretizationLevel,
    number
  > = {
    A:
      0,

    B:
      AI_PARTIAL_ARTIFACT.length,

    C:
      AI_FULL_ARTIFACT.length,
  };

export const AI_RECOMMENDATION_BY_LEVEL:
  Record<
    ConcretizationLevel,
    {
      heading:
        string;

      message:
        string;
    }
  > = {
    A: {
      heading:
        "Scheduling strategy",

      message:
        "Prioritize high attendance and livestream sessions in the largest room. Keep talks with similar topics together where possible. Place live demonstrations only in rooms with a projector, and check speaker availability before finalizing the schedule.",
    },

    B: {
      heading:
        "Suggested starting structure",

      message:
        "I placed several fixed anchor talks as a starting point. Use these placements to organize the remaining talks while checking room equipment, speaker conflicts, availability, and topic grouping.",
    },

    C: {
      heading:
        "Complete suggested schedule",

      message:
        "I created a complete schedule that groups NLP talks in Room A, Health talks in Room B, and Robotics talks in Room C. Review the schedule and make any changes needed to resolve conflicts and satisfy the task requirements.",
    },
  };

export const SEMANTIC_PROBE = {
  id:
    "room-c-projector-failure",

  version:
    SEMANTIC_PROBE_VERSION,

  title:
    "Facilities update",

  message:
    "The projector in Room C is broken for the rest of the day.",

  collapsedLabel:
    "New facilities update",

  shownAfterSeconds:
    7 * 60 + 30,

  collapseAfterSeconds:
    5,

  affectedRoom:
    "C" as Room,

  requiredProjectorRoom:
    "A" as Room,

  requiredTalkIds:
    [
      ...POST_PROBE_REQUIRED_ROOM_A_TALKS,
    ],

  semanticOnly:
    true,
};

function clonePlacements(
  placements:
    Placement[],
): Placement[] {
  return placements.map(
    (placement) => ({
      ...placement,
    }),
  );
}

export function getInitialPlacements(
  level:
    ConcretizationLevel,
): Placement[] {
  switch (
    level
  ) {
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
  trialNumber:
    StudyTrialNumber,
): Placement[] {
  return getInitialPlacements(
    getConditionForTrial(
      trialNumber,
    ),
  );
}

export function getExpectedInitialPlacementCount(
  level:
    ConcretizationLevel,
): number {
  return EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL[
    level
  ];
}

export function getAssistantRecommendation(
  level:
    ConcretizationLevel,
): {
  heading:
    string;

  message:
    string;
} {
  return {
    ...AI_RECOMMENDATION_BY_LEVEL[
      level
    ],
  };
}

export function getTalkById(
  talkId:
    string,
): Talk | undefined {
  return TALKS.find(
    (talk) =>
      talk.id ===
      talkId,
  );
}

export function isDemoTalk(
  talkId:
    string,
): boolean {
  return DEMO_TALK_IDS.some(
    (demoTalkId) =>
      demoTalkId ===
      talkId,
  );
}

export function getPlacementAt(
  placements:
    Placement[],
  room:
    Room,
  slot:
    Slot,
): Placement | undefined {
  return placements.find(
    (placement) =>
      placement.room ===
        room &&
      placement.slot ===
        slot,
  );
}

export function getTalkAt(
  room:
    Room,
  slot:
    Slot,
): Placement | undefined {
  return getPlacementAt(
    AI_FULL_ARTIFACT,
    room,
    slot,
  );
}

export function formatAllowedSlots(
  slots:
    Slot[],
): string {
  if (
    slots.length ===
    SLOTS.length
  ) {
    return "Any slot";
  }

  return slots
    .map(
      (slot) =>
        `Slot ${slot}`,
    )
    .join(", ");
}

export function formatAllowedRooms(
  rooms:
    Room[],
): string {
  if (
    rooms.length ===
    ROOMS.length
  ) {
    return "Any room";
  }

  return rooms
    .map(
      (room) =>
        `Room ${room}`,
    )
    .join(", ");
}