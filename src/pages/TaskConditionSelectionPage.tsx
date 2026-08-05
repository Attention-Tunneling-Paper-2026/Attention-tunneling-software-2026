import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

import {
  useEffect,
  useMemo,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router";

import "../styles/studyPages.css";

import {
  useEventLogStore,
} from "../store/eventLogStore";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

import {
  STUDY_TASK_IDS,
  STUDY_TRIAL_NUMBERS,
  TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,
  TOTAL_STUDY_TRIALS,
  isStudyTaskId,
} from "../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../types/scheduler";

import type {
  StudyTrialProgress,
} from "../types/study";

interface TaskDomainDefinition {
  taskId:
    StudyTaskId;

  problemNumber:
    number;

  categoryLabel:
    string;

  title:
    string;

  brief:
    string;
}

interface TaskOption {
  trialNumber:
    StudyTrialNumber;

  trial:
    StudyTrialProgress | undefined;
}

const TOTAL_PROBLEMS =
  STUDY_TASK_IDS.length;

const TASK_OPTIONS_PER_PROBLEM =
  STUDY_TRIAL_NUMBERS.length;

const REQUIRED_TASKS_PER_PROBLEM =
  1;

const TOTAL_REQUIRED_STUDY_TASKS =
  TOTAL_STUDY_TRIALS;

const TASK_DOMAINS: Record<
  StudyTaskId,
  TaskDomainDefinition
> = {
  symposium: {
    taskId:
      "symposium",

    problemNumber:
      1,

    categoryLabel:
      "Scheduling",

    title:
      "Symposium Scheduler",

    brief:
      "Arrange twelve symposium talks across three rooms and four time slots while satisfying the scheduling constraints.",
  },

  delivery: {
    taskId:
      "delivery",

    problemNumber:
      2,

    categoryLabel:
      "Logistics",

    title:
      "Delivery Dispatch",

    brief:
      "Arrange twelve shipments across three vans and four route windows while satisfying the delivery constraints.",
  },

  clinic: {
    taskId:
      "clinic",

    problemNumber:
      3,

    categoryLabel:
      "Workforce allocation",

    title:
      "Clinic Roster",

    brief:
      "Arrange twelve clinical duties across three wards and four shifts while satisfying the roster constraints.",
  },
};

function trialIsOpen(
  trial:
    StudyTrialProgress,
): boolean {
  return (
    trial.status ===
      "active" ||
    trial.status ===
      "submitted"
  );
}

function trialIsComplete(
  trial:
    StudyTrialProgress | undefined,
): boolean {
  return trial?.status ===
    "questionnaire_complete";
}

function getOpenTrialPath(
  trial:
    StudyTrialProgress,
): string {
  if (
    trial.status ===
    "submitted"
  ) {
    return `/trial-questionnaire/${trial.taskId}/${trial.trialNumber}`;
  }

  return `/task/${trial.taskId}/${trial.trialNumber}`;
}

function getTaskButtonLabel(
  trialNumber:
    StudyTrialNumber,

  trial:
    StudyTrialProgress | undefined,

  locked:
    boolean,
): string {
  if (
    !trial
  ) {
    return `Task ${trialNumber} unavailable`;
  }

  if (
    trial.status ===
    "questionnaire_complete"
  ) {
    return `Task ${trialNumber} completed`;
  }

  if (
    locked
  ) {
    return `Task ${trialNumber} locked`;
  }

  if (
    trial.status ===
    "submitted"
  ) {
    return `Complete Task ${trialNumber} questionnaire`;
  }

  if (
    trial.status ===
    "active"
  ) {
    return `Continue Task ${trialNumber}`;
  }

  return `Begin Task ${trialNumber}`;
}

interface InvalidTaskSelectionProps {
  taskIdParam:
    string | undefined;
}

function InvalidTaskSelection({
  taskIdParam,
}: InvalidTaskSelectionProps) {
  const navigate =
    useNavigate();

  return (
    <main className="study-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI Assisted Problem-Solving Study
          </div>

          <h1>
            Problem not found
          </h1>

          <p>
            The requested constraint-satisfaction problem could not
            be identified.
          </p>
        </div>
      </header>

      <div className="study-page-content">
        <section
          className="study-notice-card"
          role="alert"
        >
          <h2>
            Invalid problem selection
          </h2>

          <p>
            The problem identifier
            {taskIdParam
              ? ` “${taskIdParam}”`
              : ""} is not available in this study.
          </p>
        </section>

        <div className="study-page-actions">
          <button
            type="button"
            className="study-primary-button"
            onClick={() => {
              navigate(
                "/tasks",
              );
            }}
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
            />

            Return to problem selection
          </button>
        </div>
      </div>
    </main>
  );
}

export default function TaskConditionSelectionPage() {
  const navigate =
    useNavigate();

  const {
    taskId:
      taskIdParam,
  } = useParams<{
    taskId:
      string;
  }>();

  const taskId:
    StudyTaskId | null =
      isStudyTaskId(
        taskIdParam,
      )
        ? taskIdParam
        : null;

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

  const startTrial =
    useStudySessionStore(
      (state) =>
        state.startTrial,
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

  const taskDefinition =
    taskId
      ? TASK_DOMAINS[
          taskId
        ]
      : null;

  const taskTrials =
    useMemo(
      () =>
        taskId
          ? trials.filter(
              (trial) =>
                trial.taskId ===
                taskId,
            )
          : [],
      [
        taskId,
        trials,
      ],
    );

  const taskOptions:
    TaskOption[] =
      useMemo(
        () =>
          STUDY_TRIAL_NUMBERS.map(
            (trialNumber) => ({
              trialNumber,

              trial:
                taskTrials.find(
                  (trial) =>
                    trial.trialNumber ===
                    trialNumber,
                ),
            }),
          ),
        [
          taskTrials,
        ],
      );

  const completedTaskCount =
    taskOptions.filter(
      (option) =>
        trialIsComplete(
          option.trial,
        ),
    ).length;

  const problemComplete =
    completedTaskCount ===
    REQUIRED_TASKS_PER_PROBLEM;

  const openTrial =
    trials.find(
      trialIsOpen,
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

  function handleSelectTask(
    option:
      TaskOption,
  ) {
    if (
      !taskId ||
      !taskDefinition ||
      !option.trial ||
      option.trial.status ===
        "questionnaire_complete"
    ) {
      return;
    }

    const selectedTrial =
      option.trial;

    const isCurrentTrial =
      Boolean(
        openTrial &&
        openTrial.taskId ===
          taskId &&
        openTrial.trialNumber ===
          option.trialNumber,
      );

    if (
      problemComplete &&
      !isCurrentTrial
    ) {
      return;
    }

    if (
      openTrial &&
      !isCurrentTrial
    ) {
      return;
    }

    if (
      selectedTrial.status ===
      "submitted"
    ) {
      navigate(
        `/trial-questionnaire/${taskId}/${option.trialNumber}`,
      );

      return;
    }

    if (
      selectedTrial.status ===
      "active"
    ) {
      navigate(
        `/task/${taskId}/${option.trialNumber}`,
      );

      return;
    }

    const assignment =
      startTrial(
        option.trialNumber,
        taskId,
      );

    if (
      !assignment
    ) {
      return;
    }

    addEvent({
      eventType:
        "task_selected",

      taskId,

      trialNumber:
        assignment.trialNumber,

      trialOrder:
        assignment.trialOrder,

      condition:
        assignment.condition,

      conditionOrder:
        assignment.conditionOrder,

      globalOptionNumber:
        assignment.globalOptionNumber,

      globalTrialNumber:
        assignment.globalTrialNumber,

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
          "task_condition_selection",

        selectionLevel:
          "task_variant",

        taskId,

        taskTitle:
          taskDefinition.title,

        outerTaskNumber:
          taskDefinition.problemNumber,

        innerTaskNumber:
          assignment.trialNumber,

        participantLabel:
          assignment.participantLabel,

        totalSubtasks:
          TASK_OPTIONS_PER_PROBLEM,

        requiredTasksPerProblem:
          REQUIRED_TASKS_PER_PROBLEM,

        totalTasks:
          TOTAL_PROBLEMS,

        totalTrials:
          TOTAL_REQUIRED_STUDY_TASKS,

        availableTaskOptionCount:
          TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

        globalOptionNumber:
          assignment.globalOptionNumber,

        globalTrialNumber:
          assignment.globalTrialNumber,

        participantId,

        sessionId,
      },
    });

    navigate(
      `/task/${taskId}/${assignment.trialNumber}`,
      {
        state: {
          taskId,

          taskTitle:
            taskDefinition.title,

          outerTaskNumber:
            taskDefinition.problemNumber,

          trialNumber:
            assignment.trialNumber,

          trialOrder:
            assignment.trialOrder,

          globalOptionNumber:
            assignment.globalOptionNumber,

          globalTrialNumber:
            assignment.globalTrialNumber,

          totalTrials:
            TOTAL_REQUIRED_STUDY_TASKS,

          participantLabel:
            assignment.participantLabel,

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

  if (
    !procedureAccepted ||
    postExperimentCompleted
  ) {
    return null;
  }

  if (
    !taskId ||
    !taskDefinition
  ) {
    return (
      <InvalidTaskSelection
        taskIdParam={
          taskIdParam
        }
      />
    );
  }

  return (
    <main className="study-page task-condition-selection-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            Problem {taskDefinition.problemNumber} of{" "}
            {TOTAL_PROBLEMS} · {taskDefinition.categoryLabel}
          </div>

          <h1>
            {taskDefinition.title}
          </h1>

          <p>
            Select the task number assigned by the instructor.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label={
            problemComplete
              ? "Assigned task completed"
              : "Assigned task pending"
          }
        >
          {problemComplete
            ? "Task completed"
            : "Select 1 of 3 tasks"}
        </div>
      </header>

      <div className="study-page-content">
        <section
          className="task-option-selection task-option-selection-card"
          aria-labelledby="task-option-selection-title"
        >
          <div className="task-option-selection-header">
            <div className="task-option-selection-eyebrow">
              Problem brief
            </div>

            <h2 id="task-option-selection-title">
              {taskDefinition.title}
            </h2>

            <p className="task-option-selection-description">
              {taskDefinition.brief}
            </p>

            <p className="task-option-selection-instruction">
              Select the task number assigned by the instructor.
            </p>
          </div>

          <div
            className="task-option-button-group"
            role="group"
            aria-label={`${taskDefinition.title} task options`}
          >
            {taskOptions.map(
              (option) => {
                const trial =
                  option.trial;

                const completed =
                  trialIsComplete(
                    trial,
                  );

                const isCurrentTrial =
                  Boolean(
                    trial &&
                    openTrial &&
                    openTrial.taskId ===
                      taskId &&
                    openTrial.trialNumber ===
                      option.trialNumber,
                  );

                const locked =
                  Boolean(
                    (
                      openTrial &&
                      !isCurrentTrial
                    ) ||
                    (
                      problemComplete &&
                      !completed
                    ),
                  );

                const unavailable =
                  !trial;

                const disabled =
                  unavailable ||
                  completed ||
                  locked;

                return (
                  <button
                    key={option.trialNumber}
                    type="button"
                    className={[
                      completed
                        ? "study-completed-button"
                        : "study-primary-button",

                      "task-option-button",

                      isCurrentTrial
                        ? "task-option-button-current"
                        : "",

                      locked
                        ? "task-option-button-locked"
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
                      handleSelectTask(
                        option,
                      );
                    }}
                  >
                    {completed ? (
                      <CheckCircle2
                        size={18}
                        aria-hidden="true"
                      />
                    ) : locked ? (
                      <LockKeyhole
                        size={18}
                        aria-hidden="true"
                      />
                    ) : null}

                    <span>
                      {getTaskButtonLabel(
                        option.trialNumber,
                        trial,
                        locked,
                      )}
                    </span>

                    {!disabled && (
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
        </section>

        {openTrial &&
          (
            openTrial.taskId !==
              taskId ||
            openTrial.status ===
              "submitted"
          ) && (
            <section
              className="task-option-open-trial-notice"
              aria-live="polite"
            >
              <p>
                Complete the open task or its questionnaire before
                selecting another task.
              </p>

              <button
                type="button"
                className="study-primary-button task-option-continue-button"
                onClick={() => {
                  navigate(
                    getOpenTrialPath(
                      openTrial,
                    ),
                  );
                }}
              >
                Continue open task

                <ArrowRight
                  size={18}
                  aria-hidden="true"
                />
              </button>
            </section>
          )}

        {problemComplete && (
          <section className="post-task-action-card">
            <CheckCircle2
              size={28}
              aria-hidden="true"
            />

            <div>
              <h2>
                Assigned task completed
              </h2>

              <p>
                The assigned task and its questionnaire for{" "}
                {taskDefinition.title} are complete.
              </p>
            </div>

            <button
              type="button"
              className="study-primary-button"
              onClick={() => {
                navigate(
                  "/tasks",
                );
              }}
            >
              Return to problem selection

              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            </button>
          </section>
        )}

        <div className="study-page-actions">
          <button
            type="button"
            className="study-secondary-button"
            onClick={() => {
              navigate(
                "/tasks",
              );
            }}
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
            />

            Back to problem selection
          </button>
        </div>
      </div>
    </main>
  );
}
