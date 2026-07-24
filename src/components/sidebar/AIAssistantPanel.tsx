import {
  Bot,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

import type {
  ConcretizationLevel,
} from "../../types/scheduler";

interface AssistantContent {
  introduction:
    string;

  artifactMessage:
    string;
}

const ASSISTANT_CONTENT:
  Record<
    ConcretizationLevel,
    AssistantContent
  > = {
    A: {
      introduction:
        "I recommend organizing the symposium into topic tracks. Assign one topic to each room and arrange the talks according to speaker availability and room requirements.",

      artifactMessage:
        "Use this strategy as a starting point and create your own schedule while checking every constraint.",
    },

    B: {
      introduction:
        "I recommend organizing the symposium into topic tracks. Assign one topic to each room and arrange the talks according to speaker availability and room requirements.",

      artifactMessage:
        "I added several starting placements to demonstrate the proposed structure. Complete the remaining schedule and revise any placement you consider unsuitable.",
    },

    C: {
      introduction:
        "I recommend organizing the symposium into topic tracks. Assign one topic to each room and arrange the talks according to speaker availability and room requirements.",

      artifactMessage:
        "I placed a complete proposed schedule on the grid. Review every placement carefully and make any changes you consider necessary.",
    },
  };

export default function AIAssistantPanel() {
  const level =
    useSchedulerStore(
      (state) =>
        state.level,
    );

  const assistantContent =
    ASSISTANT_CONTENT[
      level
    ];

  return (
    <aside
      className="panel ai-assistant-panel"
      aria-label="AI Scheduling Assistant"
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
            AI Scheduling Assistant
          </div>

          <div className="ai-panel-status">
            <span
              className="ai-status-dot"
              aria-hidden="true"
            />

            Analysis complete
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
              Recommendation
            </div>

            <p>
              {
                assistantContent
                  .introduction
              }
            </p>

            <div
              className="ai-recommendation-list"
              aria-label="Recommended topic organization"
            >
              <div>
                <strong>
                  Room A
                </strong>

                <span>
                  NLP
                </span>
              </div>

              <div>
                <strong>
                  Room B
                </strong>

                <span>
                  Health
                </span>
              </div>

              <div>
                <strong>
                  Room C
                </strong>

                <span>
                  Robotics
                </span>
              </div>
            </div>

            <p>
              {
                assistantContent
                  .artifactMessage
              }
            </p>
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