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
  StudyTrialAssignment,
  StudyTrialProgress,
} from "../types/study";

import {
  STUDY_TASK_IDS,
  TOTAL_STUDY_TRIALS,
} from "../types/scheduler";

import type {
  StudyTaskId,
} from "../types/scheduler";

interface TaskDomainDefinition {
  id:
    StudyTaskId;

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

const TOTAL_EXPERIMENT_TASKS =
  STUDY_TASK_IDS.length;

// ADVISER FIX: A token assigns exactly one trial for each task domain.
const ASSIGNED_TRIALS_PER_TASK =
  1;

const TOTAL_REQUIRED_STUDY_TASKS =
  TOTAL_STUDY_TRIALS;

const TASK_DOMAINS:
  TaskDomainDefinition[] = [
    {
      id:
        "symposium",

      categoryLabel:
        "Scheduling task",

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
        "Four time slots",

      icon:
        CalendarDays,
    },
    {
      id:
        "delivery",

      categoryLabel:
        "Logistics task",

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
        "Four route windows",

      icon:
        Truck,
    },
    {
      id:
        "clinic",

      categoryLabel:
        "Workforce allocation task",

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
        "Four shifts",

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

function trialMatchesAssignment(
  trial:
    StudyTrialProgress,

  assignment:
    StudyTrialAssignment,
): boolean {
  return (
    trial.taskId ===
      assignment.taskId &&
    trial.trialNumber ===
      assignment.trialNumber
  );
}

function getTaskDefinition(
  taskId:
    StudyTaskId,
): TaskDomainDefinition | undefined {
  return TASK_DOMAINS.find(
    (task) =>
      task.id ===
      taskId,
  );
}

function getAssignedTaskButtonLabel(
  trial:
    StudyTrialProgress,

  trialOrder:
    number,
): string {
  if (
    trial.status ===
    "submitted"
  ) {
    return `Continue Task ${trialOrder} questionnaire`;
  }

  if (
    trial.status ===
    "active"
  ) {
    return `Continue Task ${trialOrder}`;
  }

  return `Begin Task ${trialOrder}`;
}

function getAssignedTaskProgressLabel(
  trial:
    StudyTrialProgress,
): string {
  if (
    trial.status ===
    "submitted"
  ) {
    return "Complete the task questionnaire";
  }

  if (
    trial.status ===
    "active"
  ) {
    return "Assigned task in progress";
  }

  return "Next assigned task";
}

export default function TaskSelectionPage() {
  const navigate =
    useNavigate();

  const participantToken =
    useStudySessionStore(
      (state) =>
        state.participantToken,
    );

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

  const assignmentStatus =
    useStudySessionStore(
      (state) =>
        state.assignmentStatus,
    );

  const assignmentTableVersion =
    useStudySessionStore(
      (state) =>
        state.assignmentTableVersion,
    );

  const assignmentSequenceId =
    useStudySessionStore(
      (state) =>
        state.assignmentSequenceId,
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

  const openPostExperiment =
    useStudySessionStore(
      (state) =>
        state.openPostExperiment,
    );

  const setEventParticipantToken =
    useEventLogStore(
      (state) =>
        state.setParticipantToken,
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

  const assignmentReady =
    assignmentStatus ===
      "valid" &&
    participantToken.length >
      0 &&
    sessionId.length >
      0 &&
    assignmentTableVersion !==
      null &&
    assignmentSequenceId !==
      null &&
    assignments.length ===
      TOTAL_REQUIRED_STUDY_TASKS;

  const orderedAssignments =
    useMemo(
      () =>
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
          ),
      [
        assignments,
      ],
    );

  const completedTrialCount =
    orderedAssignments.filter(
      (assignment) =>
        trials.some(
          (trial) =>
            trialMatchesAssignment(
              trial,
              assignment,
            ) &&
            trialIsComplete(
              trial,
            ),
        ),
    ).length;

  const allTrialsComplete =
    assignmentReady &&
    completedTrialCount ===
      TOTAL_REQUIRED_STUDY_TASKS;

  const openTrial =
    trials.find(
      trialIsOpen,
    );

  const openAssignment =
    openTrial
      ? orderedAssignments.find(
          (assignment) =>
            trialMatchesAssignment(
              openTrial,
              assignment,
            ),
        )
      : undefined;

  const nextAssignment =
    orderedAssignments.find(
      (assignment) => {
        const matchingTrial =
          trials.find(
            (trial) =>
              trialMatchesAssignment(
                trial,
                assignment,
              ),
          );

        return matchingTrial?.status ===
          "pending";
      },
    );

  // ADVISER FIX: Expose only the open assigned trial or the next assigned trial.
  const currentAssignment =
    openAssignment ??
    nextAssignment;

  const currentTrial =
    currentAssignment
      ? trials.find(
          (trial) =>
            trialMatchesAssignment(
              trial,
              currentAssignment,
            ),
        )
      : undefined;

  const currentTask =
    currentAssignment
      ? getTaskDefinition(
          currentAssignment.taskId,
        )
      : undefined;

  useEffect(() => {
    if (
      !procedureAccepted ||
      assignmentStatus !==
        "valid"
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

    if (
      !assignmentReady
    ) {
      return;
    }

    setEventParticipantToken(
      participantToken,
    );

    setEventSessionId(
      sessionId,
    );

    setEventConditionOrder(
      conditionOrder,
    );
  }, [
    assignmentReady,
    assignmentStatus,
    conditionOrder,
    navigate,
    participantToken,
    postExperimentCompleted,
    procedureAccepted,
    sessionId,
    setEventConditionOrder,
    setEventParticipantToken,
    setEventSessionId,
  ]);

  function handleOpenAssignedTask() {
    if (
      !assignmentReady ||
      !currentAssignment ||
      !currentTrial ||
      !currentTask ||
      allTrialsComplete
    ) {
      return;
    }

    if (
      openTrial
    ) {
      if (
        !trialMatchesAssignment(
          openTrial,
          currentAssignment,
        )
      ) {
        return;
      }

      navigate(
        openTrial.status ===
          "submitted"
          ? `/trial-questionnaire/${currentAssignment.taskId}/${currentAssignment.trialNumber}`
          : `/task/${currentAssignment.taskId}/${currentAssignment.trialNumber}`,
      );

      return;
    }

    const startedAssignment =
      startNextTrial();

    if (
      !startedAssignment
    ) {
      return;
    }

    const startedTask =
      getTaskDefinition(
        startedAssignment.taskId,
      );

    if (
      !startedTask
    ) {
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
          "token_assigned_trial",

        participantId,

        participantToken,

        sessionId,

        assignmentTableVersion,

        assignmentSequenceId,

        assignedTrial: {
          trialOrder:
            startedAssignment.trialOrder,

          taskId:
            startedAssignment.taskId,

          trialNumber:
            startedAssignment.trialNumber,

          condition:
            startedAssignment.condition,
        },

        taskTitle:
          startedTask.title,

        totalSubtasks:
          ASSIGNED_TRIALS_PER_TASK,

        totalTasks:
          TOTAL_EXPERIMENT_TASKS,

        totalTrials:
          TOTAL_REQUIRED_STUDY_TASKS,
      },
    });

    navigate(
      `/task/${startedAssignment.taskId}/${startedAssignment.trialNumber}`,
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
    postExperimentCompleted ||
    !assignmentReady
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
            Assigned Task
          </h1>

          <p>
            Continue with the task currently assigned by the
            study sequence.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label="Study progress"
        >
          {completedTrialCount} of{" "}
          {TOTAL_REQUIRED_STUDY_TASKS} tasks completed
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
              Your assigned study sequence
            </h2>

            <p>
              The next task in your assigned sequence is shown
              below. Complete it and its questionnaire before
              the following assigned task becomes available.
            </p>
          </div>
        </section>

        {!allTrialsComplete &&
          currentAssignment &&
          currentTrial &&
          currentTask && (
          <div className="task-selection-domain-list">
            <section
              className="task-selection-overview-card"
              aria-labelledby={`${currentTask.id}-task-title`}
            >
              <div className="task-selection-overview-header">
                <div className="task-assignment-icon">
                  <currentTask.icon
                    size={30}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <div className="task-assignment-label">
                    Task {currentAssignment.trialOrder} of{" "}
                    {TOTAL_REQUIRED_STUDY_TASKS} ·{" "}
                    {currentTask.categoryLabel}
                  </div>

                  <h2 id={`${currentTask.id}-task-title`}>
                    {currentTask.title}
                  </h2>
                </div>
              </div>

              <p className="task-assignment-description">
                {currentTask.description}
              </p>

              <div className="task-assignment-details">
                <div className="task-assignment-detail">
                  <ClipboardList
                    size={20}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      {currentTask.itemCountLabel}
                    </strong>

                    <span>
                      {currentTask.itemInstruction}
                    </span>
                  </div>
                </div>

                <div className="task-assignment-detail">
                  <currentTask.icon
                    size={20}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      {currentTask.resourceCountLabel}
                    </strong>

                    <span>
                      {currentTask.resourceInstruction}
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
                      Complete the assigned task
                    </span>
                  </div>
                </div>
              </div>

              <div className="task-selection-actions task-selection-compact-actions">
                <button
                  type="button"
                  className={[
                    "study-primary-button",
                    "task-selection-main-button",
                    "task-selection-compact-button",

                    currentTrial.status !==
                      "pending"
                      ? "task-selection-main-button-current"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )}
                  onClick={
                    handleOpenAssignedTask
                  }
                >
                  <span>
                    {getAssignedTaskButtonLabel(
                      currentTrial,
                      Number(
                        currentAssignment.trialOrder,
                      ),
                    )}
                  </span>

                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                  />
                </button>

                <p className="task-selection-subtask-progress task-selection-task-progress">
                  {getAssignedTaskProgressLabel(
                    currentTrial,
                  )}
                </p>
              </div>
            </section>
          </div>
        )}

        {openTrial && (
          <p className="task-selection-blocked-message">
            Complete the current task and its questionnaire before
            the next assigned task becomes available.
          </p>
        )}

        <section className="task-progress-card">
          <div className="task-progress-header">
            <h2>
              Study progress
            </h2>

            <span>
              {completedTrialCount} of{" "}
              {TOTAL_REQUIRED_STUDY_TASKS} tasks completed
            </span>
          </div>

          <div
            className="task-progress-steps"
            aria-label="Task completion progress"
          >
            {orderedAssignments.map(
              (assignment) => {
                const trial =
                  trials.find(
                    (item) =>
                      trialMatchesAssignment(
                        item,
                        assignment,
                      ),
                  );

                const completed =
                  Boolean(
                    trial &&
                    trialIsComplete(
                      trial,
                    ),
                  );

                const current =
                  Boolean(
                    currentAssignment &&
                    currentAssignment.taskId ===
                      assignment.taskId &&
                    currentAssignment.trialNumber ===
                      assignment.trialNumber,
                  );

                return (
                  <div
                    key={`${assignment.taskId}-${assignment.trialNumber}`}
                    className={[
                      "task-progress-step",

                      completed
                        ? "task-progress-step-complete"
                        : "",

                      current &&
                      !completed
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
                        assignment.trialOrder
                      )}
                    </div>

                    <span>
                      Task {assignment.trialOrder}
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
