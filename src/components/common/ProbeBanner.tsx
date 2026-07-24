import {
  Bell,
  Megaphone,
} from "lucide-react";

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
  if (!visible || acknowledged) {
    return null;
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className="probe-notification-button"
        onClick={onOpenCollapsed}
        aria-label="Open unread facilities update"
        title="Facilities update"
      >
        <Bell
          size={20}
          aria-hidden="true"
        />

        <span
          className="probe-notification-badge"
          aria-hidden="true"
        >
          1
        </span>
      </button>
    );
  }

  return (
    <section
      className="scheduler-banner"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="probe-banner-message">
        <Megaphone
          size={20}
          aria-hidden="true"
        />

        <div>
          <strong>
            Facilities update
          </strong>

          <div>
            The projector in Room C is broken for the
            rest of the day.
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