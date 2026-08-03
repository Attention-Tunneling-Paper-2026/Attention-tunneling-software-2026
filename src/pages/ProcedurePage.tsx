import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  GripVertical,
  ListChecks,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useEventLogStore,
} from "../store/eventLogStore";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

const PARTICIPANT_VISIBLE_TASK_COUNT =
  3;

const TRIALS_PER_TASK =
  3;

const TOTAL_STUDY_TRIALS =
  PARTICIPANT_VISIBLE_TASK_COUNT *
  TRIALS_PER_TASK;

export default function ProcedurePage() {
  const navigate =
    useNavigate();

  const participantId =
    useStudySessionStore(
      (state) =>
        state.participantId,
    );

  const sessionId =
    useStudySessionStore(
      (state) =>
        state.sessionId,
    );

  const procedureAccepted =
    useStudySessionStore(
      (state) =>
        state.procedureAccepted,
    );

  const acceptProcedure =
    useStudySessionStore(
      (state) =>
        state.acceptProcedure,
    );

  const setEventParticipantId =
    useEventLogStore(
      (state) =>
        state.setParticipantId,
    );

  const setEventSessionId =
    useEventLogStore(
      (state) =>
        state.setSessionId,
    );

  const addEvent =
    useEventLogStore(
      (state) =>
        state.addEvent,
    );

  const events =
    useEventLogStore(
      (state) =>
        state.events,
    );

  const [
    instructionsAccepted,
    setInstructionsAccepted,
  ] = useState(
    procedureAccepted,
  );

  const procedureEventLogged =
    useRef(
      false,
    );

  const continueStarted =
    useRef(
      false,
    );

  useEffect(() => {
    setEventParticipantId(
      participantId,
    );

    setEventSessionId(
      sessionId,
    );
  }, [
    participantId,
    sessionId,
    setEventParticipantId,
    setEventSessionId,
  ]);

  useEffect(() => {
    setInstructionsAccepted(
      procedureAccepted,
    );
  }, [
    procedureAccepted,
  ]);

  useEffect(() => {
    if (
      procedureEventLogged.current
    ) {
      return;
    }

    const alreadyLogged =
      events.some(
        (event) =>
          event.sessionId ===
            sessionId &&
          event.eventType ===
            "procedure_viewed",
      );

    procedureEventLogged.current =
      true;

    if (
      alreadyLogged
    ) {
      return;
    }

    addEvent({
      eventType:
        "procedure_viewed",

      phase:
        "pre_ai",

      metadata: {
        page:
          "procedure",

        participantVisibleTaskCount:
          PARTICIPANT_VISIBLE_TASK_COUNT,

        trialsPerTask:
          TRIALS_PER_TASK,

        totalTrials:
          TOTAL_STUDY_TRIALS,

        procedureAccepted,
      },
    });
  }, [
    addEvent,
    events,
    procedureAccepted,
    sessionId,
  ]);

  function handleContinue() {
    if (
      !instructionsAccepted ||
      continueStarted.current
    ) {
      return;
    }

    continueStarted.current =
      true;

    const studyAlreadyStarted =
      events.some(
        (event) =>
          event.sessionId ===
            sessionId &&
          event.eventType ===
            "study_started",
      );

    acceptProcedure();

    if (
      !studyAlreadyStarted
    ) {
      addEvent({
        eventType:
          "study_started",

        phase:
          "pre_ai",

        metadata: {
          page:
            "procedure",

          participantVisibleTaskCount:
            PARTICIPANT_VISIBLE_TASK_COUNT,

          trialsPerTask:
            TRIALS_PER_TASK,

          totalTrials:
            TOTAL_STUDY_TRIALS,

          participantId,

          sessionId,
        },
      });
    }

    navigate(
      "/tasks",
    );
  }

  return (
    <main className="study-page procedure-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI-Assisted Problem-Solving Study
          </div>

          <h1>
            Study Procedure
          </h1>

          <p>
            Please review the following instructions before
            beginning the tasks.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label="Study progress"
        >
          Step 1
        </div>
      </header>

      <div className="study-page-content">
        <section
          className="study-overview-card"
          aria-labelledby="study-overview-title"
        >
          <div className="study-section-heading">
            <FileText
              size={22}
              aria-hidden="true"
            />

            <div>
              <h2 id="study-overview-title">
                Study overview
              </h2>

              <p>
                You will complete three tasks with assistance
                from an AI assistant. In each task, arrange the
                provided items while following the stated
                constraints and requirements.
              </p>
            </div>
          </div>

          <div className="study-overview-grid">
            <div className="study-overview-item">
              <div className="study-overview-icon">
                <ListChecks
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div>
                <strong>
                  Three tasks
                </strong>

                <span>
                  Complete the three assigned tasks in the
                  order presented by the study interface.
                </span>
              </div>
            </div>

            <div className="study-overview-item">
              <div className="study-overview-icon">
                <Clock3
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div>
                <strong>
                  Fifteen minutes
                </strong>

                <span>
                  Each timed task provides fifteen minutes
                  after the AI analysis is displayed to review,
                  revise, and submit your solution.
                </span>
              </div>
            </div>

            <div className="study-overview-item">
              <div className="study-overview-icon">
                <ClipboardCheck
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div>
                <strong>
                  Questionnaires
                </strong>

                <span>
                  Complete the short questionnaires shown at
                  designated points and one final questionnaire
                  after all three tasks are completed.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="study-instructions-card"
          aria-labelledby="task-procedure-title"
        >
          <div className="study-section-heading">
            <CheckCircle2
              size={22}
              aria-hidden="true"
            />

            <div>
              <h2 id="task-procedure-title">
                Procedure for each task
              </h2>

              <p>
                Follow these steps during each task.
              </p>
            </div>
          </div>

          <ol className="procedure-step-list">
            <li className="procedure-step">
              <div className="procedure-step-number">
                1
              </div>

              <div className="procedure-step-content">
                <div className="procedure-step-icon">
                  <FileText
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Review the task information
                  </strong>

                  <p>
                    Read the task description, item details,
                    available positions, constraints, and any
                    additional requirements before starting.
                  </p>
                </div>
              </div>
            </li>

            <li className="procedure-step">
              <div className="procedure-step-number">
                2
              </div>

              <div className="procedure-step-content">
                <div className="procedure-step-icon">
                  <Bot
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Request the AI analysis
                  </strong>

                  <p>
                    Select the AI assistant to receive its
                    recommendation. The task timer begins after
                    the analysis is displayed.
                  </p>
                </div>
              </div>
            </li>

            <li className="procedure-step">
              <div className="procedure-step-number">
                3
              </div>

              <div className="procedure-step-content">
                <div className="procedure-step-icon">
                  <GripVertical
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Arrange or revise the solution
                  </strong>

                  <p>
                    Drag and drop items into available cells.
                    You may move or swap placed items while
                    reviewing the requirements and the AI
                    recommendation.
                  </p>
                </div>
              </div>
            </li>

            <li className="procedure-step">
              <div className="procedure-step-number">
                4
              </div>

              <div className="procedure-step-content">
                <div className="procedure-step-icon">
                  <ClipboardCheck
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Submit your final solution
                  </strong>

                  <p>
                    Submit the arrangement that you believe
                    best satisfies the task constraints and
                    requirements, then continue as instructed.
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </section>

        <section
          className="study-notice-card"
          aria-labelledby="important-guidance-title"
        >
          <h2 id="important-guidance-title">
            Important guidance
          </h2>

          <div className="study-guidance-list">
            <div className="study-guidance-item">
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />

              <span>
                The AI output is a recommendation. Review it
                carefully and make any changes you consider
                appropriate.
              </span>
            </div>

            <div className="study-guidance-item">
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />

              <span>
                Pay attention to all task constraints and
                requirements while arranging the items.
              </span>
            </div>

            <div className="study-guidance-item">
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />

              <span>
                Work at your normal pace. There is no need to
                rush unless the task timer is close to
                expiring.
              </span>
            </div>

            <div className="study-guidance-item">
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />

              <span>
                Do not refresh or close the browser during the
                study. Refreshing the browser clears the
                current participant session and returns the
                study to this procedure page.
              </span>
            </div>
          </div>
        </section>

        <section className="procedure-confirmation-card">
          <label className="procedure-confirmation-label">
            <input
              type="checkbox"
              checked={
                instructionsAccepted
              }
              onChange={(event) => {
                setInstructionsAccepted(
                  event.target.checked,
                );
              }}
            />

            <span>
              I have read the instructions and understand the
              study procedure.
            </span>
          </label>
        </section>

        <div className="study-page-actions">
          <button
            type="button"
            className="study-primary-button"
            disabled={
              !instructionsAccepted
            }
            onClick={
              handleContinue
            }
          >
            Continue to task selection

            <ArrowRight
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </main>
  );
}
