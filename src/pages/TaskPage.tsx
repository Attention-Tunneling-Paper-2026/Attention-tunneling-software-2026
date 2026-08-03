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
  isStudyTrialNumber,
} from "../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

function isStudyTaskId(
  value: unknown,
): value is StudyTaskId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

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
      !taskId ||
      !trialNumber ||
      !trial
    ) {
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
    procedureAccepted,
    taskId,
    trial,
    trialNumber,
  ]);

  if (
    taskId === null ||
    trialNumber === null ||
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
    !procedureAccepted ||
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
