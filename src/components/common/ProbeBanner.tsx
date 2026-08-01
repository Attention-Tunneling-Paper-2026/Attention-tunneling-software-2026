import {
  Bell,
  Megaphone,
} from "lucide-react";

import {
  SEMANTIC_PROBE,
} from "../../data/symposium";

interface ProbeBannerProps {
  visible: boolean;
  acknowledged: boolean;
  collapsed: boolean;
  onAcknowledge: () => void;
  onOpenCollapsed: () => void;
}

export default function ProbeBanner({
  visible,
  acknowledged,
  collapsed,
  onAcknowledge,
  onOpenCollapsed,
}: ProbeBannerProps) {
  if (!visible) {
    return null;
  }

  /*
   * The bell remains available after acknowledgement so the facilities
   * update is still represented through the end of the trial. The unread
   * badge is shown only before acknowledgement.
   */
  if (collapsed || acknowledged) {
    return (
      <button
        type="button"
        className="probe-notification-button"
        onClick={onOpenCollapsed}
        aria-label={
          acknowledged
            ? "Open acknowledged facilities update"
            : "Open unread facilities update"
        }
        title={SEMANTIC_PROBE.collapsedLabel}
        data-probe-id={SEMANTIC_PROBE.id}
        data-probe-version={SEMANTIC_PROBE.version}
        data-probe-acknowledged={acknowledged}
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
      data-probe-id={SEMANTIC_PROBE.id}
      data-probe-version={SEMANTIC_PROBE.version}
      data-probe-display-mode={
        SEMANTIC_PROBE.displayMode
      }
    >
      <div className="probe-banner-message">
        <Megaphone
          size={20}
          aria-hidden="true"
        />

        <div>
          <strong>
            {SEMANTIC_PROBE.title}
          </strong>

          <div>
            {SEMANTIC_PROBE.message}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="probe-acknowledge-button"
        onClick={onAcknowledge}
        aria-label="Acknowledge facilities update"
      >
        OK
      </button>
    </section>
  );
}
