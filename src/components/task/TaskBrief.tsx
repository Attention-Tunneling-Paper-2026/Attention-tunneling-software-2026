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

const TASK_TITLE =
  "Symposium Scheduler";

const TASK_OBJECTIVE =
  "Create a complete symposium schedule that assigns every talk to a suitable room and time slot while satisfying the scheduling constraints.";

export default function TaskBrief({
  taskId = "symposium",
  taskNumber,
  totalTrials = 3,
  durationMinutes = 15,
  onOpenDetails,
  disabled = false,
}: TaskBriefProps) {
  const headingId =
    `${taskId}-task-${taskNumber}-brief-title`;

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
              {TASK_TITLE}
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
          aria-label="Open full details for Symposium Scheduler"
        >
          <Info
            size={17}
            aria-hidden="true"
          />

          View task details
        </button>
      </div>

      <p className="task-brief-objective">
        {TASK_OBJECTIVE}
      </p>

      <div className="task-brief-facts">
        <div className="task-brief-fact">
          <LayoutGrid
            size={19}
            aria-hidden="true"
          />

          <div>
            <strong>
              12 talks
            </strong>

            <span>
              Assign every talk exactly once
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
              3 rooms
            </strong>

            <span>
              Across 4 time slots
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