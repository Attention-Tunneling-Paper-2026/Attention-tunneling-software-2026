import {
  AI_FULL_ARTIFACT,
  AI_PARTIAL_ARTIFACT,
  AI_RECOMMENDATION_BY_LEVEL,
  AI_STRATEGY_ARTIFACT,
  ROOM_DETAILS,
  ROOMS,
  SEMANTIC_PROBE,
  SLOTS,
  SYMPOSIUM_TASK,
  TALKS,
  formatAllowedRooms,
  formatAllowedSlots,
  getAssistantRecommendation,
  getInitialPlacements,
  getInitialPlacementsForTrial,
  getPlacementAt,
  getTalkAt,
  getTalkById,
} from "../symposium";

import type {
  ConcretizationLevel,
  Placement,
  Room,
  Slot,
  StudyTrialNumber,
  Talk,
} from "../../types/scheduler";

export interface SymposiumTaskConstraint {
  id: string;
  title: string;
  description: string;
}

export interface SymposiumTaskPreference {
  id: string;
  title: string;
  description: string;
}

export interface SymposiumTaskUpdate {
  id: string;
  title: string;
  message: string;
  collapsedLabel: string;

  affectedRoom: Room;

  shownAfterSeconds: number;
  collapseAfterSeconds: number;

  semanticOnly: boolean;
}

export interface SymposiumAssistantContent {
  name: string;
  statusLabel: string;
  recommendationLabel: string;

  heading: string;
  recommendation: string;

  roomRecommendations?: {
    room: Room;
    topic: string;
  }[];
}

export interface SymposiumTrialContent {
  trialNumber: StudyTrialNumber;
  participantLabel: string;
  condition: ConcretizationLevel;
  route: string;

  assistant: SymposiumAssistantContent;

  initialPlacements: Placement[];
}

export interface SymposiumTaskDefinition {
  id: "symposium";

  routePattern: "/task/:trialNumber";

  title: string;
  shortTitle: string;
  description: string;
  objective: string;

  itemSingular: string;
  itemPlural: string;

  locationSingular: string;
  locationPlural: string;

  periodSingular: string;
  periodPlural: string;

  durationSeconds: number;

  rooms: Room[];
  slots: Slot[];
  talks: Talk[];

  roomDetails: typeof ROOM_DETAILS;

  constraints: SymposiumTaskConstraint[];
  preferences: SymposiumTaskPreference[];

  assistantByCondition: Record<
    ConcretizationLevel,
    SymposiumAssistantContent
  >;

  initialPlacements: Record<
    ConcretizationLevel,
    Placement[]
  >;

  trials: SymposiumTrialContent[];

  update: SymposiumTaskUpdate;
}

function clonePlacements(
  placements: Placement[],
): Placement[] {
  return placements.map(
    (placement) => ({
      ...placement,
    }),
  );
}

function createAssistantContent(
  condition: ConcretizationLevel,
): SymposiumAssistantContent {
  const recommendation =
    getAssistantRecommendation(
      condition,
    );

  if (condition === "C") {
    return {
      name: "AI Scheduling Assistant",

      statusLabel:
        "Analysis complete",

      recommendationLabel:
        "Recommendation",

      heading:
        recommendation.heading,

      recommendation:
        recommendation.message,

      roomRecommendations: [
        {
          room: "A",
          topic: "NLP",
        },

        {
          room: "B",
          topic: "Health",
        },

        {
          room: "C",
          topic: "Robotics",
        },
      ],
    };
  }

  return {
    name: "AI Scheduling Assistant",

    statusLabel:
      "Analysis complete",

    recommendationLabel:
      "Recommendation",

    heading:
      recommendation.heading,

    recommendation:
      recommendation.message,
  };
}

const assistantByCondition: Record<
  ConcretizationLevel,
  SymposiumAssistantContent
> = {
  A: createAssistantContent(
    "A",
  ),

  B: createAssistantContent(
    "B",
  ),

  C: createAssistantContent(
    "C",
  ),
};

const initialPlacements: Record<
  ConcretizationLevel,
  Placement[]
> = {
  A: clonePlacements(
    AI_STRATEGY_ARTIFACT,
  ),

  B: clonePlacements(
    AI_PARTIAL_ARTIFACT,
  ),

  C: clonePlacements(
    AI_FULL_ARTIFACT,
  ),
};

const trials: SymposiumTrialContent[] = [
  {
    trialNumber: 1,

    participantLabel:
      "Task 1",

    condition: "A",

    route: "/task/1",

    assistant: {
      ...assistantByCondition.A,
    },

    initialPlacements:
      clonePlacements(
        initialPlacements.A,
      ),
  },

  {
    trialNumber: 2,

    participantLabel:
      "Task 2",

    condition: "B",

    route: "/task/2",

    assistant: {
      ...assistantByCondition.B,
    },

    initialPlacements:
      clonePlacements(
        initialPlacements.B,
      ),
  },

  {
    trialNumber: 3,

    participantLabel:
      "Task 3",

    condition: "C",

    route: "/task/3",

    assistant: {
      ...assistantByCondition.C,

      roomRecommendations:
        assistantByCondition.C
          .roomRecommendations?.map(
            (recommendation) => ({
              ...recommendation,
            }),
          ),
    },

    initialPlacements:
      clonePlacements(
        initialPlacements.C,
      ),
  },
];

export const SYMPOSIUM_TASK_DATA:
  SymposiumTaskDefinition = {
    id: "symposium",

    routePattern:
      "/task/:trialNumber",

    title:
      SYMPOSIUM_TASK.title,

    shortTitle:
      SYMPOSIUM_TASK.shortTitle,

    description:
      SYMPOSIUM_TASK.description,

    objective:
      "Create a complete symposium schedule that assigns every talk to a suitable room and time slot while satisfying the scheduling constraints.",

    itemSingular:
      "talk",

    itemPlural:
      "talks",

    locationSingular:
      "room",

    locationPlural:
      "rooms",

    periodSingular:
      "slot",

    periodPlural:
      "slots",

    durationSeconds:
      SYMPOSIUM_TASK.durationSeconds,

    rooms: [
      ...ROOMS,
    ],

    slots: [
      ...SLOTS,
    ],

    talks:
      TALKS.map(
        (talk) => ({
          ...talk,

          allowedSlots: [
            ...talk.allowedSlots,
          ],

          allowedRooms: [
            ...talk.allowedRooms,
          ],
        }),
      ),

    roomDetails: {
      A: {
        ...ROOM_DETAILS.A,
      },

      B: {
        ...ROOM_DETAILS.B,
      },

      C: {
        ...ROOM_DETAILS.C,
      },
    },

    constraints: [
      {
        id:
          "assign-every-talk",

        title:
          "Complete assignment",

        description:
          "Schedule every talk exactly once.",
      },

      {
        id:
          "one-talk-per-cell",

        title:
          "One talk per cell",

        description:
          "Each room and slot may contain only one talk.",
      },

      {
        id:
          "availability",

        title:
          "Availability",

        description:
          "Each talk may only use its allowed rooms and available slots.",
      },

      {
        id:
          "projector",

        title:
          "Projector requirement",

        description:
          "Demo talks N1, R1, R2, and R3 require a projector and may only use Room A or Room C.",
      },

      {
        id:
          "capacity",

        title:
          "Capacity requirement",

        description:
          "Talk N3 requires at least 80 seats and may only use Room A or Room B.",
      },

      {
        id:
          "speaker-conflict",

        title:
          "Speaker availability",

        description:
          "A speaker cannot present more than one talk during the same slot.",
      },
    ],

    preferences: [
      {
        id:
          "group-topics",

        title:
          "Group topics",

        description:
          "Keep talks from the same topic grouped in the same room where possible.",
      },

      {
        id:
          "keynote-opening",

        title:
          "Keynote placement",

        description:
          "Place keynote N1 in Room A during Slot 1.",
      },
    ],

    assistantByCondition,

    initialPlacements,

    trials,

    update: {
      id:
        SEMANTIC_PROBE.id,

      title:
        SEMANTIC_PROBE.title,

      message:
        `${SEMANTIC_PROBE.message} Continue scheduling using this updated information.`,

      collapsedLabel:
        SEMANTIC_PROBE.collapsedLabel,

      affectedRoom:
        "C",

      shownAfterSeconds:
        SEMANTIC_PROBE.shownAfterSeconds,

      collapseAfterSeconds:
        SEMANTIC_PROBE.collapseAfterSeconds,

      semanticOnly:
        SEMANTIC_PROBE.semanticOnly,
    },
  };

export function getSymposiumInitialPlacements(
  condition: ConcretizationLevel,
): Placement[] {
  return clonePlacements(
    SYMPOSIUM_TASK_DATA
      .initialPlacements[
        condition
      ],
  );
}

export function getSymposiumTrialContent(
  trialNumber: StudyTrialNumber,
): SymposiumTrialContent {
  const trial =
    SYMPOSIUM_TASK_DATA
      .trials
      .find(
        (item) =>
          item.trialNumber ===
          trialNumber,
      );

  if (!trial) {
    throw new Error(
      `No Symposium configuration exists for Task ${trialNumber}.`,
    );
  }

  return {
    ...trial,

    assistant: {
      ...trial.assistant,

      roomRecommendations:
        trial.assistant
          .roomRecommendations
          ?.map(
            (recommendation) => ({
              ...recommendation,
            }),
          ),
    },

    initialPlacements:
      clonePlacements(
        trial.initialPlacements,
      ),
  };
}

export function getSymposiumTrialRoute(
  trialNumber: StudyTrialNumber,
): string {
  return `/task/${trialNumber}`;
}

export {
  AI_FULL_ARTIFACT,
  AI_PARTIAL_ARTIFACT,
  AI_RECOMMENDATION_BY_LEVEL,
  AI_STRATEGY_ARTIFACT,
  ROOM_DETAILS,
  ROOMS,
  SEMANTIC_PROBE,
  SLOTS,
  SYMPOSIUM_TASK,
  TALKS,
  formatAllowedRooms,
  formatAllowedSlots,
  getAssistantRecommendation,
  getInitialPlacements,
  getInitialPlacementsForTrial,
  getPlacementAt,
  getTalkAt,
  getTalkById,
};

export default SYMPOSIUM_TASK_DATA;