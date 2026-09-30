import {
  ArrowLeft,
  ClipboardList,
} from "lucide-react";

import {
  useEffect,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router";

import SymposiumScheduler from "./SymposiumScheduler";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

import {
  TOTAL_STUDY_TRIALS,
  isStudyTaskId,
  isStudyTrialNumber,
} from "../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

function InvalidTaskPage() {
  const navigate =
    useNavigate();

  return (
    <main className="study-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI Assisted Constraint-Solving Study
          </div>

          <h1>
            Task not found
          </h1>

          <p>
            The requested task could not be identified.
          </p>
        </div>
      </header>

      <div className="study-page-content">
        <section
          className="study-notice-card"
          role="alert"
        >
          <div className="study-section-heading">
            <ClipboardList
              size={22}
              aria-hidden="true"
            />

            <div>
              <h2>
                Invalid task
              </h2>

              <p>
                Return to the assigned-task page to continue
                with the task in your study sequence.
              </p>
            </div>
          </div>
        </section>

        <div className="study-page-actions">
          <button
            type="button"
            className="study-primary-button"
            onClick={() =>
              navigate(
                "/tasks",
              )
            }
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
            />

            Return to assigned task
          </button>
        </div>
      </div>
    </main>
  );
}

export default function TaskPage() {
  const navigate =
    useNavigate();

  const {
    taskId:
      taskIdParam,
    trialNumber:
      trialNumberParam,
  } = useParams<{
    taskId: string;
    trialNumber: string;
  }>();

  const procedureAccepted =
    useStudySessionStore(
      (state) =>
        state.procedureAccepted,
    );

  const assignmentStatus =
    useStudySessionStore(
      (state) =>
        state.assignmentStatus,
    );

  const assignments =
    useStudySessionStore(
      (state) =>
        state.assignments,
    );

  const postExperimentCompleted =
    useStudySessionStore(
      (state) =>
        state.postExperimentCompleted,
    );

  const studyCompleted =
    useStudySessionStore(
      (state) =>
        state.studyCompleted,
    );

  const trials =
    useStudySessionStore(
      (state) =>
        state.trials,
    );

  const startNextTrial =
    useStudySessionStore(
      (state) =>
        state.startNextTrial,
    );

  const taskId:
    StudyTaskId | null =
      isStudyTaskId(
        taskIdParam,
      )
        ? taskIdParam
        : null;

  const parsedTrialNumber =
    Number(
      trialNumberParam,
    );

  const trialNumber:
    StudyTrialNumber | null =
      isStudyTrialNumber(
        parsedTrialNumber,
      )
        ? parsedTrialNumber
        : null;

  const trial =
    taskId ===
        null ||
      trialNumber ===
        null
      ? undefined
      : trials.find(
          (item) =>
            item.taskId ===
              taskId &&
            item.trialNumber ===
              trialNumber,
        );

  const assignmentReady =
    assignmentStatus ===
      "valid" &&
    assignments.length ===
      TOTAL_STUDY_TRIALS &&
    trials.length ===
      TOTAL_STUDY_TRIALS;

  const orderedAssignments =
    assignments
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
      );

  const openTrial =
    trials.find(
      (item) =>
        item.status ===
          "active" ||
        item.status ===
          "submitted",
    );

  const openAssignment =
    openTrial
      ? orderedAssignments.find(
          (assignment) =>
            assignment.taskId ===
              openTrial.taskId &&
            assignment.trialNumber ===
              openTrial.trialNumber,
        )
      : undefined;

  const nextAssignment =
    orderedAssignments.find(
      (assignment) => {
        const assignedTrial =
          trials.find(
            (item) =>
              item.taskId ===
                assignment.taskId &&
              item.trialNumber ===
                assignment.trialNumber,
          );

        return assignedTrial?.status ===
          "pending";
      },
    );

  // ADVISER FIX: Direct URLs may access only the open or next token-assigned trial.
  const currentAssignment =
    openAssignment ??
    nextAssignment;

  const currentTrial =
    currentAssignment
      ? trials.find(
          (item) =>
            item.taskId ===
              currentAssignment.taskId &&
            item.trialNumber ===
              currentAssignment.trialNumber,
        )
      : undefined;

  const allTrialsComplete =
    assignmentReady &&
    orderedAssignments.every(
      (assignment) =>
        trials.some(
          (item) =>
            item.taskId ===
              assignment.taskId &&
            item.trialNumber ===
              assignment.trialNumber &&
            item.status ===
              "questionnaire_complete",
        ),
    );

  const routeMatchesCurrentAssignment =
    Boolean(
      currentAssignment &&
      taskId !==
        null &&
      trialNumber !==
        null &&
      currentAssignment.taskId ===
        taskId &&
      currentAssignment.trialNumber ===
        trialNumber,
    );

  const correctAssignedPath =
    !currentAssignment ||
    !currentTrial
      ? "/tasks"
      : currentTrial.status ===
          "submitted"
        ? `/trial-questionnaire/${currentAssignment.taskId}/${currentAssignment.trialNumber}`
        : `/task/${currentAssignment.taskId}/${currentAssignment.trialNumber}`;

  useEffect(() => {
    if (
      !procedureAccepted ||
      !assignmentReady
    ) {
      navigate(
        "/procedure",
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      studyCompleted ||
      postExperimentCompleted
    ) {
      navigate(
        "/disclosure",
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      allTrialsComplete
    ) {
      navigate(
        "/post-experiment",
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      !currentAssignment ||
      !currentTrial
    ) {
      navigate(
        "/tasks",
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      !routeMatchesCurrentAssignment
    ) {
      navigate(
        correctAssignedPath,
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      currentTrial.status ===
      "pending"
    ) {
      const startedAssignment =
        startNextTrial();

      if (
        !startedAssignment
      ) {
        navigate(
          "/tasks",
          {
            replace:
              true,
          },
        );

        return;
      }

      if (
        startedAssignment.taskId !==
          currentAssignment.taskId ||
        startedAssignment.trialNumber !==
          currentAssignment.trialNumber
      ) {
        navigate(
          `/task/${startedAssignment.taskId}/${startedAssignment.trialNumber}`,
          {
            replace:
              true,
          },
        );
      }

      return;
    }

    if (
      currentTrial.status ===
      "submitted"
    ) {
      navigate(
        `/trial-questionnaire/${currentAssignment.taskId}/${currentAssignment.trialNumber}`,
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      currentTrial.status ===
      "questionnaire_complete"
    ) {
      navigate(
        "/tasks",
        {
          replace:
            true,
        },
      );
    }
  }, [
    allTrialsComplete,
    assignmentReady,
    correctAssignedPath,
    currentAssignment,
    currentTrial,
    navigate,
    postExperimentCompleted,
    procedureAccepted,
    routeMatchesCurrentAssignment,
    startNextTrial,
    studyCompleted,
  ]);

  if (
    !procedureAccepted ||
    !assignmentReady ||
    postExperimentCompleted ||
    studyCompleted ||
    allTrialsComplete
  ) {
    return null;
  }

  if (
    taskId ===
      null ||
    trialNumber ===
      null ||
    !trial
  ) {
    return (
      <InvalidTaskPage />
    );
  }

  if (
    !currentAssignment ||
    !currentTrial ||
    !routeMatchesCurrentAssignment ||
    trial.status !==
      "active"
  ) {
    return null;
  }

  return (
    <SymposiumScheduler
      taskId={
        taskId
      }
      taskNumber={
        trialNumber
      }
    />
  );
}
