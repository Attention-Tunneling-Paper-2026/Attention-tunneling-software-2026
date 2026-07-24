import { TALKS } from "../../data/symposium";
import { useSchedulerStore } from "../../store/schedulerStore";
import type {
  Room,
  Slot,
  Talk,
} from "../../types/scheduler";
import ScheduleCell from "./ScheduleCell";

const rooms: Room[] = ["A", "B", "C"];
const slots: Slot[] = [1, 2, 3, 4];

const roomDetails: Record<
  Room,
  {
    capacity: number;
    hasProjector: boolean;
  }
> = {
  A: {
    capacity: 120,
    hasProjector: true,
  },
  B: {
    capacity: 80,
    hasProjector: false,
  },
  C: {
    capacity: 60,
    hasProjector: true,
  },
};

export default function SchedulerGrid() {
  const placements = useSchedulerStore(
    (state) => state.placements,
  );

  function getTalkAt(
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

    return TALKS.find(
      (talk) =>
        talk.id === placement.talkId,
    );
  }

  function hasSpeakerConflict(
    talkId: string,
    slot: Slot,
  ): boolean {
    const talk = TALKS.find(
      (item) => item.id === talkId,
    );

    if (!talk?.speaker) {
      return false;
    }

    return placements
      .filter(
        (placement) =>
          placement.slot === slot,
      )
      .map((placement) =>
        TALKS.find(
          (item) =>
            item.id === placement.talkId,
        ),
      )
      .filter(
        (
          item,
        ): item is Talk =>
          item !== undefined,
      )
      .some(
        (otherTalk) =>
          otherTalk.id !== talk.id &&
          otherTalk.speaker ===
            talk.speaker,
      );
  }

  return (
    <section
      className="scheduler-grid"
      aria-label="Symposium schedule"
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

        {slots.map((slot) => (
          <div
            key={slot}
            className="slot-label"
            role="columnheader"
          >
            Slot {slot}
          </div>
        ))}
      </div>

      <div role="grid">
        {rooms.map((room) => {
          const details =
            roomDetails[room];

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

              {slots.map((slot) => {
                const talk =
                  getTalkAt(
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
        Availability windows, equipment requirements,
        and room capacity restrictions are enforced
        while dragging.
      </div>
    </section>
  );
}