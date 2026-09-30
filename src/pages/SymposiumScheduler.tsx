import {
  DndContext,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import {
  Bot,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

import {
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import ProbeBanner from "../components/common/ProbeBanner";
import TrialTimer from "../components/common/TrialTimer";
import ConstraintsPanel from "../components/constraints/ConstraintsPanel";
import SchedulerGrid from "../components/scheduler/SchedulerGrid";
import UnassignedTray from "../components/scheduler/UnassignedTray";
import AIAssistantPanel from "../components/sidebar/AIAssistantPanel";
import CurrentConflictsPanel from "../components/task/CurrentConflictsPanel";
import TaskSummaryTable from "../components/task/TaskSummaryTable";

import {
  getAssistantRecommendation,
  getExpectedInitialPlacementCount,
  getInitialPlacementsForTrial,
  getSemanticProbe,
  getStudyTaskDefinition,
  isDemoTalk,
} from "../data/symposium";

import {
  calculateSchedulerMetrics,
  createScheduleSnapshot,
  getScheduleStateHash,
} from "../metrics/schedulerMetrics";

import {
  useEventLogStore,
} from "../store/eventLogStore";

import {
  useQuestionnaireStore,
} from "../store/questionnaireStore";

import {
  useSchedulerStore,
} from "../store/schedulerStore";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

import type {
  EditCategory,
  TrialEndReason,
} from "../types/events";

import type {
  Placement,
  Room,
  Slot,
  StudyTaskId,
  StudyTrialNumber,
  StudyTrialOrderValue,
} from "../types/scheduler";

import {
  DEFAULT_CONDITION_ORDER,
  STUDY_TASK_IDS,
  STUDY_TRIAL_NUMBERS,
  TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,
  TOTAL_STUDY_TRIALS,
  createCompositeTrialId,
  getConditionForTrial,
  getGlobalOptionNumber,
  isConditionOrder,
  isStudyTrialOrder,
} from "../types/scheduler";

import "../styles/scheduler.css";

const AI_ANALYSIS_DELAY_MS =
  1000;

const IDLE_THRESHOLD_MS =
  10_000;

const IDLE_LOOKBACK_MS =
  60_000;

const PROBE_FLOOR_MS =
  240_000;

const PROBE_INVEST_EDIT_COUNT =
  6;

const SOLVED_GRACE_MS =
  3_000;

const PROBE_CAP_MS =
  480_000;

type ProbeTriggerReason =
  | "invest"
  | "solved"
  | "cap"
  | "floor_clamped";

interface IdleInterval {
  startedAt:
    number;

  endedAt:
    number;
}

interface ProbeCandidate {
  reason:
    Exclude<
      ProbeTriggerReason,
      "floor_clamped"
    >;

  dueAt:
    number;
}

const TOTAL_TASK_DOMAINS =
  STUDY_TASK_IDS.length;

const TASK_OPTIONS_PER_DOMAIN =
  STUDY_TRIAL_NUMBERS.length;

interface TaskPresentation {
  title:
    string;

  summaryTitle:
    string;

  summaryDescription:
    string;

  submitLabel:
    string;

  solutionNoun:
    string;

  recommendationNoun:
    string;

  pageId:
    string;

  macroStructureDefinition:
    string;

  theoreticalEditTaxonomyVersion:
    string;
}

function getTaskPresentation(
  taskId:
    StudyTaskId,
): TaskPresentation {
  switch (
    taskId as string
  ) {
    case "delivery":
      return {
        title:
          "Delivery Dispatch",

        summaryTitle:
          "Delivery Dispatch Task Summary",

        summaryDescription:
          "Arrange all twelve shipments across three vans and four route windows while satisfying the refrigeration, capacity, and shared-driver constraints.",

        submitLabel:
          "Submit Dispatch",

        solutionNoun:
          "dispatch plan",

        recommendationNoun:
          "dispatch recommendation",

        pageId:
          "delivery_dispatch",

        macroStructureDefinition:
          "van_majority_region_mapping_ignoring_route_window_order",

        theoreticalEditTaxonomyVersion:
          "delivery_edit_taxonomy_v1",
      };

    case "clinic":
      return {
        title:
          "Clinic Roster",

        summaryTitle:
          "Clinic Roster Task Summary",

        summaryDescription:
          "Arrange all twelve nursing duties across three wards and four shifts while satisfying the ICU certification, capacity, and shared-nurse constraints.",

        submitLabel:
          "Submit Roster",

        solutionNoun:
          "roster",

        recommendationNoun:
          "roster recommendation",

        pageId:
          "clinic_roster",

        macroStructureDefinition:
          "ward_majority_specialty_mapping_ignoring_shift_order",

        theoreticalEditTaxonomyVersion:
          "clinic_edit_taxonomy_v1",
      };

    case "symposium":
    default:
      return {
        title:
          "Symposium Scheduler",

        summaryTitle:
          "Symposium Task Summary",

        summaryDescription:
          "Arrange all twelve talks across three rooms and four time slots while satisfying the projector, capacity, and shared-speaker constraints.",

        submitLabel:
          "Submit Schedule",

        solutionNoun:
          "schedule",

        recommendationNoun:
          "scheduling recommendation",

        pageId:
          "symposium_scheduler",

        macroStructureDefinition:
          "room_majority_topic_mapping_ignoring_slot_order",

        theoreticalEditTaxonomyVersion:
          "symposium_edit_taxonomy_v1",
      };
  }
}

type AssistantStatus =
  | "idle"
  | "thinking"
  | "ready";

interface SymposiumSchedulerProps {
  taskId:
    StudyTaskId;

  taskNumber:
    StudyTrialNumber;
}

/*
 * Prefer the cell directly under the pointer. The fallback keeps
 * keyboard and non-pointer dragging functional.
 */
const preciseCollisionDetection:
  CollisionDetection = (
    args,
  ) => {
    const pointerCollisions =
      pointerWithin(
        args,
      );

    return pointerCollisions.length >
      0
      ? pointerCollisions
      : rectIntersection(
          args,
        );
  };

function isRoom(
  value: unknown,
): value is Room {
  return (
    value === "A" ||
    value === "B" ||
    value === "C"
  );
}

function isSlot(
  value: unknown,
): value is Slot {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4
  );
}

function getCurrentTimeMs():
  number {
  return Date.now();
}

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

function getEditCategory(
  sourcePlacement:
    Placement | undefined,

  targetPlacement:
    Placement | undefined,

  targetRoom:
    Room,

  talkId:
    string,

  taskId:
    StudyTaskId,
): EditCategory {
  if (
    isDemoTalk(
      talkId,
      taskId,
    ) &&
    sourcePlacement?.room !==
      "A" &&
    targetRoom ===
      "A"
  ) {
    return "demo_into_room_a";
  }

  if (
    !isDemoTalk(
      talkId,
      taskId,
    ) &&
    sourcePlacement?.room ===
      "A" &&
    targetRoom !==
      "A"
  ) {
    return "non_demo_out_of_room_a";
  }

  if (
    !sourcePlacement
  ) {
    return "move_from_unassigned";
  }

  if (
    targetPlacement
  ) {
    return sourcePlacement.room ===
      targetRoom
      ? "within_room_swap"
      : "cross_room_swap";
  }

  return sourcePlacement.room ===
    targetRoom
    ? "move_within_room"
    : "move_between_rooms";
}

function getEarliestProbeCandidate(
  trialStartedAt:
    number,

  investDueAt:
    number | null,

  solvedDueAt:
    number | null,
): ProbeCandidate {
  const candidates:
    ProbeCandidate[] = [
      ...(investDueAt ===
      null
        ? []
        : [
            {
              reason:
                "invest" as const,

              dueAt:
                investDueAt,
            },
          ]),
      ...(solvedDueAt ===
      null
        ? []
        : [
            {
              reason:
                "solved" as const,

              dueAt:
                solvedDueAt,
            },
          ]),
      {
        reason:
          "cap",

        dueAt:
          trialStartedAt +
          PROBE_CAP_MS,
      },
    ];

  const priority:
    Record<
      ProbeCandidate["reason"],
      number
    > = {
      invest:
        0,

      solved:
        1,

      cap:
        2,
    };

  return candidates.sort(
    (
      first,
      second,
    ) =>
      first.dueAt -
        second.dueAt ||
      priority[
        first.reason
      ] -
        priority[
          second.reason
        ],
  )[0];
}

function getIdleMsInPreviousWindow(
  onsetAt:
    number,

  completedIntervals:
    IdleInterval[],

  lastActivityAt:
    number | null,
): number {
  const windowStartedAt =
    onsetAt -
    IDLE_LOOKBACK_MS;

  const intervals = [
    ...completedIntervals,
  ];

  // ADVISER FIX: Include the no-input interval still active at probe onset,
  // independently of the threshold used to emit ordinary idle events.
  if (
    lastActivityAt !==
      null
  ) {
    intervals.push({
      startedAt:
        lastActivityAt,

      endedAt:
        onsetAt,
    });
  }

  const overlapMs =
    intervals.reduce(
      (
        total,
        interval,
      ) =>
        total +
        Math.max(
          0,
          Math.min(
            onsetAt,
            interval.endedAt,
          ) -
            Math.max(
              windowStartedAt,
              interval.startedAt,
            ),
        ),
      0,
    );

  return Math.max(
    0,
    Math.min(
      IDLE_LOOKBACK_MS,
      Math.round(
        overlapMs,
      ),
    ),
  );
}

function SymposiumSchedulerTrial({
  taskId,
  taskNumber,
}: SymposiumSchedulerProps) {
  const navigate =
    useNavigate();

  const taskPresentation =
    getTaskPresentation(
      taskId,
    );

  const taskDefinition =
    getStudyTaskDefinition(
      taskId,
    );

  const semanticProbe =
    getSemanticProbe(
      taskId,
    );

  const TRIAL_DURATION_SECONDS =
    taskDefinition.durationSeconds;

  const PROBE_COLLAPSE_SECONDS =
    semanticProbe.collapseAfterSeconds;

  const taskPageId =
    taskPresentation.pageId;

  const macroStructureDefinition =
    taskPresentation
      .macroStructureDefinition;

  const theoreticalEditTaxonomyVersion =
    taskPresentation
      .theoreticalEditTaxonomyVersion;

  const taskKey =
    `${taskId}:${taskNumber}`;

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(
    TRIAL_DURATION_SECONDS,
  );

  const [
    assistantStatus,
    setAssistantStatus,
  ] = useState<AssistantStatus>(
    "idle",
  );

  const [
    taskDetailsOpen,
    setTaskDetailsOpen,
  ] = useState(
    false,
  );

  const [
    probeVisible,
    setProbeVisible,
  ] = useState(
    false,
  );

  const [
    probeAcknowledged,
    setProbeAcknowledged,
  ] = useState(
    false,
  );

  const [
    probeCollapsed,
    setProbeCollapsed,
  ] = useState(
    false,
  );

  const [
    probeIntegrated,
    setProbeIntegrated,
  ] = useState(
    false,
  );

  const [
    trialSubmitted,
    setTrialSubmitted,
  ] = useState(
    false,
  );

  const [
    participantAssignmentMade,
    setParticipantAssignmentMade,
  ] = useState(
    false,
  );

  const initializedTaskKeyRef =
    useRef<string | null>(
      null,
    );

  const assistantRecommendationPendingLogRef =
    useRef(
      false,
    );

  const trialStartLoggedRef =
    useRef(
      false,
    );

  const timerExpiredLoggedRef =
    useRef(
      false,
    );

  const timerWarningLoggedRef =
    useRef({
      amber:
        false,

      red:
        false,
    });

  const submitInProgressRef =
    useRef(
      false,
    );

  const submitTrialRef =
    useRef<
      (
        reason:
          TrialEndReason,
      ) => void
    >(
      () => undefined,
    );

  const trialStartedAtRef =
    useRef<number | null>(
      null,
    );

  const probeShownAtRef =
    useRef<number | null>(
      null,
    );

  const probeCollapsedLoggedRef =
    useRef(
      false,
    );

  const probeAcknowledgedLoggedRef =
    useRef(
      false,
    );

  const probeDeadlineCheckRef =
    useRef<
      (
        now:
          number,
      ) => void
    >(
      () => undefined,
    );

  const collapseDeadlineCheckRef =
    useRef<
      (
        now:
          number,
      ) => void
    >(
      () => undefined,
    );

  const idleLastActivityAtRef =
    useRef<number | null>(
      null,
    );

  const completedIdleIntervalsRef =
    useRef<IdleInterval[]>(
      [],
    );

  const acceptedEditCountRef =
    useRef(
      0,
    );

  const boardFirstFullyAssignedAtRef =
    useRef<number | null>(
      null,
    );

  const postCompleteAcceptedEditCountRef =
    useRef(
      0,
    );

  const investTriggerDueAtRef =
    useRef<number | null>(
      null,
    );

  const solvedStateReachedAtRef =
    useRef<number | null>(
      null,
    );

  const solvedTriggerDueAtRef =
    useRef<number | null>(
      null,
    );

  const probeOpenedFromBellRef =
    useRef(
      false,
    );

  const recordActivityRef =
    useRef<
      (
        now?:
          number,
      ) => void
    >(
      () => undefined,
    );

  const dragStartedAtRef =
    useRef<number | null>(
      null,
    );

  const stateHistoryRef =
    useRef<string[]>(
      [],
    );

  const stateVisitCountsRef =
    useRef<
      Map<
        string,
        number
      >
    >(
      new Map(),
    );

  const strategySwitchDetectedRef =
    useRef(
      false,
    );

  const firstPostProbeEditDetectedRef =
    useRef(
      false,
    );

  const postProbeEditCountRef =
    useRef(
      0,
    );

  const consecutiveSalvageCountRef =
    useRef(
      0,
    );

  const level =
    useSchedulerStore(
      (state) =>
        state.level,
    );

  const schedulerTrialNumber =
    useSchedulerStore(
      (state) =>
        state.trialNumber,
    );

  const initializeTrial =
    useSchedulerStore(
      (state) =>
        state.initializeTrial,
    );

  const moveOrSwapTalk =
    useSchedulerStore(
      (state) =>
        state.moveOrSwapTalk,
    );

  const validateMoveOrSwapTalk =
    useSchedulerStore(
      (state) =>
        state.validateMoveOrSwapTalk,
    );

  const unassignTalk =
    useSchedulerStore(
      (state) =>
        state.unassignTalk,
    );

  const setTrialLocked =
    useSchedulerStore(
      (state) =>
        state.setTrialLocked,
    );

  const trialLocked =
    useSchedulerStore(
      (state) =>
        state.trialLocked,
    );

  const setActiveTalkId =
    useSchedulerStore(
      (state) =>
        state.setActiveTalkId,
    );

  const initializeTrialResponse =
    useQuestionnaireStore(
      (state) =>
        state.initializeTrialResponse,
    );

  const startEventTrial =
    useEventLogStore(
      (state) =>
        state.startTrial,
    );

  const addEvent =
    useEventLogStore(
      (state) =>
        state.addEvent,
    );

  const trialProgress =
    useStudySessionStore(
      (state) =>
        state.trials.find(
          (trial) =>
            trial.taskId ===
              taskId &&
            trial.trialNumber ===
              taskNumber,
        ),
    );

  const markAssistantAnalysisRequested =
    useStudySessionStore(
      (state) =>
        state.markAssistantAnalysisRequested,
    );

  const markAssistantAnalysisStarted =
    useStudySessionStore(
      (state) =>
        state.markAssistantAnalysisStarted,
    );

  const markAssistantAnalysisCompleted =
    useStudySessionStore(
      (state) =>
        state.markAssistantAnalysisCompleted,
    );

  const markAssistantRecommendationShown =
    useStudySessionStore(
      (state) =>
        state.markAssistantRecommendationShown,
    );

  const markTrialTimerStarted =
    useStudySessionStore(
      (state) =>
        state.markTrialTimerStarted,
    );

  const markProbeShown =
    useStudySessionStore(
      (state) =>
        state.markProbeShown,
    );

  const markProbeCollapsed =
    useStudySessionStore(
      (state) =>
        state.markProbeCollapsed,
    );

  const markProbeAcknowledged =
    useStudySessionStore(
      (state) =>
        state.markProbeAcknowledged,
    );

  const markTrialSubmitted =
    useStudySessionStore(
      (state) =>
        state.markTrialSubmitted,
    );

  const openTrialQuestionnaire =
    useStudySessionStore(
      (state) =>
        state.openTrialQuestionnaire,
    );

  const expectedCondition =
    getConditionForTrial(
      taskNumber,
    );

  const assistantRecommendation =
    getAssistantRecommendation(
      level,
      taskId,
    );

  const renderedAssistantText =
    [
      assistantRecommendation.heading,
      assistantRecommendation.message,
      assistantRecommendation
        .prefillAcknowledgment,
    ]
      .filter(
        (value) =>
          typeof value ===
            "string" &&
          value.length >
            0,
      )
      .join(
        "\n\n",
      );

  const assistantContentVersion =
    `${taskDefinition.messageVersion}-${taskId}-v1`;

  const trialOrder:
    StudyTrialOrderValue =
      isStudyTrialOrder(
        trialProgress?.trialOrder,
      )
        ? trialProgress.trialOrder
        : 0;

  const conditionOrder =
    isConditionOrder(
      trialProgress?.conditionOrder,
    )
      ? trialProgress.conditionOrder
      : DEFAULT_CONDITION_ORDER;

  const isFirstTrial =
    trialOrder === 1;

  const probeExposureNumber =
    trialOrder;

  const probeNaive =
    trialOrder === 1;

  const trialId =
    trialProgress?.trialId ??
    createCompositeTrialId(
      taskId,
      taskNumber,
    );

  const globalOptionNumber =
    trialProgress?.globalOptionNumber ??
    getGlobalOptionNumber(
      taskId,
      taskNumber,
    );

  const globalTrialNumber =
    trialProgress?.globalTrialNumber ??
    globalOptionNumber;

  const eventIdentity = {
    taskId,
    trialId,
    trialOrder,
    conditionOrder,
    isFirstTrial,
    probeExposureNumber,
    probeNaive,
    globalOptionNumber,
    globalTrialNumber,
  };

  const assistantReady =
    assistantStatus ===
      "ready" &&
    trialOrder !== 0;

  const timerExpired =
    remainingSeconds ===
    0;

  recordActivityRef.current = (
    now =
      getCurrentTimeMs(),
  ) => {
    if (
      !assistantReady ||
      trialSubmitted ||
      trialStartedAtRef.current ===
        null
    ) {
      return;
    }

    const idleStartedAt =
      idleLastActivityAtRef.current;

    idleLastActivityAtRef.current =
      now;

    if (
      idleStartedAt ===
        null
    ) {
      return;
    }

    const idleDurationMs =
      now -
      idleStartedAt;

    if (
      idleDurationMs <
      IDLE_THRESHOLD_MS
    ) {
      return;
    }

    completedIdleIntervalsRef.current = [
      ...completedIdleIntervalsRef.current.filter(
        (interval) =>
          interval.endedAt >=
          now -
            IDLE_LOOKBACK_MS,
      ),
      {
        startedAt:
          idleStartedAt,

        endedAt:
          now,
      },
    ];

    const trialStartedAt =
      trialStartedAtRef.current;

    addEvent({
      ...eventIdentity,
      eventType:
        "idle",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        probeShownAtRef.current ===
        null
          ? "pre_probe"
          : "post_probe",

      metadata: {
        taskId:
          taskId,

        taskNumber,

        idleThresholdMs:
          IDLE_THRESHOLD_MS,

        idleDurationMs,

        idleStartedAtElapsedMs:
          Math.max(
            0,
            idleStartedAt -
              trialStartedAt,
          ),

        idleEndedAtElapsedMs:
          Math.max(
            0,
            now -
              trialStartedAt,
          ),
      },
    });
  };

  function armSolvedTriggerCandidate(
    snapshot:
      ReturnType<
        typeof createScheduleSnapshot
      >,

    reachedAt:
      number,
  ) {
    if (
      solvedTriggerDueAtRef.current !==
        null ||
      !snapshot.completeAssignment ||
      snapshot.speakerConflictPairCount !==
        0
    ) {
      return;
    }

    solvedStateReachedAtRef.current =
      reachedAt;

    solvedTriggerDueAtRef.current =
      reachedAt +
      SOLVED_GRACE_MS;
  }

  function registerAcceptedScheduleEdit(
    previousSnapshot:
      ReturnType<
        typeof createScheduleSnapshot
      >,

    nextSnapshot:
      ReturnType<
        typeof createScheduleSnapshot
      >,

    acceptedAt:
      number,
  ) {
    acceptedEditCountRef.current +=
      1;

    if (
      boardFirstFullyAssignedAtRef.current ===
        null &&
      previousSnapshot.completeAssignment
    ) {
      boardFirstFullyAssignedAtRef.current =
        trialStartedAtRef.current ??
        acceptedAt;
    }

    const boardWasAlreadyFullyAssigned =
      boardFirstFullyAssignedAtRef.current !==
      null;

    if (
      boardWasAlreadyFullyAssigned
    ) {
      postCompleteAcceptedEditCountRef.current +=
        1;

      if (
        postCompleteAcceptedEditCountRef.current ===
          PROBE_INVEST_EDIT_COUNT &&
        investTriggerDueAtRef.current ===
          null
      ) {
        investTriggerDueAtRef.current =
          acceptedAt;
      }
    } else if (
      nextSnapshot.completeAssignment
    ) {
      // ADVISER FIX: The completing A/B edit establishes, but does not increment, the investment counter.
      boardFirstFullyAssignedAtRef.current =
        acceptedAt;

      postCompleteAcceptedEditCountRef.current =
        0;
    }

    armSolvedTriggerCandidate(
      nextSnapshot,
      acceptedAt,
    );
  }

  const interactionDisabled =
    !assistantReady ||
    timerExpired ||
    trialSubmitted ||
    trialLocked;

  useEffect(() => {
    setParticipantAssignmentMade(
      false,
    );

    idleLastActivityAtRef.current =
      null;

    completedIdleIntervalsRef.current =
      [];

    acceptedEditCountRef.current =
      0;

    boardFirstFullyAssignedAtRef.current =
      null;

    postCompleteAcceptedEditCountRef.current =
      0;

    investTriggerDueAtRef.current =
      null;

    solvedStateReachedAtRef.current =
      null;

    solvedTriggerDueAtRef.current =
      null;

    probeOpenedFromBellRef.current =
      false;

    probeAcknowledgedLoggedRef.current =
      false;
  }, [
    taskId,
    taskNumber,
  ]);

  useEffect(() => {
    const timerStartedAtIso =
      trialProgress?.timerStartedAtIso;

    if (
      typeof timerStartedAtIso ===
        "string"
    ) {
      const timerStartedAt =
        Date.parse(
          timerStartedAtIso,
        );

      if (
        Number.isFinite(
          timerStartedAt,
        )
      ) {
        trialStartedAtRef.current =
          timerStartedAt;
      }
    }

    const probeShownAtIso =
      trialProgress?.probeShownAtIso;

    if (
      typeof probeShownAtIso ===
        "string"
    ) {
      const probeShownAt =
        Date.parse(
          probeShownAtIso,
        );

      if (
        Number.isFinite(
          probeShownAt,
        )
      ) {
        probeShownAtRef.current =
          probeShownAt;
      }

      setProbeVisible(
        true,
      );

      const persistedProbeCollapsed =
        typeof trialProgress
          ?.probeCollapsedAtIso ===
          "string";

      const persistedProbeAcknowledged =
        typeof trialProgress
          ?.probeAcknowledgedAtIso ===
          "string";

      probeCollapsedLoggedRef.current =
        persistedProbeCollapsed;

      setProbeCollapsed(
        persistedProbeCollapsed ||
          persistedProbeAcknowledged,
      );

      setProbeAcknowledged(
        persistedProbeAcknowledged,
      );

      probeAcknowledgedLoggedRef.current =
        persistedProbeAcknowledged;
    }

    if (
      typeof trialProgress
        ?.assistantRecommendationShownAtIso ===
        "string" ||
      typeof timerStartedAtIso ===
        "string"
    ) {
      setAssistantStatus(
        "ready",
      );
    } else if (
      typeof trialProgress
        ?.assistantAnalysisRequestedAtIso ===
        "string" ||
      typeof trialProgress
        ?.assistantAnalysisStartedAtIso ===
        "string"
    ) {
      setAssistantStatus(
        "thinking",
      );
    }
  }, [
    trialProgress
      ?.assistantAnalysisRequestedAtIso,
    trialProgress
      ?.assistantAnalysisStartedAtIso,
    trialProgress
      ?.assistantRecommendationShownAtIso,
    trialProgress
      ?.probeAcknowledgedAtIso,
    trialProgress
      ?.probeCollapsedAtIso,
    trialProgress
      ?.probeShownAtIso,
    trialProgress
      ?.timerStartedAtIso,
  ]);

  useEffect(() => {
    if (
      schedulerTrialNumber !==
        taskNumber ||
      initializedTaskKeyRef.current !==
        taskKey
    ) {
      initializeTrial(
        taskNumber,
        conditionOrder,
        trialOrder,
      );

      initializedTaskKeyRef.current =
        taskKey;
    }
  }, [
    conditionOrder,
    initializeTrial,
    schedulerTrialNumber,
    taskKey,
    taskNumber,
    trialOrder,
  ]);

  useEffect(() => {
    if (
      assistantStatus !==
      "thinking"
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          markAssistantAnalysisCompleted(
            taskNumber,
          );

          markAssistantRecommendationShown(
            taskNumber,
          );

          addEvent({

            ...eventIdentity,
            eventType:
              "assistant_analysis_completed",

            trialNumber:
              taskNumber,

            condition:
              expectedCondition,

            phase:
              "pre_ai",

            metadata: {
              page:
                taskPageId,

              taskNumber,

              analysisDelayMs:
                AI_ANALYSIS_DELAY_MS,

              taskVersion:
                taskDefinition.taskVersion,

              aiArtifactVersion:
                taskDefinition.artifactVersion,

              aiMessageVersion:
                taskDefinition.messageVersion,
            },
          });

          assistantRecommendationPendingLogRef.current =
            true;

          setAssistantStatus(
            "ready",
          );
        },
        AI_ANALYSIS_DELAY_MS,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    addEvent,
    assistantStatus,
    expectedCondition,
    markAssistantAnalysisCompleted,
    markAssistantRecommendationShown,
    taskNumber,
    taskPageId,
  ]);

  useEffect(() => {
    if (
      !assistantReady ||
      !assistantRecommendationPendingLogRef.current
    ) {
      return;
    }

    const assistantPanel =
      document.querySelector<HTMLElement>(
        `.ai-assistant-panel[data-task-id="${taskId}"]`,
      );

    const renderedText =
      assistantPanel
        ? Array.from(
            assistantPanel.querySelectorAll<HTMLElement>(
              ".ai-message-bubble p",
            ),
          )
            .map(
              (element) =>
                element.textContent
                  ?.trim() ??
                "",
            )
            .filter(
              (value) =>
                value.length >
                0,
            )
            .join(
              "\n\n",
            ) ||
          renderedAssistantText
        : renderedAssistantText;

    const contentVersion =
      assistantPanel
        ?.getAttribute(
          "data-content-version",
        ) ??
      assistantContentVersion;

    assistantRecommendationPendingLogRef.current =
      false;

    addEvent({

      taskId,
      trialId,
      trialOrder,
      conditionOrder,
      isFirstTrial,
      probeExposureNumber,
      probeNaive,
      globalOptionNumber,
      globalTrialNumber,
      eventType:
        "assistant_recommendation_shown",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "pre_probe",

      renderedText,

      messageId:
        `${taskId}-recommendation-${level}-${contentVersion}`,

      contentVersion,

      metadata: {
        page:
          taskPageId,

        taskNumber,

        taskVersion:
          taskDefinition.taskVersion,

        aiArtifactVersion:
          taskDefinition.artifactVersion,

        aiMessageVersion:
          taskDefinition.messageVersion,
      },
    });
  }, [
    addEvent,
    assistantContentVersion,
    assistantReady,
    conditionOrder,
    expectedCondition,
    globalOptionNumber,
    globalTrialNumber,
    isFirstTrial,
    level,
    probeExposureNumber,
    probeNaive,
    renderedAssistantText,
    taskDefinition.artifactVersion,
    taskDefinition.messageVersion,
    taskDefinition.taskVersion,
    taskId,
    taskNumber,
    taskPageId,
    trialId,
    trialOrder,
  ]);

  useEffect(() => {
    if (
      !assistantReady ||
      trialStartLoggedRef.current
    ) {
      return;
    }

    trialStartLoggedRef.current =
      true;

    const persistedTimerStartedAt =
      typeof trialProgress
        ?.timerStartedAtIso ===
        "string"
        ? Date.parse(
            trialProgress
              .timerStartedAtIso,
          )
        : Number.NaN;

    const trialAlreadyStarted =
      Number.isFinite(
        persistedTimerStartedAt,
      );

    const trialStartedAt =
      trialAlreadyStarted
        ? persistedTimerStartedAt
        : getCurrentTimeMs();

    trialStartedAtRef.current =
      trialStartedAt;

    idleLastActivityAtRef.current =
      trialAlreadyStarted
        ? getCurrentTimeMs()
        : trialStartedAt;

    startEventTrial({
      taskId,
      trialId,
      trialNumber:
        taskNumber,
      trialOrder,
      conditionOrder,
      isFirstTrial,
      probeExposureNumber,
      probeNaive,
    });

    if (
      !trialAlreadyStarted
    ) {
      markTrialTimerStarted(
        taskNumber,
      );
    }

    const currentPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const expectedPlacements =
      getInitialPlacementsForTrial(
        taskNumber,
        taskId,
      );

    const initialSnapshot =
      createScheduleSnapshot(
        currentPlacements,
              taskId,
      );

    const expectedInitialHash =
      getScheduleStateHash(
        expectedPlacements,
      );

    const studySessionState =
      useStudySessionStore.getState();

    const resolvedOrderedPlan =
      studySessionState.assignments
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
        .map(
          (assignment) => ({
            trialOrder:
              assignment.trialOrder,

            taskId:
              assignment.taskId,

            condition:
              assignment.condition,
          }),
        );

    if (
      initialSnapshot.completeAssignment &&
      boardFirstFullyAssignedAtRef.current ===
        null
    ) {
      // ADVISER FIX: Condition C begins counting accepted investment edits at trial start.
      boardFirstFullyAssignedAtRef.current =
        trialStartedAt;
    }

    armSolvedTriggerCandidate(
      initialSnapshot,
      trialAlreadyStarted
        ? getCurrentTimeMs()
        : trialStartedAt,
    );

    stateHistoryRef.current = [
      initialSnapshot.stateHash,
    ];

    stateVisitCountsRef.current =
      new Map([
        [
          initialSnapshot.stateHash,
          1,
        ],
      ]);

    addEvent({

      ...eventIdentity,
      participantToken:
        studySessionState.participantToken,

        eventType:
          "trial_start",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "pre_probe",

      scheduleBefore:
        initialSnapshot.canonicalSchedule,

      scheduleAfter:
        initialSnapshot.canonicalSchedule,

      stateHashBefore:
        initialSnapshot.stateHash,

      stateHashAfter:
        initialSnapshot.stateHash,

      structuralSignatureBefore:
        initialSnapshot.structuralSignature,

      structuralSignatureAfter:
        initialSnapshot.structuralSignature,

      macroStructureSignatureBefore:
        initialSnapshot.macroStructureSignature,

      macroStructureSignatureAfter:
        initialSnapshot.macroStructureSignature,

      roomCompositionSignatureBefore:
        initialSnapshot.roomCompositionSignature,

      roomCompositionSignatureAfter:
        initialSnapshot.roomCompositionSignature,

      scoreBefore:
        initialSnapshot.score.totalScore,

      scoreAfter:
        initialSnapshot.score.totalScore,

      scoreDelta:
        0,

      speakerConflictsBefore:
        initialSnapshot.speakerConflictPairCount,

      speakerConflictsAfter:
        initialSnapshot.speakerConflictPairCount,

      hammingDistanceFromAIBefore:
        initialSnapshot.hammingDistanceFromAI,

      hammingDistanceFromAIAfter:
        initialSnapshot.hammingDistanceFromAI,

      hammingDistanceFromAI:
        initialSnapshot.hammingDistanceFromAI,

      insideAIFamilyBefore:
        initialSnapshot.insideAIFamily,

      insideAIFamilyAfter:
        initialSnapshot.insideAIFamily,

      structuralSignature:
        initialSnapshot.structuralSignature,

      macroStructureSignature:
        initialSnapshot.macroStructureSignature,

      roomCompositionSignature:
        initialSnapshot.roomCompositionSignature,

      postProbeFeasibleBefore:
        null,

      postProbeFeasibleAfter:
        null,

      unresolvedDemoTalkIdsBefore:
        null,

      unresolvedDemoTalkIdsAfter:
        null,

      resultingViolations:
        initialSnapshot.resultingViolations,

      violationCount:
        initialSnapshot.violationCount,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        trialResumed:
          trialAlreadyStarted,

        timerStartedAtIso:
          trialProgress
            ?.timerStartedAtIso ??
          new Date(
            trialStartedAt,
          ).toISOString(),

        totalTrials:
          TOTAL_STUDY_TRIALS,

        availableTaskOptionCount:
          TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

        totalTaskDomains:
          TOTAL_TASK_DOMAINS,

        taskOptionsPerDomain:
          TASK_OPTIONS_PER_DOMAIN,

        trialOrder,

        conditionOrder,

        isFirstTrial,

        probeExposureNumber,

        probeNaive,

        trialDurationSeconds:
          TRIAL_DURATION_SECONDS,

        // ADVISER FIX: Export the shared state-based policy, never the retired seven-minute onset.
        probeTriggerPolicyVersion:
          "state_based_v1",

        probeFloorMs:
          PROBE_FLOOR_MS,

        probeInvestAcceptedEditCount:
          PROBE_INVEST_EDIT_COUNT,

        solvedGraceMs:
          SOLVED_GRACE_MS,

        probeCapMs:
          PROBE_CAP_MS,

        probeCollapseSeconds:
          PROBE_COLLAPSE_SECONDS,

        aiAnalysisDelayMs:
          AI_ANALYSIS_DELAY_MS,

        taskVersion:
          taskDefinition.taskVersion,

        aiArtifactVersion:
          taskDefinition.artifactVersion,

        aiMessageVersion:
          taskDefinition.messageVersion,

        probeVersion:
          semanticProbe.version,

        participantToken:
          studySessionState.participantToken,

        assignmentTableVersion:
          studySessionState.assignmentTableVersion,

        assignmentSequenceId:
          studySessionState.assignmentSequenceId,

        resolvedOrderedPlan,

        scoringVersion:
          taskDefinition.scoringVersion,

        expectedCondition,

        loadedCondition:
          level,

        correctConditionLoaded:
          level ===
          expectedCondition,

        expectedInitialPlacementCount:
          getExpectedInitialPlacementCount(
            expectedCondition,
            taskId,
          ),

        loadedInitialPlacementCount:
          currentPlacements.length,

        expectedInitialScheduleHash:
          expectedInitialHash,

        loadedInitialScheduleHash:
          initialSnapshot.stateHash,

        correctInitialScheduleLoaded:
          initialSnapshot.stateHash ===
          expectedInitialHash,

        initialMacroStructureSignature:
          initialSnapshot.macroStructureSignature,

        initialRoomCompositionSignature:
          initialSnapshot.roomCompositionSignature,

        macroStructureDefinition:
          macroStructureDefinition,

        theoreticalEditTaxonomyVersion:
          theoreticalEditTaxonomyVersion,

        initialDistanceToBestPostProbeSolution:
          initialSnapshot.distanceToBestPostProbeSolution,

        initialCompleteAssignment:
          initialSnapshot.completeAssignment,

          initialStructurallyLegal:
            initialSnapshot.structurallyLegal,
        },
      });
  }, [
    addEvent,
    assistantReady,
    conditionOrder,
    expectedCondition,
    isFirstTrial,
    level,
    markTrialTimerStarted,
    probeExposureNumber,
    macroStructureDefinition,
    probeNaive,
    taskId,
    taskNumber,
    taskDefinition,
    semanticProbe,
    theoreticalEditTaxonomyVersion,
    trialId,
    trialOrder,
    trialProgress?.timerStartedAtIso,
  ]);

  useEffect(() => {
    const timerStartedAt =
      trialStartedAtRef.current;

    if (
      !assistantReady ||
      trialSubmitted ||
      timerStartedAt ===
        null
    ) {
      return;
    }

    let probeDeadlineTimeoutId:
      number | null =
        null;

    let collapseDeadlineTimeoutId:
      number | null =
        null;

    const clearProbeDeadlineTimeout =
      () => {
        if (
          probeDeadlineTimeoutId ===
          null
        ) {
          return;
        }

        window.clearTimeout(
          probeDeadlineTimeoutId,
        );

        probeDeadlineTimeoutId =
          null;
      };

    const clearCollapseDeadlineTimeout =
      () => {
        if (
          collapseDeadlineTimeoutId ===
          null
        ) {
          return;
        }

        window.clearTimeout(
          collapseDeadlineTimeoutId,
        );

        collapseDeadlineTimeoutId =
          null;
      };

    const rearmDeadlineTimeouts =
      (
        now =
          getCurrentTimeMs(),
      ) => {
        clearProbeDeadlineTimeout();

        const startedAt =
          trialStartedAtRef.current;

        if (
          startedAt !==
            null &&
          probeShownAtRef.current ===
            null
        ) {
          const candidate =
            getEarliestProbeCandidate(
              startedAt,
              investTriggerDueAtRef.current,
              solvedTriggerDueAtRef.current,
            );

          const probeDeadlineAt =
            Math.max(
              startedAt +
                PROBE_FLOOR_MS,
              candidate.dueAt,
            );

          probeDeadlineTimeoutId =
            window.setTimeout(
              () => {
                evaluateDeadlines();
              },
              Math.max(
                0,
                probeDeadlineAt -
                  now,
              ),
            );
        }

        clearCollapseDeadlineTimeout();

        const probeShownAt =
          probeShownAtRef.current;

        if (
          probeShownAt !==
            null &&
          !probeAcknowledged &&
          !probeCollapsed &&
          !probeCollapsedLoggedRef.current
        ) {
          collapseDeadlineTimeoutId =
            window.setTimeout(
              () => {
                evaluateDeadlines();
              },
              Math.max(
                0,
                probeShownAt +
                  PROBE_COLLAPSE_SECONDS *
                    1000 -
                  now,
              ),
            );
        }
      };

    const evaluateDeadlines =
      (
        now =
          getCurrentTimeMs(),
      ) => {
        probeDeadlineCheckRef.current(
          now,
        );

        collapseDeadlineCheckRef.current(
          now,
        );

        rearmDeadlineTimeouts(
          now,
        );
      };

    const updateRemainingTime =
      (
        now =
          getCurrentTimeMs(),
      ) => {
        const startedAt =
          trialStartedAtRef.current;

        if (
          startedAt === null
        ) {
          return;
        }

        const elapsedSeconds =
          Math.floor(
            Math.max(
              0,
              now -
                startedAt,
            ) /
              1000,
          );

        setRemainingSeconds(
          Math.max(
            0,
            TRIAL_DURATION_SECONDS -
              elapsedSeconds,
          ),
        );

        evaluateDeadlines(
          now,
        );
      };

    const handleDeadlineEvent =
      () => {
        evaluateDeadlines();
      };

    const handleVisibilityChange =
      () => {
        const now =
          getCurrentTimeMs();

        updateRemainingTime(
          now,
        );

        if (
          document.visibilityState ===
            "visible"
        ) {
          recordActivityRef.current(
            now,
          );
        }
      };

    updateRemainingTime();

    const intervalId =
      window.setInterval(
        updateRemainingTime,
        250,
      );

    const deadlineIntervalId =
      window.setInterval(
        () => {
          const now =
            getCurrentTimeMs();

          evaluateDeadlines(
            now,
          );
        },
        50,
      );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleDeadlineEvent,
    );

    window.addEventListener(
      "blur",
      handleDeadlineEvent,
    );

    document.addEventListener(
      "pointermove",
      handleDeadlineEvent,
    );

    document.addEventListener(
      "pointerdown",
      handleDeadlineEvent,
    );

    document.addEventListener(
      "keydown",
      handleDeadlineEvent,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      window.clearInterval(
        deadlineIntervalId,
      );

      clearProbeDeadlineTimeout();

      clearCollapseDeadlineTimeout();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleDeadlineEvent,
      );

      window.removeEventListener(
        "blur",
        handleDeadlineEvent,
      );

      document.removeEventListener(
        "pointermove",
        handleDeadlineEvent,
      );

      document.removeEventListener(
        "pointerdown",
        handleDeadlineEvent,
      );

      document.removeEventListener(
        "keydown",
        handleDeadlineEvent,
      );
    };
  }, [
    assistantReady,
    probeAcknowledged,
    probeCollapsed,
    probeVisible,
    trialSubmitted,
    PROBE_COLLAPSE_SECONDS,
    TRIAL_DURATION_SECONDS,
  ]);

  useEffect(() => {
    if (
      !assistantReady ||
      trialSubmitted
    ) {
      return;
    }

    const warningThresholds =
      [
        {
          level:
            "amber" as const,
          remainingSeconds:
            300,
        },
        {
          level:
            "red" as const,
          remainingSeconds:
            180,
        },
      ];

    for (
      const warning of
      warningThresholds
    ) {
      if (
        remainingSeconds >
          warning.remainingSeconds ||
        timerWarningLoggedRef.current[
          warning.level
        ]
      ) {
        continue;
      }

      timerWarningLoggedRef.current[
        warning.level
      ] = true;

      addEvent({

        ...eventIdentity,
        eventType:
          "timer_warning",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        phase:
          probeShownAtRef.current ===
          null
            ? "pre_probe"
            : "post_probe",

        remainingMs:
          remainingSeconds *
          1000,

        timerWarningLevel:
          warning.level,

        metadata: {
          taskId:
            taskId,

          taskNumber,

          remainingSeconds,

          thresholdSeconds:
            warning.remainingSeconds,
        },
      });
    }
  }, [
    addEvent,
    assistantReady,
    expectedCondition,
    remainingSeconds,
    taskId,
    taskNumber,
    trialSubmitted,
  ]);

  useEffect(() => {
    if (
      !assistantReady ||
      remainingSeconds !== 0 ||
      timerExpiredLoggedRef.current
    ) {
      return;
    }

    recordActivityRef.current(
      getCurrentTimeMs(),
    );

    timerExpiredLoggedRef.current =
      true;

    setActiveTalkId(
      null,
    );

    setTrialLocked(
      true,
    );

    const snapshot =
      createScheduleSnapshot(
        clonePlacements(
          useSchedulerStore
            .getState()
            .placements,
        ),
              taskId,
      );

    const probeWasShown =
      probeShownAtRef.current !==
      null;

    const timerPostProbeFeasible =
      probeWasShown
        ? snapshot.postProbeFeasible
        : null;

    const timerUnresolvedDemoTalkIds =
      probeWasShown
        ? [
            ...snapshot
              .unresolvedDemoTalkIds,
          ]
        : null;

    addEvent({

      ...eventIdentity,
      eventType:
        "timer_expired",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "submitted",

      scheduleBefore:
        snapshot.canonicalSchedule,

      scheduleAfter:
        snapshot.canonicalSchedule,

      stateHashBefore:
        snapshot.stateHash,

      stateHashAfter:
        snapshot.stateHash,

      structuralSignatureBefore:
        snapshot.structuralSignature,

      structuralSignatureAfter:
        snapshot.structuralSignature,

      macroStructureSignatureBefore:
        snapshot.macroStructureSignature,

      macroStructureSignatureAfter:
        snapshot.macroStructureSignature,

      roomCompositionSignatureBefore:
        snapshot.roomCompositionSignature,

      roomCompositionSignatureAfter:
        snapshot.roomCompositionSignature,

      scoreBefore:
        snapshot.score.totalScore,

      scoreAfter:
        snapshot.score.totalScore,

      scoreDelta:
        0,

      speakerConflictsBefore:
        snapshot.speakerConflictPairCount,

      speakerConflictsAfter:
        snapshot.speakerConflictPairCount,

      hammingDistanceFromAIBefore:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAIAfter:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAI:
        snapshot.hammingDistanceFromAI,

      insideAIFamilyBefore:
        snapshot.insideAIFamily,

      insideAIFamilyAfter:
        snapshot.insideAIFamily,

      structuralSignature:
        snapshot.structuralSignature,

      accepted:
        true,

      trialEndReason:
        "timeout",

      probeCompliant:
        probeWasShown
          ? snapshot.semanticProbeCompliant
          : null,

      probeVisible:
        probeWasShown,

      probeAcknowledged:
        probeWasShown
          ? probeAcknowledged
          : undefined,

      probeIntegrationDetected:
        probeWasShown
          ? probeIntegrated
          : undefined,

      postProbeFeasibleBefore:
        timerPostProbeFeasible,

      postProbeFeasibleAfter:
        timerPostProbeFeasible,

      unresolvedDemoTalkIdsBefore:
        timerUnresolvedDemoTalkIds,

      unresolvedDemoTalkIdsAfter:
        timerUnresolvedDemoTalkIds,

      resultingViolations:
        snapshot.resultingViolations,

      violationCount:
        snapshot.violationCount,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        remainingSeconds:
          0,

        probeShown:
          probeWasShown,

        probeAcknowledged:
          probeWasShown
            ? probeAcknowledged
            : null,

        probeIntegrationDetected:
          probeWasShown
            ? probeIntegrated
            : null,

        postProbeFeasible:
          timerPostProbeFeasible,

        unresolvedDemoTalkIds:
          timerUnresolvedDemoTalkIds,

        roomCompositionSignature:
          snapshot.roomCompositionSignature,

        distanceToBestPostProbeSolution:
          snapshot.distanceToBestPostProbeSolution,

        scorePercentage:
          snapshot.score.scorePercentage,

        preProbeFeasible:
          snapshot.preProbeFeasible,

        semanticProbeCompliant:
          probeWasShown
            ? snapshot.semanticProbeCompliant
            : null,
      },
    });

    submitTrialRef.current(
      "timeout",
    );
  }, [
    addEvent,
    assistantReady,
    expectedCondition,
    probeAcknowledged,
    probeIntegrated,
    remainingSeconds,
    setActiveTalkId,
    setTrialLocked,
    taskId,
    taskNumber,
  ]);

  probeDeadlineCheckRef.current = (
    now:
      number,
  ) => {
    if (
      !assistantReady
    ) {
      return;
    }

    const trialStartedAt =
      trialStartedAtRef.current;

    if (
      trialStartedAt === null
    ) {
      return;
    }

    const elapsedMs =
      Math.max(
        0,
        now -
          trialStartedAt,
      );

    const floorAt =
      trialStartedAt +
      PROBE_FLOOR_MS;

    const candidate =
      getEarliestProbeCandidate(
        trialStartedAt,
        investTriggerDueAtRef.current,
        solvedTriggerDueAtRef.current,
      );

    const displayAt =
      Math.max(
        floorAt,
        candidate.dueAt,
      );

    if (
      now <
        displayAt ||
      probeShownAtRef.current !==
        null ||
      trialSubmitted
    ) {
      return;
    }

    const triggerReason:
      ProbeTriggerReason =
        candidate.dueAt <
          floorAt &&
        candidate.reason !==
          "cap"
          ? "floor_clamped"
          : candidate.reason;

    const shownAt =
      now;

    probeShownAtRef.current =
      shownAt;

    markProbeShown(
      taskNumber,
    );

    setProbeVisible(
      true,
    );

    const currentPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const snapshot =
      createScheduleSnapshot(
        currentPlacements,
        taskId,
      );

    const probeOnsetMeasurements = {
      triggerReason,

      placedItemCount:
        currentPlacements.length,

      currentConflictCount:
        snapshot.speakerConflictPairCount,

      editsMadeSoFar:
        acceptedEditCountRef.current,

      hammingDistanceFromAI:
        snapshot.hammingDistanceFromAI,

      idleMsInPrevious60Seconds:
        getIdleMsInPreviousWindow(
          shownAt,
          completedIdleIntervalsRef.current,
          idleLastActivityAtRef.current,
        ),
    };

    // ADVISER FIX: Emit one probe event with typed, snapshot-consistent onset fields.
    addEvent({

        ...eventIdentity,
        eventType:
          "probe_shown",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        phase:
          "post_probe",

        triggerReason:
          probeOnsetMeasurements.triggerReason,

        placedItemCount:
          probeOnsetMeasurements.placedItemCount,

        currentConflictCount:
          probeOnsetMeasurements.currentConflictCount,

        editsMadeSoFar:
          probeOnsetMeasurements.editsMadeSoFar,

        idleMsInPrevious60Seconds:
          probeOnsetMeasurements.idleMsInPrevious60Seconds,

        scheduleBefore:
          snapshot.canonicalSchedule,

        scheduleAfter:
          snapshot.canonicalSchedule,

        stateHashBefore:
          snapshot.stateHash,

        stateHashAfter:
          snapshot.stateHash,

        structuralSignatureBefore:
          snapshot.structuralSignature,

        structuralSignatureAfter:
          snapshot.structuralSignature,

        scoreBefore:
          snapshot.score.totalScore,

        scoreAfter:
          snapshot.score.totalScore,

        scoreDelta:
          0,

        speakerConflictsBefore:
          snapshot.speakerConflictPairCount,

        speakerConflictsAfter:
          snapshot.speakerConflictPairCount,

        hammingDistanceFromAIBefore:
          snapshot.hammingDistanceFromAI,

        hammingDistanceFromAIAfter:
          snapshot.hammingDistanceFromAI,

        hammingDistanceFromAI:
          snapshot.hammingDistanceFromAI,

        insideAIFamilyBefore:
          snapshot.insideAIFamily,

        insideAIFamilyAfter:
          snapshot.insideAIFamily,

        structuralSignature:
          snapshot.structuralSignature,

        probeVisible:
          true,

        probeAcknowledged:
          false,

        probeDisplayMode:
          semanticProbe.displayMode,

        integrationConsistentEdit:
          false,

        probeIntegrationDetected:
          false,

        latencyFromProbeMs:
          0,

        postProbeFeasibleBefore:
          snapshot.postProbeFeasible,

        postProbeFeasibleAfter:
          snapshot.postProbeFeasible,

        unresolvedDemoTalkIdsBefore: [
          ...snapshot
            .unresolvedDemoTalkIds,
        ],

        unresolvedDemoTalkIdsAfter: [
          ...snapshot
            .unresolvedDemoTalkIds,
        ],

        resultingViolations:
          snapshot.resultingViolations,

        violationCount:
          snapshot.violationCount,

        metadata: {
          taskId:
            taskId,

          taskNumber,

          remainingSeconds:
            Math.max(
              0,
              TRIAL_DURATION_SECONDS -
                Math.floor(
                  elapsedMs /
                    1000,
                ),
            ),

          elapsedSeconds:
            elapsedMs /
            1000,

          actualProbeOnsetMs:
            elapsedMs,

          ...probeOnsetMeasurements,

          triggerCandidate:
            candidate.reason,

          triggerCandidateDueAtElapsedMs:
            Math.max(
              0,
              candidate.dueAt -
                trialStartedAt,
            ),

          probeFloorMs:
            PROBE_FLOOR_MS,

          solvedGraceMs:
            SOLVED_GRACE_MS,

          probeCapMs:
            PROBE_CAP_MS,

          probeId:
            semanticProbe.id,

          probeVersion:
            semanticProbe.version,

          affectedRoom:
            semanticProbe.affectedRoom,

          affectedResource:
            semanticProbe.affectedRoom,

          requiredProjectorRoom:
            semanticProbe.requiredProjectorRoom,

          requiredEquipmentResource:
            semanticProbe.requiredProjectorRoom,

          requiredTalkIds:
            semanticProbe.requiredTalkIds,

          requiredItemIds:
            semanticProbe.requiredTalkIds,

          probeShownAtElapsedMs:
            elapsedMs,

          probeAcknowledged:
            false,

          postProbeFeasible:
            snapshot.postProbeFeasible,

          unresolvedDemoTalkIds: [
            ...snapshot
              .unresolvedDemoTalkIds,
          ],

          roomCompositionSignature:
            snapshot.roomCompositionSignature,

          roomADemoCount:
            snapshot.roomADemoCount,

          roomANonDemoCount:
            snapshot.roomANonDemoCount,

          roomAContainsExactDemoSet:
            snapshot.roomAContainsExactDemoSet,

          distanceToBestPostProbeSolution:
            snapshot.distanceToBestPostProbeSolution,
        },
      });
  };

  collapseDeadlineCheckRef.current = (
    now:
      number,
  ) => {
    const probeShownAt =
      probeShownAtRef.current;

    if (
      semanticProbe.displayMode !==
        "transient" ||
      probeShownAt ===
        null ||
      probeAcknowledged ||
      probeCollapsed ||
      probeCollapsedLoggedRef.current ||
      trialSubmitted ||
      now <
        probeShownAt +
          PROBE_COLLAPSE_SECONDS *
            1000
    ) {
      return;
    }

    probeCollapsedLoggedRef.current =
      true;

    markProbeCollapsed(
      taskNumber,
    );

    addEvent({

      ...eventIdentity,
      eventType:
        "probe_collapsed",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "post_probe",

      probeVisible:
        true,

      probeAcknowledged:
        false,

      probeDisplayMode:
        semanticProbe.displayMode,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        probeId:
          semanticProbe.id,

        probeVersion:
          semanticProbe.version,

        displayMode:
          semanticProbe.displayMode,
      },
    });

    setProbeCollapsed(
      true,
    );
  };

  function handleAnalyzeTask() {
    if (
      assistantStatus !==
        "idle" ||
      trialOrder === 0
    ) {
      return;
    }

    markAssistantAnalysisRequested(
      taskNumber,
    );

    addEvent({

      ...eventIdentity,
      eventType:
        "assistant_analysis_requested",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "pre_ai",

      metadata: {
        page:
          taskPageId,

        taskNumber,

        taskVersion:
          taskDefinition.taskVersion,

        aiArtifactVersion:
          taskDefinition.artifactVersion,

        aiMessageVersion:
          taskDefinition.messageVersion,
      },
    });

    markAssistantAnalysisStarted(
      taskNumber,
    );

    addEvent({

      ...eventIdentity,
      eventType:
        "assistant_analysis_started",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "pre_ai",

      metadata: {
        page:
          taskPageId,

        taskNumber,

        expectedAnalysisDelayMs:
          AI_ANALYSIS_DELAY_MS,
      },
    });

    setAssistantStatus(
      "thinking",
    );
  }

  function handleOpenTaskDetails() {
    setTaskDetailsOpen(
      true,
    );

    addEvent({

      ...eventIdentity,
      eventType:
        "task_details_opened",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      metadata: {
        page:
          taskPageId,

        taskNumber,
      },
    });
  }

  function handleCloseTaskDetails() {
    setTaskDetailsOpen(
      false,
    );

    addEvent({

      ...eventIdentity,
      eventType:
        "task_details_closed",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      metadata: {
        page:
          taskPageId,

        taskNumber,
      },
    });
  }

  function handleProbeAcknowledge() {
    if (
      trialSubmitted
    ) {
      return;
    }

    if (
      probeAcknowledged ||
      probeAcknowledgedLoggedRef.current
    ) {
      setProbeCollapsed(
        true,
      );

      probeOpenedFromBellRef.current =
        false;

      return;
    }

    probeAcknowledgedLoggedRef.current =
      true;

    const acknowledgementSource =
      probeOpenedFromBellRef.current
        ? "bell" as const
        : "banner_ok" as const;

    const acknowledgedAt =
      getCurrentTimeMs();

    const latencyMs =
      probeShownAtRef.current ===
      null
        ? null
        : Math.max(
            0,
            acknowledgedAt -
              probeShownAtRef.current,
          );

    const snapshot =
      createScheduleSnapshot(
        clonePlacements(
          useSchedulerStore
            .getState()
            .placements,
        ),
              taskId,
      );

    const acknowledgementRecorded =
      markProbeAcknowledged(
        taskNumber,
      );

    if (
      !acknowledgementRecorded
    ) {
      probeAcknowledgedLoggedRef.current =
        false;

      return;
    }

    addEvent({

      ...eventIdentity,
      eventType:
        "probe_ack",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "post_probe",

      probeLatencyMs:
        latencyMs,

      probeAcknowledgmentSource:
        acknowledgementSource,

      latencyFromProbeMs:
        latencyMs,

      probeVisible:
        true,

      probeAcknowledged:
        true,

      probeDisplayMode:
        semanticProbe.displayMode,

      probeIntegrationDetected:
        probeIntegrated,

      postProbeFeasibleBefore:
        snapshot.postProbeFeasible,

      postProbeFeasibleAfter:
        snapshot.postProbeFeasible,

      unresolvedDemoTalkIdsBefore: [
        ...snapshot
          .unresolvedDemoTalkIds,
      ],

      unresolvedDemoTalkIdsAfter: [
        ...snapshot
          .unresolvedDemoTalkIds,
      ],

      metadata: {
        taskId:
          taskId,

        taskNumber,

        probeId:
          semanticProbe.id,

        probeVersion:
          semanticProbe.version,

        acknowledgementLatencyMs:
          latencyMs,

        acknowledgementSource,

        probeAcknowledged:
          true,

        affectedRoom:
          semanticProbe.affectedRoom,

        requiredProjectorRoom:
          semanticProbe.requiredProjectorRoom,

        requiredTalkIds:
          semanticProbe.requiredTalkIds,

        postProbeFeasible:
          snapshot.postProbeFeasible,

        unresolvedDemoTalkIds: [
          ...snapshot
            .unresolvedDemoTalkIds,
        ],
      },
    });

    setProbeAcknowledged(
      true,
    );

    // ADVISER FIX: First acknowledgement collapses to the persistent bell.
    setProbeCollapsed(
      true,
    );

    probeCollapsedLoggedRef.current =
      true;

    probeOpenedFromBellRef.current =
      false;
  }

  function handleOpenCollapsedProbe() {
    if (
      trialSubmitted
    ) {
      return;
    }

    const latencyMs =
      probeShownAtRef.current ===
      null
        ? null
        : Math.max(
            0,
            getCurrentTimeMs() -
              probeShownAtRef.current,
          );

    if (
      !probeAcknowledged
    ) {
      probeOpenedFromBellRef.current =
        true;
    }

    addEvent({

      ...eventIdentity,
      eventType:
        "probe_notification_opened",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "post_probe",

      probeLatencyMs:
        latencyMs,

      latencyFromProbeMs:
        latencyMs,

      probeVisible:
        true,

      probeAcknowledged,

      probeDisplayMode:
        semanticProbe.displayMode,

      probeIntegrationDetected:
        probeIntegrated,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        probeId:
          semanticProbe.id,

        probeVersion:
          semanticProbe.version,

        notificationOpenLatencyMs:
          latencyMs,

        affectedRoom:
          semanticProbe.affectedRoom,

        requiredProjectorRoom:
          semanticProbe.requiredProjectorRoom,

        requiredTalkIds:
          semanticProbe.requiredTalkIds,
      },
    });

    setProbeCollapsed(
      false,
    );
  }

  function handleDragStart(
    event:
      DragStartEvent,
  ) {
    if (
      interactionDisabled
    ) {
      dragStartedAtRef.current =
        null;

      setActiveTalkId(
        null,
      );

      return;
    }

    const talkId =
      event.active.data.current
        ?.talkId;

    if (
      typeof talkId !==
      "string"
    ) {
      dragStartedAtRef.current =
        null;

      setActiveTalkId(
        null,
      );

      return;
    }

    dragStartedAtRef.current =
      getCurrentTimeMs();

    setActiveTalkId(
      talkId,
    );

    const currentPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const sourcePlacement =
      currentPlacements.find(
        (placement) =>
          placement.talkId ===
          talkId,
      );

    const snapshot =
      createScheduleSnapshot(
        currentPlacements,
              taskId,
      );

    addEvent({

      ...eventIdentity,
      eventType:
        "drag_start",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      talkId,

      fromRoom:
        sourcePlacement?.room,

      fromSlot:
        sourcePlacement?.slot,

      source:
        sourcePlacement
          ? "schedule_grid"
          : "unassigned_tray",

      scheduleBefore:
        snapshot.canonicalSchedule,

      stateHashBefore:
        snapshot.stateHash,

      structuralSignatureBefore:
        snapshot.structuralSignature,

      scoreBefore:
        snapshot.score.totalScore,

      speakerConflictsBefore:
        snapshot.speakerConflictPairCount,

      hammingDistanceFromAIBefore:
        snapshot.hammingDistanceFromAI,

      insideAIFamilyBefore:
        snapshot.insideAIFamily,

      probeVisible,

      probeAcknowledged,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        roomCompositionSignatureBefore:
          snapshot.roomCompositionSignature,

        distanceToBestPostProbeSolutionBefore:
          snapshot.distanceToBestPostProbeSolution,
      },
    });
  }

  function handleDragCancel() {
    const dragDurationMs =
      dragStartedAtRef.current ===
      null
        ? undefined
        : Math.max(
            0,
            getCurrentTimeMs() -
              dragStartedAtRef.current,
          );

    dragStartedAtRef.current =
      null;

    if (
      interactionDisabled
    ) {
      setActiveTalkId(
        null,
      );

      return;
    }

    const snapshot =
      createScheduleSnapshot(
        clonePlacements(
          useSchedulerStore
            .getState()
            .placements,
        ),
              taskId,
      );

    addEvent({

      ...eventIdentity,
      eventType:
        "drag_cancel",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      action:
        "no_op",

      dragDurationMs,

      scheduleBefore:
        snapshot.canonicalSchedule,

      scheduleAfter:
        snapshot.canonicalSchedule,

      stateHashBefore:
        snapshot.stateHash,

      stateHashAfter:
        snapshot.stateHash,

      structuralSignatureBefore:
        snapshot.structuralSignature,

      structuralSignatureAfter:
        snapshot.structuralSignature,

      macroStructureSignatureBefore:
        snapshot.macroStructureSignature,

      macroStructureSignatureAfter:
        snapshot.macroStructureSignature,

      roomCompositionSignatureBefore:
        snapshot.roomCompositionSignature,

      roomCompositionSignatureAfter:
        snapshot.roomCompositionSignature,

      scoreBefore:
        snapshot.score.totalScore,

      scoreAfter:
        snapshot.score.totalScore,

      scoreDelta:
        0,

      speakerConflictsBefore:
        snapshot.speakerConflictPairCount,

      speakerConflictsAfter:
        snapshot.speakerConflictPairCount,

      hammingDistanceFromAIBefore:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAIAfter:
        snapshot.hammingDistanceFromAI,

      insideAIFamilyBefore:
        snapshot.insideAIFamily,

      insideAIFamilyAfter:
        snapshot.insideAIFamily,

      editCategory:
        "other",

      probeVisible,

      probeAcknowledged,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        reason:
          "Drag cancelled",
      },
    });

    setActiveTalkId(
      null,
    );
  }

  function handleDragEnd(
    event:
      DragEndEvent,
  ) {
    const dragDurationMs =
      dragStartedAtRef.current ===
      null
        ? undefined
        : Math.max(
            0,
            getCurrentTimeMs() -
              dragStartedAtRef.current,
          );

    dragStartedAtRef.current =
      null;

    if (
      interactionDisabled
    ) {
      setActiveTalkId(
        null,
      );

      return;
    }

    const {
      active,
      over,
    } = event;

    const talkId =
      active.data.current
        ?.talkId;

    if (
      typeof talkId !==
      "string"
    ) {
      setActiveTalkId(
        null,
      );

      return;
    }

    const previousPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const previousSnapshot =
      createScheduleSnapshot(
        previousPlacements,
              taskId,
      );

    const sourcePlacement =
      previousPlacements.find(
        (placement) =>
          placement.talkId ===
          talkId,
      );

    const targetData =
      over?.data.current;

    const targetType =
      targetData?.type;

    const targetRoomValue =
      targetData?.room;

    const targetSlotValue =
      targetData?.slot;

    const targetRoom =
      isRoom(
        targetRoomValue,
      )
        ? targetRoomValue
        : undefined;

    const targetSlot =
      isSlot(
        targetSlotValue,
      )
        ? targetSlotValue
        : undefined;

    const targetReportedLegal =
      targetData?.dropIsLegal;

    if (
      targetType ===
      "unassigned-tray"
    ) {
      const trayDropAllowed =
        targetData?.allowTrayUnplace ===
        true;

      const trayDropSucceeded =
        Boolean(
          sourcePlacement,
        ) &&
        trayDropAllowed &&
        unassignTalk(
          talkId,
        );

      if (
        !trayDropSucceeded
      ) {
        const illegalReason =
          trayDropAllowed
            ? "source_not_found"
            : "tray_unplace_disabled";

        addEvent({

          ...eventIdentity,
          eventType:
            "illegal_drop",

          trialNumber:
            taskNumber,

          condition:
            expectedCondition,

          talkId,

          fromRoom:
            sourcePlacement?.room,

          fromSlot:
            sourcePlacement?.slot,

          source:
            sourcePlacement
              ? "schedule_grid"
              : "unassigned_tray",

          action:
            "no_op",

          success:
            false,

          illegalReason,

          dragDurationMs,

          scheduleBefore:
            previousSnapshot.canonicalSchedule,

          scheduleAfter:
            previousSnapshot.canonicalSchedule,

          stateHashBefore:
            previousSnapshot.stateHash,

          stateHashAfter:
            previousSnapshot.stateHash,

          structuralSignatureBefore:
            previousSnapshot.structuralSignature,

          structuralSignatureAfter:
            previousSnapshot.structuralSignature,

          scoreBefore:
            previousSnapshot.score.totalScore,

          scoreAfter:
            previousSnapshot.score.totalScore,

          scoreDelta:
            0,

          speakerConflictsBefore:
            previousSnapshot.speakerConflictPairCount,

          speakerConflictsAfter:
            previousSnapshot.speakerConflictPairCount,

          hammingDistanceFromAIBefore:
            previousSnapshot.hammingDistanceFromAI,

          hammingDistanceFromAIAfter:
            previousSnapshot.hammingDistanceFromAI,

          insideAIFamilyBefore:
            previousSnapshot.insideAIFamily,

          insideAIFamilyAfter:
            previousSnapshot.insideAIFamily,

          statePreviouslyVisited:
            true,

          editCategory:
            "illegal_edit",

          probeVisible,

          probeAcknowledged,

          metadata: {
            taskId:
              taskId,

            taskNumber,

            reason:
              illegalReason,
          },
        });

        setActiveTalkId(
          null,
        );

        return;
      }

      const nextPlacements =
        clonePlacements(
          useSchedulerStore
            .getState()
            .placements,
        );

      const acceptedEditAt =
        getCurrentTimeMs();

      const nextSnapshot =
        createScheduleSnapshot(
          nextPlacements,
          taskId,
        );

      registerAcceptedScheduleEdit(
        previousSnapshot,
        nextSnapshot,
        acceptedEditAt,
      );

      const probeActive =
        probeShownAtRef.current !==
        null;

      const metrics =
        calculateSchedulerMetrics(
          previousPlacements,
          nextPlacements,
          probeActive,
                  taskId,
        );

      const stateHistory =
        stateHistoryRef.current;

      const visitCountBefore =
        stateVisitCountsRef.current.get(
          metrics.stateHash,
        ) ?? 0;

      const statePreviouslyVisited =
        visitCountBefore >
        0;

      const isImmediateReversal =
        stateHistory.length >=
          2 &&
        stateHistory[
          stateHistory.length -
          2
        ] ===
          metrics.stateHash;

      stateHistoryRef.current = [
        ...stateHistory,
        metrics.stateHash,
      ];

      stateVisitCountsRef.current.set(
        metrics.stateHash,
        visitCountBefore + 1,
      );

      const latencyFromProbeMs =
        probeShownAtRef.current ===
        null
          ? null
          : Math.max(
              0,
              getCurrentTimeMs() -
                probeShownAtRef.current,
            );

      const firstProbeIntegration =
        metrics.integrationConsistentEdit &&
        !probeIntegrated;

      if (
        firstProbeIntegration
      ) {
        setProbeIntegrated(
          true,
        );
      }

      if (
        probeActive
      ) {
        postProbeEditCountRef.current +=
          1;
      }

      addEvent({

        ...eventIdentity,
        eventType:
          "unplace",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        phase:
          probeActive
            ? "post_probe"
            : "pre_probe",

        talkId,

        fromRoom:
          sourcePlacement?.room,

        fromSlot:
          sourcePlacement?.slot,

        source:
          "schedule_grid",

        action:
          "unplace",

        success:
          true,

        dragDurationMs,

        latencyFromProbeMs,

        scheduleBefore:
          metrics.previousCanonicalSchedule,

        scheduleAfter:
          metrics.canonicalSchedule,

        stateHashBefore:
          metrics.previousStateHash,

        stateHashAfter:
          metrics.stateHash,

        structuralSignatureBefore:
          metrics.previousStructuralSignature,

        structuralSignatureAfter:
          metrics.structuralSignature,

        macroStructureSignatureBefore:
          metrics.previousMacroStructureSignature,

        macroStructureSignatureAfter:
          metrics.macroStructureSignature,

        roomCompositionSignatureBefore:
          metrics.previousRoomCompositionSignature,

        roomCompositionSignatureAfter:
          metrics.roomCompositionSignature,

        scoreBefore:
          metrics.previousScore.totalScore,

        scoreAfter:
          metrics.score.totalScore,

        scoreDelta:
          metrics.scoreDelta,

        speakerConflictsBefore:
          metrics.previousScore
            .violatedSpeakerPairChecks,

        speakerConflictsAfter:
          metrics.score
            .violatedSpeakerPairChecks,

        hammingDistanceFromAIBefore:
          metrics.previousHammingDistanceFromAI,

        hammingDistanceFromAIAfter:
          metrics.hammingDistanceFromAI,

        insideAIFamilyBefore:
          metrics.previousInsideAIFamily,

        insideAIFamilyAfter:
          metrics.insideAIFamily,

        statePreviouslyVisited,

        isImmediateReversal,

        isBacktracking:
          statePreviouslyVisited,

        editCategory:
          "move_to_unassigned",

        probeVisible:
          probeActive,

        probeAcknowledged,

        integrationConsistentEdit:
          metrics.integrationConsistentEdit,

        probeIntegrationDetected:
          probeActive
            ? probeIntegrated ||
              firstProbeIntegration
            : null,

        postProbeFeasibleBefore:
          metrics.postProbeFeasibleBefore,

        postProbeFeasibleAfter:
          metrics.postProbeFeasibleAfter,

        unresolvedDemoTalkIdsBefore:
          metrics.unresolvedDemoTalkIdsBefore,

        unresolvedDemoTalkIdsAfter:
          metrics.unresolvedDemoTalkIdsAfter,

        resultingViolations:
          metrics.resultingViolations,

        violationCount:
          metrics.violationCount,

        metadata: {
          taskId:
            taskId,

          taskNumber,

          changedTalkIds:
            metrics.changedTalkIds,

          probeActive,

          firstProbeIntegration,

          postProbeEditIndex:
            probeActive
              ? postProbeEditCountRef.current
              : null,

          completeAssignment:
            metrics.completeAssignment,

          structurallyLegal:
            metrics.structurallyLegal,

          preProbeFeasible:
            metrics.preProbeFeasible,

          semanticProbeCompliant:
            probeActive
              ? metrics.semanticProbeCompliant
              : null,
        },
      });

      probeDeadlineCheckRef.current(
        acceptedEditAt,
      );

      setActiveTalkId(
        null,
      );

      return;
    }

    if (
      targetType !==
        "schedule-cell" ||
      !targetRoom ||
      !targetSlot
    ) {
      addEvent({
        ...eventIdentity,
        eventType:
          "illegal_drop",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        talkId,

        fromRoom:
          sourcePlacement?.room,

        fromSlot:
          sourcePlacement?.slot,

        source:
          sourcePlacement
            ? "schedule_grid"
            : "unassigned_tray",

        action:
          "no_op",

        success:
          false,

        dragDurationMs,

        scheduleBefore:
          previousSnapshot.canonicalSchedule,

        scheduleAfter:
          previousSnapshot.canonicalSchedule,

        stateHashBefore:
          previousSnapshot.stateHash,

        stateHashAfter:
          previousSnapshot.stateHash,

        structuralSignatureBefore:
          previousSnapshot.structuralSignature,

        structuralSignatureAfter:
          previousSnapshot.structuralSignature,

        scoreBefore:
          previousSnapshot.score.totalScore,

        scoreAfter:
          previousSnapshot.score.totalScore,

        scoreDelta:
          0,

        speakerConflictsBefore:
          previousSnapshot.speakerConflictPairCount,

        speakerConflictsAfter:
          previousSnapshot.speakerConflictPairCount,

        hammingDistanceFromAIBefore:
          previousSnapshot.hammingDistanceFromAI,

        hammingDistanceFromAIAfter:
          previousSnapshot.hammingDistanceFromAI,

        hammingDistanceFromAI:
          previousSnapshot.hammingDistanceFromAI,

        insideAIFamilyBefore:
          previousSnapshot.insideAIFamily,

        insideAIFamilyAfter:
          previousSnapshot.insideAIFamily,

        statePreviouslyVisited:
          true,

        editCategory:
          "illegal_edit",

        probeVisible,

        probeAcknowledged,

        metadata: {
          taskId:
            taskId,

          taskNumber,

          reason:
            "No valid target cell",
        },
      });

      setActiveTalkId(
        null,
      );

      return;
    }

    const droppedOnSameCell =
      sourcePlacement?.room ===
        targetRoom &&
      sourcePlacement?.slot ===
        targetSlot;

    if (
      droppedOnSameCell
    ) {
      addEvent({
        ...eventIdentity,
        eventType:
          "drag_cancel",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        talkId,

        fromRoom:
          sourcePlacement.room,

        fromSlot:
          sourcePlacement.slot,

        toRoom:
          targetRoom,

        toSlot:
          targetSlot,

        source:
          "schedule_grid",

        action:
          "no_op",

        success:
          true,

        dragDurationMs,

        scheduleBefore:
          previousSnapshot.canonicalSchedule,

        scheduleAfter:
          previousSnapshot.canonicalSchedule,

        stateHashBefore:
          previousSnapshot.stateHash,

        stateHashAfter:
          previousSnapshot.stateHash,

        structuralSignatureBefore:
          previousSnapshot.structuralSignature,

        structuralSignatureAfter:
          previousSnapshot.structuralSignature,

        scoreBefore:
          previousSnapshot.score.totalScore,

        scoreAfter:
          previousSnapshot.score.totalScore,

        scoreDelta:
          0,

        speakerConflictsBefore:
          previousSnapshot.speakerConflictPairCount,

        speakerConflictsAfter:
          previousSnapshot.speakerConflictPairCount,

        hammingDistanceFromAIBefore:
          previousSnapshot.hammingDistanceFromAI,

        hammingDistanceFromAIAfter:
          previousSnapshot.hammingDistanceFromAI,

        hammingDistanceFromAI:
          previousSnapshot.hammingDistanceFromAI,

        insideAIFamilyBefore:
          previousSnapshot.insideAIFamily,

        insideAIFamilyAfter:
          previousSnapshot.insideAIFamily,

        statePreviouslyVisited:
          true,

        editCategory:
          "return_to_previous_state",

        probeVisible,

        probeAcknowledged,

        metadata: {
          taskId:
            taskId,

          taskNumber,

          reason:
            "Dropped on original cell",
        },
      });

      setActiveTalkId(
        null,
      );

      return;
    }

    const targetPlacement =
      previousPlacements.find(
        (placement) =>
          placement.room ===
            targetRoom &&
          placement.slot ===
            targetSlot,
      );

    /*
     * The typed validator checks both sides of a possible swap.
     * Speaker conflicts remain visible and violable.
     */
    const moveValidation =
      validateMoveOrSwapTalk(
        talkId,
        targetRoom,
        targetSlot,
      );

    const targetCellReportedIllegal =
      targetReportedLegal ===
      false;

    const legal =
      !targetCellReportedIllegal &&
      moveValidation.valid;

    const success =
      legal &&
      moveOrSwapTalk(
        talkId,
        targetRoom,
        targetSlot,
      );

    if (
      !success
    ) {
      addEvent({
        ...eventIdentity,
        eventType:
          "illegal_drop",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        talkId,

        fromRoom:
          sourcePlacement?.room,

        fromSlot:
          sourcePlacement?.slot,

        toRoom:
          targetRoom,

        toSlot:
          targetSlot,

        source:
          sourcePlacement
            ? "schedule_grid"
            : "unassigned_tray",

        action:
          "no_op",

        displacedTalkId:
          moveValidation.displacedTalkId,

        success:
          false,

        illegalReason:
          moveValidation.reason,

        dragDurationMs,

        scheduleBefore:
          previousSnapshot.canonicalSchedule,

        scheduleAfter:
          previousSnapshot.canonicalSchedule,

        stateHashBefore:
          previousSnapshot.stateHash,

        stateHashAfter:
          previousSnapshot.stateHash,

        structuralSignatureBefore:
          previousSnapshot.structuralSignature,

        structuralSignatureAfter:
          previousSnapshot.structuralSignature,

        scoreBefore:
          previousSnapshot.score.totalScore,

        scoreAfter:
          previousSnapshot.score.totalScore,

        scoreDelta:
          0,

        speakerConflictsBefore:
          previousSnapshot.speakerConflictPairCount,

        speakerConflictsAfter:
          previousSnapshot.speakerConflictPairCount,

        hammingDistanceFromAIBefore:
          previousSnapshot.hammingDistanceFromAI,

        hammingDistanceFromAIAfter:
          previousSnapshot.hammingDistanceFromAI,

        hammingDistanceFromAI:
          previousSnapshot.hammingDistanceFromAI,

        insideAIFamilyBefore:
          previousSnapshot.insideAIFamily,

        insideAIFamilyAfter:
          previousSnapshot.insideAIFamily,

        statePreviouslyVisited:
          true,

        editCategory:
          "illegal_edit",

        probeVisible,

        probeAcknowledged,

        metadata: {
          taskId:
            taskId,

          taskNumber,

          targetOccupied:
            Boolean(
              targetPlacement,
            ),

          activeOrigin:
            active.data.current
              ?.origin ??
            active.data.current
              ?.source ??
            null,

          targetReportedLegal:
            targetReportedLegal ??
            null,

          reason:
            moveValidation.reason ??
            (
              targetCellReportedIllegal
                ? "The selected target cell or swap is structurally illegal"
                : "Structurally illegal placement or swap"
            ),
        },
      });

      setActiveTalkId(
        null,
      );

      return;
    }

    const nextPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const acceptedEditAt =
      getCurrentTimeMs();

    const nextSnapshot =
      createScheduleSnapshot(
        nextPlacements,
        taskId,
      );

    registerAcceptedScheduleEdit(
      previousSnapshot,
      nextSnapshot,
      acceptedEditAt,
    );

    const probeActive =
      probeShownAtRef.current !==
      null;

    const metrics =
      calculateSchedulerMetrics(
        previousPlacements,
        nextPlacements,
        probeActive,
              taskId,
      );

    const stateHistory =
      stateHistoryRef.current;

    const nextStateHash =
      metrics.stateHash;

    const visitCountBefore =
      stateVisitCountsRef.current.get(
        nextStateHash,
      ) ?? 0;

    const statePreviouslyVisited =
      visitCountBefore > 0;

    const isImmediateReversal =
      stateHistory.length >=
        2 &&
      stateHistory[
        stateHistory.length - 2
      ] ===
        nextStateHash;

    const isBacktracking =
      statePreviouslyVisited;

    const firstStrategySwitch =
      metrics.strategySwitchTriggered &&
      !strategySwitchDetectedRef.current;

    if (
      firstStrategySwitch
    ) {
      strategySwitchDetectedRef.current =
        true;
    }

    const latencyFromProbeMs =
      probeShownAtRef.current ===
      null
        ? null
        : Math.max(
            0,
            getCurrentTimeMs() -
              probeShownAtRef.current,
          );

    let postProbeEditIndex:
      number | null = null;

    let isFirstPostProbeEdit =
      false;

    if (
      probeActive
    ) {
      postProbeEditCountRef.current +=
        1;

      postProbeEditIndex =
        postProbeEditCountRef.current;

      isFirstPostProbeEdit =
        !firstPostProbeEditDetectedRef.current;

      if (
        isFirstPostProbeEdit
      ) {
        firstPostProbeEditDetectedRef.current =
          true;
      }
    }

    const firstProbeIntegration =
      metrics.integrationConsistentEdit &&
      !probeIntegrated;

    if (
      firstProbeIntegration
    ) {
      setProbeIntegrated(
        true,
      );
    }

    const probeIntegrationDetectedAfterEdit =
      probeActive
        ? probeIntegrated ||
          firstProbeIntegration
        : null;

    if (
      metrics.isSalvageAttempt
    ) {
      consecutiveSalvageCountRef.current +=
        1;
    } else {
      consecutiveSalvageCountRef.current =
        0;
    }

    const action =
      !sourcePlacement
        ? "assign"
        : targetPlacement
          ? "swap"
          : "move";

    if (
      action ===
        "assign" &&
      taskNumber !==
        3
    ) {
      setParticipantAssignmentMade(
        true,
      );
    }

    const editCategory =
      getEditCategory(
        sourcePlacement,
        targetPlacement,
        targetRoom,
        talkId,
        taskId,
      );

    stateHistoryRef.current = [
      ...stateHistory,
      nextStateHash,
    ];

    stateVisitCountsRef.current.set(
      nextStateHash,
      visitCountBefore + 1,
    );

    const aiFamilyExit =
      metrics.previousInsideAIFamily &&
      !metrics.insideAIFamily;

    const aiFamilyReentry =
      !metrics.previousInsideAIFamily &&
      metrics.insideAIFamily;

    addEvent({

      ...eventIdentity,
      eventType:
        "drop",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        probeActive
          ? "post_probe"
          : "pre_probe",

      talkId,

      fromRoom:
        sourcePlacement?.room,

      fromSlot:
        sourcePlacement?.slot,

      toRoom:
        targetRoom,

      toSlot:
        targetSlot,

      source:
        sourcePlacement
          ? "schedule_grid"
          : "unassigned_tray",

      action,

      displacedTalkId:
        moveValidation.displacedTalkId,

      success:
        true,

      dragDurationMs,

      probeLatencyMs:
        latencyFromProbeMs,

      latencyFromProbeMs,

      scheduleBefore:
        metrics.previousCanonicalSchedule,

      scheduleAfter:
        metrics.canonicalSchedule,

      stateHashBefore:
        metrics.previousStateHash,

      stateHashAfter:
        metrics.stateHash,

      structuralSignatureBefore:
        metrics.previousStructuralSignature,

      structuralSignatureAfter:
        metrics.structuralSignature,

      macroStructureSignatureBefore:
        metrics.previousMacroStructureSignature,

      macroStructureSignatureAfter:
        metrics.macroStructureSignature,

      roomCompositionSignatureBefore:
        metrics.previousRoomCompositionSignature,

      roomCompositionSignatureAfter:
        metrics.roomCompositionSignature,

      scoreBefore:
        metrics.previousScore.totalScore,

      scoreAfter:
        metrics.score.totalScore,

      scoreDelta:
        metrics.scoreDelta,

      speakerConflictsBefore:
        metrics.previousScore.violatedSpeakerPairChecks,

      speakerConflictsAfter:
        metrics.score.violatedSpeakerPairChecks,

      hammingDistanceFromAIBefore:
        metrics.previousHammingDistanceFromAI,

      hammingDistanceFromAIAfter:
        metrics.hammingDistanceFromAI,

      hammingDistanceFromAI:
        metrics.hammingDistanceFromAI,

      insideAIFamilyBefore:
        metrics.previousInsideAIFamily,

      insideAIFamilyAfter:
        metrics.insideAIFamily,

      statePreviouslyVisited,

      isImmediateReversal,

      isBacktracking,

      editCategory,

      theoreticalEditCategory:
        metrics.theoreticalEditCategory ??
        undefined,

      isSalvageAttempt:
        metrics.isSalvageAttempt,

      isNonImprovingEdit:
        metrics.isNonImprovingEdit,

      isPlateauEdit:
        metrics.isPlateauEdit,

      isDestructiveEdit:
        metrics.isDestructiveEdit,

      transitionId:
        metrics.transitionId,

      isOptimalDestructiveTransition:
        metrics.isOptimalDestructiveTransition,

      strategySwitchTriggered:
        firstStrategySwitch,

      probeVisible:
        probeActive,

      probeAcknowledged,

      integrationConsistentEdit:
        metrics.integrationConsistentEdit,

      probeIntegrationDetected:
        probeIntegrationDetectedAfterEdit,

      postProbeFeasibleBefore:
        metrics.postProbeFeasibleBefore,

      postProbeFeasibleAfter:
        metrics.postProbeFeasibleAfter,

      unresolvedDemoTalkIdsBefore:
        metrics.unresolvedDemoTalkIdsBefore,

      unresolvedDemoTalkIdsAfter:
        metrics.unresolvedDemoTalkIdsAfter,

      resultingViolations:
        metrics.resultingViolations,

      violationCount:
        metrics.violationCount,

      structuralSignature:
        metrics.structuralSignature,

      macroStructureSignature:
        metrics.macroStructureSignature,

      roomCompositionSignature:
        metrics.roomCompositionSignature,

      moatCrossed:
        metrics.moatCrossed,

      metadata: {
        taskId:
          taskId,

        taskNumber,

        targetOccupied:
          Boolean(
            targetPlacement,
          ),

        changedTalkIds:
          metrics.changedTalkIds,

        previousMacroStructureSignature:
          metrics.previousMacroStructureSignature,

        macroStructureSignature:
          metrics.macroStructureSignature,

        previousRoomCompositionSignature:
          metrics.previousRoomCompositionSignature,

        roomCompositionSignature:
          metrics.roomCompositionSignature,

        macroStructureDefinition:
          macroStructureDefinition,

        theoreticalEditCategory:
          metrics.theoreticalEditCategory,

        theoreticalEditTaxonomyVersion:
          theoreticalEditTaxonomyVersion,

        previousDistanceToBestPostProbeSolution:
          metrics.previousDistanceToBestPostProbeSolution,

        distanceToBestPostProbeSolution:
          metrics.distanceToBestPostProbeSolution,

        previousScorePercentage:
          metrics.previousScore.scorePercentage,

        scorePercentage:
          metrics.score.scorePercentage,

        isScoreDecreasingEdit:
          metrics.isScoreDecreasingEdit,

        destructiveEditMagnitude:
          metrics.destructiveEditMagnitude,

        structuralDeparture:
          metrics.structuralDeparture,

        aiFamilyExit,

        aiFamilyReentry,

        visitCountBefore,

        visitCountAfter:
          visitCountBefore + 1,

        consecutiveSalvageAttemptCount:
          consecutiveSalvageCountRef.current,

        repeatedSalvageAttempt:
          metrics.isSalvageAttempt &&
          consecutiveSalvageCountRef.current >
            1,

        probeActive,

        probeAcknowledged,

        firstProbeIntegration,

        probeIntegrationDetected:
          probeIntegrationDetectedAfterEdit,

        integrationTalkIds:
          metrics.integrationTalkIds,

        latencyFromProbeMs,

        postProbeFeasibleBefore:
          metrics.postProbeFeasibleBefore,

        postProbeFeasibleAfter:
          metrics.postProbeFeasibleAfter,

        unresolvedDemoTalkIdsBefore:
          metrics.unresolvedDemoTalkIdsBefore,

        unresolvedDemoTalkIdsAfter:
          metrics.unresolvedDemoTalkIdsAfter,

        postProbeEditIndex,

        isFirstPostProbeEdit,

        postProbeEditsBeforeIntegration:
          probeActive &&
          !probeIntegrated
            ? Math.max(
                0,
                postProbeEditCountRef.current -
                  (
                    firstProbeIntegration
                      ? 1
                      : 0
                  ),
              )
            : null,

        firstStrategySwitch,

        strategySwitchLatencyFromProbeMs:
          firstStrategySwitch
            ? latencyFromProbeMs
            : null,

        hammingDistanceAtStrategySwitch:
          firstStrategySwitch
            ? metrics.hammingDistanceFromAI
            : null,

        roomADemoCount:
          metrics.roomADemoCount,

        roomANonDemoCount:
          metrics.roomANonDemoCount,

        roomAContainsExactDemoSet:
          metrics.roomAContainsExactDemoSet,

        completeAssignment:
          metrics.completeAssignment,

        structurallyLegal:
          metrics.structurallyLegal,

        postProbeFeasible:
          probeActive
            ? metrics.postProbeFeasible
            : null,

        unresolvedDemoTalkIds:
          probeActive
            ? [
                ...metrics
                  .unresolvedDemoTalkIds,
              ]
            : null,
      },
    });

    probeDeadlineCheckRef.current(
      acceptedEditAt,
    );

    setActiveTalkId(
      null,
    );
  }

  function handleSubmit(
    submissionReason:
      TrialEndReason =
        "submitted",
  ) {
    if (
      trialSubmitted ||
      submitInProgressRef.current ||
      !assistantReady
    ) {
      return;
    }

    submitInProgressRef.current =
      true;

    const finalPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const snapshot =
      createScheduleSnapshot(
        finalPlacements,
        taskId,
      );

    const probeWasShown =
      probeShownAtRef.current !==
        null ||
      typeof trialProgress?.probeShownAtIso ===
        "string";

    // ADVISER FIX: Submission is available for every active board state and never waits for the probe.
    setTrialLocked(
      true,
    );

    const submissionLatencyFromProbeMs =
      probeShownAtRef.current ===
      null
        ? null
        : Math.max(
            0,
            getCurrentTimeMs() -
              probeShownAtRef.current,
          );

    const submissionPostProbeFeasible =
      probeWasShown
        ? snapshot.postProbeFeasible
        : null;

    const submissionUnresolvedDemoTalkIds =
      probeWasShown
        ? [
            ...snapshot
              .unresolvedDemoTalkIds,
          ]
        : null;

    const submissionProbeIntegrationDetected =
      probeWasShown
        ? probeIntegrated
        : null;

    const detectionMiss =
      probeWasShown
        ? !probeAcknowledged
        : null;

    const integrationMiss =
      probeWasShown
        ? !probeIntegrated
        : null;

    const detectionWithoutIntegration =
      probeWasShown
        ? probeAcknowledged &&
          !probeIntegrated
        : null;

    setActiveTalkId(
      null,
    );

    const commonMetadata = {
      taskId:
        taskId,

      taskNumber,

      trialId,

      globalOptionNumber,

      globalTrialNumber,

      trialOrder,

      conditionOrder,

      isFirstTrial,

      probeExposureNumber,

      probeNaive,

      placements:
        finalPlacements,

      remainingSeconds,

      timerExpired,

      trialEndReason:
        submissionReason,

      accepted:
        true,

      preProbeFeasible:
        snapshot.preProbeFeasible,

      semanticProbeCompliant:
        probeWasShown
          ? snapshot.semanticProbeCompliant
          : null,

      probeShown:
        probeWasShown,

      probeVisible,

      probeAcknowledged:
        probeWasShown
          ? probeAcknowledged
          : null,

      probeIntegrated:
        submissionProbeIntegrationDetected,

      probeIntegrationDetected:
        submissionProbeIntegrationDetected,

      detectionMiss,

      integrationMiss,

      detectionWithoutIntegration,

      latencyFromProbeMs:
        submissionLatencyFromProbeMs,

      postProbeEditCount:
        postProbeEditCountRef.current,

      strategySwitchOccurred:
        strategySwitchDetectedRef.current,

      stateCount:
        stateHistoryRef.current.length,

      uniqueStateCount:
        stateVisitCountsRef.current.size,

      taskVersion:
        taskDefinition.taskVersion,

      aiArtifactVersion:
        taskDefinition.artifactVersion,

      aiMessageVersion:
        taskDefinition.messageVersion,

      probeVersion:
        semanticProbe.version,

      scoringVersion:
        taskDefinition.scoringVersion,

      macroStructureSignature:
        snapshot.macroStructureSignature,

      roomCompositionSignature:
        snapshot.roomCompositionSignature,

      macroStructureDefinition:
        macroStructureDefinition,

      theoreticalEditTaxonomyVersion:
        theoreticalEditTaxonomyVersion,

      distanceToBestPostProbeSolution:
        snapshot.distanceToBestPostProbeSolution,

      roomADemoCount:
        snapshot.roomADemoCount,

      roomANonDemoCount:
        snapshot.roomANonDemoCount,

      roomAContainsExactDemoSet:
        snapshot.roomAContainsExactDemoSet,

      completeAssignment:
        snapshot.completeAssignment,

      structurallyLegal:
        snapshot.structurallyLegal,

      postProbeFeasible:
        submissionPostProbeFeasible,

      unresolvedDemoTalkIds:
        submissionUnresolvedDemoTalkIds,

      finalScheduleHash:
        snapshot.stateHash,

      finalScore:
        snapshot.score.totalScore,

      finalScorePercentage:
        snapshot.score.scorePercentage,

      finalSpeakerConflictPairs:
        snapshot.speakerConflictPairCount,
    };

    const submitted =
      markTrialSubmitted(
        taskNumber,
        submissionReason,
      );

    if (
      !submitted
    ) {
      addEvent({
        ...eventIdentity,
        eventType:
          "submit_attempt",
        trialNumber:
          taskNumber,
        condition:
          expectedCondition,
        phase:
          probeWasShown
            ? "post_probe"
            : "pre_probe",
        accepted:
          false,
        trialEndReason:
          submissionReason,
        scheduleBefore:
          snapshot.canonicalSchedule,
        scheduleAfter:
          snapshot.canonicalSchedule,
        stateHashBefore:
          snapshot.stateHash,
        stateHashAfter:
          snapshot.stateHash,
        structuralSignatureBefore:
          snapshot.structuralSignature,
        structuralSignatureAfter:
          snapshot.structuralSignature,
        scoreBefore:
          snapshot.score.totalScore,
        scoreAfter:
          snapshot.score.totalScore,
        scoreDelta:
          0,
        speakerConflictsBefore:
          snapshot.speakerConflictPairCount,
        speakerConflictsAfter:
          snapshot.speakerConflictPairCount,
        resultingViolations:
          snapshot.resultingViolations,
        violationCount:
          snapshot.violationCount,
        probeVisible:
          probeWasShown,
        probeAcknowledged:
          probeWasShown
            ? probeAcknowledged
            : false,
        metadata: {
          ...eventIdentity,
          taskNumber,
          rejectionReason:
            "session_state_rejected",
          boardPreserved:
            true,
          navigationBlocked:
            true,
        },
      });

      submitInProgressRef.current =
        false;

      setTrialLocked(
        false,
      );

      return;
    }

    addEvent({

      ...eventIdentity,
      eventType:
        "submit_attempt",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        probeWasShown
          ? "post_probe"
          : "pre_probe",

      accepted:
        true,

      trialEndReason:
        submissionReason,

      probeCompliant:
        probeWasShown
          ? snapshot.semanticProbeCompliant
          : null,

      scheduleBefore:
        snapshot.canonicalSchedule,

      scheduleAfter:
        snapshot.canonicalSchedule,

      stateHashBefore:
        snapshot.stateHash,

      stateHashAfter:
        snapshot.stateHash,

      structuralSignatureBefore:
        snapshot.structuralSignature,

      structuralSignatureAfter:
        snapshot.structuralSignature,

      scoreBefore:
        snapshot.score.totalScore,

      scoreAfter:
        snapshot.score.totalScore,

      scoreDelta:
        0,

      speakerConflictsBefore:
        snapshot.speakerConflictPairCount,

      speakerConflictsAfter:
        snapshot.speakerConflictPairCount,

      hammingDistanceFromAIBefore:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAIAfter:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAI:
        snapshot.hammingDistanceFromAI,

      insideAIFamilyBefore:
        snapshot.insideAIFamily,

      insideAIFamilyAfter:
        snapshot.insideAIFamily,

      probeVisible:
        probeWasShown,

      probeAcknowledged:
        probeWasShown
          ? probeAcknowledged
          : undefined,

      probeIntegrationDetected:
        submissionProbeIntegrationDetected ??
        undefined,

      latencyFromProbeMs:
        submissionLatencyFromProbeMs,

      detectionMiss,

      integrationMiss,

      detectionWithoutIntegration,

      postProbeFeasible:
        submissionPostProbeFeasible,

      unresolvedDemoTalkIds:
        submissionUnresolvedDemoTalkIds,

      postProbeFeasibleBefore:
        submissionPostProbeFeasible,

      postProbeFeasibleAfter:
        submissionPostProbeFeasible,

      unresolvedDemoTalkIdsBefore:
        submissionUnresolvedDemoTalkIds,

      unresolvedDemoTalkIdsAfter:
        submissionUnresolvedDemoTalkIds,

      resultingViolations:
        snapshot.resultingViolations,

      violationCount:
        snapshot.violationCount,

      structuralSignature:
        snapshot.structuralSignature,

      macroStructureSignature:
        snapshot.macroStructureSignature,

      roomCompositionSignature:
        snapshot.roomCompositionSignature,

      metadata:
        commonMetadata,
    });

    initializeTrialResponse(
      taskNumber,
      taskId,
      expectedCondition,
    );

    const questionnaireOpened =
      openTrialQuestionnaire(
        taskNumber,
      );

    if (
      !questionnaireOpened
    ) {
      submitInProgressRef.current =
        false;

      return;
    }

    addEvent({

      ...eventIdentity,
      eventType:
        "trial_end",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "submitted",

      accepted:
        true,

      trialEndReason:
        submissionReason,

      probeCompliant:
        probeWasShown
          ? snapshot.semanticProbeCompliant
          : null,

      scheduleBefore:
        snapshot.canonicalSchedule,

      scheduleAfter:
        snapshot.canonicalSchedule,

      stateHashBefore:
        snapshot.stateHash,

      stateHashAfter:
        snapshot.stateHash,

      structuralSignatureBefore:
        snapshot.structuralSignature,

      structuralSignatureAfter:
        snapshot.structuralSignature,

      scoreBefore:
        snapshot.score.totalScore,

      scoreAfter:
        snapshot.score.totalScore,

      scoreDelta:
        0,

      speakerConflictsBefore:
        snapshot.speakerConflictPairCount,

      speakerConflictsAfter:
        snapshot.speakerConflictPairCount,

      hammingDistanceFromAIBefore:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAIAfter:
        snapshot.hammingDistanceFromAI,

      hammingDistanceFromAI:
        snapshot.hammingDistanceFromAI,

      insideAIFamilyBefore:
        snapshot.insideAIFamily,

      insideAIFamilyAfter:
        snapshot.insideAIFamily,

      probeVisible:
        probeWasShown,

      probeAcknowledged:
        probeWasShown
          ? probeAcknowledged
          : undefined,

      probeIntegrationDetected:
        submissionProbeIntegrationDetected ??
        undefined,

      latencyFromProbeMs:
        submissionLatencyFromProbeMs,

      detectionMiss,

      integrationMiss,

      detectionWithoutIntegration,

      postProbeFeasible:
        submissionPostProbeFeasible,

      unresolvedDemoTalkIds:
        submissionUnresolvedDemoTalkIds,

      postProbeFeasibleBefore:
        submissionPostProbeFeasible,

      postProbeFeasibleAfter:
        submissionPostProbeFeasible,

      unresolvedDemoTalkIdsBefore:
        submissionUnresolvedDemoTalkIds,

      unresolvedDemoTalkIdsAfter:
        submissionUnresolvedDemoTalkIds,

      resultingViolations:
        snapshot.resultingViolations,

      violationCount:
        snapshot.violationCount,

      structuralSignature:
        snapshot.structuralSignature,

      macroStructureSignature:
        snapshot.macroStructureSignature,

      roomCompositionSignature:
        snapshot.roomCompositionSignature,

      metadata:
        commonMetadata,
    });

    setTrialSubmitted(
      true,
    );

    window.setTimeout(
      () => {
        navigate(
          `/trial-questionnaire/${taskId}/${taskNumber}`,
          {
            replace:
              true,

            state: {
              trialNumber:
                taskNumber,

              trialOrder,

              totalTrials:
                TOTAL_STUDY_TRIALS,

              totalStudyTrials:
                TOTAL_STUDY_TRIALS,

              availableTaskOptionCount:
                TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

              trialId,

              globalOptionNumber,

              globalTrialNumber,

              taskId:
                taskId,

              condition:
                expectedCondition,

              conditionOrder,

              isFirstTrial,

              probeExposureNumber,

              probeNaive,
            },
          },
        );
      },
      0,
    );
  }

  submitTrialRef.current =
    handleSubmit;

  return (
    <DndContext
      collisionDetection={
        preciseCollisionDetection
      }
      onDragStart={
        handleDragStart
      }
      onDragCancel={
        handleDragCancel
      }
      onDragEnd={
        handleDragEnd
      }
    >
      <div
        className={`scheduler-page scheduler-page-${taskId}`}
        data-task-id={taskId}
        onPointerDownCapture={() => {
          recordActivityRef.current();
        }}
        onPointerMoveCapture={() => {
          recordActivityRef.current();
        }}
        onKeyDownCapture={() => {
          recordActivityRef.current();
        }}
        onWheelCapture={() => {
          recordActivityRef.current();
        }}
      >
        <header className="scheduler-header">
          <div>
            <div className="scheduler-title">
              {taskPresentation.title}
            </div>

            <div className="scheduler-task">
              Task {trialOrder} of{" "}
              {TOTAL_STUDY_TRIALS}
            </div>
          </div>

          <div className="scheduler-right">
            <button
              type="button"
              className="task-details-button"
              onClick={
                handleOpenTaskDetails
              }
            >
              Task Details
            </button>

            {assistantReady ? (
              <TrialTimer
                remainingSeconds={
                  remainingSeconds
                }
              />
            ) : (
              <div className="scheduler-timer scheduler-timer-idle">
                Not started
              </div>
            )}

            <button
              type="button"
              className="scheduler-submit"
              onClick={() => {
                handleSubmit(
                  "submitted",
                );
              }}
              disabled={
                timerExpired
              }
            >
              {/* ADVISER FIX: Keep the submit label stable without previewing the probe. */}
              {taskPresentation.submitLabel}
            </button>
          </div>
        </header>

        <ProbeBanner
          taskId={
            taskId
          }
          visible={
            probeVisible
          }
          acknowledged={
            probeAcknowledged
          }
          collapsed={
            probeCollapsed
          }
          onAcknowledge={
            handleProbeAcknowledge
          }
          onOpenCollapsed={
            handleOpenCollapsedProbe
          }
        />

        {/* ADVISER FIX: Only the real mid-task probe renders in the reserved banner slot. */}

        {timerExpired && (
          <div className="trial-timeout-message">
            Time is over. Your current{" "}
            {taskPresentation.solutionNoun} is being submitted
            automatically.
          </div>
        )}

        <div className="scheduler-layout">
          {assistantReady ? (
            <AIAssistantPanel
              taskId={
                taskId
              }
            />
          ) : (
            <button
              type="button"
              className="panel ai-assistant-launch"
              onClick={
                handleAnalyzeTask
              }
              disabled={
                assistantStatus ===
                "thinking"
              }
            >
              {assistantStatus ===
              "thinking" ? (
                <>
                  <LoaderCircle
                    size={34}
                    className="ai-thinking-icon"
                    aria-hidden="true"
                  />

                  <strong>
                    Analyzing constraints
                  </strong>

                  <span>
                    The AI assistant is preparing its
                    recommendation.
                  </span>
                </>
              ) : (
                <>
                  <div className="ai-launch-icon">
                    <Bot
                      size={30}
                      aria-hidden="true"
                    />
                  </div>

                  <strong>
                    Ask AI to analyze the task
                  </strong>

                  <span>
                    Click to receive a{" "}
                    {taskPresentation.recommendationNoun}.
                  </span>

                  <div className="ai-launch-action">
                    <Sparkles
                      size={16}
                      aria-hidden="true"
                    />

                    Generate answer
                  </div>
                </>
              )}
            </button>
          )}

          <main
            className="panel grid-panel"
            aria-disabled={
              interactionDisabled
            }
          >
            {assistantReady ? (
              <>
                {taskNumber === 3 ||
                participantAssignmentMade ? (
                  <CurrentConflictsPanel
                    taskId={
                      taskId
                    }
                  />
                ) : null}

                <SchedulerGrid
                  taskId={
                    taskId
                  }
                />

                <UnassignedTray
                  taskId={
                    taskId
                  }
                />
              </>
            ) : (
              <div className="scheduler-waiting-panel">
                <Bot
                  size={38}
                  aria-hidden="true"
                />

                <strong>
                  {taskPresentation.title} not started
                </strong>

                <span>
                  Ask the AI assistant to analyze the task
                  before editing the{" "}
                  {taskPresentation.solutionNoun}.
                </span>
              </div>
            )}
          </main>

          <ConstraintsPanel
            taskId={
              taskId
            }
          />
        </div>

        {taskDetailsOpen && (
          <div
            className="task-details-overlay"
            role="presentation"
            onClick={
              handleCloseTaskDetails
            }
          >
            <section
              className="task-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-details-title"
              onClick={(
                event:
                  MouseEvent<HTMLElement>,
              ) => {
                event.stopPropagation();
              }}
            >
              <div className="task-details-header">
                <div>
                  <h2 id="task-details-title">
                    {taskPresentation.summaryTitle}
                  </h2>

                  <p>
                    {taskPresentation.summaryDescription}
                  </p>
                </div>

                <button
                  type="button"
                  className="task-details-close"
                  onClick={
                    handleCloseTaskDetails
                  }
                  aria-label="Close task details"
                >
                  <X
                    size={20}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <TaskSummaryTable
                taskId={
                  taskId
                }
              />

              <div className="task-details-footer">
                <button
                  type="button"
                  className="task-details-done"
                  onClick={
                    handleCloseTaskDetails
                  }
                >
                  Done
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default function SymposiumScheduler(
  props:
    SymposiumSchedulerProps,
) {
  const taskKey =
    `${props.taskId}:${props.taskNumber}`;

  return (
    <SymposiumSchedulerTrial
      key={
        taskKey
      }
      {...props}
    />
  );
}
