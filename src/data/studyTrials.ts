import {
  DEFAULT_CONDITION_ORDER,
  STUDY_TASK_IDS,
  STUDY_TRIAL_NUMBERS,
  TOTAL_STUDY_TRIALS,
  TRIALS_PER_TASK,
  createCompositeTrialId,
  getConditionForTrial,
  getConditionForTrialOrder,
  getGlobalTrialNumber,
  getTaskNumber,
  getTrialNumberForCondition,
  isConditionOrder,
  isStudyTaskId,
  isStudyTrialNumber,
} from "../types/scheduler";

import {
  getTaskSkin,
} from "./taskSkins";

import type {
  ConditionOrder,
  ConcretizationLevel,
  StudyTaskId,
  StudyTrialNumber,
  StudyTrialOrder,
} from "../types/scheduler";

import type {
  StudyTrialAssignment,
  StudyTrialProgress,
} from "../types/study";

export const STUDY_TASK_SEQUENCE:
  readonly StudyTaskId[] = STUDY_TASK_IDS;

export const INNER_TRIAL_SEQUENCE:
  readonly StudyTrialNumber[] = STUDY_TRIAL_NUMBERS;

export const TOTAL_TASK_DOMAINS =
  STUDY_TASK_SEQUENCE.length;

export const SUBTASKS_PER_TASK =
  TRIALS_PER_TASK;

export {
  TOTAL_STUDY_TRIALS,
};

export interface StudyTaskTrialDefinition {
  taskId: StudyTaskId;
  trialNumber: StudyTrialNumber;
  condition: ConcretizationLevel;

  /** Participant-facing number of the outer problem domain: 1–3. */
  outerTaskNumber: number;

  /** Participant-facing number inside the selected domain: 1–3. */
  innerTaskNumber: StudyTrialNumber;

  /** Stable study-wide number in task-major order: 1–9. */
  globalTrialNumber: number;

  /** Stable composite identity such as symposium-A or clinic-C. */
  trialId: string;

  /**
   * Order of the assistance condition within a domain. This remains 1–3
   * even though the study-wide trial order spans 1–9.
   */
  innerTrialOrder: StudyTrialOrder;

  /** Study-wide serial order in task-major order. */
  trialOrder: number;

  conditionOrder: ConditionOrder;
  participantLabel: string;
  domainLabel: string;
  taskTitle: string;
  taskShortTitle: string;

  taskRoute: string;
  questionnaireRoute: string;
}

export interface StudyTaskGroupDefinition {
  taskId: StudyTaskId;
  outerTaskNumber: number;
  participantLabel: string;
  title: string;
  shortTitle: string;
  description: string;
  totalTrials: number;
  route: string;
  trials: StudyTaskTrialDefinition[];
}

export interface StudyTrialIdentity {
  taskId: StudyTaskId;
  trialNumber: StudyTrialNumber;
}

export interface ParsedStudyTrialIdentity
  extends StudyTrialIdentity {
  condition: ConcretizationLevel;
  trialId: string;
}

function createTaskRoute(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `/task/${taskId}/${trialNumber}`;
}

function createQuestionnaireRoute(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): string {
  return `/trial-questionnaire/${taskId}/${trialNumber}`;
}

function getTaskSelectionRoute(
  taskId: StudyTaskId,
): string {
  return `/tasks/${taskId}`;
}

function createTrialDefinition(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
  innerTrialOrder: StudyTrialOrder,
  conditionOrder: ConditionOrder,
): StudyTaskTrialDefinition {
  const skin = getTaskSkin(taskId);
  const condition = getConditionForTrial(trialNumber);
  const outerTaskNumber = getTaskNumber(taskId);
  const globalTrialNumber = getGlobalTrialNumber(
    taskId,
    trialNumber,
  );

  return {
    taskId,
    trialNumber,
    condition,
    outerTaskNumber,
    innerTaskNumber: trialNumber,
    globalTrialNumber,
    trialId: createCompositeTrialId(
      taskId,
      trialNumber,
    ),
    innerTrialOrder,
    trialOrder: globalTrialNumber,
    conditionOrder,
    participantLabel: `Task ${trialNumber}`,
    domainLabel: `Task ${outerTaskNumber}`,
    taskTitle: skin.title,
    taskShortTitle: skin.shortTitle,
    taskRoute: createTaskRoute(
      taskId,
      trialNumber,
    ),
    questionnaireRoute:
      createQuestionnaireRoute(
        taskId,
        trialNumber,
      ),
  };
}

/**
 * Creates the three inner trials for one task domain.
 *
 * trialNumber is the stable condition identity:
 * 1 = A, 2 = B, 3 = C.
 * innerTrialOrder records where that condition occurs in conditionOrder.
 */
export function createTaskTrialDefinitions(
  taskId: StudyTaskId,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskTrialDefinition[] {
  return INNER_TRIAL_SEQUENCE.map(
    (innerTrialOrder) => {
      const condition = getConditionForTrialOrder(
        innerTrialOrder,
        conditionOrder,
      );

      const trialNumber =
        getTrialNumberForCondition(condition);

      return createTrialDefinition(
        taskId,
        trialNumber,
        innerTrialOrder,
        conditionOrder,
      );
    },
  );
}

/** Creates the complete 3 × 3 study definition in task-major order. */
export function createStudyTrialDefinitions(
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskTrialDefinition[] {
  return STUDY_TASK_SEQUENCE.flatMap(
    (taskId) =>
      createTaskTrialDefinitions(
        taskId,
        conditionOrder,
      ),
  );
}

export function createStudyTaskGroups(
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskGroupDefinition[] {
  return STUDY_TASK_SEQUENCE.map(
    (taskId) => {
      const skin = getTaskSkin(taskId);
      const outerTaskNumber =
        getTaskNumber(taskId);

      return {
        taskId,
        outerTaskNumber,
        participantLabel:
          `Task ${outerTaskNumber}`,
        title: skin.title,
        shortTitle: skin.shortTitle,
        description: skin.description,
        totalTrials: SUBTASKS_PER_TASK,
        route: getTaskSelectionRoute(taskId),
        trials: createTaskTrialDefinitions(
          taskId,
          conditionOrder,
        ),
      };
    },
  );
}

export const STUDY_TRIAL_DEFINITIONS:
  readonly StudyTaskTrialDefinition[] =
    createStudyTrialDefinitions();

export const STUDY_TASK_GROUPS:
  readonly StudyTaskGroupDefinition[] =
    createStudyTaskGroups();

export function createStudyTrialAssignments(
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTrialAssignment[] {
  return createStudyTrialDefinitions(
    conditionOrder,
  ).map(
    (definition) => ({
      trialNumber:
        definition.trialNumber,
      trialOrder:
        0,
      taskId:
        definition.taskId,
      condition:
        definition.condition,
      conditionOrder:
        definition.conditionOrder,
      participantLabel:
        definition.participantLabel,
      isFirstTrial:
        false,
      probeExposureNumber:
        0,
      probeNaive:
        false,
      trialId:
        definition.trialId,
      outerTaskNumber:
        definition.outerTaskNumber,
      innerTaskNumber:
        definition.innerTaskNumber,
      globalTrialNumber:
        definition.globalTrialNumber,
    }),
  );
}

export function getStudyTaskGroup(
  taskId: StudyTaskId,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskGroupDefinition {
  const skin = getTaskSkin(taskId);
  const outerTaskNumber = getTaskNumber(taskId);

  return {
    taskId,
    outerTaskNumber,
    participantLabel: `Task ${outerTaskNumber}`,
    title: skin.title,
    shortTitle: skin.shortTitle,
    description: skin.description,
    totalTrials: SUBTASKS_PER_TASK,
    route: getTaskSelectionRoute(taskId),
    trials: createTaskTrialDefinitions(
      taskId,
      conditionOrder,
    ),
  };
}

export function getStudyTrialDefinition(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskTrialDefinition {
  const definition = createTaskTrialDefinitions(
    taskId,
    conditionOrder,
  ).find(
    (trial) =>
      trial.trialNumber === trialNumber,
  );

  if (!definition) {
    throw new Error(
      `No trial is configured for ${taskId} task ${trialNumber}.`,
    );
  }

  return { ...definition };
}

export function getStudyTrialById(
  trialId: string,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskTrialDefinition | undefined {
  const parsed = parseStudyTrialId(trialId);

  if (!parsed) {
    return undefined;
  }

  return getStudyTrialDefinition(
    parsed.taskId,
    parsed.trialNumber,
    conditionOrder,
  );
}

export function getStudyTrialByGlobalNumber(
  globalTrialNumber: number,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskTrialDefinition | undefined {
  const definition = createStudyTrialDefinitions(
    conditionOrder,
  ).find(
    (trial) =>
      trial.globalTrialNumber ===
      globalTrialNumber,
  );

  return definition
    ? { ...definition }
    : undefined;
}

export function getNextStudyTrialDefinition(
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
  conditionOrder: ConditionOrder = DEFAULT_CONDITION_ORDER,
): StudyTaskTrialDefinition | undefined {
  const definitions = createStudyTrialDefinitions(
    conditionOrder,
  ).sort(
    (first, second) =>
      first.globalTrialNumber -
      second.globalTrialNumber,
  );

  const currentIndex = definitions.findIndex(
    (trial) =>
      trial.taskId === taskId &&
      trial.trialNumber === trialNumber,
  );

  if (
    currentIndex < 0 ||
    currentIndex >= definitions.length - 1
  ) {
    return undefined;
  }

  return {
    ...definitions[currentIndex + 1],
  };
}

export function isStudyTrialIdentity(
  value: unknown,
): value is StudyTrialIdentity {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate = value as {
    taskId?: unknown;
    trialNumber?: unknown;
  };

  return (
    isStudyTaskId(candidate.taskId) &&
    isStudyTrialNumber(
      candidate.trialNumber,
    )
  );
}

export function studyTrialIdentitiesAreEqual(
  first: StudyTrialIdentity,
  second: StudyTrialIdentity,
): boolean {
  return (
    first.taskId === second.taskId &&
    first.trialNumber === second.trialNumber
  );
}

export function parseStudyTrialId(
  value: unknown,
): ParsedStudyTrialIdentity | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const separatorIndex = value.lastIndexOf("-");

  if (
    separatorIndex <= 0 ||
    separatorIndex === value.length - 1
  ) {
    return undefined;
  }

  const taskValue = value.slice(
    0,
    separatorIndex,
  );
  const conditionValue = value.slice(
    separatorIndex + 1,
  );

  if (!isStudyTaskId(taskValue)) {
    return undefined;
  }

  if (
    conditionValue !== "A" &&
    conditionValue !== "B" &&
    conditionValue !== "C"
  ) {
    return undefined;
  }

  const condition:
    ConcretizationLevel = conditionValue;
  const trialNumber =
    getTrialNumberForCondition(condition);

  return {
    taskId: taskValue,
    trialNumber,
    condition,
    trialId: createCompositeTrialId(
      taskValue,
      trialNumber,
    ),
  };
}

export function isStudyTrialId(
  value: unknown,
): value is string {
  return parseStudyTrialId(value) !==
    undefined;
}

export function getTaskTrialProgress(
  trials: readonly StudyTrialProgress[],
  taskId: StudyTaskId,
): StudyTrialProgress[] {
  return trials
    .filter(
      (trial) =>
        trial.taskId === taskId,
    )
    .sort(
      (first, second) =>
        first.trialNumber -
        second.trialNumber,
    );
}

export function getTrialProgressByIdentity(
  trials: readonly StudyTrialProgress[],
  taskId: StudyTaskId,
  trialNumber: StudyTrialNumber,
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) =>
      trial.taskId === taskId &&
      trial.trialNumber === trialNumber,
  );
}

export function getCompletedStudyTrialCount(
  trials: readonly StudyTrialProgress[],
): number {
  return trials.filter(
    (trial) =>
      trial.status ===
      "questionnaire_complete",
  ).length;
}

export function getCompletedTaskTrialCount(
  trials: readonly StudyTrialProgress[],
  taskId: StudyTaskId,
): number {
  return getTaskTrialProgress(
    trials,
    taskId,
  ).filter(
    (trial) =>
      trial.status ===
      "questionnaire_complete",
  ).length;
}

export function isTaskDomainComplete(
  trials: readonly StudyTrialProgress[],
  taskId: StudyTaskId,
): boolean {
  const taskTrials = getTaskTrialProgress(
    trials,
    taskId,
  );

  return (
    taskTrials.length === SUBTASKS_PER_TASK &&
    taskTrials.every(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    )
  );
}

export function areAllStudyTrialsComplete(
  trials: readonly StudyTrialProgress[],
): boolean {
  if (trials.length !== TOTAL_STUDY_TRIALS) {
    return false;
  }

  const expectedTrialIds = new Set(
    STUDY_TRIAL_DEFINITIONS.map(
      (trial) => trial.trialId,
    ),
  );

  const completedTrialIds = new Set(
    trials
      .filter(
        (trial) =>
          trial.status ===
          "questionnaire_complete",
      )
      .map(
        (trial) =>
          createCompositeTrialId(
            trial.taskId,
            trial.trialNumber,
          ),
      ),
  );

  return (
    completedTrialIds.size ===
      expectedTrialIds.size &&
    [...expectedTrialIds].every(
      (trialId) =>
        completedTrialIds.has(trialId),
    )
  );
}

export function validateStudyTrialConfiguration(
  definitions:
    readonly StudyTaskTrialDefinition[],
): boolean {
  if (
    definitions.length !==
    TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  const trialIds = new Set<string>();
  const globalNumbers = new Set<number>();

  for (const definition of definitions) {
    if (
      !isStudyTaskId(definition.taskId) ||
      !isStudyTrialNumber(
        definition.trialNumber,
      ) ||
      !isConditionOrder(
        definition.conditionOrder,
      )
    ) {
      return false;
    }

    if (
      definition.condition !==
      getConditionForTrial(
        definition.trialNumber,
      )
    ) {
      return false;
    }

    if (
      definition.trialId !==
      createCompositeTrialId(
        definition.taskId,
        definition.trialNumber,
      )
    ) {
      return false;
    }

    if (
      definition.globalTrialNumber !==
      getGlobalTrialNumber(
        definition.taskId,
        definition.trialNumber,
      )
    ) {
      return false;
    }

    if (
      trialIds.has(definition.trialId) ||
      globalNumbers.has(
        definition.globalTrialNumber,
      )
    ) {
      return false;
    }

    trialIds.add(definition.trialId);
    globalNumbers.add(
      definition.globalTrialNumber,
    );
  }

  return true;
}

/* Compatibility aliases for callers that use shorter names. */
export const STUDY_TRIALS =
  STUDY_TRIAL_DEFINITIONS;

export const TASK_TRIAL_GROUPS =
  STUDY_TASK_GROUPS;

export const getTrialDefinition =
  getStudyTrialDefinition;

export const getTrialByGlobalNumber =
  getStudyTrialByGlobalNumber;
