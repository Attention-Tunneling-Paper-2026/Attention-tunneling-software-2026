import {
  useParams,
} from "react-router";

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

type TaskDomainId =
  | "symposium"
  | "delivery"
  | "clinic";

interface SchedulerGridProps {
  taskId?:
    TaskDomainId;
}

interface GridPresentation {
  unlockedAriaLabel:
    string;

  lockedAriaLabel:
    string;

  rowAxisLabel:
    string;

  getColumnLabel: (
    slot:
      Slot,
  ) => string;

  getRowLabel: (
    room:
      Room,
  ) => string;

  getCapacityLabel: (
    capacity:
      number,
  ) => string;

  getEquipmentLabel: (
    available:
      boolean,
  ) => string;

  hint:
    string;
}

const GRID_PRESENTATION: Record<
  TaskDomainId,
  GridPresentation
> = {
  symposium: {
    unlockedAriaLabel:
      "Symposium schedule",

    lockedAriaLabel:
      "Symposium schedule, locked",

    rowAxisLabel:
      "Room",

    getColumnLabel: (
      slot,
    ) => `Slot ${slot}`,

    getRowLabel: (
      room,
    ) => `Room ${room}`,

    getCapacityLabel: (
      capacity,
    ) => `${capacity} seats`,

    getEquipmentLabel: (
      available,
    ) =>
      available
        ? "Projector available"
        : "No projector",

    hint:
      "Demo talks require a projector room. Availability windows, room restrictions, and capacity requirements are enforced while dragging. Speaker conflicts remain visible.",
  },

  delivery: {
    unlockedAriaLabel:
      "Delivery dispatch plan",

    lockedAriaLabel:
      "Delivery dispatch plan, locked",

    rowAxisLabel:
      "Van",

    getColumnLabel: (
      slot,
    ) => `Window ${slot}`,

    getRowLabel: (
      room,
    ) => `Van ${room}`,

    getCapacityLabel: (
      capacity,
    ) => `${capacity}-unit capacity`,

    getEquipmentLabel: (
      available,
    ) =>
      available
        ? "Refrigeration available"
        : "No refrigeration",

    hint:
      "Cold-chain shipments require a refrigerated van. Availability windows, vehicle restrictions, and capacity requirements are enforced while dragging. Driver conflicts remain visible.",
  },

  clinic: {
    unlockedAriaLabel:
      "Clinic roster",

    lockedAriaLabel:
      "Clinic roster, locked",

    rowAxisLabel:
      "Ward",

    getColumnLabel: (
      slot,
    ) => `Shift ${slot}`,

    getRowLabel: (
      room,
    ) => `Ward ${room}`,

    getCapacityLabel: (
      capacity,
    ) => `${capacity}-patient capacity`,

    getEquipmentLabel: (
      available,
    ) =>
      available
        ? "ICU certified"
        : "Not ICU certified",

    hint:
      "ICU-required duties must be assigned to an ICU-certified ward. Availability windows, ward restrictions, and capacity requirements are enforced while dragging. Nurse conflicts remain visible.",
  },
};

function isTaskDomainId(
  value:
    unknown,
): value is TaskDomainId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

export default function SchedulerGrid({
  taskId,
}: SchedulerGridProps) {
  const {
    taskId:
      taskIdParam,
  } = useParams<{
    taskId?:
      string;
  }>();

  const resolvedTaskId:
    TaskDomainId =
      isTaskDomainId(
        taskId,
      )
        ? taskId
        : isTaskDomainId(
              taskIdParam,
            )
          ? taskIdParam
          : "symposium";

  const presentation =
    GRID_PRESENTATION[
      resolvedTaskId
    ];

  const placements =
    useSchedulerStore(
      (state) =>
        state.placements,
    );

  const trialLocked =
    useSchedulerStore(
      (state) =>
        state.trialLocked,
    );

  function getTalkAtCell(
    room:
      Room,
    slot:
      Slot,
  ): Talk | undefined {
    const placement =
      placements.find(
        (item) =>
          item.room === room &&
          item.slot === slot,
      );

    if (
      !placement
    ) {
      return undefined;
    }

    return getTalkById(
      placement.talkId,
    );
  }

  /*
   * Speaker identity remains internal here. ScheduleCell converts it to
   * the participant-facing label. In the delivery and clinic skins, the
   * same shared identity field represents the assigned driver or nurse.
   */
  function hasResourceConflict(
    talkId:
      string,
    slot:
      Slot,
  ): boolean {
    const talk =
      getTalkById(
        talkId,
      );

    if (
      !talk?.speaker
    ) {
      return false;
    }

    return placements.some(
      (placement) => {
        if (
          placement.slot !==
            slot ||
          placement.talkId ===
            talk.id
        ) {
          return false;
        }

        const otherTalk =
          getTalkById(
            placement.talkId,
          );

        return (
          otherTalk?.speaker ===
          talk.speaker
        );
      },
    );
  }

  return (
    <section
      className="scheduler-grid"
      aria-label={
        trialLocked
          ? presentation.lockedAriaLabel
          : presentation.unlockedAriaLabel
      }
      aria-disabled={
        trialLocked
      }
      data-trial-locked={
        trialLocked
      }
      data-task-id={
        resolvedTaskId
      }
    >
      <div
        className="grid-header"
        role="row"
      >
        <div
          className="slot-label"
          aria-hidden="true"
        >
          {presentation.rowAxisLabel}
        </div>

        {SLOTS.map(
          (slot) => (
            <div
              key={slot}
              className="slot-label"
              role="columnheader"
            >
              {presentation.getColumnLabel(
                slot,
              )}
            </div>
          ),
        )}
      </div>

      {/* ADVISER FIX: Give the three schedule rows a dedicated layout container. */}
      <div
        className="scheduler-grid-rows"
        role="grid"
        aria-colcount={
          SLOTS.length + 1
        }
        aria-rowcount={
          ROOMS.length
        }
        aria-readonly={
          trialLocked
        }
      >
        {ROOMS.map(
          (room) => {
            const details =
              ROOM_DETAILS[
                room
              ];

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
                    {presentation.getRowLabel(
                      room,
                    )}
                  </strong>

                  <span>
                    {presentation.getCapacityLabel(
                      details.capacity,
                    )}
                  </span>

                  <span>
                    {presentation.getEquipmentLabel(
                      details.hasProjector,
                    )}
                  </span>
                </div>

                {SLOTS.map(
                  (slot) => {
                    const talk =
                      getTalkAtCell(
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
                            ? hasResourceConflict(
                                talk.id,
                                slot,
                              )
                            : false
                        }
                      />
                    );
                  },
                )}
              </div>
            );
          },
        )}
      </div>

      <div className="grid-hint">
        {presentation.hint}
      </div>
    </section>
  );
}
