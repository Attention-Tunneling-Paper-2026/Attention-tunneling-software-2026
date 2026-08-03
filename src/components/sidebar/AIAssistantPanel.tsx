import {
  Bot,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import {
  useParams,
} from "react-router";

import {
  SYMPOSIUM_TASK_DATA,
} from "../../data/tasks/symposium";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

type TaskDomainId =
  | "symposium"
  | "delivery"
  | "clinic";

interface AIAssistantPanelProps {
  taskId?:
    TaskDomainId;
}

interface TaskAssistantPresentation {
  recommendation:
    string;

  partialPrefillAcknowledgment:
    string;

  fullPrefillAcknowledgment:
    string;

  reviewMessage:
    string;
}

const TASK_ASSISTANT_PRESENTATION: Record<
  TaskDomainId,
  TaskAssistantPresentation
> = {
  symposium: {
    recommendation:
      "Organize by topic tracks: Room A = NLP, Room B = Health, Room C = Robotics, ordered by speaker availability.",

    partialPrefillAcknowledgment:
      "I have placed several talks on the schedule as a starting point. Complete the remaining assignments and revise any placement that conflicts with the task constraints.",

    fullPrefillAcknowledgment:
      "I have filled the schedule using this topic-track structure. Review every talk placement and revise any placement that conflicts with the task constraints.",

    reviewMessage:
      "Review the recommendation against all task constraints before submitting your final schedule.",
  },

  delivery: {
    recommendation:
      "Organize by delivery regions: Van A = North region, Van B = Central region, Van C = South region, ordered by driver availability.",

    partialPrefillAcknowledgment:
      "I have placed several shipments in the dispatch plan as a starting point. Complete the remaining assignments and revise any placement that conflicts with the task constraints.",

    fullPrefillAcknowledgment:
      "I have filled the dispatch plan using this regional structure. Review every shipment assignment and revise any placement that conflicts with the task constraints.",

    reviewMessage:
      "Review the recommendation against all task constraints before submitting your final dispatch plan.",
  },

  clinic: {
    recommendation:
      "Organize by clinical specialties: Ward A = Emergency care, Ward B = General medicine, Ward C = Critical care, ordered by nurse availability.",

    partialPrefillAcknowledgment:
      "I have placed several clinical duties in the roster as a starting point. Complete the remaining assignments and revise any placement that conflicts with the task constraints.",

    fullPrefillAcknowledgment:
      "I have filled the roster using this specialty-based structure. Review every duty assignment and revise any placement that conflicts with the task constraints.",

    reviewMessage:
      "Review the recommendation against all task constraints before submitting your final roster.",
  },
};

function isTaskDomainId(
  value:
    unknown,
): value is TaskDomainId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

export default function AIAssistantPanel({
  taskId,
}: AIAssistantPanelProps) {
  const {
    taskId:
      routeTaskId,
  } = useParams<{
    taskId?:
      string;
  }>();

  const resolvedTaskId:
    TaskDomainId =
      isTaskDomainId(
        taskId,
      )
        ? taskId
        : isTaskDomainId(
              routeTaskId,
            )
          ? routeTaskId
          : "symposium";

  const level =
    useSchedulerStore(
      (state) =>
        state.level,
    );

  const assistantContent =
    SYMPOSIUM_TASK_DATA
      .assistantByCondition[
        level
      ];

  const presentation =
    TASK_ASSISTANT_PRESENTATION[
      resolvedTaskId
    ];

  const prefillAcknowledgment =
    level === "B"
      ? presentation
          .partialPrefillAcknowledgment
      : level === "C"
        ? presentation
            .fullPrefillAcknowledgment
        : null;

  const contentVersion =
    `${assistantContent.contentVersion}-${resolvedTaskId}-v1`;

  return (
    <aside
      className="panel ai-assistant-panel"
      aria-label={
        assistantContent.name
      }
      data-content-version={
        contentVersion
      }
      data-task-id={
        resolvedTaskId
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

            {
              assistantContent
                .statusLabel
            }
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
              {
                assistantContent
                  .recommendationLabel
              }
            </div>

            <p>
              {
                presentation
                  .recommendation
              }
            </p>

            {prefillAcknowledgment ? (
              <p>
                {
                  prefillAcknowledgment
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
          {
            presentation
              .reviewMessage
          }
        </span>
      </div>
    </aside>
  );
}
