import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import {
  getSpeakerDisplayLabel,
  getTalkById,
} from "../../data/symposium";

import {
  getSpeakerViolations,
} from "../../metrics/schedulerMetrics";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

function getTalkTitle(
  talkId: string,
): string {
  const talk = getTalkById(
    talkId,
  );

  return talk
    ? `${talk.id} ${talk.title}`
    : talkId;
}

export default function CurrentConflictsPanel() {
  const placements = useSchedulerStore(
    (state) => state.placements,
  );

  const conflicts = getSpeakerViolations(
    placements,
  );

  const allSpeakerConflictsResolved =
    conflicts.length === 0;

  return (
    <section
      className={[
        "current-conflicts-panel",

        allSpeakerConflictsResolved
          ? "current-conflicts-panel-clear"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
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
          {allSpeakerConflictsResolved ? (
            <CheckCircle2
              size={19}
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              size={19}
              aria-hidden="true"
            />
          )}

          <span>
            {allSpeakerConflictsResolved
              ? "No current speaker conflicts"
              : "Current speaker conflicts"}
          </span>
        </div>

        <span className="current-conflicts-count">
          {conflicts.length}{" "}
          {conflicts.length === 1
            ? "conflict"
            : "conflicts"}
        </span>
      </div>

      {allSpeakerConflictsResolved ? (
        <div className="current-conflicts-list">
          <div className="current-conflict-item">
            <CheckCircle2
              size={16}
              aria-hidden="true"
            />

            <span>
              The visible speaker conflicts are resolved.
              Continue considering both scheduling
              preferences before submitting the schedule.
            </span>
          </div>
        </div>
      ) : (
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
                  {getSpeakerDisplayLabel(
                    conflict.speaker,
                  )}{" "}
                  is assigned to{" "}
                  {talkLabels.join(" and ")}{" "}
                  during Slot {conflict.slot}.
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
