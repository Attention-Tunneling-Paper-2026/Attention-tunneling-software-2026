import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import {
  getSpeakerDisplayLabel,
} from "../../data/symposium";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

import type {
  MoveValidationResult,
  Room,
  Slot,
  Talk,
} from "../../types/scheduler";

interface ScheduleCellProps {
  room: Room;
  slot: Slot;
  talk?: Talk;
  hasConflict?: boolean;
}

function getIllegalMoveLabel(
  reason: MoveValidationResult["reason"],
): string {
  switch (reason) {
    case "trial_locked":
      return "The trial is locked.";

    case "target_room_not_allowed":
    case "displaced_talk_room_not_allowed":
      return "The room is not allowed for this move or swap.";

    case "target_slot_not_allowed":
    case "displaced_talk_slot_not_allowed":
      return "The slot is not allowed for this move or swap.";

    case "target_projector_required":
    case "displaced_talk_projector_required":
      return "A required projector is unavailable for this move or swap.";

    case "target_capacity_insufficient":
    case "displaced_talk_capacity_insufficient":
      return "The room capacity is insufficient for this move or swap.";

    case "talk_not_found":
    case "source_not_found":
      return "The selected talk could not be moved.";

    case "same_cell":
      return "The talk is already in this cell.";

    case "tray_unplace_disabled":
      return "Returning this talk to the tray is disabled.";

    default:
      return "Unavailable for the selected talk or swap.";
  }
}

export default function ScheduleCell({
  room,
  slot,
  talk,
  hasConflict = false,
}: ScheduleCellProps) {
  const activeTalkId = useSchedulerStore(
    (state) => state.activeTalkId,
  );

  const validateMoveOrSwapTalk = useSchedulerStore(
    (state) => state.validateMoveOrSwapTalk,
  );

  const trialLocked = useSchedulerStore(
    (state) => state.trialLocked,
  );

  const cellId = `cell-${room}-${slot}`;

  /*
   * Structural legality is evaluated by the store for both sides of a
   * possible swap. Speaker conflicts remain visible and violable.
   */
  const moveValidation =
    activeTalkId === null
      ? null
      : validateMoveOrSwapTalk(
          activeTalkId,
          room,
          slot,
        );

  const dropIsLegal =
    moveValidation === null ||
    moveValidation.valid;

  const occupiedByDifferentTalk = Boolean(
    activeTalkId &&
      talk &&
      talk.id !== activeTalkId,
  );

  const currentTalkCell = Boolean(
    activeTalkId &&
      talk?.id === activeTalkId,
  );

  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id: cellId,

    /*
     * Keep cells registered during a drag even when a move is illegal.
     * This allows the parent DnD handler to observe and log illegal hovers.
     */
    disabled: activeTalkId === null,

    data: {
      type: "schedule-cell",
      room,
      slot,
      occupiedTalkId: talk?.id ?? null,
      dropIsLegal,
      illegalReason:
        moveValidation?.reason ?? null,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: talk
      ? `talk-${talk.id}`
      : `empty-${cellId}`,

    disabled: !talk || trialLocked,

    data: {
      type: "talk",
      talkId: talk?.id,
      room,
      slot,
      origin: "grid",
    },
  });

  const draggableStyle = transform
    ? {
        transform:
          `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const topicClass = talk
    ? `schedule-cell-${talk.topic.toLowerCase()}`
    : "schedule-cell-empty";

  const cellClasses = [
    "schedule-cell-dropzone",

    activeTalkId && !dropIsLegal
      ? "schedule-cell-illegal"
      : "",

    activeTalkId && dropIsLegal
      ? "schedule-cell-legal"
      : "",

    isOver && dropIsLegal
      ? "schedule-cell-over"
      : "",

    activeTalkId &&
    occupiedByDifferentTalk &&
    dropIsLegal
      ? "schedule-cell-occupied-target"
      : "",

    currentTalkCell
      ? "schedule-cell-current"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const speakerLabel =
    talk?.speaker
      ? getSpeakerDisplayLabel(
          talk.speaker,
        )
      : "";

  const movementLabel =
    activeTalkId !== null &&
    !dropIsLegal
      ? getIllegalMoveLabel(
          moveValidation?.reason,
        )
      : "";

  const cellLabel = talk
    ? [
        `Room ${room}`,
        `Slot ${slot}`,
        talk.id,
        talk.title,
        speakerLabel,

        talk.demo
          ? "Demo talk requiring a projector"
          : "",

        hasConflict
          ? "Speaker conflict"
          : "",

        movementLabel,
      ]
        .filter(Boolean)
        .join(", ")
    : [
        `Room ${room}`,
        `Slot ${slot}`,
        "empty",
        movementLabel,
      ]
        .filter(Boolean)
        .join(", ");

  return (
    <div
      ref={setDroppableRef}
      className={cellClasses}
      role="gridcell"
      aria-label={cellLabel}
      aria-disabled={
        activeTalkId !== null &&
        !dropIsLegal
      }
      data-drop-legal={
        activeTalkId === null
          ? undefined
          : dropIsLegal
      }
      data-illegal-reason={
        moveValidation?.reason
      }
      data-room={room}
      data-slot={slot}
    >
      {talk ? (
        <div
          ref={setDraggableRef}
          style={draggableStyle}
          {...listeners}
          {...attributes}
          className={[
            "schedule-cell",
            topicClass,

            hasConflict
              ? "schedule-cell-conflict"
              : "",

            isDragging
              ? "schedule-cell-dragging"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-grabbed={isDragging}
          aria-disabled={trialLocked}
        >
          <div className="talk-card-content">
            <div className="talk-card-id">
              {talk.id}

              {talk.demo ? (
                <span
                  className="demo-indicator"
                  title="Projector required"
                >
                  Demo
                </span>
              ) : null}

              {hasConflict ? (
                <span
                  className="conflict-indicator"
                  aria-label="Speaker conflict"
                  title="Speaker conflict"
                >
                  ⚠
                </span>
              ) : null}
            </div>

            <div className="talk-card-title">
              {talk.title}
            </div>

            {speakerLabel ? (
              <div className="talk-card-speaker">
                {speakerLabel}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="schedule-cell schedule-cell-empty">
          <span>
            {activeTalkId && !dropIsLegal
              ? "Unavailable"
              : activeTalkId
                ? "Move here"
                : "Empty"}
          </span>
        </div>
      )}
    </div>
  );
}
