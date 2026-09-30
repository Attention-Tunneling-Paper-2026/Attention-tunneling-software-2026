import {
  Bell,
  Megaphone,
} from "lucide-react";

import {
  useParams,
} from "react-router";

import {
  getSemanticProbe,
} from "../../data/symposium";

import {
  isStudyTaskId,
} from "../../types/scheduler";

import type {
  StudyTaskId,
} from "../../types/scheduler";

interface ProbeBannerProps {
  visible:
    boolean;

  acknowledged:
    boolean;

  collapsed:
    boolean;

  onAcknowledge:
    () => void;

  onOpenCollapsed:
    () => void;

  taskId?:
    StudyTaskId;
}

export default function ProbeBanner({
  visible,
  acknowledged,
  collapsed,
  onAcknowledge,
  onOpenCollapsed,
  taskId,
}: ProbeBannerProps) {
  const {
    taskId:
      routeTaskId,
  } = useParams<{
    taskId?:
      string;
  }>();

  const resolvedTaskId:
    StudyTaskId =
      isStudyTaskId(
        taskId,
      )
        ? taskId
        : isStudyTaskId(
              routeTaskId,
            )
          ? routeTaskId
          : "symposium";

  /*
   * Probe wording, IDs, versions, timing metadata, and affected resources
   * come from the same canonical task data used by logging and metrics.
   * This prevents the visible update from drifting away from the recorded
   * experimental configuration.
   */
  const probe =
    getSemanticProbe(
      resolvedTaskId,
    );

  const updateLabel =
    probe.title.toLowerCase();

  // ADVISER FIX: Acknowledgement no longer removes the task update permanently.
  if (
    !visible
  ) {
    return null;
  }

  if (
    collapsed
  ) {
    return (
      <button
        type="button"
        className="probe-notification-button"
        onClick={
          onOpenCollapsed
        }
        aria-label={
          acknowledged
            ? `Reopen ${updateLabel}`
            : `Open unread ${updateLabel}`
        }
        title={
          probe.collapsedLabel
        }
        data-task-id={
          resolvedTaskId
        }
        data-probe-id={
          probe.id
        }
        data-probe-version={
          probe.version
        }
        data-probe-display-mode={
          probe.displayMode
        }
        data-probe-acknowledged={
          acknowledged
            ? "true"
            : "false"
        }
      >
        <Bell
          size={20}
          aria-hidden="true"
        />

        {!acknowledged && (
          <span
            className="probe-notification-badge"
            aria-hidden="true"
          >
            1
          </span>
        )}
      </button>
    );
  }

  return (
    <section
      className="scheduler-banner"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-task-id={
        resolvedTaskId
      }
      data-probe-id={
        probe.id
      }
      data-probe-version={
        probe.version
      }
      data-probe-display-mode={
        probe.displayMode
      }
      data-probe-semantic-only={
        probe.semanticOnly
      }
      data-probe-acknowledged={
        acknowledged
          ? "true"
          : "false"
      }
    >
      <div className="probe-banner-message">
        <Megaphone
          size={20}
          aria-hidden="true"
        />

        <div>
          <strong>
            {probe.title}
          </strong>

          <div>
            {probe.message}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="probe-acknowledge-button"
        onClick={
          onAcknowledge
        }
        aria-label={
          acknowledged
            ? `Close ${updateLabel}`
            : `Acknowledge ${updateLabel}`
        }
      >
        {acknowledged
          ? "Close"
          : "OK"}
      </button>
    </section>
  );
}
