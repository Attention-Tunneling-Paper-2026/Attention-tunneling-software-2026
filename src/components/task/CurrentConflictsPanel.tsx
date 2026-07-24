import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { TALKS } from "../../data/symposium";
import { useSchedulerStore } from "../../store/schedulerStore";
import { getSpeakerViolations } from "../../metrics/schedulerMetrics";

function getTalkTitle(
  talkId: string,
): string {
  const talk = TALKS.find(
    (item) => item.id === talkId,
  );

  return talk
    ? `${talk.id} ${talk.title}`
    : talkId;
}

export default function CurrentConflictsPanel() {
  const placements = useSchedulerStore(
    (state) => state.placements,
  );

  const conflicts =
    getSpeakerViolations(
      placements,
    );

  if (conflicts.length === 0) {
    return (
      <section
        className="current-conflicts-panel current-conflicts-panel-clear"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="current-conflicts-header">
          <div className="current-conflicts-title">
            <CheckCircle2
              size={19}
              aria-hidden="true"
            />

            <span>
              No current speaker conflicts
            </span>
          </div>

          <span className="current-conflicts-count">
            0 conflicts
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="current-conflicts-panel"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="current-conflicts-title"
    >
      <div className="current-conflicts-header">
        <div
          id="current-conflicts-title"
          className="current-conflicts-title"
        >
          <AlertTriangle
            size={19}
            aria-hidden="true"
          />

          <span>
            Current speaker conflicts
          </span>
        </div>

        <span className="current-conflicts-count">
          {conflicts.length}{" "}
          {conflicts.length === 1
            ? "conflict"
            : "conflicts"}
        </span>
      </div>

      <div className="current-conflicts-list">
        {conflicts.map((conflict) => {
          const talkLabels =
            conflict.talkIds.map(
              getTalkTitle,
            );

          return (
            <div
              key={[
                conflict.speaker,
                conflict.slot,
                ...conflict.talkIds,
              ].join(":")}
              className="current-conflict-item"
            >
              <AlertTriangle
                size={16}
                aria-hidden="true"
              />

              <span>
                Dr. {conflict.speaker} is assigned to{" "}
                {talkLabels.join(" and ")} during Slot{" "}
                {conflict.slot}.
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}