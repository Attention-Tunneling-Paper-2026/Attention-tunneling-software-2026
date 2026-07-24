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
            AI Assisted Scheduling Study
          </div>

          <h1>
            Task not found
          </h1>

          <p>
            The requested Symposium Scheduler task could not
            be identified.
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
                Invalid task number
              </h2>

              <p>
                Return to the task selection page and choose
                the task assigned to you.
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
    trialNumber:
      trialNumberParam,
  } = useParams<{
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
    trialNumber === null
      ? undefined
      : trials.find(
          (item) =>
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
        "/tasks",
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
        `/trial-questionnaire/${trialNumber}`,
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
        "/tasks",
        {
          replace: true,
        },
      );
    }
  }, [
    navigate,
    procedureAccepted,
    trial,
    trialNumber,
  ]);

  if (
    trialNumber === null ||
    !trial
  ) {
    return (
      <InvalidTaskPage />
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
      taskNumber={
        trialNumber
      }
    />
  );
}