import {
  Check,
  ClipboardCheck,
  FileText,
  Flag,
  ListChecks,
} from "lucide-react";

import type {
  ReactNode,
} from "react";

import type {
  StudySessionStage,
} from "../../types/study";

interface StudyProgressProps {
  currentStage:
    StudySessionStage;

  completedTrials?:
    number;

  currentTrial?:
    number | null;

  totalTrials?:
    number;

  compact?:
    boolean;

  className?:
    string;
}

interface ProgressStep {
  id:
    | "procedure"
    | "task_assignment"
    | "post_experiment"
    | "disclosure";

  label:
    string;

  icon:
    ReactNode;
}

const progressSteps:
  ProgressStep[] = [
    {
      id:
        "procedure",

      label:
        "Procedure",

      icon: (
        <FileText
          size={18}
          aria-hidden="true"
        />
      ),
    },

    {
      id:
        "task_assignment",

      label:
        "Tasks and questionnaires",

      icon: (
        <ListChecks
          size={18}
          aria-hidden="true"
        />
      ),
    },

    {
      id:
        "post_experiment",

      label:
        "Post task questionnaire",

      icon: (
        <ClipboardCheck
          size={18}
          aria-hidden="true"
        />
      ),
    },

    {
      id:
        "disclosure",

      label:
        "Disclosure",

      icon: (
        <Flag
          size={18}
          aria-hidden="true"
        />
      ),
    },
  ];

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function getProgressStepId(
  stage:
    StudySessionStage,
): ProgressStep["id"] | "complete" {
  switch (stage) {
    case "procedure":
      return "procedure";

    case "task_assignment":
    case "task":
    case "trial_questionnaire":
      return "task_assignment";

    case "post_experiment":
      return "post_experiment";

    case "disclosure":
      return "disclosure";

    case "complete":
      return "complete";
  }
}

function getStageIndex(
  stage:
    StudySessionStage,
): number {
  const progressStepId =
    getProgressStepId(
      stage,
    );

  if (
    progressStepId ===
    "complete"
  ) {
    return progressSteps.length;
  }

  return progressSteps.findIndex(
    (step) =>
      step.id ===
      progressStepId,
  );
}

function getStageLabel(
  stage:
    StudySessionStage,
): string {
  switch (stage) {
    case "procedure":
      return "Procedure";

    case "task_assignment":
      return "Task selection";

    case "task":
      return "Scheduling task";

    case "trial_questionnaire":
      return "Task questionnaire";

    case "post_experiment":
      return "Post task questionnaire";

    case "disclosure":
      return "Disclosure";

    case "complete":
      return "Study complete";
  }
}

function getTaskProgressLabel(
  stage:
    StudySessionStage,
  completedTrials: number,
  currentTrial: number,
  totalTrials: number,
): string {
  if (
    stage === "complete" ||
    stage === "post_experiment" ||
    stage === "disclosure" ||
    completedTrials >=
      totalTrials
  ) {
    return `${totalTrials} of ${totalTrials} tasks complete`;
  }

  if (
    stage === "task"
  ) {
    return `Task ${currentTrial} of ${totalTrials}`;
  }

  if (
    stage ===
    "trial_questionnaire"
  ) {
    return `Questionnaire for task ${currentTrial}`;
  }

  return `${completedTrials} of ${totalTrials} tasks complete`;
}

function getProgressPercentage(
  currentStage:
    StudySessionStage,
  completedTrials: number,
  totalTrials: number,
): number {
  if (
    currentStage ===
    "complete"
  ) {
    return 100;
  }

  if (
    currentStage ===
    "disclosure"
  ) {
    return 90;
  }

  if (
    currentStage ===
    "post_experiment"
  ) {
    return 75;
  }

  if (
    currentStage ===
      "task_assignment" ||
    currentStage ===
      "task" ||
    currentStage ===
      "trial_questionnaire"
  ) {
    const taskSectionStart =
      25;

    const taskSectionSize =
      50;

    const taskProgress =
      totalTrials > 0
        ? completedTrials /
          totalTrials
        : 0;

    return (
      taskSectionStart +
      taskProgress *
        taskSectionSize
    );
  }

  return 0;
}

export default function StudyProgress({
  currentStage,
  completedTrials = 0,
  currentTrial = null,
  totalTrials = 3,
  compact = false,
  className = "",
}: StudyProgressProps) {
  const safeTotalTrials =
    Math.max(
      1,
      totalTrials,
    );

  const normalizedCompletedTrials =
    clamp(
      completedTrials,
      0,
      safeTotalTrials,
    );

  const normalizedCurrentTrial =
    clamp(
      currentTrial ??
        normalizedCompletedTrials +
          1,
      1,
      safeTotalTrials,
    );

  const currentStageIndex =
    getStageIndex(
      currentStage,
    );

  const componentClassName = [
    "study-progress",

    compact
      ? "study-progress-compact"
      : "",

    className,
  ]
    .filter(
      Boolean,
    )
    .join(" ");

  const progressPercentage =
    getProgressPercentage(
      currentStage,
      normalizedCompletedTrials,
      safeTotalTrials,
    );

  return (
    <nav
      className={
        componentClassName
      }
      aria-label="Study progress"
    >
      <div className="study-progress-summary">
        <div>
          <span className="study-progress-summary-label">
            Study progress
          </span>

          <strong>
            {getStageLabel(
              currentStage,
            )}
          </strong>
        </div>

        <span className="study-progress-task-count">
          {getTaskProgressLabel(
            currentStage,
            normalizedCompletedTrials,
            normalizedCurrentTrial,
            safeTotalTrials,
          )}
        </span>
      </div>

      <ol className="study-progress-list">
        {progressSteps.map(
          (
            step,
            index,
          ) => {
            const completed =
              currentStage ===
                "complete" ||
              index <
                currentStageIndex;

            const current =
              currentStage !==
                "complete" &&
              index ===
                currentStageIndex;

            const stepClassName = [
              "study-progress-item",

              completed
                ? "study-progress-item-complete"
                : "",

              current
                ? "study-progress-item-current"
                : "",
            ]
              .filter(
                Boolean,
              )
              .join(" ");

            return (
              <li
                key={
                  step.id
                }
                className={
                  stepClassName
                }
                aria-current={
                  current
                    ? "step"
                    : undefined
                }
              >
                <div className="study-progress-marker">
                  {completed ? (
                    <Check
                      size={17}
                      aria-hidden="true"
                    />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="study-progress-item-content">
                  <span>
                    {step.label}
                  </span>

                  {step.id ===
                    "task_assignment" && (
                    <small>
                      {
                        normalizedCompletedTrials
                      }{" "}
                      of{" "}
                      {
                        safeTotalTrials
                      }{" "}
                      complete
                    </small>
                  )}
                </div>
              </li>
            );
          },
        )}
      </ol>

      <div
        className="study-progress-bar"
        aria-hidden="true"
      >
        <div
          className="study-progress-bar-fill"
          style={{
            width:
              `${progressPercentage}%`,
          }}
        />
      </div>
    </nav>
  );
}