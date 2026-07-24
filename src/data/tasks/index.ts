import {
  SYMPOSIUM_TASK_DATA,
  getSymposiumTrialContent,
  getSymposiumTrialRoute,
} from "./symposium";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../../types/scheduler";

import type {
  SymposiumTaskDefinition,
  SymposiumTrialContent,
} from "./symposium";

export type StudyTaskDefinition =
  SymposiumTaskDefinition;

export const STUDY_TASK_IDS:
  StudyTaskId[] = [
    "symposium",
  ];

export const STUDY_TASKS: Record<
  StudyTaskId,
  StudyTaskDefinition
> = {
  symposium:
    SYMPOSIUM_TASK_DATA,
};

export const STUDY_TASK_LIST:
  StudyTaskDefinition[] = [
    SYMPOSIUM_TASK_DATA,
  ];

export function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return value === "symposium";
}

export function getTaskDefinition(
  taskId: StudyTaskId,
): StudyTaskDefinition {
  return STUDY_TASKS[
    taskId
  ];
}

export function findTaskDefinition(
  taskId: string,
): StudyTaskDefinition | undefined {
  if (!isStudyTaskId(taskId)) {
    return undefined;
  }

  return STUDY_TASKS[
    taskId
  ];
}

export function getTaskTitle(
  taskId: StudyTaskId,
): string {
  return STUDY_TASKS[
    taskId
  ].title;
}

export function getTaskShortTitle(
  taskId: StudyTaskId,
): string {
  return STUDY_TASKS[
    taskId
  ].shortTitle;
}

export function getTaskDurationSeconds(
  taskId: StudyTaskId,
): number {
  return STUDY_TASKS[
    taskId
  ].durationSeconds;
}

export function getTaskRoute(
  trialNumber: StudyTrialNumber,
): string {
  return getSymposiumTrialRoute(
    trialNumber,
  );
}

export function getTrialContent(
  trialNumber: StudyTrialNumber,
): SymposiumTrialContent {
  return getSymposiumTrialContent(
    trialNumber,
  );
}

export {
  SYMPOSIUM_TASK_DATA,
  getSymposiumTrialContent,
  getSymposiumTrialRoute,
};

export * from "./symposium";