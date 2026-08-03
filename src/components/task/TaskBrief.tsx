import {
  Clock3,
  FileText,
  Info,
  LayoutGrid,
  MapPinned,
} from "lucide-react";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../../types/scheduler";

interface TaskBriefProps {
  taskId?:
    StudyTaskId;

  taskNumber:
    StudyTrialNumber;

  totalTrials?:
    number;

  durationMinutes?:
    number;

  onOpenDetails:
    () => void;

  disabled?:
    boolean;
}

type SupportedStudyTaskId =
  | "symposium"
  | "delivery"
  | "clinic";

interface TaskBriefContent {
  title:
    string;

  objective:
    string;

  itemCountLabel:
    string;

  itemInstruction:
    string;

  resourceCountLabel:
    string;

  resourceInstruction:
    string;

  detailsAriaLabel:
    string;
}

const TASK_BRIEF_CONTENT: Record<
  SupportedStudyTaskId,
  TaskBriefContent
> = {
  symposium: {
    title:
      "Symposium Scheduler",

    objective:
      "Create a complete symposium schedule that assigns every talk to a suitable room and time slot while satisfying the scheduling constraints.",

    itemCountLabel:
      "12 talks",

    itemInstruction:
      "Assign every talk exactly once",

    resourceCountLabel:
      "3 rooms",

    resourceInstruction:
      "Across 4 time slots",

    detailsAriaLabel:
      "Open full details for Symposium Scheduler",
  },

  delivery: {
    title:
      "Delivery Dispatch",

    objective:
      "Create a complete delivery plan that assigns every shipment to a suitable van and route window while satisfying the dispatch constraints.",

    itemCountLabel:
      "12 shipments",

    itemInstruction:
      "Assign every shipment exactly once",

    resourceCountLabel:
      "3 vans",

    resourceInstruction:
      "Across 4 route windows",

    detailsAriaLabel:
      "Open full details for Delivery Dispatch",
  },

  clinic: {
    title:
      "Clinic Roster",

    objective:
      "Create a complete clinic roster that assigns every duty to a suitable ward and shift while satisfying the staffing constraints.",

    itemCountLabel:
      "12 duties",

    itemInstruction:
      "Assign every duty exactly once",

    resourceCountLabel:
      "3 wards",

    resourceInstruction:
      "Across 4 shifts",

    detailsAriaLabel:
      "Open full details for Clinic Roster",
  },
};

function resolveTaskId(
  taskId:
    StudyTaskId,
): SupportedStudyTaskId {
  const value =
    String(taskId);

  if (
    value === "delivery" ||
    value === "clinic"
  ) {
    return value;
  }

  return "symposium";
}

export default function TaskBrief({
  taskId = "symposium",
  taskNumber,
  totalTrials = 3,
  durationMinutes = 15,
  onOpenDetails,
  disabled = false,
}: TaskBriefProps) {
  const resolvedTaskId =
    resolveTaskId(
      taskId,
    );

  const content =
    TASK_BRIEF_CONTENT[
      resolvedTaskId
    ];

  const headingId =
    `${resolvedTaskId}-task-${taskNumber}-brief-title`;

  return (
    <section
      className="task-brief"
      aria-labelledby={
        headingId
      }
    >
      <div className="task-brief-header">
        <div className="task-brief-heading">
          <div className="task-brief-icon">
            <FileText
              size={22}
              aria-hidden="true"
            />
          </div>

          <div>
            <div className="task-brief-progress">
              Task {taskNumber} of{" "}
              {totalTrials}
            </div>

            <h1 id={headingId}>
              {content.title}
            </h1>
          </div>
        </div>

        <button
          type="button"
          className="task-details-button"
          onClick={
            onOpenDetails
          }
          disabled={
            disabled
          }
          aria-label={
            content.detailsAriaLabel
          }
        >
          <Info
            size={17}
            aria-hidden="true"
          />

          View task details
        </button>
      </div>

      <p className="task-brief-objective">
        {content.objective}
      </p>

      <div className="task-brief-facts">
        <div className="task-brief-fact">
          <LayoutGrid
            size={19}
            aria-hidden="true"
          />

          <div>
            <strong>
              {content.itemCountLabel}
            </strong>

            <span>
              {content.itemInstruction}
            </span>
          </div>
        </div>

        <div className="task-brief-fact">
          <MapPinned
            size={19}
            aria-hidden="true"
          />

          <div>
            <strong>
              {content.resourceCountLabel}
            </strong>

            <span>
              {content.resourceInstruction}
            </span>
          </div>
        </div>

        <div className="task-brief-fact">
          <Clock3
            size={19}
            aria-hidden="true"
          />

          <div>
            <strong>
              {durationMinutes} minutes
            </strong>

            <span>
              Timer starts after AI analysis
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
