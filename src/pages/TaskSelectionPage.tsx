import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LockKeyhole,
} from "lucide-react";

import {
  useEffect,
  useMemo,
} from "react";

import {
  useNavigate,
} from "react-router";

import "../styles/studyPages.css";

import {
  useEventLogStore,
} from "../store/eventLogStore";

import {
  useSchedulerStore,
} from "../store/schedulerStore";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

import {
  isConditionOrder,
} from "../types/scheduler";

import type {
  StudyTrialOrder,
} from "../types/scheduler";

import type {
  StudyTrialProgress,
} from "../types/study";

const TOTAL_TRIALS =
  3;

function isStudyTrialOrder(
  value: unknown,
): value is StudyTrialOrder {
  return (
    value === 1 ||
    value === 2 ||
    value === 3
  );
}

function getParticipantTaskNumber(
  trial: StudyTrialProgress,
): StudyTrialOrder {
  return isStudyTrialOrder(
    trial.trialOrder,
  )
    ? trial.trialOrder
    : trial.trialNumber;
}

function getTrialButtonLabel(
  trial:
    StudyTrialProgress,
): string {
  const participantTaskNumber =
    getParticipantTaskNumber(
      trial,
    );

  switch (
    trial.status
  ) {
    case "pending":
      return `Begin Task ${participantTaskNumber}`;

    case "active":
      return `Continue Task ${participantTaskNumber}`;

    case "submitted":
      return `Continue Task ${participantTaskNumber} questionnaire`;

    case "questionnaire_complete":
      return `Task ${participantTaskNumber} completed`;
  }
}

export default function TaskSelectionPage() {
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

  const conditionOrder =
    useStudySessionStore(
      (state) =>
        state.conditionOrder,
    );

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

  const trials =
    useStudySessionStore(
      (state) =>
        state.trials,
    );

  const startStudyTrial =
    useStudySessionStore(
      (state) =>
        state.startTrial,
    );

  const openTrialQuestionnaire =
    useStudySessionStore(
      (state) =>
        state.openTrialQuestionnaire,
    );

  const openPostExperiment =
    useStudySessionStore(
      (state) =>
        state.openPostExperiment,
    );

  const initializeTrial =
    useSchedulerStore(
      (state) =>
        state.initializeTrial,
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

  const setEventConditionOrder =
    useEventLogStore(
      (state) =>
        state.setConditionOrder,
    );

  const addEvent =
    useEventLogStore(
      (state) =>
        state.addEvent,
    );

  const orderedTrials =
    useMemo(
      () =>
        [...trials].sort(
          (
            firstTrial,
            secondTrial,
          ) =>
            getParticipantTaskNumber(
              firstTrial,
            ) -
            getParticipantTaskNumber(
              secondTrial,
            ),
        ),
      [
        trials,
      ],
    );

  const completedTrialCount =
    orderedTrials.filter(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    ).length;

  const allTrialsComplete =
    orderedTrials.length ===
      TOTAL_TRIALS &&
    completedTrialCount ===
      TOTAL_TRIALS;

  const openTrial =
    orderedTrials.find(
      (trial) =>
        trial.status ===
          "active" ||
        trial.status ===
          "submitted",
    );

  useEffect(() => {
    if (
      !procedureAccepted
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

    setEventParticipantId(
      participantId,
    );

    setEventSessionId(
      sessionId,
    );

    setEventConditionOrder(
      conditionOrder,
    );
  }, [
    conditionOrder,
    navigate,
    participantId,
    postExperimentCompleted,
    procedureAccepted,
    sessionId,
    setEventConditionOrder,
    setEventParticipantId,
    setEventSessionId,
  ]);

  function handleOpenTrial(
    trial:
      StudyTrialProgress,
  ) {
    if (
      trial.status ===
      "questionnaire_complete"
    ) {
      return;
    }

    if (
      openTrial &&
      openTrial.trialNumber !==
        trial.trialNumber
    ) {
      return;
    }

    if (
      trial.status ===
      "submitted"
    ) {
      const questionnaireOpened =
        openTrialQuestionnaire(
          trial.trialNumber,
        );

      if (
        !questionnaireOpened
      ) {
        return;
      }

      navigate(
        `/trial-questionnaire/${trial.trialNumber}`,
      );

      return;
    }

    const wasPending =
      trial.status ===
      "pending";

    const assignment =
      startStudyTrial(
        trial.trialNumber,
      );

    if (
      !assignment
    ) {
      return;
    }

    if (
      wasPending
    ) {
      const assignmentTrialOrder =
        isStudyTrialOrder(
          assignment.trialOrder,
        )
          ? assignment.trialOrder
          : getParticipantTaskNumber(
              trial,
            );

      const assignmentConditionOrder =
        isConditionOrder(
          assignment.conditionOrder,
        )
          ? assignment.conditionOrder
          : conditionOrder;

      initializeTrial(
        assignment.trialNumber,
        assignmentConditionOrder,
        assignmentTrialOrder,
      );

      addEvent({
        eventType:
          "task_selected",

        trialNumber:
          assignment.trialNumber,

        trialOrder:
          assignment.trialOrder,

        condition:
          assignment.condition,

        conditionOrder:
          assignment.conditionOrder,

        isFirstTrial:
          assignment.isFirstTrial,

        probeExposureNumber:
          assignment.probeExposureNumber,

        probeNaive:
          assignment.probeNaive,

        phase:
          "pre_ai",

        metadata: {
          page:
            "task_selection",

          taskId:
            "symposium",

          taskTitle:
            "Symposium Scheduler",

          participantLabel:
            assignment.participantLabel,

          participantTaskNumber:
            assignmentTrialOrder,

          totalTrials:
            TOTAL_TRIALS,

          assignmentMethod:
            "researcher_assigned",
        },
      });
    }

    navigate(
      `/task/${assignment.trialNumber}`,
      {
        state: {
          trialNumber:
            assignment.trialNumber,

          trialOrder:
            assignment.trialOrder,

          totalTrials:
            TOTAL_TRIALS,

          taskId:
            "symposium",

          condition:
            assignment.condition,

          conditionOrder:
            assignment.conditionOrder,

          isFirstTrial:
            assignment.isFirstTrial,

          probeExposureNumber:
            assignment.probeExposureNumber,

          probeNaive:
            assignment.probeNaive,
        },
      },
    );
  }

  function handlePostExperiment() {
    if (
      !allTrialsComplete
    ) {
      return;
    }

    const opened =
      openPostExperiment();

    if (
      !opened
    ) {
      return;
    }

    navigate(
      "/post-experiment",
    );
  }

  if (
    !procedureAccepted ||
    postExperimentCompleted
  ) {
    return null;
  }

  return (
    <main className="study-page task-selection-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI Assisted Scheduling Study
          </div>

          <h1>
            Task Selection
          </h1>

          <p>
            Select the task assigned to you by the researcher.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label="Study progress"
        >
          {completedTrialCount} of{" "}
          {TOTAL_TRIALS} completed
        </div>
      </header>

      <div className="study-page-content">
        <section
          className="task-assignment-notice"
          aria-labelledby="task-selection-guidance"
        >
          <div className="task-assignment-notice-icon">
            <LockKeyhole
              size={22}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2 id="task-selection-guidance">
              Researcher assigned tasks
            </h2>

            <p>
              All three tasks use the Symposium Scheduler.
              Select only the task number assigned to you by
              the researcher.
            </p>
          </div>
        </section>

        <section
          className="task-selection-overview-card"
          aria-labelledby="symposium-task-title"
        >
          <div className="task-selection-overview-header">
            <div className="task-assignment-icon">
              <CalendarDays
                size={30}
                aria-hidden="true"
              />
            </div>

            <div>
              <div className="task-assignment-label">
                Scheduling task
              </div>

              <h2 id="symposium-task-title">
                Symposium Scheduler
              </h2>
            </div>
          </div>

          <p className="task-assignment-description">
            Arrange twelve symposium talks across three rooms
            and four time slots while satisfying the scheduling
            requirements.
          </p>

          <div className="task-assignment-details">
            <div className="task-assignment-detail">
              <ClipboardList
                size={20}
                aria-hidden="true"
              />

              <div>
                <strong>
                  12 talks
                </strong>

                <span>
                  Schedule every talk exactly once
                </span>
              </div>
            </div>

            <div className="task-assignment-detail">
              <CalendarDays
                size={20}
                aria-hidden="true"
              />

              <div>
                <strong>
                  3 rooms
                </strong>

                <span>
                  Four available time slots
                </span>
              </div>
            </div>

            <div className="task-assignment-detail">
              <Clock3
                size={20}
                aria-hidden="true"
              />

              <div>
                <strong>
                  15 minutes
                </strong>

                <span>
                  Timer begins after AI analysis
                </span>
              </div>
            </div>
          </div>

          <div className="task-selection-actions">
            <div
              className="task-selection-button-grid"
              aria-label="Task selection buttons"
            >
              {orderedTrials.map(
                (trial) => {
                  const completed =
                    trial.status ===
                    "questionnaire_complete";

                  const current =
                    trial.status ===
                      "active" ||
                    trial.status ===
                      "submitted";

                  const blockedByAnotherTrial =
                    Boolean(
                      openTrial &&
                      openTrial.trialNumber !==
                        trial.trialNumber,
                    );

                  const disabled =
                    completed ||
                    blockedByAnotherTrial ||
                    allTrialsComplete;

                  return (
                    <button
                      key={
                        trial.trialNumber
                      }
                      type="button"
                      className={[
                        completed
                          ? "study-completed-button"
                          : "study-primary-button",

                        "task-selection-main-button",

                        current
                          ? "task-selection-main-button-current"
                          : "",
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " ",
                        )}
                      disabled={
                        disabled
                      }
                      onClick={() => {
                        handleOpenTrial(
                          trial,
                        );
                      }}
                    >
                      {completed && (
                        <CheckCircle2
                          size={18}
                          aria-hidden="true"
                        />
                      )}

                      <span>
                        {getTrialButtonLabel(
                          trial,
                        )}
                      </span>

                      {!completed && (
                        <ArrowRight
                          size={18}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                },
              )}
            </div>

            {openTrial && (
              <p className="task-selection-blocked-message">
                Complete the current task and its questionnaire
                before opening another task.
              </p>
            )}
          </div>
        </section>

        <section className="task-progress-card">
          <div className="task-progress-header">
            <h2>
              Study progress
            </h2>

            <span>
              {completedTrialCount} of{" "}
              {TOTAL_TRIALS} tasks completed
            </span>
          </div>

          <div
            className="task-progress-steps"
            aria-label="Task completion progress"
          >
            {orderedTrials.map(
              (trial) => {
                const completed =
                  trial.status ===
                  "questionnaire_complete";

                const current =
                  trial.status ===
                    "active" ||
                  trial.status ===
                    "submitted";

                return (
                  <div
                    key={
                      trial.trialNumber
                    }
                    className={[
                      "task-progress-step",

                      completed
                        ? "task-progress-step-complete"
                        : "",

                      current
                        ? "task-progress-step-current"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        " ",
                      )}
                  >
                    <div className="task-progress-step-marker">
                      {completed ? (
                        <CheckCircle2
                          size={19}
                          aria-hidden="true"
                        />
                      ) : (
                        getParticipantTaskNumber(
                          trial,
                        )
                      )}
                    </div>

                    <span>
                      Task{" "}
                      {
                        getParticipantTaskNumber(
                          trial,
                        )
                      }
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </section>

        {allTrialsComplete && (
          <section className="post-task-action-card">
            <CheckCircle2
              size={30}
              aria-hidden="true"
            />

            <div>
              <h2>
                All scheduling tasks completed
              </h2>

              <p>
                Continue to the post task questionnaire to
                complete the final study questions.
              </p>
            </div>

            <button
              type="button"
              className="study-primary-button"
              onClick={
                handlePostExperiment
              }
            >
              Proceed to post task questionnaire

              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            </button>
          </section>
        )}
      </div>
    </main>
  );
}