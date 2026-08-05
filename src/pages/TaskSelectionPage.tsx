import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hospital,
  LockKeyhole,
  Truck,
  type LucideIcon,
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
  useStudySessionStore,
} from "../store/studySessionStore";

import type {
  StudyTrialProgress,
} from "../types/study";

import {
  STUDY_TASK_IDS,
  STUDY_TRIAL_NUMBERS,
  TOTAL_STUDY_TRIALS,
  isStudyTaskId,
} from "../types/scheduler";

import type {
  StudyTaskId,
} from "../types/scheduler";

type ExperimentTaskNumber =
  | 1
  | 2
  | 3;

interface TaskDomainDefinition {
  id:
    StudyTaskId;

  taskNumber:
    ExperimentTaskNumber;

  categoryLabel:
    string;

  title:
    string;

  description:
    string;

  itemCountLabel:
    string;

  itemInstruction:
    string;

  resourceCountLabel:
    string;

  resourceInstruction:
    string;

  icon:
    LucideIcon;
}

interface TaskDomainProgress
  extends TaskDomainDefinition {
  completedSubtaskCount:
    number;

  hasStarted:
    boolean;

  hasOpenSubtask:
    boolean;

  completed:
    boolean;
}

const TOTAL_EXPERIMENT_TASKS =
  STUDY_TASK_IDS.length;

const SUBTASKS_PER_TASK =
  STUDY_TRIAL_NUMBERS.length;

const TOTAL_REQUIRED_STUDY_TASKS =
  TOTAL_STUDY_TRIALS;

const TASK_DOMAINS:
  TaskDomainDefinition[] = [
    {
      id:
        "symposium",

      taskNumber:
        1,

      categoryLabel:
        "Problem 1 · Scheduling",

      title:
        "Symposium Scheduler",

      description:
        "Arrange twelve symposium talks across three rooms and four time slots while satisfying the three main scheduling constraints.",

      itemCountLabel:
        "12 talks",

      itemInstruction:
        "Projector, capacity, and speaker constraints",

      resourceCountLabel:
        "3 rooms",

      resourceInstruction:
        "Three task options",

      icon:
        CalendarDays,
    },
    {
      id:
        "delivery",

      taskNumber:
        2,

      categoryLabel:
        "Problem 2 · Logistics",

      title:
        "Delivery Dispatch",

      description:
        "Arrange twelve shipments across three vans and four route windows while satisfying the three main dispatch constraints.",

      itemCountLabel:
        "12 shipments",

      itemInstruction:
        "Refrigeration, capacity, and driver constraints",

      resourceCountLabel:
        "3 vans",

      resourceInstruction:
        "Three task options",

      icon:
        Truck,
    },
    {
      id:
        "clinic",

      taskNumber:
        3,

      categoryLabel:
        "Problem 3 · Workforce allocation",

      title:
        "Clinic Roster",

      description:
        "Arrange twelve nursing duties across three wards and four shifts while satisfying the three main roster constraints.",

      itemCountLabel:
        "12 duties",

      itemInstruction:
        "ICU certification, capacity, and nurse constraints",

      resourceCountLabel:
        "3 wards",

      resourceInstruction:
        "Three task options",

      icon:
        Hospital,
    },
  ];

function trialIsComplete(
  trial:
    StudyTrialProgress,
): boolean {
  return trial.status ===
    "questionnaire_complete";
}

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

function getTaskButtonLabel(
  task:
    TaskDomainProgress,

  locked:
    boolean,
): string {
  if (
    task.completed
  ) {
    return `Problem ${task.taskNumber} completed`;
  }

  if (
    locked
  ) {
    return `Problem ${task.taskNumber} locked`;
  }

  if (
    task.hasStarted ||
    task.hasOpenSubtask
  ) {
    return `Continue Problem ${task.taskNumber}`;
  }

  return `Open Problem ${task.taskNumber}`;
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

  const openPostExperiment =
    useStudySessionStore(
      (state) =>
        state.openPostExperiment,
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

  const taskProgress =
    useMemo(
      () =>
        TASK_DOMAINS.map(
          (task):
            TaskDomainProgress => {
            const taskTrials =
              trials.filter(
                (trial) =>
                  trial.taskId ===
                  task.id,
              );

            const completedSubtaskCount =
              taskTrials.filter(
                trialIsComplete,
              ).length;

            const hasOpenSubtask =
              taskTrials.some(
                trialIsOpen,
              );

            const hasStarted =
              taskTrials.some(
                (trial) =>
                  trial.status !==
                  "pending",
              );

            return {
              ...task,

              completedSubtaskCount,

              hasStarted,

              hasOpenSubtask,

              completed:
                completedSubtaskCount ===
                  1,
            };
          },
        ),
      [
        trials,
      ],
    );

  const completedTrialCount =
    trials.filter(
      trialIsComplete,
    ).length;

  const completedTaskCount =
    taskProgress.filter(
      (task) =>
        task.completed,
    ).length;

  const allTrialsComplete =
    completedTrialCount ===
      TOTAL_REQUIRED_STUDY_TASKS &&
    completedTaskCount ===
      TOTAL_EXPERIMENT_TASKS &&
    STUDY_TASK_IDS.every(
      (taskId) =>
        trials.filter(
          (trial) =>
            trialIsComplete(
              trial,
            ) &&
            isStudyTaskId(
              trial.taskId,
            ) &&
            trial.taskId ===
              taskId,
        ).length ===
        1,
    );

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

  function handleOpenTask(
    task:
      TaskDomainProgress,
  ) {
    if (
      task.completed
    ) {
      return;
    }

    if (
      openTrial
    ) {
      if (
        !isStudyTaskId(
          openTrial.taskId,
        ) ||
        openTrial.taskId !==
          task.id
      ) {
        return;
      }

      navigate(
        openTrial.status ===
          "submitted"
          ? `/trial-questionnaire/${task.id}/${openTrial.trialNumber}`
          : `/task/${task.id}/${openTrial.trialNumber}`,
      );

      return;
    }

    addEvent({
      eventType:
        "task_selected",

      phase:
        "pre_ai",

      metadata: {
        page:
          "task_selection",

        selectionLevel:
          "task_domain",

        taskId:
          task.id,

        taskNumber:
          task.taskNumber,

        taskTitle:
          task.title,

        completedSubtasks:
          task.completedSubtaskCount,

        totalSubtasks:
          SUBTASKS_PER_TASK,

        totalTasks:
          TOTAL_EXPERIMENT_TASKS,

        totalTrials:
          TOTAL_REQUIRED_STUDY_TASKS,

        participantId,

        sessionId,
      },
    });

    navigate(
      `/tasks/${task.id}`,
      {
        state: {
          taskId:
            task.id,

          taskNumber:
            task.taskNumber,

          taskTitle:
            task.title,

          completedSubtasks:
            task.completedSubtaskCount,

          totalSubtasks:
            SUBTASKS_PER_TASK,
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
            AI Assisted Problem-Solving Study
          </div>

          <h1>
            Problem Selection
          </h1>

          <p>
            Select each constraint-satisfaction problem and complete
            the task assigned by the instructor.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label="Study progress"
        >
          {completedTaskCount} of{" "}
          {TOTAL_EXPERIMENT_TASKS} problems completed
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
              Three constraint-satisfaction problems
            </h2>

            <p>
              The experiment contains three constraint-satisfaction
              problems, and each problem includes three task options.
              You will complete three tasks in total—one task from
              each problem. Select the task specified by the
              instructor.
            </p>
          </div>
        </section>

        <div className="task-selection-domain-list">
          {taskProgress.map(
            (task) => {
              const TaskIcon =
                task.icon;

              const blockedByAnotherTask =
                Boolean(
                  openTrial &&
                  openTrial.taskId !==
                    task.id,
                );

              const disabled =
                task.completed ||
                blockedByAnotherTask ||
                allTrialsComplete;

              return (
                <section
                  key={task.id}
                  className="task-selection-overview-card"
                  aria-labelledby={`${task.id}-task-title`}
                >
                  <div className="task-selection-overview-header">
                    <div className="task-assignment-icon">
                      <TaskIcon
                        size={30}
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <div className="task-assignment-label">
                        {task.categoryLabel}
                      </div>

                      <h2 id={`${task.id}-task-title`}>
                        {task.title}
                      </h2>
                    </div>
                  </div>

                  <p className="task-assignment-description">
                    {task.description}
                  </p>

                  <div className="task-assignment-details">
                    <div className="task-assignment-detail">
                      <ClipboardList
                        size={20}
                        aria-hidden="true"
                      />

                      <div>
                        <strong>
                          {task.itemCountLabel}
                        </strong>

                        <span>
                          {task.itemInstruction}
                        </span>
                      </div>
                    </div>

                    <div className="task-assignment-detail">
                      <TaskIcon
                        size={20}
                        aria-hidden="true"
                      />

                      <div>
                        <strong>
                          {task.resourceCountLabel}
                        </strong>

                        <span>
                          {task.resourceInstruction}
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
                          3 task options
                        </strong>

                        <span>
                          Complete the assigned task
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="task-selection-actions task-selection-compact-actions">
                    <button
                      type="button"
                      className={[
                        task.completed
                          ? "study-completed-button"
                          : "study-primary-button",

                        "task-selection-main-button",
                        "task-selection-compact-button",

                        task.hasOpenSubtask
                          ? "task-selection-main-button-current"
                          : "",
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " ",
                        )}
                      disabled={disabled}
                      onClick={() => {
                        handleOpenTask(
                          task,
                        );
                      }}
                    >
                      {task.completed ? (
                        <CheckCircle2
                          size={18}
                          aria-hidden="true"
                        />
                      ) : blockedByAnotherTask ? (
                        <LockKeyhole
                          size={18}
                          aria-hidden="true"
                        />
                      ) : null}

                      <span>
                        {getTaskButtonLabel(
                          task,
                          blockedByAnotherTask,
                        )}
                      </span>

                      {!task.completed &&
                        !blockedByAnotherTask && (
                          <ArrowRight
                            size={18}
                            aria-hidden="true"
                          />
                        )}
                    </button>

                    <p className="task-selection-subtask-progress task-selection-task-progress">
                      {task.completed
                        ? "Assigned task completed"
                        : "Select 1 of 3 task options"}
                    </p>
                  </div>
                </section>
              );
            },
          )}
        </div>

        {openTrial && (
          <p className="task-selection-blocked-message">
            Complete the current task and its questionnaire before
            opening another constraint-satisfaction problem.
          </p>
        )}

        <section className="task-progress-card">
          <div className="task-progress-header">
            <h2>
              Study progress
            </h2>

            <span>
              {completedTaskCount} of{" "}
              {TOTAL_EXPERIMENT_TASKS} problems completed
            </span>
          </div>

          <div
            className="task-progress-steps"
            aria-label="Problem completion progress"
          >
            {taskProgress.map(
              (task) => {
                const current =
                  !task.completed &&
                  task.hasStarted;

                return (
                  <div
                    key={task.id}
                    className={[
                      "task-progress-step",

                      task.completed
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
                      {task.completed ? (
                        <CheckCircle2
                          size={19}
                          aria-hidden="true"
                        />
                      ) : (
                        task.taskNumber
                      )}
                    </div>

                    <span>
                      Problem {task.taskNumber}
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
                All assigned tasks completed
              </h2>

              <p>
                Continue to the post-experiment questionnaire to
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
              Proceed to post-experiment questionnaire

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
