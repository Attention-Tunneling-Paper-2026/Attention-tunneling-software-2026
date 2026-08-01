import {
  ROOM_DETAILS,
  ROOMS,
  SLOTS,
  getTalkById,
} from "../../data/symposium";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

import type {
  Room,
  Slot,
  Talk,
} from "../../types/scheduler";

import ScheduleCell from "./ScheduleCell";

export default function SchedulerGrid() {
  const placements = useSchedulerStore(
    (state) => state.placements,
  );

  const trialLocked = useSchedulerStore(
    (state) => state.trialLocked,
  );

  function getTalkAtCell(
    room: Room,
    slot: Slot,
  ): Talk | undefined {
    const placement = placements.find(
      (item) =>
        item.room === room &&
        item.slot === slot,
    );

    if (!placement) {
      return undefined;
    }

    return getTalkById(placement.talkId);
  }

  /*
   * Speaker identity remains internal here. ScheduleCell converts it to
   * the participant-facing label, such as Kim to Dr. Chaky.
   */
  function hasSpeakerConflict(
    talkId: string,
    slot: Slot,
  ): boolean {
    const talk = getTalkById(talkId);

    if (!talk?.speaker) {
      return false;
    }

    return placements.some((placement) => {
      if (
        placement.slot !== slot ||
        placement.talkId === talk.id
      ) {
        return false;
      }

      const otherTalk = getTalkById(
        placement.talkId,
      );

      return otherTalk?.speaker === talk.speaker;
    });
  }

  return (
    <section
      className="scheduler-grid"
      aria-label={
        trialLocked
          ? "Symposium schedule, locked"
          : "Symposium schedule"
      }
      aria-disabled={trialLocked}
      data-trial-locked={trialLocked}
    >
      <div
        className="grid-header"
        role="row"
      >
        <div
          className="slot-label"
          aria-hidden="true"
        >
          Room
        </div>

        {SLOTS.map((slot) => (
          <div
            key={slot}
            className="slot-label"
            role="columnheader"
          >
            Slot {slot}
          </div>
        ))}
      </div>

      <div
        role="grid"
        aria-colcount={SLOTS.length + 1}
        aria-rowcount={ROOMS.length}
        aria-readonly={trialLocked}
      >
        {ROOMS.map((room) => {
          const details = ROOM_DETAILS[room];

          return (
            <div
              key={room}
              className="room-row"
              role="row"
            >
              <div
                className="room-label"
                role="rowheader"
              >
                <strong>
                  Room {room}
                </strong>

                <span>
                  {details.capacity} seats
                </span>

                <span>
                  {details.hasProjector
                    ? "Projector available"
                    : "No projector"}
                </span>
              </div>

              {SLOTS.map((slot) => {
                const talk = getTalkAtCell(
                  room,
                  slot,
                );

                return (
                  <ScheduleCell
                    key={`${room}-${slot}`}
                    room={room}
                    slot={slot}
                    talk={talk}
                    hasConflict={
                      talk
                        ? hasSpeakerConflict(
                            talk.id,
                            slot,
                          )
                        : false
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="grid-hint">
        Demo talks require a projector room.
        Availability windows, room restrictions,
        and capacity requirements are enforced while
        dragging. Speaker conflicts remain visible.
      </div>
    </section>
  );
}
