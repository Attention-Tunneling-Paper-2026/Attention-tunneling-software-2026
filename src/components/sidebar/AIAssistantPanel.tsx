import {
  Bot,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import {
  SYMPOSIUM_TASK_DATA,
} from "../../data/tasks/symposium";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

const SHARED_RECOMMENDATION =
  "Organize by topic tracks: Room A = NLP, Room B = Health, Room C = Robotics, ordered by speaker availability.";

export default function AIAssistantPanel() {
  const level = useSchedulerStore(
    (state) => state.level,
  );

  const assistantContent =
    SYMPOSIUM_TASK_DATA
      .assistantByCondition[level];

  return (
    <aside
      className="panel ai-assistant-panel"
      aria-label={assistantContent.name}
      data-content-version={
        assistantContent.contentVersion
      }
    >
      <div className="ai-panel-header">
        <div className="ai-avatar">
          <Bot
            size={21}
            aria-hidden="true"
          />
        </div>

        <div>
          <div className="ai-panel-name">
            {assistantContent.name}
          </div>

          <div className="ai-panel-status">
            <span
              className="ai-status-dot"
              aria-hidden="true"
            />

            {assistantContent.statusLabel}
          </div>
        </div>
      </div>

      <div
        className="ai-chat-window"
        aria-live="polite"
      >
        <div className="ai-message-row">
          <div className="ai-message-avatar">
            <Sparkles
              size={16}
              aria-hidden="true"
            />
          </div>

          <div className="ai-message-bubble">
            <div className="ai-message-label">
              {assistantContent.recommendationLabel}
            </div>

            <p>
              {SHARED_RECOMMENDATION}
            </p>

            {assistantContent
              .prefillAcknowledgment ? (
              <p>
                {
                  assistantContent
                    .prefillAcknowledgment
                }
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ai-condition-note">
        <CheckCircle2
          size={15}
          aria-hidden="true"
        />

        <span>
          Review the recommendation against all task
          constraints before submitting your final schedule.
        </span>
      </div>
    </aside>
  );
}
