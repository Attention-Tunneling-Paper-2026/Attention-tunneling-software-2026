import {
  DndContext,
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
  AI_ARTIFACT_VERSION,
  AI_MESSAGE_VERSION,
  EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL,
  SCORING_VERSION,
  SEMANTIC_PROBE,
  SEMANTIC_PROBE_VERSION,
  SYMPOSIUM_TASK,
  SYMPOSIUM_TASK_VERSION,
  getInitialPlacementsForTrial,
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
} from "../types/events";

import type {
  Placement,
  Room,
  Slot,
  StudyTrialNumber,
} from "../types/scheduler";

import {
  getConditionForTrial,
} from "../types/scheduler";

import "../styles/scheduler.css";

const TRIAL_DURATION_SECONDS =
  SYMPOSIUM_TASK.durationSeconds;

const PROBE_ONSET_SECONDS =
  SEMANTIC_PROBE.shownAfterSeconds;

const PROBE_COLLAPSE_SECONDS =
  SEMANTIC_PROBE.collapseAfterSeconds;

const AI_ANALYSIS_DELAY_MS =
  1000;

type AssistantStatus =
  | "idle"
  | "thinking"
  | "ready";

interface SymposiumSchedulerProps {
  taskNumber:
    StudyTrialNumber;
}

interface EditHistoryAnalysis {
  statePreviouslyVisited:
    boolean;

  visitCountBefore:
    number;

  isImmediateReversal:
    boolean;

  isBacktracking:
    boolean;
}

function getCurrentTimeMs():
  number {
  if (
    typeof performance !==
    "undefined"
  ) {
    return performance.now();
  }

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

  historyAnalysis:
    EditHistoryAnalysis,
): EditCategory {
  if (
    historyAnalysis.isImmediateReversal
  ) {
    return "immediate_reversal";
  }

  if (
    historyAnalysis.statePreviouslyVisited
  ) {
    return "return_to_previous_state";
  }

  if (
    isDemoTalk(
      talkId,
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

export default function SymposiumScheduler({
  taskNumber,
}: SymposiumSchedulerProps) {
  const navigate =
    useNavigate();

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

  const eventTrialStartedRef =
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

  const submitInProgressRef =
    useRef(
      false,
    );

  const probeShownAtRef =
    useRef<number | null>(
      null,
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

  const placements =
    useSchedulerStore(
      (state) =>
        state.placements,
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

  const canMoveOrSwapTalk =
    useSchedulerStore(
      (state) =>
        state.canMoveOrSwapTalk,
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

  const trialOrder =
    trialProgress?.trialOrder &&
    trialProgress.trialOrder > 0
      ? trialProgress.trialOrder
      : taskNumber;

  const conditionOrder =
    trialProgress?.conditionOrder &&
    trialProgress.conditionOrder > 0
      ? trialProgress.conditionOrder
      : trialOrder;

  const isFirstTrial =
    trialProgress?.trialOrder &&
    trialProgress.trialOrder > 0
      ? trialProgress.isFirstTrial
      : trialOrder === 1;

  const probeExposureNumber =
    trialProgress?.probeExposureNumber &&
    trialProgress.probeExposureNumber > 0
      ? trialProgress.probeExposureNumber
      : trialOrder;

  const probeNaive =
    trialProgress?.trialOrder &&
    trialProgress.trialOrder > 0
      ? trialProgress.probeNaive
      : trialOrder === 1;

  const assistantReady =
    assistantStatus ===
    "ready";

  const timerExpired =
    remainingSeconds ===
    0;

  const interactionDisabled =
    !assistantReady ||
    timerExpired ||
    trialSubmitted;

  useEffect(() => {
    if (
      schedulerTrialNumber !==
      taskNumber
    ) {
      initializeTrial(
        taskNumber,
      );
    }
  }, [
    initializeTrial,
    schedulerTrialNumber,
    taskNumber,
  ]);

  useEffect(() => {
    if (
      eventTrialStartedRef.current
    ) {
      return;
    }

    eventTrialStartedRef.current =
      true;

    startEventTrial({
      trialId:
        `symposium-trial-${taskNumber}`,

      trialNumber:
        taskNumber,

      trialOrder,

      conditionOrder,

      isFirstTrial,

      probeExposureNumber,

      probeNaive,
    });
  }, [
    conditionOrder,
    isFirstTrial,
    probeExposureNumber,
    probeNaive,
    startEventTrial,
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
          markAssistantRecommendationShown(
            taskNumber,
          );

          addEvent({
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
                "symposium_scheduler",

              taskNumber,

              analysisDelayMs:
                AI_ANALYSIS_DELAY_MS,

              taskVersion:
                SYMPOSIUM_TASK_VERSION,

              aiArtifactVersion:
                AI_ARTIFACT_VERSION,

              aiMessageVersion:
                AI_MESSAGE_VERSION,
            },
          });

          addEvent({
            eventType:
              "assistant_recommendation_shown",

            trialNumber:
              taskNumber,

            condition:
              expectedCondition,

            phase:
              "pre_probe",

            metadata: {
              page:
                "symposium_scheduler",

              taskNumber,

              taskVersion:
                SYMPOSIUM_TASK_VERSION,

              aiArtifactVersion:
                AI_ARTIFACT_VERSION,

              aiMessageVersion:
                AI_MESSAGE_VERSION,
            },
          });

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
    markAssistantRecommendationShown,
    taskNumber,
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

    markTrialTimerStarted(
      taskNumber,
    );

    const currentPlacements =
      clonePlacements(
        useSchedulerStore
          .getState()
          .placements,
      );

    const expectedPlacements =
      getInitialPlacementsForTrial(
        taskNumber,
      );

    const initialSnapshot =
      createScheduleSnapshot(
        currentPlacements,
      );

    const expectedInitialHash =
      getScheduleStateHash(
        expectedPlacements,
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

      postProbeFeasibleBefore:
        initialSnapshot.postProbeFeasible,

      postProbeFeasibleAfter:
        initialSnapshot.postProbeFeasible,

      resultingViolations:
        initialSnapshot.resultingViolations,

      violationCount:
        initialSnapshot.violationCount,

      metadata: {
        taskId:
          "symposium",

        taskNumber,

        totalTrials:
          3,

        trialOrder,

        conditionOrder,

        isFirstTrial,

        probeExposureNumber,

        probeNaive,

        trialDurationSeconds:
          TRIAL_DURATION_SECONDS,

        probeOnsetSeconds:
          PROBE_ONSET_SECONDS,

        probeCollapseSeconds:
          PROBE_COLLAPSE_SECONDS,

        aiAnalysisDelayMs:
          AI_ANALYSIS_DELAY_MS,

        taskVersion:
          SYMPOSIUM_TASK_VERSION,

        aiArtifactVersion:
          AI_ARTIFACT_VERSION,

        aiMessageVersion:
          AI_MESSAGE_VERSION,

        probeVersion:
          SEMANTIC_PROBE_VERSION,

        scoringVersion:
          SCORING_VERSION,

        expectedCondition,

        loadedCondition:
          level,

        correctConditionLoaded:
          level ===
          expectedCondition,

        expectedInitialPlacementCount:
          EXPECTED_INITIAL_PLACEMENT_COUNT_BY_LEVEL[
            expectedCondition
          ],

        loadedInitialPlacementCount:
          currentPlacements.length,

        expectedInitialScheduleHash:
          expectedInitialHash,

        loadedInitialScheduleHash:
          initialSnapshot.stateHash,

        correctInitialScheduleLoaded:
          initialSnapshot.stateHash ===
          expectedInitialHash,

        initialRoomCompositionSignature:
          initialSnapshot.roomCompositionSignature,

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
    probeNaive,
    taskNumber,
    trialOrder,
  ]);

  useEffect(() => {
    if (
      !assistantReady ||
      trialSubmitted ||
      remainingSeconds === 0
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          setRemainingSeconds(
            (currentValue) =>
              Math.max(
                0,
                currentValue - 1,
              ),
          );
        },
        1000,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    assistantReady,
    remainingSeconds,
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

    timerExpiredLoggedRef.current =
      true;

    setActiveTalkId(
      null,
    );

    const snapshot =
      createScheduleSnapshot(
        clonePlacements(
          useSchedulerStore
            .getState()
            .placements,
        ),
      );

    addEvent({
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

      postProbeFeasibleBefore:
        snapshot.postProbeFeasible,

      postProbeFeasibleAfter:
        snapshot.postProbeFeasible,

      resultingViolations:
        snapshot.resultingViolations,

      violationCount:
        snapshot.violationCount,

      metadata: {
        taskId:
          "symposium",

        taskNumber,

        remainingSeconds:
          0,

        probeShown:
          probeShownAtRef.current !==
          null,

        probeAcknowledged,

        probeIntegrated,

        roomCompositionSignature:
          snapshot.roomCompositionSignature,

        distanceToBestPostProbeSolution:
          snapshot.distanceToBestPostProbeSolution,

        scorePercentage:
          snapshot.score.scorePercentage,
      },
    });
  }, [
    addEvent,
    assistantReady,
    expectedCondition,
    probeAcknowledged,
    probeIntegrated,
    remainingSeconds,
    setActiveTalkId,
    taskNumber,
  ]);

  useEffect(() => {
    if (
      !assistantReady
    ) {
      return;
    }

    const elapsedSeconds =
      TRIAL_DURATION_SECONDS -
      remainingSeconds;

    if (
      elapsedSeconds >=
        PROBE_ONSET_SECONDS &&
      !probeVisible &&
      !probeAcknowledged &&
      !trialSubmitted
    ) {
      const shownAt =
        getCurrentTimeMs();

      probeShownAtRef.current =
        shownAt;

      markProbeShown(
        taskNumber,
      );

      setProbeVisible(
        true,
      );

      const snapshot =
        createScheduleSnapshot(
          clonePlacements(
            useSchedulerStore
              .getState()
              .placements,
          ),
        );

      addEvent({
        eventType:
          "probe_shown",

        trialNumber:
          taskNumber,

        condition:
          expectedCondition,

        phase:
          "post_probe",

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

        postProbeFeasibleBefore:
          snapshot.postProbeFeasible,

        postProbeFeasibleAfter:
          snapshot.postProbeFeasible,

        resultingViolations:
          snapshot.resultingViolations,

        violationCount:
          snapshot.violationCount,

        metadata: {
          taskId:
            "symposium",

          taskNumber,

          remainingSeconds,

          elapsedSeconds,

          probeId:
            SEMANTIC_PROBE.id,

          probeVersion:
            SEMANTIC_PROBE_VERSION,

          affectedRoom:
            SEMANTIC_PROBE.affectedRoom,

          requiredProjectorRoom:
            SEMANTIC_PROBE.requiredProjectorRoom,

          requiredTalkIds:
            SEMANTIC_PROBE.requiredTalkIds,

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
    }
  }, [
    addEvent,
    assistantReady,
    expectedCondition,
    markProbeShown,
    probeAcknowledged,
    probeVisible,
    remainingSeconds,
    taskNumber,
    trialSubmitted,
  ]);

  useEffect(() => {
    if (
      !probeVisible ||
      probeAcknowledged ||
      probeCollapsed ||
      trialSubmitted
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          setProbeCollapsed(
            true,
          );
        },
        PROBE_COLLAPSE_SECONDS *
          1000,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    probeAcknowledged,
    probeCollapsed,
    probeVisible,
    trialSubmitted,
  ]);

  function handleAnalyzeTask() {
    if (
      assistantStatus !==
      "idle"
    ) {
      return;
    }

    markAssistantAnalysisRequested(
      taskNumber,
    );

    addEvent({
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
          "symposium_scheduler",

        taskNumber,

        taskVersion:
          SYMPOSIUM_TASK_VERSION,

        aiArtifactVersion:
          AI_ARTIFACT_VERSION,

        aiMessageVersion:
          AI_MESSAGE_VERSION,
      },
    });

    markAssistantAnalysisStarted(
      taskNumber,
    );

    addEvent({
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
          "symposium_scheduler",

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
      eventType:
        "task_details_opened",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      metadata: {
        page:
          "symposium_scheduler",

        taskNumber,
      },
    });
  }

  function handleCloseTaskDetails() {
    setTaskDetailsOpen(
      false,
    );

    addEvent({
      eventType:
        "task_details_closed",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      metadata: {
        page:
          "symposium_scheduler",

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

    markProbeAcknowledged(
      taskNumber,
    );

    addEvent({
      eventType:
        "probe_acknowledged",

      trialNumber:
        taskNumber,

      condition:
        expectedCondition,

      phase:
        "post_probe",

      probeLatencyMs:
        latencyMs,

      probeVisible:
        true,

      probeAcknowledged:
        true,

      metadata: {
        taskId:
          "symposium",

        taskNumber,

        probeId:
          SEMANTIC_PROBE.id,

        acknowledgementLatencyMs:
          latencyMs,
      },
    });

    setProbeAcknowledged(
      true,
    );

    setProbeCollapsed(
      false,
    );
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

    addEvent({
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

      probeVisible:
        true,

      probeAcknowledged:
        false,

      metadata: {
        taskId:
          "symposium",

        taskNumber,

        probeId:
          SEMANTIC_PROBE.id,

        notificationOpenLatencyMs:
          latencyMs,
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
      );

    addEvent({
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
          "symposium",

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
      );

    addEvent({
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
          "symposium",

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
      );

    const sourcePlacement =
      previousPlacements.find(
        (placement) =>
          placement.talkId ===
          talkId,
      );

    const targetType =
      over?.data.current
        ?.type;

    const targetRoom =
      over?.data.current
        ?.room as
        | Room
        | undefined;

    const targetSlot =
      over?.data.current
        ?.slot as
        | Slot
        | undefined;

    if (
      targetType !==
        "schedule-cell" ||
      !targetRoom ||
      !targetSlot
    ) {
      addEvent({
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
            "symposium",

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
            "symposium",

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

    const legal =
      canMoveOrSwapTalk(
        talkId,
        targetRoom,
        targetSlot,
      );

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
            "symposium",

          taskNumber,

          targetOccupied:
            Boolean(
              targetPlacement,
            ),

          reason:
            "Structurally illegal placement",
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

    const probeActive =
      probeShownAtRef.current !==
      null;

    const metrics =
      calculateSchedulerMetrics(
        previousPlacements,
        nextPlacements,
        probeActive,
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

    const historyAnalysis:
      EditHistoryAnalysis = {
        statePreviouslyVisited,

        visitCountBefore,

        isImmediateReversal,

        isBacktracking,
      };

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

    const editCategory =
      getEditCategory(
        sourcePlacement,
        targetPlacement,
        targetRoom,
        talkId,
        historyAnalysis,
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

      success:
        true,

      dragDurationMs,

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
        metrics.integrationConsistentEdit,

      postProbeFeasibleBefore:
        metrics.postProbeFeasibleBefore,

      postProbeFeasibleAfter:
        metrics.postProbeFeasibleAfter,

      resultingViolations:
        metrics.resultingViolations,

      violationCount:
        metrics.violationCount,

      structuralSignature:
        metrics.structuralSignature,

      moatCrossed:
        metrics.moatCrossed,

      metadata: {
        taskId:
          "symposium",

        taskNumber,

        targetOccupied:
          Boolean(
            targetPlacement,
          ),

        changedTalkIds:
          metrics.changedTalkIds,

        previousRoomCompositionSignature:
          metrics.previousRoomCompositionSignature,

        roomCompositionSignature:
          metrics.roomCompositionSignature,

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

        latencyFromProbeMs,

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
          metrics.postProbeFeasible,
      },
    });

    setActiveTalkId(
      null,
    );
  }

  function handleSubmit() {
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
      );

    const probeWasShown =
      probeShownAtRef.current !==
      null;

    setActiveTalkId(
      null,
    );

    const commonMetadata = {
      taskId:
        "symposium",

      taskNumber,

      trialOrder,

      conditionOrder,

      isFirstTrial,

      probeExposureNumber,

      probeNaive,

      placements:
        finalPlacements,

      remainingSeconds,

      timerExpired,

      probeShown:
        probeWasShown,

      probeVisible,

      probeAcknowledged,

      probeIntegrated,

      detectionMiss:
        probeWasShown &&
        !probeAcknowledged,

      integrationMiss:
        probeWasShown &&
        !probeIntegrated,

      detectionWithoutIntegration:
        probeAcknowledged &&
        !probeIntegrated,

      postProbeEditCount:
        postProbeEditCountRef.current,

      strategySwitchOccurred:
        strategySwitchDetectedRef.current,

      stateCount:
        stateHistoryRef.current.length,

      uniqueStateCount:
        stateVisitCountsRef.current.size,

      taskVersion:
        SYMPOSIUM_TASK_VERSION,

      aiArtifactVersion:
        AI_ARTIFACT_VERSION,

      aiMessageVersion:
        AI_MESSAGE_VERSION,

      probeVersion:
        SEMANTIC_PROBE_VERSION,

      scoringVersion:
        SCORING_VERSION,

      roomCompositionSignature:
        snapshot.roomCompositionSignature,

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
        snapshot.postProbeFeasible,

      finalScore:
        snapshot.score.totalScore,

      finalScorePercentage:
        snapshot.score.scorePercentage,

      finalSpeakerConflictPairs:
        snapshot.speakerConflictPairCount,
    };

    addEvent({
      eventType:
        "submit_attempt",

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

      probeAcknowledged,

      probeIntegrationDetected:
        probeIntegrated,

      postProbeFeasibleBefore:
        snapshot.postProbeFeasible,

      postProbeFeasibleAfter:
        snapshot.postProbeFeasible,

      resultingViolations:
        snapshot.resultingViolations,

      violationCount:
        snapshot.violationCount,

      structuralSignature:
        snapshot.structuralSignature,

      metadata:
        commonMetadata,
    });

    const submitted =
      markTrialSubmitted(
        taskNumber,
      );

    if (
      !submitted
    ) {
      submitInProgressRef.current =
        false;

      return;
    }

    initializeTrialResponse(
      taskNumber,
      "symposium",
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
      eventType:
        "trial_submitted",

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

      probeAcknowledged,

      probeIntegrationDetected:
        probeIntegrated,

      postProbeFeasibleBefore:
        snapshot.postProbeFeasible,

      postProbeFeasibleAfter:
        snapshot.postProbeFeasible,

      resultingViolations:
        snapshot.resultingViolations,

      violationCount:
        snapshot.violationCount,

      structuralSignature:
        snapshot.structuralSignature,

      metadata:
        commonMetadata,
    });

    setTrialSubmitted(
      true,
    );

    window.setTimeout(
      () => {
        navigate(
          `/trial-questionnaire/${taskNumber}`,
          {
            replace:
              true,

            state: {
              trialNumber:
                taskNumber,

              trialOrder,

              totalTrials:
                3,

              taskId:
                "symposium",

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

  return (
    <DndContext
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
      <div className="scheduler-page">
        <header className="scheduler-header">
          <div>
            <div className="scheduler-title">
              Symposium Scheduler
            </div>

            <div className="scheduler-task">
              Task {taskNumber} of 3
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
              onClick={
                handleSubmit
              }
              disabled={
                !assistantReady ||
                trialSubmitted
              }
            >
              {timerExpired
                ? "Finish Trial"
                : "Submit Schedule"}
            </button>
          </div>
        </header>

        <ProbeBanner
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

        {timerExpired && (
          <div className="trial-timeout-message">
            Time is over. Submit your current schedule to
            finish the trial.
          </div>
        )}

        <div className="scheduler-layout">
          {assistantReady ? (
            <AIAssistantPanel />
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
                    Click to receive a scheduling
                    recommendation.
                  </span>

                  <div className="ai-launch-action">
                    <Sparkles
                      size={16}
                      aria-hidden="true"
                    />

                    Analyze task
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
                <CurrentConflictsPanel />

                <SchedulerGrid />

                <UnassignedTray />
              </>
            ) : (
              <div className="scheduler-waiting-panel">
                <Bot
                  size={38}
                  aria-hidden="true"
                />

                <strong>
                  Schedule not started
                </strong>

                <span>
                  Ask the AI assistant to analyze the task
                  before editing the schedule.
                </span>
              </div>
            )}
          </main>

          <ConstraintsPanel />
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
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="task-details-header">
                <div>
                  <h2 id="task-details-title">
                    Symposium Task Summary
                  </h2>

                  <p>
                    Schedule all twelve talks into the
                    available rooms and time slots.
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

              <TaskSummaryTable />

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