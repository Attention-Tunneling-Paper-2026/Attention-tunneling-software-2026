import {
  Bot,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

export type TaskStartStatus =
  | "idle"
  | "thinking";

interface TaskStartPanelProps {
  status:
    TaskStartStatus;

  onRequestAnalysis:
    () => void;

  disabled?:
    boolean;
}

export default function TaskStartPanel({
  status,
  onRequestAnalysis,
  disabled = false,
}: TaskStartPanelProps) {
  const isThinking =
    status ===
    "thinking";

  return (
    <section
      className="panel ai-assistant-launch"
      aria-labelledby="task-start-panel-title"
      aria-live="polite"
      aria-busy={
        isThinking
      }
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
          AI Scheduling Assistant
        </div>

        <h2 id="task-start-panel-title">
          {isThinking
            ? "Analyzing the task"
            : "Request AI analysis"}
        </h2>

        <p>
          {isThinking
            ? "The assistant is reviewing the Symposium Scheduler requirements and preparing its recommendation."
            : "Ask the assistant to analyze the scheduling requirements and provide a recommendation for completing the task."}
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