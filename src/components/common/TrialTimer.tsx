interface TrialTimerProps {
  remainingSeconds: number;
}

type TimerWarningLevel =
  | "normal"
  | "warning"
  | "danger";

function normalizeRemainingSeconds(
  remainingSeconds: number,
): number {
  if (!Number.isFinite(remainingSeconds)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(remainingSeconds),
  );
}

function formatTime(
  totalSeconds: number,
): string {
  const minutes = Math.floor(
    totalSeconds / 60,
  );
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function getWarningLevel(
  remainingSeconds: number,
): TimerWarningLevel {
  if (remainingSeconds <= 180) {
    return "danger";
  }

  if (remainingSeconds <= 300) {
    return "warning";
  }

  return "normal";
}

export default function TrialTimer({
  remainingSeconds,
}: TrialTimerProps) {
  const safeRemainingSeconds =
    normalizeRemainingSeconds(
      remainingSeconds,
    );

  const warningLevel =
    getWarningLevel(
      safeRemainingSeconds,
    );

  const timerClass = [
    "scheduler-timer",

    warningLevel === "warning"
      ? "scheduler-timer-warning"
      : "",

    warningLevel === "danger"
      ? "scheduler-timer-danger"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={timerClass}
      role="timer"
      aria-live={
        safeRemainingSeconds <= 10
          ? "assertive"
          : "off"
      }
      aria-atomic="true"
      aria-label={`${safeRemainingSeconds} seconds remaining`}
      data-warning-level={warningLevel}
      data-remaining-seconds={
        safeRemainingSeconds
      }
    >
      {formatTime(
        safeRemainingSeconds,
      )}
    </div>
  );
}
