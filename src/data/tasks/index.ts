import {
  SYMPOSIUM_TASK_DATA,
  getSymposiumTrialContent,
  getSymposiumTrialRoute,
} from "./symposium";

import {
  getAssistantRecommendation,
  getInitialPlacements,
  getSemanticProbe,
  getStudyTaskDefinition,
  getTaskConstraints,
  getTaskItems,
  getTaskPreferences,
  getTaskResourceDetails,
} from "../symposium";

import {
  getTaskSkin,
} from "../taskSkins";

import type {
  ConcretizationLevel,
  Placement,
  StudyTaskId,
  StudyTrialNumber,
} from "../../types/scheduler";

import type {
  SymposiumAssistantContent,
  SymposiumTaskDefinition,
  SymposiumTrialContent,
} from "./symposium";

export interface StudyTaskConstraint {
  id: string;
  title: string;
  description: string;
}

export interface StudyTaskPreference {
  id: string;
  title: string;
  description: string;
}

export type StudyTaskDefinition = Omit<
  SymposiumTaskDefinition,
  "id" | "constraints" | "preferences"
> & {
  id: StudyTaskId;
  constraints: StudyTaskConstraint[];
  preferences: StudyTaskPreference[];
};

export const STUDY_TASK_IDS:
  StudyTaskId[] = [
    "symposium",
    "delivery",
    "clinic",
  ];

const STUDY_TRIAL_NUMBERS:
  StudyTrialNumber[] = [
    1,
    2,
    3,
  ];

const CONDITION_BY_TRIAL: Record<
  StudyTrialNumber,
  ConcretizationLevel
> = {
  1: "A",
  2: "B",
  3: "C",
};

const CONSTRAINT_TITLES: Record<
  StudyTaskId,
  Record<number, string>
> = {
  symposium: {
    1: "Demo projector requirement",
    2: "N3 capacity requirement",
    3: "Speaker conflict rule",
  },
  delivery: {
    1: "Cold-chain refrigeration requirement",
    2: "N3 capacity requirement",
    3: "Driver conflict rule",
  },
  clinic: {
    1: "ICU ward requirement",
    2: "N3 capacity requirement",
    3: "Nurse conflict rule",
  },
};

const PREFERENCE_TITLES: Record<
  StudyTaskId,
  Record<number, string>
> = {
  symposium: {
    1: "Topic grouping",
    2: "Keynote placement",
  },
  delivery: {
    1: "Region grouping",
    2: "Priority dispatch",
  },
  clinic: {
    1: "Specialty grouping",
    2: "Priority duty",
  },
};

function clonePlacements(
  placements: readonly Placement[],
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

function getAssistantName(
  taskId: StudyTaskId,
): string {
  switch (taskId) {
    case "delivery":
      return "AI Dispatch Assistant";

    case "clinic":
      return "AI Roster Assistant";

    case "symposium":
    default:
      return "AI Scheduling Assistant";
  }
}

function createTaskRoute(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `/task/${taskId}/${trialNumber}`;
}

function createAssistantContent(
  taskId: StudyTaskId,
  condition: ConcretizationLevel,
  contentVersion: string,
): SymposiumAssistantContent {
  const recommendation =
    getAssistantRecommendation(
      condition,
      taskId,
    );

  return {
    name: getAssistantName(taskId),
    statusLabel: "Analysis complete",
    recommendationLabel: "Recommendation",
    heading: recommendation.heading,
    recommendation: recommendation.message,
    prefillAcknowledgment:
      recommendation.prefillAcknowledgment,
    contentVersion,
  };
}

function createTaskDefinition(
  taskId: Exclude<
    StudyTaskId,
    "symposium"
  >,
): StudyTaskDefinition {
  const skin = getTaskSkin(taskId);
  const taskMetadata =
    getStudyTaskDefinition(taskId);
  const resourceDetails =
    getTaskResourceDetails(taskId);
  const probe = getSemanticProbe(taskId);

  const assistantByCondition: Record<
    ConcretizationLevel,
    SymposiumAssistantContent
  > = {
    A: createAssistantContent(
      taskId,
      "A",
      taskMetadata.messageVersion,
    ),
    B: createAssistantContent(
      taskId,
      "B",
      taskMetadata.messageVersion,
    ),
    C: createAssistantContent(
      taskId,
      "C",
      taskMetadata.messageVersion,
    ),
  };

  const initialPlacements: Record<
    ConcretizationLevel,
    Placement[]
  > = {
    A: getInitialPlacements("A", taskId),
    B: getInitialPlacements("B", taskId),
    C: getInitialPlacements("C", taskId),
  };

  const trials: SymposiumTrialContent[] =
    STUDY_TRIAL_NUMBERS.map(
      (trialNumber) => {
        const condition =
          CONDITION_BY_TRIAL[trialNumber];

        return {
          trialNumber,
          participantLabel:
            `Task ${trialNumber}`,
          condition,
          route: createTaskRoute(
            taskId,
            trialNumber,
          ),
          assistant: cloneAssistantContent(
            assistantByCondition[condition],
          ),
          initialPlacements:
            clonePlacements(
              initialPlacements[condition],
            ),
        };
      },
    );

  return {
    id: taskId,
    routePattern:
      "/task/:taskId/:trialNumber",
    title: taskMetadata.title,
    shortTitle: taskMetadata.shortTitle,
    description: taskMetadata.description,
    objective: skin.objective,
    itemSingular:
      skin.vocabulary.itemSingular,
    itemPlural:
      skin.vocabulary.itemPlural,
    locationSingular:
      skin.vocabulary.resourceSingular,
    locationPlural:
      skin.vocabulary.resourcePlural,
    periodSingular:
      skin.vocabulary.periodSingular,
    periodPlural:
      skin.vocabulary.periodPlural,
    durationSeconds:
      taskMetadata.durationSeconds,
    rooms: [
      ...SYMPOSIUM_TASK_DATA.rooms,
    ],
    slots: [
      ...SYMPOSIUM_TASK_DATA.slots,
    ],
    talks: getTaskItems(taskId).map(
      (item) => ({
        ...item,
        allowedSlots: [
          ...item.allowedSlots,
        ],
        allowedRooms: [
          ...item.allowedRooms,
        ],
      }),
    ),
    roomDetails: {
      A: {
        ...resourceDetails.A,
      },
      B: {
        ...resourceDetails.B,
      },
      C: {
        ...resourceDetails.C,
      },
    },
    constraints:
      getTaskConstraints(taskId).map(
        (constraint) => ({
          id: constraint.id,
          title:
            CONSTRAINT_TITLES[taskId][
              constraint.number
            ],
          description:
            constraint.text,
        }),
      ),
    preferences:
      getTaskPreferences(taskId).map(
        (preference) => ({
          id: preference.id,
          title:
            PREFERENCE_TITLES[taskId][
              preference.number
            ],
          description:
            preference.text,
        }),
      ),
    assistantByCondition,
    initialPlacements,
    trials,
    update: {
      id: probe.id,
      version: probe.version,
      title: probe.title,
      message: probe.message,
      collapsedLabel:
        probe.collapsedLabel,
      affectedRoom:
        probe.affectedRoom,
      requiredProjectorRoom:
        probe.requiredProjectorRoom,
      requiredTalkIds: [
        ...probe.requiredTalkIds,
      ],
      // ADVISER FIX: Use the canonical state-based probe policy for every task skin.
      triggerPolicy: {
        ...probe.triggerPolicy,
        triggerReasons: [
          ...probe.triggerPolicy
            .triggerReasons,
        ],
      },
      collapseAfterSeconds:
        probe.collapseAfterSeconds,
      displayMode:
        probe.displayMode,
      semanticOnly:
        probe.semanticOnly,
    },
  };
}

export const DELIVERY_TASK_DATA:
  StudyTaskDefinition =
    createTaskDefinition("delivery");

export const CLINIC_TASK_DATA:
  StudyTaskDefinition =
    createTaskDefinition("clinic");

export const STUDY_TASKS: Record<
  StudyTaskId,
  StudyTaskDefinition
> = {
  symposium:
    SYMPOSIUM_TASK_DATA,
  delivery:
    DELIVERY_TASK_DATA,
  clinic:
    CLINIC_TASK_DATA,
};

export const STUDY_TASK_LIST:
  StudyTaskDefinition[] =
    STUDY_TASK_IDS.map(
      (taskId) =>
        STUDY_TASKS[taskId],
    );

export function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

export function getTaskDefinition(
  taskId: StudyTaskId,
): StudyTaskDefinition {
  return STUDY_TASKS[taskId];
}

export function findTaskDefinition(
  taskId: string,
): StudyTaskDefinition | undefined {
  if (!isStudyTaskId(taskId)) {
    return undefined;
  }

  return STUDY_TASKS[taskId];
}

export function getTaskTitle(
  taskId: StudyTaskId,
): string {
  return STUDY_TASKS[taskId].title;
}

export function getTaskShortTitle(
  taskId: StudyTaskId,
): string {
  return STUDY_TASKS[taskId].shortTitle;
}

export function getTaskDurationSeconds(
  taskId: StudyTaskId,
): number {
  return STUDY_TASKS[
    taskId
  ].durationSeconds;
}

export function getTaskRoute(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): string;

export function getTaskRoute(
  trialNumber: StudyTrialNumber,
): string;

export function getTaskRoute(
  taskIdOrTrialNumber:
    | StudyTaskId
    | StudyTrialNumber,
  trialNumber?: StudyTrialNumber,
): string {
  if (
    typeof taskIdOrTrialNumber ===
    "number"
  ) {
    return createTaskRoute(
      "symposium",
      taskIdOrTrialNumber,
    );
  }

  if (!trialNumber) {
    throw new Error(
      `A trial number is required for task "${taskIdOrTrialNumber}".`,
    );
  }

  return createTaskRoute(
    taskIdOrTrialNumber,
    trialNumber,
  );
}

export function getTrialContent(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): SymposiumTrialContent;

export function getTrialContent(
  trialNumber: StudyTrialNumber,
): SymposiumTrialContent;

export function getTrialContent(
  taskIdOrTrialNumber:
    | StudyTaskId
    | StudyTrialNumber,
  trialNumber?: StudyTrialNumber,
): SymposiumTrialContent {
  const taskId =
    typeof taskIdOrTrialNumber ===
    "number"
      ? "symposium"
      : taskIdOrTrialNumber;

  const resolvedTrialNumber =
    typeof taskIdOrTrialNumber ===
    "number"
      ? taskIdOrTrialNumber
      : trialNumber;

  if (!resolvedTrialNumber) {
    throw new Error(
      `A trial number is required for task "${taskId}".`,
    );
  }

  const trial =
    STUDY_TASKS[taskId].trials.find(
      (item) =>
        item.trialNumber ===
        resolvedTrialNumber,
    );

  if (!trial) {
    throw new Error(
      `No ${STUDY_TASKS[taskId].title} condition option exists for trial number ${resolvedTrialNumber}.`,
    );
  }

  return {
    ...trial,
    assistant:
      cloneAssistantContent(
        trial.assistant,
      ),
    initialPlacements:
      clonePlacements(
        trial.initialPlacements,
      ),
  };
}

export {
  SYMPOSIUM_TASK_DATA,
  getSymposiumTrialContent,
  getSymposiumTrialRoute,
};

export * from "./symposium";