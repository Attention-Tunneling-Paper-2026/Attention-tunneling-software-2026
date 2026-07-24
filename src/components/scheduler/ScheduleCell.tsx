import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useSchedulerStore } from "../../store/schedulerStore";
import type {
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

export default function ScheduleCell({
  room,
  slot,
  talk,
  hasConflict = false,
}: ScheduleCellProps) {
  const activeTalkId = useSchedulerStore(
    (state) => state.activeTalkId,
  );

  const canMoveOrSwapTalk = useSchedulerStore(
    (state) => state.canMoveOrSwapTalk,
  );

  const cellId = `cell-${room}-${slot}`;

  const dropIsLegal = activeTalkId
    ? canMoveOrSwapTalk(
        activeTalkId,
        room,
        slot,
      )
    : true;

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
    disabled:
      activeTalkId !== null &&
      !dropIsLegal,
    data: {
      type: "schedule-cell",
      room,
      slot,
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
    disabled: !talk,
    data: {
      type: "talk",
      talkId: talk?.id,
      room,
      slot,
    },
  });

  const draggableStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
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

  const speakerLabel = talk?.speaker
    ? `Dr. ${talk.speaker}`
    : "Solo speaker";

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
      ]
        .filter(Boolean)
        .join(", ")
    : `Room ${room}, Slot ${slot}, empty`;

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

            <div className="talk-card-speaker">
              {speakerLabel}
            </div>
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