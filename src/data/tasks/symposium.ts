import {
  AI_FULL_ARTIFACT,
  AI_PARTIAL_ARTIFACT,
  AI_RECOMMENDATION_BY_LEVEL,
  AI_STRATEGY_ARTIFACT,
  ROOM_DETAILS,
  ROOMS,
  SEMANTIC_PROBE,
  SLOTS,
  SYMPOSIUM_CONSTRAINTS,
  SYMPOSIUM_PREFERENCES,
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
  ProbeTriggerPolicyDefinition,
  SymposiumConstraintDefinition,
  SymposiumPreferenceDefinition,
} from "../symposium";

import type {
  ConcretizationLevel,
  Placement,
  ProbeDisplayMode,
  Room,
  Slot,
  StudyTrialNumber,
  Talk,
} from "../../types/scheduler";

export interface SymposiumTaskConstraint {
  id: SymposiumConstraintDefinition["id"];
  title: string;
  description: string;
}

export interface SymposiumTaskPreference {
  id: SymposiumPreferenceDefinition["id"];
  title: string;
  description: string;
}

export interface SymposiumTaskUpdate {
  id: string;
  version?: string;
  title: string;
  message: string;
  collapsedLabel: string;
  affectedRoom: Room;
  requiredProjectorRoom?: Room;
  requiredTalkIds?: string[];
  triggerPolicy: ProbeTriggerPolicyDefinition;
  collapseAfterSeconds: number;
  displayMode?: ProbeDisplayMode;
  semanticOnly: boolean;
}

export interface SymposiumAssistantContent {
  name: string;
  statusLabel: string;
  recommendationLabel: string;
  heading: string;
  recommendation: string;
  prefillAcknowledgment?: string | null;
  contentVersion?: string;
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
  routePattern: "/task/:taskId/:trialNumber";
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

const SYMPOSIUM_TASK_ID = "symposium" as const;

const CONSTRAINT_TITLES: Record<
  SymposiumConstraintDefinition["id"],
  string
> = {
  projector_requirement:
    "Demo projector requirement",
  capacity_requirement:
    "N3 capacity requirement",
  speaker_availability:
    "Speaker conflict rule",
};

const PREFERENCE_TITLES: Record<
  SymposiumPreferenceDefinition["id"],
  string
> = {
  topic_grouping: "Topic grouping",
  keynote_opening: "Keynote placement",
};

function clonePlacements(
  placements: Placement[],
): Placement[] {
  return placements.map((placement) => ({
    ...placement,
  }));
}

function cloneAssistantContent(
  assistant: SymposiumAssistantContent,
): SymposiumAssistantContent {
  return {
    ...assistant,
    roomRecommendations:
      assistant.roomRecommendations?.map(
        (recommendation) => ({
          ...recommendation,
        }),
      ),
  };
}

function createAssistantContent(
  condition: ConcretizationLevel,
): SymposiumAssistantContent {
  const recommendation =
    getAssistantRecommendation(condition);

  return {
    name: "AI Scheduling Assistant",
    statusLabel: "Analysis complete",
    recommendationLabel: "Recommendation",
    heading: recommendation.heading,
    recommendation: recommendation.message,
    prefillAcknowledgment:
      recommendation.prefillAcknowledgment,
    contentVersion: SYMPOSIUM_TASK.messageVersion,
  };
}

export function getSymposiumTrialRoute(
  trialNumber: StudyTrialNumber,
): string {
  return `/task/${SYMPOSIUM_TASK_ID}/${trialNumber}`;
}

/*
 * The recommendation content is identical across A, B, and C.
 * Only the acknowledgement of the condition-specific prefill may differ.
 */
const assistantByCondition: Record<
  ConcretizationLevel,
  SymposiumAssistantContent
> = {
  A: createAssistantContent("A"),
  B: createAssistantContent("B"),
  C: createAssistantContent("C"),
};

const initialPlacements: Record<
  ConcretizationLevel,
  Placement[]
> = {
  A: clonePlacements(AI_STRATEGY_ARTIFACT),
  B: clonePlacements(AI_PARTIAL_ARTIFACT),
  C: clonePlacements(AI_FULL_ARTIFACT),
};

/*
 * trialNumber is the stable condition-option identity:
 * 1 = A, 2 = B, 3 = C.
 *
 * It is not the participant's chronological trial order. The study-session
 * store assigns chronological order only when the token-assigned option
 * is actually started.
 */
const trials: SymposiumTrialContent[] = [
  {
    trialNumber: 1,
    participantLabel: "Task 1",
    condition: "A",
    route: getSymposiumTrialRoute(1),
    assistant: cloneAssistantContent(
      assistantByCondition.A,
    ),
    initialPlacements: clonePlacements(
      initialPlacements.A,
    ),
  },
  {
    trialNumber: 2,
    participantLabel: "Task 2",
    condition: "B",
    route: getSymposiumTrialRoute(2),
    assistant: cloneAssistantContent(
      assistantByCondition.B,
    ),
    initialPlacements: clonePlacements(
      initialPlacements.B,
    ),
  },
  {
    trialNumber: 3,
    participantLabel: "Task 3",
    condition: "C",
    route: getSymposiumTrialRoute(3),
    assistant: cloneAssistantContent(
      assistantByCondition.C,
    ),
    initialPlacements: clonePlacements(
      initialPlacements.C,
    ),
  },
];

export const SYMPOSIUM_TASK_DATA:
  SymposiumTaskDefinition = {
    id: SYMPOSIUM_TASK_ID,
    routePattern: "/task/:taskId/:trialNumber",
    title: SYMPOSIUM_TASK.title,
    shortTitle: SYMPOSIUM_TASK.shortTitle,
    description: SYMPOSIUM_TASK.description,
    objective:
      "Create a complete symposium schedule that satisfies the scheduling constraints while considering the scheduling preferences.",
    itemSingular: "talk",
    itemPlural: "talks",
    locationSingular: "room",
    locationPlural: "rooms",
    periodSingular: "slot",
    periodPlural: "slots",
    durationSeconds: SYMPOSIUM_TASK.durationSeconds,
    rooms: [...ROOMS],
    slots: [...SLOTS],
    talks: TALKS.map((talk) => ({
      ...talk,
      allowedSlots: [...talk.allowedSlots],
      allowedRooms: [...talk.allowedRooms],
    })),
    roomDetails: {
      A: { ...ROOM_DETAILS.A },
      B: { ...ROOM_DETAILS.B },
      C: { ...ROOM_DETAILS.C },
    },
    constraints: SYMPOSIUM_CONSTRAINTS.map(
      (constraint) => ({
        id: constraint.id,
        title: CONSTRAINT_TITLES[constraint.id],
        description: constraint.text,
      }),
    ),
    preferences: SYMPOSIUM_PREFERENCES.map(
      (preference) => ({
        id: preference.id,
        title: PREFERENCE_TITLES[preference.id],
        description: preference.text,
      }),
    ),
    assistantByCondition,
    initialPlacements,
    trials,
    update: {
      id: SEMANTIC_PROBE.id,
      version: SEMANTIC_PROBE.version,
      title: SEMANTIC_PROBE.title,
      message: SEMANTIC_PROBE.message,
      collapsedLabel: SEMANTIC_PROBE.collapsedLabel,
      affectedRoom: SEMANTIC_PROBE.affectedRoom,
      requiredProjectorRoom:
        SEMANTIC_PROBE.requiredProjectorRoom,
      requiredTalkIds: [
        ...SEMANTIC_PROBE.requiredTalkIds,
      ],
      // ADVISER FIX: Expose the shared state-based policy instead of a fixed onset.
      triggerPolicy: {
        ...SEMANTIC_PROBE.triggerPolicy,
        triggerReasons: [
          ...SEMANTIC_PROBE
            .triggerPolicy.triggerReasons,
        ],
      },
      collapseAfterSeconds:
        SEMANTIC_PROBE.collapseAfterSeconds,
      displayMode: SEMANTIC_PROBE.displayMode,
      semanticOnly: SEMANTIC_PROBE.semanticOnly,
    },
  };

export function getSymposiumInitialPlacements(
  condition: ConcretizationLevel,
): Placement[] {
  return clonePlacements(
    SYMPOSIUM_TASK_DATA
      .initialPlacements[condition],
  );
}

export function getSymposiumTrialContent(
  trialNumber: StudyTrialNumber,
): SymposiumTrialContent {
  const trial =
    SYMPOSIUM_TASK_DATA.trials.find(
      (item) =>
        item.trialNumber === trialNumber,
    );

  if (!trial) {
    throw new Error(
      `No Symposium condition option exists for trial number ${trialNumber}.`,
    );
  }

  return {
    ...trial,
    assistant: cloneAssistantContent(
      trial.assistant,
    ),
    initialPlacements: clonePlacements(
      trial.initialPlacements,
    ),
  };
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
  SYMPOSIUM_CONSTRAINTS,
  SYMPOSIUM_PREFERENCES,
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
