import { useDraggable } from "@dnd-kit/core";
import { TALKS } from "../../data/symposium";
import { useSchedulerStore } from "../../store/schedulerStore";
import type { Talk } from "../../types/scheduler";

interface UnassignedTalkProps {
  talk: Talk;
}

function UnassignedTalk({
  talk,
}: UnassignedTalkProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `talk-${talk.id}`,
    data: {
      type: "talk",
      talkId: talk.id,
      source: "unassigned-tray",
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const speakerLabel = talk.speaker
    ? `Dr. ${talk.speaker}`
    : "Solo speaker";

  const accessibilityLabel = [
    talk.id,
    talk.title,
    talk.topic,
    speakerLabel,
    talk.demo
      ? "Demo talk requiring a projector"
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        "unassigned-talk",
        `unassigned-${talk.topic.toLowerCase()}`,
        isDragging
          ? "unassigned-talk-dragging"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={accessibilityLabel}
      title="Drag this talk to an available schedule cell"
    >
      <div className="unassigned-talk-header">
        <strong>{talk.id}</strong>

        {talk.demo ? (
          <span
            className="demo-indicator"
            title="Projector required"
          >
            Demo
          </span>
        ) : null}
      </div>

      <span className="unassigned-talk-title">
        {talk.title}
      </span>

      <span className="unassigned-talk-speaker">
        {speakerLabel}
      </span>
    </div>
  );
}

export default function UnassignedTray() {
  const unassignedTalkIds = useSchedulerStore(
    (state) => state.unassignedTalkIds,
  );

  const talks = TALKS.filter((talk) =>
    unassignedTalkIds.includes(talk.id),
  );

  return (
    <section
      className="unassigned-tray"
      aria-label="Unassigned talks"
    >
      <div className="unassigned-tray-title">
        Unassigned talks
      </div>

      <div className="unassigned-tray-description">
        Drag each talk into an available room and slot.
        Once assigned, move or swap it within the schedule.
      </div>

      {talks.length === 0 ? (
        <div
          className="unassigned-empty"
          role="status"
        >
          All talks are assigned.
        </div>
      ) : (
        <div className="unassigned-list">
          {talks.map((talk) => (
            <UnassignedTalk
              key={talk.id}
              talk={talk}
            />
          ))}
        </div>
      )}
    </section>
  );
}