import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useMemo } from "react";

import {
  getSpeakerDisplayLabel,
  getTalkById,
} from "../../data/symposium";
import {
  useSchedulerStore,
} from "../../store/schedulerStore";

import type {
  Talk,
} from "../../types/scheduler";

interface UnassignedTalkProps {
  talk: Talk;
  disabled: boolean;
}

function UnassignedTalk({
  talk,
  disabled,
}: UnassignedTalkProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `talk-${talk.id}`,
    disabled,
    data: {
      type: "talk",
      talkId: talk.id,
      origin: "tray",
      source: "unassigned_tray",
    },
  });

  const style = transform
    ? {
        transform:
          `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const speakerLabel =
    talk.speaker
      ? getSpeakerDisplayLabel(
          talk.speaker,
        )
      : "";

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
        disabled
          ? "unassigned-talk-disabled"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={accessibilityLabel}
      aria-grabbed={isDragging}
      aria-disabled={disabled}
      title={
        disabled
          ? "The trial is locked"
          : "Drag this talk to an empty legal schedule cell"
      }
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

      {speakerLabel ? (
        <span className="unassigned-talk-speaker">
          {speakerLabel}
        </span>
      ) : null}
    </div>
  );
}

export default function UnassignedTray() {
  const unassignedTalkIds = useSchedulerStore(
    (state) => state.unassignedTalkIds,
  );
  const activeTalkId = useSchedulerStore(
    (state) => state.activeTalkId,
  );
  const activeDragOrigin = useSchedulerStore(
    (state) => state.activeDragOrigin,
  );
  const allowTrayUnplace = useSchedulerStore(
    (state) => state.allowTrayUnplace,
  );
  const trialLocked = useSchedulerStore(
    (state) => state.trialLocked,
  );

  const talks = useMemo(
    () =>
      unassignedTalkIds
        .map((talkId) => getTalkById(talkId))
        .filter(
          (talk): talk is Talk =>
            talk !== undefined,
        ),
    [unassignedTalkIds],
  );

  const scheduledTalkBeingDragged =
    activeTalkId !== null &&
    activeDragOrigin === "grid";

  const trayDropCandidate =
    scheduledTalkBeingDragged &&
    !trialLocked;

  const trayAcceptsDrop =
    trayDropCandidate &&
    allowTrayUnplace;

  const trayIllegalReason =
    trayDropCandidate &&
    !allowTrayUnplace
      ? "tray_unplace_disabled"
      : null;

  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: "unassigned-tray-dropzone",

    /*
     * Keep the tray registered while a scheduled talk is dragged, even
     * when unplacement is disabled. The parent DnD handler can then log
     * the attempted illegal drop instead of losing the target entirely.
     */
    disabled:
      !scheduledTalkBeingDragged ||
      trialLocked,

    data: {
      type: "unassigned-tray",
      acceptsScheduledTalk:
        trayAcceptsDrop,
      allowTrayUnplace,
      dropIsLegal:
        trayAcceptsDrop,
      illegalReason:
        trayIllegalReason,
    },
  });

  const trayDescription = allowTrayUnplace
    ? "Drag unassigned talks into empty legal cells. Scheduled talks may also be returned to this tray."
    : "Drag unassigned talks into empty legal cells. Once assigned, talks may be moved or swapped but cannot be returned to this tray.";

  const trayStatusMessage =
    isOver &&
    scheduledTalkBeingDragged
      ? trayAcceptsDrop
        ? "Return talk to the unassigned tray"
        : "Returning talks to the tray is disabled"
      : null;

  return (
    <section
      ref={setNodeRef}
      className={[
        "unassigned-tray",
        trayAcceptsDrop
          ? "unassigned-tray-drop-enabled"
          : "",
        isOver && trayAcceptsDrop
          ? "unassigned-tray-over"
          : "",
        trialLocked
          ? "unassigned-tray-locked"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Unassigned talks"
      aria-disabled={trialLocked}
      data-allow-tray-unplace={allowTrayUnplace}
      data-drop-enabled={trayAcceptsDrop}
      data-drop-legal={
        scheduledTalkBeingDragged
          ? trayAcceptsDrop
          : undefined
      }
      data-illegal-reason={
        trayIllegalReason ?? undefined
      }
    >
      <div className="unassigned-tray-title">
        Unassigned talks
      </div>

      <div className="unassigned-tray-description">
        {trayDescription}
      </div>

      {trayStatusMessage ? (
        <div
          className="unassigned-tray-drop-message"
          role="status"
        >
          {trayStatusMessage}
        </div>
      ) : null}

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
              disabled={trialLocked}
            />
          ))}
        </div>
      )}
    </section>
  );
}
