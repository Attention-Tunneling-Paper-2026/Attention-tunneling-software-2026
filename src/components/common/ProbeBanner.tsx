import {
  Bell,
  Megaphone,
} from "lucide-react";

import {
  useParams,
} from "react-router";

import {
  SEMANTIC_PROBE,
} from "../../data/symposium";

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

interface ProbePresentation {
  id:
    string;

  version:
    string;

  title:
    string;

  message:
    string;

  collapsedLabel:
    string;

  displayMode:
    string;

  updateLabel:
    string;
}

function isStudyTaskId(
  value:
    unknown,
): value is StudyTaskId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

function getProbePresentation(
  taskId:
    StudyTaskId,
): ProbePresentation {
  switch (
    taskId
  ) {
    case "delivery":
      return {
        id:
          "delivery-refrigeration-failure",

        version:
          "delivery_probe_v1",

        title:
          "Vehicle Update",

        message:
          "The refrigeration unit in Van C has failed for the rest of the day. Cold-chain shipments must be reassigned to a van with functioning refrigeration.",

        collapsedLabel:
          "Open delivery vehicle update",

        displayMode:
          SEMANTIC_PROBE.displayMode,

        updateLabel:
          "delivery vehicle update",
      };

    case "clinic":
      return {
        id:
          "clinic-icu-certification-loss",

        version:
          "clinic_probe_v1",

        title:
          "Certification Update",

        message:
          "Ward C has lost ICU certification for the rest of the shift. ICU-required duties must be reassigned to an ICU-certified ward.",

        collapsedLabel:
          "Open clinic certification update",

        displayMode:
          SEMANTIC_PROBE.displayMode,

        updateLabel:
          "clinic certification update",
      };

    case "symposium":
    default:
      return {
        id:
          SEMANTIC_PROBE.id,

        version:
          SEMANTIC_PROBE.version,

        title:
          SEMANTIC_PROBE.title,

        message:
          SEMANTIC_PROBE.message,

        collapsedLabel:
          SEMANTIC_PROBE.collapsedLabel,

        displayMode:
          SEMANTIC_PROBE.displayMode,

        updateLabel:
          "facilities update",
      };
  }
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
      taskId ??
      (
        isStudyTaskId(
          routeTaskId,
        )
          ? routeTaskId
          : "symposium"
      );

  const probe =
    getProbePresentation(
      resolvedTaskId,
    );

  if (
    !visible
  ) {
    return null;
  }

  /*
   * The bell remains available after acknowledgement so the task update
   * is represented through the end of the trial. The unread badge appears
   * only before acknowledgement.
   */
  if (
    collapsed ||
    acknowledged
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
            ? `Open acknowledged ${probe.updateLabel}`
            : `Open unread ${probe.updateLabel}`
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
        data-probe-acknowledged={
          acknowledged
        }
      >
        <Bell
          size={20}
          aria-hidden="true"
        />

        {!acknowledged ? (
          <span
            className="probe-notification-badge"
            aria-hidden="true"
          >
            1
          </span>
        ) : null}
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
        aria-label={`Acknowledge ${probe.updateLabel}`}
      >
        OK
      </button>
    </section>
  );
}
