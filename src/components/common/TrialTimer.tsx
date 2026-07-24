interface TrialTimerProps {
  remainingSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function TrialTimer({
  remainingSeconds,
}: TrialTimerProps) {
  const timerClass =
    remainingSeconds <= 180
      ? "scheduler-timer scheduler-timer-danger"
      : remainingSeconds <= 300
        ? "scheduler-timer scheduler-timer-warning"
        : "scheduler-timer";

  return (
    <div
      className={timerClass}
      role="timer"
      aria-live={
        remainingSeconds <= 10
          ? "assertive"
          : "off"
      }
      aria-label={`${remainingSeconds} seconds remaining`}
    >
      {formatTime(remainingSeconds)}
    </div>
  );
}