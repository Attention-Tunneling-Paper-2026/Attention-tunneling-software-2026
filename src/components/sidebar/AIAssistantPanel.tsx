import { Bot, Sparkles } from "lucide-react";
import { useParams } from "react-router";

import { getAssistantRecommendation } from "../../data/symposium";
import { SYMPOSIUM_TASK_DATA } from "../../data/tasks/symposium";
import { useSchedulerStore } from "../../store/schedulerStore";

type TaskDomainId = "symposium" | "delivery" | "clinic";

interface AIAssistantPanelProps {
  taskId?: TaskDomainId;
}

function isTaskDomainId(value: unknown): value is TaskDomainId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

export default function AIAssistantPanel({
  taskId,
}: AIAssistantPanelProps) {
  const { taskId: routeTaskId } = useParams<{ taskId?: string }>();

  const resolvedTaskId: TaskDomainId = isTaskDomainId(taskId)
    ? taskId
    : isTaskDomainId(routeTaskId)
      ? routeTaskId
      : "symposium";

  const level = useSchedulerStore((state) => state.level);
  const assistantContent = SYMPOSIUM_TASK_DATA.assistantByCondition[level];
  const { message, prefillAcknowledgment } = getAssistantRecommendation(
    level,
    resolvedTaskId,
  );

  const contentVersion =
    `${assistantContent.contentVersion}-${resolvedTaskId}-v2`;

  return (
    <aside
      className="panel ai-assistant-panel"
      aria-label={assistantContent.name}
      data-content-version={contentVersion}
      data-task-id={resolvedTaskId}
    >
      <div className="ai-panel-header">
        <div className="ai-avatar">
          <Bot size={21} aria-hidden="true" />
        </div>

        <div>
          <div className="ai-panel-name">{assistantContent.name}</div>

          <div className="ai-panel-status">
            <span className="ai-status-dot" aria-hidden="true" />
            {assistantContent.statusLabel}
          </div>
        </div>
      </div>

      <div className="ai-chat-window" aria-live="polite">
        <div className="ai-message-row">
          <div className="ai-message-avatar">
            <Sparkles size={16} aria-hidden="true" />
          </div>

          <div className="ai-message-bubble">
            <p style={{ whiteSpace: "pre-line" }}>{message}</p>

            {prefillAcknowledgment ? <p>{prefillAcknowledgment}</p> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
