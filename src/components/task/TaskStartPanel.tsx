import {
  Bot,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import type {
  StudyTaskId,
} from "../../types/scheduler";

export type TaskStartStatus =
  | "idle"
  | "thinking";

interface TaskStartPanelProps {
  taskId?:
    StudyTaskId;

  status:
    TaskStartStatus;

  onRequestAnalysis:
    () => void;

  disabled?:
    boolean;
}

interface TaskStartPresentation {
  assistantLabel:
    string;

  taskTitle:
    string;

  idleDescription:
    string;

  thinkingDescription:
    string;
}

const TASK_PRESENTATIONS: Record<
  StudyTaskId,
  TaskStartPresentation
> = {
  symposium: {
    assistantLabel:
      "AI Scheduling Assistant",

    taskTitle:
      "Symposium Scheduler",

    idleDescription:
      "Ask the assistant to analyze the scheduling requirements and provide a recommendation for completing the task.",

    thinkingDescription:
      "The assistant is reviewing the Symposium Scheduler requirements and preparing its recommendation.",
  },

  delivery: {
    assistantLabel:
      "AI Dispatch Assistant",

    taskTitle:
      "Delivery Dispatch",

    idleDescription:
      "Ask the assistant to analyze the dispatch requirements and provide a recommendation for completing the task.",

    thinkingDescription:
      "The assistant is reviewing the Delivery Dispatch requirements and preparing its recommendation.",
  },

  clinic: {
    assistantLabel:
      "AI Roster Assistant",

    taskTitle:
      "Clinic Roster",

    idleDescription:
      "Ask the assistant to analyze the roster requirements and provide a recommendation for completing the task.",

    thinkingDescription:
      "The assistant is reviewing the Clinic Roster requirements and preparing its recommendation.",
  },
};

export default function TaskStartPanel({
  taskId = "symposium",
  status,
  onRequestAnalysis,
  disabled = false,
}: TaskStartPanelProps) {
  const isThinking =
    status ===
    "thinking";

  const presentation =
    TASK_PRESENTATIONS[taskId];

  return (
    <section
      className="panel ai-assistant-launch"
      aria-labelledby="task-start-panel-title"
      aria-live="polite"
      aria-busy={
        isThinking
      }
      data-task-id={taskId}
    >
      <div
        className={[
          "ai-launch-icon",

          isThinking
            ? "ai-thinking-icon"
            : "",
        ]
          .filter(
            Boolean,
          )
          .join(
            " ",
          )}
      >
        {isThinking ? (
          <LoaderCircle
            size={34}
            aria-hidden="true"
          />
        ) : (
          <Bot
            size={34}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="ai-launch-content">
        <div className="ai-launch-label">
          {presentation.assistantLabel}
        </div>

        <h2 id="task-start-panel-title">
          {isThinking
            ? "Analyzing the task"
            : "Request AI analysis"}
        </h2>

        <p>
          {isThinking
            ? presentation.thinkingDescription
            : presentation.idleDescription}
        </p>
      </div>

      <button
        type="button"
        className="ai-launch-action"
        onClick={
          onRequestAnalysis
        }
        disabled={
          disabled ||
          isThinking
        }
        aria-label={
          isThinking
            ? `Analyzing ${presentation.taskTitle}`
            : `Analyze ${presentation.taskTitle}`
        }
      >
        {isThinking ? (
          <>
            <LoaderCircle
              size={18}
              aria-hidden="true"
            />

            Analyzing
          </>
        ) : (
          <>
            <Sparkles
              size={18}
              aria-hidden="true"
            />

            Analyze task
          </>
        )}
      </button>

      <div className="ai-launch-note">
        The fifteen minute task timer begins after the
        recommendation appears.
      </div>
    </section>
  );
}
