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
  isStudyTaskId,
  isStudyTrialNumber,
} from "../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

interface InvalidTaskPageProps {
  taskId:
    StudyTaskId | null;
}

function InvalidTaskPage({
  taskId,
}: InvalidTaskPageProps) {
  const navigate =
    useNavigate();

  const returnPath =
    taskId
      ? `/tasks/${taskId}`
      : "/tasks";

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
                Return to the task selection page and choose
                an available task.
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
                returnPath,
              )
            }
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
            />

            Return to task selection
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
    taskId === null ||
    trialNumber === null
      ? undefined
      : trials.find(
          (item) =>
            item.taskId ===
              taskId &&
            item.trialNumber ===
              trialNumber,
        );

  const openTrial =
    trials.find(
      (item) =>
        item.status ===
          "active" ||
        item.status ===
          "submitted",
    );

  const routeMatchesOpenTrial =
    Boolean(
      openTrial &&
      taskId !==
        null &&
      trialNumber !==
        null &&
      openTrial.taskId ===
        taskId &&
      openTrial.trialNumber ===
        trialNumber,
    );

  useEffect(() => {
    if (
      !procedureAccepted
    ) {
      navigate(
        "/procedure",
        {
          replace: true,
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
          replace: true,
        },
      );

      return;
    }

    if (
      taskId ===
        null ||
      trialNumber ===
        null ||
      !trial
    ) {
      return;
    }

    if (
      openTrial &&
      !routeMatchesOpenTrial
    ) {
      navigate(
        openTrial.status ===
          "submitted"
          ? `/trial-questionnaire/${openTrial.taskId}/${openTrial.trialNumber}`
          : `/task/${openTrial.taskId}/${openTrial.trialNumber}`,
        {
          replace: true,
        },
      );

      return;
    }

    if (
      trial.status ===
      "pending"
    ) {
      navigate(
        `/tasks/${taskId}`,
        {
          replace: true,
        },
      );

      return;
    }

    if (
      trial.status ===
      "submitted"
    ) {
      navigate(
        `/trial-questionnaire/${taskId}/${trialNumber}`,
        {
          replace: true,
        },
      );

      return;
    }

    if (
      trial.status ===
      "questionnaire_complete"
    ) {
      navigate(
        `/tasks/${taskId}`,
        {
          replace: true,
        },
      );
    }
  }, [
    navigate,
    openTrial,
    postExperimentCompleted,
    procedureAccepted,
    routeMatchesOpenTrial,
    studyCompleted,
    taskId,
    trial,
    trialNumber,
  ]);

  if (
    !procedureAccepted ||
    postExperimentCompleted ||
    studyCompleted
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
      <InvalidTaskPage
        taskId={
          taskId
        }
      />
    );
  }

  if (
    (
      openTrial &&
      !routeMatchesOpenTrial
    ) ||
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
