import {
  create,
} from "zustand";

import assignmentTable from "../data/assignment.json";

/*
 * Study allocation invariant:
 * - A validated P001-P054 token resolves to exactly three ordered trials.
 * - Each plan contains every task domain and every condition exactly once.
 * - The static assignment table is the sole source of runtime allocation.
 */

import {
  DEFAULT_CONDITION_ORDER,
  createCompositeTrialId,
  getGlobalOptionNumber,
  getTrialNumberForCondition,
  isConditionOrder,
  isStudyTrialOrder,
} from "../types/scheduler";

import type {
  ConcretizationLevel,
  ConditionOrder,
  StudyTaskId,
  StudyTrialNumber,
  StudyTrialOrder,
} from "../types/scheduler";

import type {
  StudySessionStage,
  StudyTrialAssignment,
  StudyTrialEndReason,
  StudyTrialProgress,
  TrialExportStatus,
  TrialProgressStatus,
} from "../types/study";

export type {
  StudySessionStage,
  TrialProgressStatus,
};

export type TrialAssignment =
  StudyTrialAssignment;

export type TrialProgress =
  StudyTrialProgress;

export type TrialCsvExportType =
  | "events"
  | "summary";

export type AssignmentStatus =
  | "uninitialized"
  | "valid"
  | "invalid";

type SupportedStudyTaskId =
  | "symposium"
  | "delivery"
  | "clinic";

interface StudyTaskDefinition {
  taskId:
    SupportedStudyTaskId;

  outerTaskNumber:
    number;
}

interface TrialIdentity {
  taskId:
    SupportedStudyTaskId;

  trialNumber:
    StudyTrialNumber;
}

const STUDY_TASKS:
  readonly StudyTaskDefinition[] = [
    {
      taskId:
        "symposium",

      outerTaskNumber:
        1,
    },
    {
      taskId:
        "delivery",

      outerTaskNumber:
        2,
    },
    {
      taskId:
        "clinic",

      outerTaskNumber:
        3,
    },
  ];

export const TOTAL_TASK_DOMAINS =
  STUDY_TASKS.length;

export const TRIALS_PER_TASK =
  1;

export const TOTAL_AVAILABLE_TRIAL_OPTIONS =
  TOTAL_TASK_DOMAINS;

export const TOTAL_STUDY_TRIALS =
  TOTAL_TASK_DOMAINS;

export const STUDY_ASSIGNMENT_METHOD =
  "static_token_table" as const;

interface StudySessionState {
  participantId:
    string;

  participantToken:
    string;

  assignmentStatus:
    AssignmentStatus;

  assignmentTableVersion:
    string | null;

  assignmentSequenceId:
    string | null;

  assignmentError:
    string | null;

  sessionId:
    string;

  conditionOrder:
    ConditionOrder;

  assignments:
    StudyTrialAssignment[];

  trials:
    StudyTrialProgress[];

  stage:
    StudySessionStage;

  procedureAccepted:
    boolean;

  currentTaskId:
    StudyTaskId | null;

  currentTrialNumber:
    StudyTrialNumber | null;

  postExperimentCompleted:
    boolean;

  disclosureViewed:
    boolean;

  studyCompleted:
    boolean;

  sessionCreatedAtIso:
    string | null;

  sessionStartedAtIso:
    string | null;

  procedureAcceptedAtIso:
    string | null;

  postExperimentStartedAtIso:
    string | null;

  postExperimentCompletedAtIso:
    string | null;

  postExperimentCsvExportStatus:
    TrialExportStatus;

  postExperimentCsvExportedAtIso:
    string | null;

  delayedRecallCollectedAtIso:
    string | null;

  disclosureViewedAtIso:
    string | null;

  studyCompletedAtIso:
    string | null;
}

interface StudySessionStore
  extends StudySessionState {
  initializeSessionFromToken: (
    participantToken:
      string | null,
  ) => boolean;

  initializeSession: (
    participantId:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;

  ensureSession: (
    participantId:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;

  setConditionOrder: (
    conditionOrder:
      ConditionOrder,
  ) => boolean;

  setParticipantId: (
    participantId:
      string,
  ) => void;

  acceptProcedure:
    () => void;

  startNextTrial:
    () =>
      | StudyTrialAssignment
      | undefined;

  startTrial: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | StudyTrialAssignment
    | undefined;

  markAssistantAnalysisRequested: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markAssistantAnalysisStarted: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markAssistantAnalysisCompleted: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markAssistantRecommendationShown: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markTrialTimerStarted: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markProbeShown: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markProbeCollapsed: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markProbeAcknowledged: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  markTrialSubmitted: (
    trialNumber?:
      StudyTrialNumber,

    reason?:
      StudyTrialEndReason,

    taskId?:
      StudyTaskId,
  ) => boolean;

  openTrialQuestionnaire: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  completeTrialQuestionnaire: (
    trialNumber?:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) => boolean;

  setTrialCsvExportStatus: (
    trialNumber:
      StudyTrialNumber,

    exportType:
      TrialCsvExportType,

    status:
      TrialExportStatus,

    errorMessage?:
      string,

    taskId?:
      StudyTaskId,

    exportedAtIso?:
      string,
  ) => boolean;

  markTrialEventsCsvExported: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,

    exportedAtIso?:
      string,
  ) => boolean;

  markTrialSummaryCsvExported: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,

    exportedAtIso?:
      string,
  ) => boolean;

  openPostExperiment:
    () => boolean;

  completePostExperiment:
    () => boolean;

  setPostExperimentCsvExportStatus: (
    status:
      TrialExportStatus,

    exportedAtIso?:
      string,
  ) => boolean;

  markPostExperimentCsvExported: (
    exportedAtIso?:
      string,
  ) => boolean;

  markDelayedRecallCollected:
    () => boolean;

  markDisclosureViewed:
    () => boolean;

  completeStudy:
    () => boolean;

  getCurrentAssignment:
    () =>
      | StudyTrialAssignment
      | undefined;

  getNextAssignment:
    () =>
      | StudyTrialAssignment
      | undefined;

  getTrialProgress: (
    trialNumber:
      StudyTrialNumber,

    taskId?:
      StudyTaskId,
  ) =>
    | StudyTrialProgress
    | undefined;

  getCompletedTrialCount:
    () => number;

  getObservedConditionOrder:
    () => ConditionOrder | undefined;

  areAllTrialsComplete:
    () => boolean;

  resetSession: (
    participantId?:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;

  resetForNewParticipant: (
    participantId?:
      string,

    conditionOrder?:
      ConditionOrder,
  ) => void;
}

type TrialTimestampField =
  | "assistantAnalysisRequestedAtIso"
  | "assistantAnalysisStartedAtIso"
  | "assistantAnalysisCompletedAtIso"
  | "assistantRecommendationShownAtIso"
  | "timerStartedAtIso"
  | "probeShownAtIso"
  | "probeCollapsedAtIso"
  | "probeAcknowledgedAtIso";

const LEGACY_STORAGE_KEYS = [
  "attentionTunnelingStudySession",
  "attention-tunneling-study-session",
];

const APPROVED_ASSIGNMENT_TABLE_VERSION =
  "latin-square-v1";

const APPROVED_ASSIGNMENT_GENERATION_SEED =
  20260809;

const PARTICIPANT_TOKEN_PATTERN =
  /^P\d{3}$/;

const ASSIGNMENT_SEQUENCE_PATTERN =
  /^Q(?:0[1-9]|1[0-8])$/;

interface StaticAssignmentTrial {
  trialOrder:
    StudyTrialOrder;

  taskId:
    SupportedStudyTaskId;

  condition:
    ConcretizationLevel;
}

interface ResolvedParticipantAssignment {
  participantToken:
    string;

  sequenceId:
    string;

  conditionOrder:
    ConditionOrder;

  trials:
    StaticAssignmentTrial[];
}

const RAW_ASSIGNMENT_TABLE =
  assignmentTable as unknown;

function isSupportedStudyTaskId(
  value:
    unknown,
): value is SupportedStudyTaskId {
  return (
    value ===
      "symposium" ||
    value ===
      "delivery" ||
    value ===
      "clinic"
  );
}

function normalizeTaskId(
  value:
    unknown,

  fallback:
    SupportedStudyTaskId =
      "symposium",
): SupportedStudyTaskId {
  return isSupportedStudyTaskId(
    value,
  )
    ? value
    : fallback;
}

function toStudyTaskId(
  taskId:
    SupportedStudyTaskId,
): StudyTaskId {
  return taskId as unknown as StudyTaskId;
}

function getTaskIdFromAssignment(
  assignment:
    Pick<
      StudyTrialAssignment,
      "taskId"
    >,
): SupportedStudyTaskId {
  return normalizeTaskId(
    assignment.taskId,
  );
}

function trialMatchesIdentity(
  trial:
    Pick<
      StudyTrialAssignment,
      "taskId" | "trialNumber"
    >,

  identity:
    TrialIdentity,
): boolean {
  return (
    getTaskIdFromAssignment(
      trial,
    ) ===
      identity.taskId &&
    trial.trialNumber ===
      identity.trialNumber
  );
}

function removeLegacyPersistedState():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  for (
    const key of
    LEGACY_STORAGE_KEYS
  ) {
    window.localStorage.removeItem(
      key,
    );

    window.sessionStorage.removeItem(
      key,
    );
  }
}

removeLegacyPersistedState();

function isRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function normalizeParticipantToken(
  participantToken:
    string | null | undefined,
): string {
  return participantToken
    ?.trim()
    .toUpperCase() ??
    "";
}

function isConcretizationLevel(
  value:
    unknown,
): value is ConcretizationLevel {
  return (
    value ===
      "A" ||
    value ===
      "B" ||
    value ===
      "C"
  );
}

function parseParticipantAssignment(
  participantToken:
    string,

  value:
    unknown,
): ResolvedParticipantAssignment | null {
  if (
    !isRecord(
      value,
    ) ||
    typeof value.sequenceId !==
      "string" ||
    !ASSIGNMENT_SEQUENCE_PATTERN.test(
      value.sequenceId,
    ) ||
    !Array.isArray(
      value.trials,
    ) ||
    value.trials.length !==
      TOTAL_STUDY_TRIALS
  ) {
    return null;
  }

  const parsedTrials:
    StaticAssignmentTrial[] = [];

  for (
    const rawTrial of
    value.trials
  ) {
    if (
      !isRecord(
        rawTrial,
      ) ||
      !isStudyTrialOrder(
        rawTrial.trialOrder,
      ) ||
      !isSupportedStudyTaskId(
        rawTrial.taskId,
      ) ||
      !isConcretizationLevel(
        rawTrial.condition,
      )
    ) {
      return null;
    }

    parsedTrials.push({
      trialOrder:
        rawTrial.trialOrder,

      taskId:
        rawTrial.taskId,

      condition:
        rawTrial.condition,
    });
  }

  parsedTrials.sort(
    (
      first,
      second,
    ) =>
      first.trialOrder -
      second.trialOrder,
  );

  const trialOrders =
    parsedTrials.map(
      (trial) =>
        trial.trialOrder,
    );

  const taskIds =
    parsedTrials.map(
      (trial) =>
        trial.taskId,
    );

  const conditions =
    parsedTrials.map(
      (trial) =>
        trial.condition,
    );

  const conditionOrderValue =
    conditions.join(
      "",
    );

  if (
    trialOrders.some(
      (
        trialOrder,
        index,
      ) =>
        trialOrder !==
        index +
          1,
    ) ||
    new Set(
      taskIds,
    ).size !==
      TOTAL_TASK_DOMAINS ||
    new Set(
      conditions,
    ).size !==
      TOTAL_STUDY_TRIALS ||
    !STUDY_TASKS.every(
      (task) =>
        taskIds.includes(
          task.taskId,
        ),
    ) ||
    !isConditionOrder(
      conditionOrderValue,
    )
  ) {
    return null;
  }

  return {
    participantToken,

    sequenceId:
      value.sequenceId,

    conditionOrder:
      conditionOrderValue,

    trials:
      parsedTrials,
  };
}

function getAssignmentRecords():
  Record<string, unknown> | null {
  if (
    !isRecord(
      RAW_ASSIGNMENT_TABLE,
    ) ||
    RAW_ASSIGNMENT_TABLE.version !==
      APPROVED_ASSIGNMENT_TABLE_VERSION ||
    RAW_ASSIGNMENT_TABLE.generationSeed !==
      APPROVED_ASSIGNMENT_GENERATION_SEED ||
    !isRecord(
      RAW_ASSIGNMENT_TABLE.assignments,
    )
  ) {
    return null;
  }

  return RAW_ASSIGNMENT_TABLE.assignments;
}

function staticAssignmentTableIsValid():
  boolean {
  const records =
    getAssignmentRecords();

  if (
    !records ||
    Object.keys(
      records,
    ).length !==
      54
  ) {
    return false;
  }

  const sequenceCounts =
    new Map<string, number>();

  for (
    let participantNumber =
      1;
    participantNumber <=
      54;
    participantNumber +=
      1
  ) {
    const participantToken =
      `P${participantNumber
        .toString()
        .padStart(
          3,
          "0",
        )}`;

    const resolved =
      parseParticipantAssignment(
        participantToken,
        records[
          participantToken
        ],
      );

    if (
      !resolved
    ) {
      return false;
    }

    sequenceCounts.set(
      resolved.sequenceId,
      (
        sequenceCounts.get(
          resolved.sequenceId,
        ) ??
        0
      ) +
        1,
    );
  }

  return Array.from(
    {
      length:
        18,
    },
    (
      _,
      index,
    ) =>
      `Q${(
        index +
        1
      )
        .toString()
        .padStart(
          2,
          "0",
        )}`,
  ).every(
    (sequenceId) =>
      sequenceCounts.get(
        sequenceId,
      ) ===
      3,
  );
}

const STATIC_ASSIGNMENT_TABLE_IS_VALID =
  staticAssignmentTableIsValid();

function resolveParticipantAssignment(
  participantTokenInput:
    string | null | undefined,
): ResolvedParticipantAssignment | null {
  const participantToken =
    normalizeParticipantToken(
      participantTokenInput,
    );

  if (
    !STATIC_ASSIGNMENT_TABLE_IS_VALID ||
    !PARTICIPANT_TOKEN_PATTERN.test(
      participantToken,
    )
  ) {
    return null;
  }

  const records =
    getAssignmentRecords();

  return records
    ? parseParticipantAssignment(
        participantToken,
        records[
          participantToken
        ],
      )
    : null;
}

function createSessionId():
  string {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    "session",
    Date.now()
      .toString(
        36,
      ),
    Math.random()
      .toString(
        36,
      )
      .slice(
        2,
        10,
      ),
  ].join(
    "_",
  );
}

function cloneAssignment(
  assignment:
    StudyTrialAssignment,
): StudyTrialAssignment {
  return {
    ...assignment,
  };
}

function cloneTrialProgress(
  trial:
    StudyTrialProgress,
): StudyTrialProgress {
  return {
    ...trial,
  };
}

function createAssignments(
  resolvedAssignment:
    ResolvedParticipantAssignment,
): StudyTrialAssignment[] {
  // ADVISER FIX: Materialize only the three immutable trials mapped to this token.
  return resolvedAssignment.trials.map(
    (tableTrial) => {
      const taskDefinition =
        STUDY_TASKS.find(
          (task) =>
            task.taskId ===
            tableTrial.taskId,
        );

      if (
        !taskDefinition
      ) {
        throw new Error(
          "Validated assignment contains an unsupported task.",
        );
      }

      const taskId =
        toStudyTaskId(
          tableTrial.taskId,
        );

      const trialNumber =
        getTrialNumberForCondition(
          tableTrial.condition,
        );

      const globalOptionNumber =
        getGlobalOptionNumber(
          taskId,
          trialNumber,
        );

      return {
        trialNumber,

        trialOrder:
          tableTrial.trialOrder,

        taskId,

        condition:
          tableTrial.condition,

        conditionOrder:
          resolvedAssignment.conditionOrder,

        participantLabel:
          `Task ${tableTrial.trialOrder}`,

        isFirstTrial:
          tableTrial.trialOrder ===
          1,

        probeExposureNumber:
          tableTrial.trialOrder,

        probeNaive:
          tableTrial.trialOrder ===
          1,

        trialId:
          createCompositeTrialId(
            taskId,
            trialNumber,
          ),

        outerTaskNumber:
          taskDefinition.outerTaskNumber,

        innerTaskNumber:
          trialNumber,

        globalOptionNumber,

        globalTrialNumber:
          globalOptionNumber,
      } satisfies StudyTrialAssignment;
    },
  );
}

function createTrialProgress(
  assignment:
    StudyTrialAssignment,
): StudyTrialProgress {
  return {
    ...cloneAssignment(
      assignment,
    ),

    status:
      "pending",

    startedAtIso:
      null,

    assistantAnalysisRequestedAtIso:
      null,

    assistantAnalysisStartedAtIso:
      null,

    assistantAnalysisCompletedAtIso:
      null,

    assistantRecommendationShownAtIso:
      null,

    timerStartedAtIso:
      null,

    probeShownAtIso:
      null,

    probeCollapsedAtIso:
      null,

    probeAcknowledgedAtIso:
      null,

    submittedAtIso:
      null,

    trialEndedAtIso:
      null,

    trialEndReason:
      null,

    questionnaireStartedAtIso:
      null,

    questionnaireCompletedAtIso:
      null,

    eventsCsvExportStatus:
      "not_ready",

    eventsCsvExportedAtIso:
      null,

    summaryCsvExportStatus:
      "not_ready",

    summaryCsvExportedAtIso:
      null,

    exportErrorMessage:
      undefined,
  };
}

function createStateForResolvedAssignment(
  resolvedAssignment:
    ResolvedParticipantAssignment,
): StudySessionState {
  const createdAtIso =
    new Date()
      .toISOString();

  const assignments =
    createAssignments(
      resolvedAssignment,
    );

  return {
    participantId:
      resolvedAssignment.participantToken,

    participantToken:
      resolvedAssignment.participantToken,

    assignmentStatus:
      "valid",

    assignmentTableVersion:
      APPROVED_ASSIGNMENT_TABLE_VERSION,

    assignmentSequenceId:
      resolvedAssignment.sequenceId,

    assignmentError:
      null,

    sessionId:
      createSessionId(),

    conditionOrder:
      resolvedAssignment.conditionOrder,

    assignments,

    trials:
      assignments.map(
        createTrialProgress,
      ),

    stage:
      "procedure",

    procedureAccepted:
      false,

    currentTaskId:
      null,

    currentTrialNumber:
      null,

    postExperimentCompleted:
      false,

    disclosureViewed:
      false,

    studyCompleted:
      false,

    sessionCreatedAtIso:
      createdAtIso,

    sessionStartedAtIso:
      null,

    procedureAcceptedAtIso:
      null,

    postExperimentStartedAtIso:
      null,

    postExperimentCompletedAtIso:
      null,

    postExperimentCsvExportStatus:
      "not_ready",

    postExperimentCsvExportedAtIso:
      null,

    delayedRecallCollectedAtIso:
      null,

    disclosureViewedAtIso:
      null,

    studyCompletedAtIso:
      null,
  };
}

function createInactiveState(
  assignmentStatus:
    Exclude<
      AssignmentStatus,
      "valid"
    >,

  assignmentError:
    string | null,
): StudySessionState {
  return {
    participantId:
      "",

    participantToken:
      "",

    assignmentStatus,

    assignmentTableVersion:
      null,

    assignmentSequenceId:
      null,

    assignmentError,

    sessionId:
      "",

    conditionOrder:
      DEFAULT_CONDITION_ORDER,

    assignments:
      [],

    trials:
      [],

    stage:
      "procedure",

    procedureAccepted:
      false,

    currentTaskId:
      null,

    currentTrialNumber:
      null,

    postExperimentCompleted:
      false,

    disclosureViewed:
      false,

    studyCompleted:
      false,

    sessionCreatedAtIso:
      null,

    sessionStartedAtIso:
      null,

    procedureAcceptedAtIso:
      null,

    postExperimentStartedAtIso:
      null,

    postExperimentCompletedAtIso:
      null,

    postExperimentCsvExportStatus:
      "not_ready",

    postExperimentCsvExportedAtIso:
      null,

    delayedRecallCollectedAtIso:
      null,

    disclosureViewedAtIso:
      null,

    studyCompletedAtIso:
      null,
  };
}

function trialHasStarted(
  trial:
    StudyTrialProgress,
): boolean {
  return (
    trial.startedAtIso !==
      null ||
    trial.status !==
      "pending"
  );
}

function getSelectedTrials(
  trials:
    StudyTrialProgress[],
): StudyTrialProgress[] {
  return trials
    .filter(
      trialHasStarted,
    )
    .sort(
      (
        first,
        second,
      ) =>
        Number(
          first.trialOrder,
        ) -
        Number(
          second.trialOrder,
        ),
    );
}

function getCompletedTrialCountFromTrials(
  trials:
    StudyTrialProgress[],
): number {
  return trials.filter(
    (trial) =>
      trial.status ===
      "questionnaire_complete",
  ).length;
}

function getObservedConditionOrderFromTrials(
  trials:
    StudyTrialProgress[],
): ConditionOrder | undefined {
  const selectedTrials =
    getSelectedTrials(
      trials,
    );

  if (
    selectedTrials.length !==
    TOTAL_STUDY_TRIALS
  ) {
    return undefined;
  }

  const observedOrder =
    selectedTrials
      .map(
        (trial) =>
          trial.condition,
      )
      .join(
        "",
      );

  return isConditionOrder(
    observedOrder,
  )
    ? observedOrder
    : undefined;
}

function areAllTrialsCompleteFromTrials(
  trials:
    StudyTrialProgress[],
): boolean {
  return (
    trials.length ===
      TOTAL_STUDY_TRIALS &&
    trials.every(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    )
  );
}

function getAssignmentForIdentity(
  assignments:
    StudyTrialAssignment[],

  identity:
    TrialIdentity,
): StudyTrialAssignment | undefined {
  const assignment =
    assignments.find(
      (item) =>
        trialMatchesIdentity(
          item,
          identity,
        ),
    );

  return assignment
    ? cloneAssignment(
        assignment,
      )
    : undefined;
}

function getTrialForIdentity(
  trials:
    StudyTrialProgress[],

  identity:
    TrialIdentity,
): StudyTrialProgress | undefined {
  return trials.find(
    (trial) =>
      trialMatchesIdentity(
        trial,
        identity,
      ),
  );
}

function sessionConfigurationIsValid(
  assignments:
    StudyTrialAssignment[],

  trials:
    StudyTrialProgress[],

  expectedAssignments:
    StudyTrialAssignment[],
): boolean {
  if (
    assignments.length !==
      TOTAL_STUDY_TRIALS ||
    trials.length !==
      TOTAL_STUDY_TRIALS ||
    expectedAssignments.length !==
      TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  return expectedAssignments.every(
      (expectedAssignment) => {
        const identity:
          TrialIdentity = {
            taskId:
              getTaskIdFromAssignment(
                expectedAssignment,
              ),

            trialNumber:
              expectedAssignment.trialNumber,
          };

        const assignment =
          assignments.find(
            (item) =>
              trialMatchesIdentity(
                item,
                identity,
              ),
          );

        const trial =
          trials.find(
            (item) =>
              trialMatchesIdentity(
                item,
                identity,
              ),
          );

        return (
          assignment?.condition ===
            expectedAssignment.condition &&
          assignment?.conditionOrder ===
            expectedAssignment.conditionOrder &&
          assignment?.trialOrder ===
            expectedAssignment.trialOrder &&
          trial?.condition ===
            expectedAssignment.condition &&
          trial?.conditionOrder ===
            expectedAssignment.conditionOrder &&
          trial?.trialOrder ===
            expectedAssignment.trialOrder
        );
      },
    );
}

const initialState =
  createInactiveState(
    "uninitialized",
    null,
  );

export const useStudySessionStore =
  create<StudySessionStore>(
    (
      set,
      get,
    ) => {
      function resolveIdentity(
        trialNumber?:
          StudyTrialNumber,

        taskId?:
          StudyTaskId,
      ): TrialIdentity | null {
        const state =
          get();

        const resolvedTrialNumber =
          trialNumber ??
          state.currentTrialNumber;

        if (
          resolvedTrialNumber ===
          null
        ) {
          return null;
        }

        if (
          isSupportedStudyTaskId(
            taskId,
          )
        ) {
          return {
            taskId,
            trialNumber:
              resolvedTrialNumber,
          };
        }

        if (
          state.currentTrialNumber ===
            resolvedTrialNumber &&
          isSupportedStudyTaskId(
            state.currentTaskId,
          )
        ) {
          return {
            taskId:
              state.currentTaskId,

            trialNumber:
              resolvedTrialNumber,
          };
        }

        const openMatches =
          state.trials.filter(
            (trial) =>
              trial.trialNumber ===
                resolvedTrialNumber &&
              (
                trial.status ===
                  "active" ||
                trial.status ===
                  "submitted"
              ),
          );

        if (
          openMatches.length ===
          1
        ) {
          return {
            taskId:
              getTaskIdFromAssignment(
                openMatches[
                  0
                ],
              ),

            trialNumber:
              resolvedTrialNumber,
          };
        }

        return null;
      }

      function markTrialTimestamp(
        field:
          TrialTimestampField,

        trialNumber?:
          StudyTrialNumber,

        taskId?:
          StudyTaskId,
      ): boolean {
        const state =
          get();

        const identity =
          resolveIdentity(
            trialNumber,
            taskId,
          );

        if (
          !identity
        ) {
          return false;
        }

        const trial =
          getTrialForIdentity(
            state.trials,
            identity,
          );

        if (
          !trial ||
          trial.status ===
            "questionnaire_complete"
        ) {
          return false;
        }

        if (
          trial[
            field
          ]
        ) {
          return true;
        }

        const timestampIso =
          new Date()
            .toISOString();

        set({
          trials:
            state.trials.map(
              (item) =>
                trialMatchesIdentity(
                  item,
                  identity,
                )
                  ? {
                      ...item,

                      [field]:
                        timestampIso,
                    }
                  : item,
            ),
        });

        return true;
      }

      function initializeFromTokenInput(
        participantTokenInput:
          string | null | undefined,

        forceNewSession =
          false,
      ): boolean {
        removeLegacyPersistedState();

        const normalizedToken =
          normalizeParticipantToken(
            participantTokenInput,
          );

        const resolvedAssignment =
          resolveParticipantAssignment(
            normalizedToken,
          );

        if (
          !resolvedAssignment
        ) {
          const assignmentError =
            !STATIC_ASSIGNMENT_TABLE_IS_VALID
              ? "assignment_table_invalid"
              : normalizedToken.length ===
                  0
                ? "missing_token"
                : "invalid_token";

          set(
            createInactiveState(
              "invalid",
              assignmentError,
            ),
          );

          return false;
        }

        const expectedAssignments =
          createAssignments(
            resolvedAssignment,
          );

        const state =
          get();

        const existingSessionIsValid =
          !forceNewSession &&
          state.assignmentStatus ===
            "valid" &&
          state.participantToken ===
            resolvedAssignment.participantToken &&
          state.participantId ===
            resolvedAssignment.participantToken &&
          state.sessionId.length >
            0 &&
          state.assignmentTableVersion ===
            APPROVED_ASSIGNMENT_TABLE_VERSION &&
          state.assignmentSequenceId ===
            resolvedAssignment.sequenceId &&
          state.conditionOrder ===
            resolvedAssignment.conditionOrder &&
          sessionConfigurationIsValid(
            state.assignments,
            state.trials,
            expectedAssignments,
          );

        if (
          existingSessionIsValid
        ) {
          return true;
        }

        // ADVISER FIX: A validated token creates its immutable three-trial session.
        set(
          createStateForResolvedAssignment(
            resolvedAssignment,
          ),
        );

        return true;
      }

      return {
        ...initialState,

        initializeSessionFromToken: (
          participantToken,
        ) =>
          initializeFromTokenInput(
            participantToken,
          ),

        initializeSession: (
          participantId,
        ) => {
          initializeFromTokenInput(
            participantId,
          );
        },

        ensureSession: (
          participantId,
        ) => {
          initializeFromTokenInput(
            participantId,
          );
        },

        setConditionOrder: (
          conditionOrder,
        ) => {
          void conditionOrder;

          // ADVISER FIX: Condition order is immutable and comes only from the token table.
          return false;
        },

        setParticipantId: (
          participantId,
        ) => {
          initializeFromTokenInput(
            participantId,
          );
        },

        acceptProcedure:
          () => {
            const state =
              get();

            if (
              state.studyCompleted ||
              state.assignmentStatus !==
                "valid" ||
              state.assignments.length !==
                TOTAL_STUDY_TRIALS ||
              state.sessionId.length ===
                0
            ) {
              return;
            }

            const acceptedAtIso =
              new Date()
                .toISOString();

            set({
              procedureAccepted:
                true,

              stage:
                "task_assignment",

              sessionStartedAtIso:
                state.sessionStartedAtIso ??
                acceptedAtIso,

              procedureAcceptedAtIso:
                state.procedureAcceptedAtIso ??
                acceptedAtIso,
            });
          },

        startNextTrial:
          () => {
            const state =
              get();

            if (
              state.assignmentStatus !==
                "valid" ||
              !state.procedureAccepted ||
              state.studyCompleted ||
              state.postExperimentCompleted
            ) {
              return undefined;
            }

            const openTrial =
              state.trials.find(
                (trial) =>
                  trial.status ===
                    "active" ||
                  trial.status ===
                    "submitted",
              );

            if (
              openTrial
            ) {
              return getAssignmentForIdentity(
                state.assignments,
                {
                  taskId:
                    getTaskIdFromAssignment(
                      openTrial,
                    ),

                  trialNumber:
                    openTrial.trialNumber,
                },
              );
            }

            const nextAssignment =
              state.assignments
                .slice()
                .sort(
                  (
                    first,
                    second,
                  ) =>
                    Number(
                      first.trialOrder,
                    ) -
                    Number(
                      second.trialOrder,
                    ),
                )
                .find(
                  (assignment) => {
                    const trial =
                      getTrialForIdentity(
                        state.trials,
                        {
                          taskId:
                            getTaskIdFromAssignment(
                              assignment,
                            ),

                          trialNumber:
                            assignment.trialNumber,
                        },
                      );

                    return trial?.status !==
                      "questionnaire_complete";
                  },
                );

            if (
              !nextAssignment
            ) {
              return undefined;
            }

            // ADVISER FIX: Advance only to the next frozen token assignment.
            return get().startTrial(
              nextAssignment.trialNumber,
              nextAssignment.taskId,
            );
          },

        startTrial: (
          trialNumber,
          taskId,
        ) => {
          const state =
            get();

          if (
            state.assignmentStatus !==
              "valid" ||
            !state.procedureAccepted ||
            state.studyCompleted ||
            state.postExperimentCompleted
          ) {
            return undefined;
          }

          const resolvedTaskId =
            isSupportedStudyTaskId(
              taskId,
            )
              ? taskId
              : isSupportedStudyTaskId(
                    state.currentTaskId,
                  )
                ? state.currentTaskId
                : null;

          if (
            !resolvedTaskId
          ) {
            return undefined;
          }

          const identity:
            TrialIdentity = {
              taskId:
                resolvedTaskId,

              trialNumber,
            };

          const storedAssignment =
            getAssignmentForIdentity(
              state.assignments,
              identity,
            );

          if (
            !storedAssignment
          ) {
            return undefined;
          }

          const requestedTrial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !requestedTrial ||
            requestedTrial.status ===
              "questionnaire_complete"
          ) {
            return undefined;
          }

          const openTrial =
            state.trials.find(
              (trial) =>
                trial.status ===
                  "active" ||
                trial.status ===
                  "submitted",
            );

          if (
            openTrial &&
            !trialMatchesIdentity(
              openTrial,
              identity,
            )
          ) {
            return undefined;
          }

          const nextAssignment =
            state.assignments
              .slice()
              .sort(
                (
                  first,
                  second,
                ) =>
                  Number(
                    first.trialOrder,
                  ) -
                  Number(
                    second.trialOrder,
                  ),
              )
              .find(
                (assignment) => {
                  const trial =
                    getTrialForIdentity(
                      state.trials,
                      {
                        taskId:
                          getTaskIdFromAssignment(
                            assignment,
                          ),

                        trialNumber:
                          assignment.trialNumber,
                      },
                    );

                  return trial?.status !==
                    "questionnaire_complete";
                },
              );

          if (
            !nextAssignment ||
            !trialMatchesIdentity(
              nextAssignment,
              identity,
            )
          ) {
            return undefined;
          }

          // ADVISER FIX: Direct URLs cannot bypass the token's frozen trial order.
          const runtimeAssignment =
            storedAssignment;

          const startedAtIso =
            requestedTrial.startedAtIso ??
            new Date()
              .toISOString();

          set({
            currentTaskId:
              runtimeAssignment.taskId,

            currentTrialNumber:
              trialNumber,

            stage:
              requestedTrial.status ===
                "submitted"
                ? "trial_questionnaire"
                : "task",

            trials:
              state.trials.map(
                (trial) =>
                  trialMatchesIdentity(
                    trial,
                    identity,
                  )
                    ? {
                        ...trial,

                        ...runtimeAssignment,

                        status:
                          trial.status ===
                          "pending"
                            ? "active"
                            : trial.status,

                        startedAtIso,
                      }
                    : trial,
              ),
          });

          return cloneAssignment(
            runtimeAssignment,
          );
        },

        markAssistantAnalysisRequested: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisRequestedAtIso",
            trialNumber,
            taskId,
          ),

        markAssistantAnalysisStarted: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisStartedAtIso",
            trialNumber,
            taskId,
          ),

        markAssistantAnalysisCompleted: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantAnalysisCompletedAtIso",
            trialNumber,
            taskId,
          ),

        markAssistantRecommendationShown: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "assistantRecommendationShownAtIso",
            trialNumber,
            taskId,
          ),

        markTrialTimerStarted: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "timerStartedAtIso",
            trialNumber,
            taskId,
          ),

        markProbeShown: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "probeShownAtIso",
            trialNumber,
            taskId,
          ),

        markProbeCollapsed: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "probeCollapsedAtIso",
            trialNumber,
            taskId,
          ),

        markProbeAcknowledged: (
          trialNumber,
          taskId,
        ) =>
          markTrialTimestamp(
            "probeAcknowledgedAtIso",
            trialNumber,
            taskId,
          ),

        markTrialSubmitted: (
          trialNumber,
          reason =
            "submitted",
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return false;
          }

          const trial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !trial ||
            (
              trial.status !==
                "active" &&
              trial.status !==
                "submitted"
            )
          ) {
            return false;
          }

          // ADVISER FIX: Probe acknowledgement and compliance do not gate a valid submission.
          const submittedAtIso =
            trial.submittedAtIso ??
            new Date()
              .toISOString();

          const trialEndedAtIso =
            trial.trialEndedAtIso ??
            submittedAtIso;

          set({
            currentTaskId:
              toStudyTaskId(
                identity.taskId,
              ),

            currentTrialNumber:
              identity.trialNumber,

            stage:
              "trial_questionnaire",

            trials:
              state.trials.map(
                (item) =>
                  trialMatchesIdentity(
                    item,
                    identity,
                  )
                    ? {
                        ...item,

                        status:
                          "submitted",

                        submittedAtIso,

                        trialEndedAtIso,

                        trialEndReason:
                          item.trialEndReason ??
                          reason,
                      }
                    : item,
              ),
          });

          return true;
        },

        openTrialQuestionnaire: (
          trialNumber,
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return false;
          }

          const trial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !trial ||
            trial.status !==
              "submitted"
          ) {
            return false;
          }

          const questionnaireStartedAtIso =
            trial.questionnaireStartedAtIso ??
            new Date()
              .toISOString();

          set({
            currentTaskId:
              toStudyTaskId(
                identity.taskId,
              ),

            currentTrialNumber:
              identity.trialNumber,

            stage:
              "trial_questionnaire",

            trials:
              state.trials.map(
                (item) =>
                  trialMatchesIdentity(
                    item,
                    identity,
                  )
                    ? {
                        ...item,

                        questionnaireStartedAtIso,
                      }
                    : item,
              ),
          });

          return true;
        },

        completeTrialQuestionnaire: (
          trialNumber,
          taskId,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return false;
          }

          const trial =
            getTrialForIdentity(
              state.trials,
              identity,
            );

          if (
            !trial
          ) {
            return false;
          }

          if (
            trial.status ===
            "questionnaire_complete"
          ) {
            set({
              currentTaskId:
                null,

              currentTrialNumber:
                null,

              stage:
                "task_assignment",
            });

            return true;
          }

          if (
            trial.status !==
            "submitted"
          ) {
            return false;
          }

          const completedAtIso =
            trial.questionnaireCompletedAtIso ??
            new Date()
              .toISOString();

          set({
            trials:
              state.trials.map(
                (item) =>
                  trialMatchesIdentity(
                    item,
                    identity,
                  )
                    ? {
                        ...item,

                        status:
                          "questionnaire_complete",

                        questionnaireStartedAtIso:
                          item.questionnaireStartedAtIso ??
                          completedAtIso,

                        questionnaireCompletedAtIso:
                          completedAtIso,

                        // ADVISER FIX: Final trial files wait for delayed post-experiment recall.
                        eventsCsvExportStatus:
                          "not_ready",

                        summaryCsvExportStatus:
                          "not_ready",

                        exportErrorMessage:
                          undefined,
                      }
                    : item,
              ),

            currentTaskId:
              null,

            currentTrialNumber:
              null,

            stage:
              "task_assignment",
          });

          return true;
        },

        setTrialCsvExportStatus: (
          trialNumber,
          exportType,
          status,
          errorMessage,
          taskId,
          exportedAtIso,
        ) => {
          const state =
            get();

          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          const trial =
            identity
              ? getTrialForIdentity(
                  state.trials,
                  identity,
                )
              : undefined;

          if (
            !identity ||
            !trial
          ) {
            return false;
          }

          if (
            status !==
              "not_ready" &&
            (
              trial.status !==
                "questionnaire_complete" ||
              state.delayedRecallCollectedAtIso ===
                null
            )
          ) {
            return false;
          }

          const timestampIso =
            exportedAtIso ??
            new Date()
              .toISOString();

          set({
            trials:
              state.trials.map(
                (trial) => {
                  if (
                    !trialMatchesIdentity(
                      trial,
                      identity,
                    )
                  ) {
                    return trial;
                  }

                  if (
                    exportType ===
                    "events"
                  ) {
                    return {
                      ...trial,

                      eventsCsvExportStatus:
                        status,

                      eventsCsvExportedAtIso:
                        status ===
                          "exported"
                          ? trial.eventsCsvExportedAtIso ??
                            timestampIso
                          : trial.eventsCsvExportedAtIso,

                      exportErrorMessage:
                        status ===
                          "failed"
                          ? errorMessage ??
                            "Events CSV export failed."
                          : undefined,
                    };
                  }

                  return {
                    ...trial,

                    summaryCsvExportStatus:
                      status,

                    summaryCsvExportedAtIso:
                      status ===
                        "exported"
                        ? trial.summaryCsvExportedAtIso ??
                          timestampIso
                        : trial.summaryCsvExportedAtIso,

                    exportErrorMessage:
                      status ===
                        "failed"
                        ? errorMessage ??
                          "Summary CSV export failed."
                        : undefined,
                  };
                },
              ),
          });

          return true;
        },

        markTrialEventsCsvExported: (
          trialNumber,
          taskId,
          exportedAtIso,
        ) =>
          get().setTrialCsvExportStatus(
            trialNumber,
            "events",
            "exported",
            undefined,
            taskId,
            exportedAtIso,
          ),

        markTrialSummaryCsvExported: (
          trialNumber,
          taskId,
          exportedAtIso,
        ) =>
          get().setTrialCsvExportStatus(
            trialNumber,
            "summary",
            "exported",
            undefined,
            taskId,
            exportedAtIso,
          ),

        openPostExperiment:
          () => {
            const state =
              get();

            if (
              !areAllTrialsCompleteFromTrials(
                state.trials,
              ) ||
              state.studyCompleted ||
              state.postExperimentCompleted
            ) {
              return false;
            }

            set({
              currentTaskId:
                null,

              currentTrialNumber:
                null,

              stage:
                "post_experiment",

              postExperimentStartedAtIso:
                state.postExperimentStartedAtIso ??
                new Date()
                  .toISOString(),
            });

            return true;
          },

        completePostExperiment:
          () => {
            const state =
              get();

            if (
              !areAllTrialsCompleteFromTrials(
                state.trials,
              ) ||
              state.delayedRecallCollectedAtIso ===
                null
            ) {
              return false;
            }

            if (
              state.postExperimentCompleted
            ) {
              set({
                stage:
                  "disclosure",
              });

              return true;
            }

            const completedAtIso =
              new Date()
                .toISOString();

            set({
              postExperimentCompleted:
                true,

              postExperimentStartedAtIso:
                state.postExperimentStartedAtIso ??
                completedAtIso,

              postExperimentCompletedAtIso:
                state.postExperimentCompletedAtIso ??
                completedAtIso,

              postExperimentCsvExportStatus:
                state.postExperimentCsvExportStatus ===
                  "exported"
                  ? "exported"
                  : state.postExperimentCsvExportStatus,

              stage:
                "disclosure",
            });

            return true;
          },

        setPostExperimentCsvExportStatus: (
          status,
          exportedAtIso,
        ) => {
          const state =
            get();

          const allTrialsComplete =
            areAllTrialsCompleteFromTrials(
              state.trials,
            );

          if (
            status !==
              "not_ready" &&
            (
              !allTrialsComplete ||
              state.delayedRecallCollectedAtIso ===
                null
            )
          ) {
            return false;
          }

          const resolvedExportedAtIso =
            status ===
            "exported"
              ? state.postExperimentCsvExportedAtIso ??
                exportedAtIso ??
                new Date()
                  .toISOString()
              : state.postExperimentCsvExportedAtIso;

          set({
            postExperimentCsvExportStatus:
              status,

            postExperimentCsvExportedAtIso:
              resolvedExportedAtIso,
          });

          return true;
        },

        markPostExperimentCsvExported: (
          exportedAtIso,
        ) =>
          get().setPostExperimentCsvExportStatus(
            "exported",
            exportedAtIso,
          ),

        markDelayedRecallCollected:
          () => {
            const state =
              get();

            if (
              !areAllTrialsCompleteFromTrials(
                state.trials,
              )
            ) {
              return false;
            }

            const collectedAtIso =
              state.delayedRecallCollectedAtIso ??
              new Date()
                .toISOString();

            // ADVISER FIX: Only completed delayed recall releases final exports.
            set({
              delayedRecallCollectedAtIso:
                collectedAtIso,

              trials:
                state.trials.map(
                  (trial) => ({
                    ...trial,

                    eventsCsvExportStatus:
                      trial.eventsCsvExportStatus ===
                        "exported"
                        ? "exported"
                        : "ready",

                    summaryCsvExportStatus:
                      trial.summaryCsvExportStatus ===
                        "exported"
                        ? "exported"
                        : "ready",

                    exportErrorMessage:
                      undefined,
                  }),
                ),

              postExperimentCsvExportStatus:
                state.postExperimentCsvExportStatus ===
                  "exported"
                  ? "exported"
                  : "ready",
            });

            return true;
          },

        markDisclosureViewed:
          () => {
            const state =
              get();

            if (
              !state.postExperimentCompleted
            ) {
              return false;
            }

            set({
              disclosureViewed:
                true,

              disclosureViewedAtIso:
                state.disclosureViewedAtIso ??
                new Date()
                  .toISOString(),

              stage:
                state.studyCompleted
                  ? "complete"
                  : "disclosure",
            });

            return true;
          },

        completeStudy:
          () => {
            const state =
              get();

            if (
              !state.postExperimentCompleted ||
              !state.disclosureViewed
            ) {
              return false;
            }

            const studyCompletedAtIso =
              state.studyCompletedAtIso ??
              new Date()
                .toISOString();

            set({
              studyCompleted:
                true,

              stage:
                "complete",

              studyCompletedAtIso,
            });

            return true;
          },

        getCurrentAssignment:
          () => {
            const state =
              get();

            if (
              state.currentTrialNumber ===
                null ||
              !isSupportedStudyTaskId(
                state.currentTaskId,
              )
            ) {
              return undefined;
            }

            return getAssignmentForIdentity(
              state.assignments,
              {
                taskId:
                  state.currentTaskId,

                trialNumber:
                  state.currentTrialNumber,
              },
            );
          },

        getNextAssignment:
          () => {
            const state =
              get();

            const nextAssignment =
              state.assignments
                .slice()
                .sort(
                  (
                    first,
                    second,
                  ) =>
                    Number(
                      first.trialOrder,
                    ) -
                    Number(
                      second.trialOrder,
                    ),
                )
                .find(
                  (assignment) => {
                    const trial =
                      getTrialForIdentity(
                        state.trials,
                        {
                          taskId:
                            getTaskIdFromAssignment(
                              assignment,
                            ),

                          trialNumber:
                            assignment.trialNumber,
                        },
                      );

                    return trial?.status ===
                      "pending";
                  },
                );

            return nextAssignment
              ? cloneAssignment(
                  nextAssignment,
                )
              : undefined;
          },

        getTrialProgress: (
          trialNumber,
          taskId,
        ) => {
          const identity =
            resolveIdentity(
              trialNumber,
              taskId,
            );

          if (
            !identity
          ) {
            return undefined;
          }

          const trial =
            getTrialForIdentity(
              get().trials,
              identity,
            );

          return trial
            ? cloneTrialProgress(
                trial,
              )
            : undefined;
        },

        getCompletedTrialCount:
          () =>
            getCompletedTrialCountFromTrials(
              get().trials,
            ),

        getObservedConditionOrder:
          () =>
            getObservedConditionOrderFromTrials(
              get().trials,
            ),

        areAllTrialsComplete:
          () =>
            areAllTrialsCompleteFromTrials(
              get().trials,
            ),

        resetSession: (
          participantId,
        ) => {
          removeLegacyPersistedState();

          const participantToken =
            participantId ??
            get().participantToken;

          initializeFromTokenInput(
            participantToken,
            true,
          );
        },

        resetForNewParticipant: (
          participantId,
        ) => {
          removeLegacyPersistedState();

          if (
            participantId
          ) {
            initializeFromTokenInput(
              participantId,
              true,
            );

            return;
          }

          // ADVISER FIX: A new participant must enter with an explicit valid token.
          set(
            createInactiveState(
              "uninitialized",
              null,
            ),
          );
        },
      };
    },
  );

export function isSymposiumTaskId(
  taskId:
    StudyTaskId,
): boolean {
  return taskId ===
    "symposium";
}
