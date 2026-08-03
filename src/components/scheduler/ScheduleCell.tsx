import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import {
  useParams,
} from "react-router";

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

type TaskDomainId =
  | "symposium"
  | "delivery"
  | "clinic";

interface ScheduleCellProps {
  room: Room;
  slot: Slot;
  talk?: Talk;
  hasConflict?: boolean;
  taskId?: TaskDomainId;
}

interface TaskPresentation {
  itemSingular: string;
  rowLabel: string;
  columnLabel: string;
  actorRole: string;
  categoryRole: string;
  specialRequirementLabel: string;
  specialRequirementDescription: string;
  conflictLabel: string;
  destinationLabel: string;
}

const TASK_PRESENTATION: Record<
  TaskDomainId,
  TaskPresentation
> = {
  symposium: {
    itemSingular: "talk",
    rowLabel: "Room",
    columnLabel: "Slot",
    actorRole: "Speaker",
    categoryRole: "Topic",
    specialRequirementLabel: "Demo",
    specialRequirementDescription:
      "Demo talk requiring a projector",
    conflictLabel: "Speaker conflict",
    destinationLabel: "schedule cell",
  },

  delivery: {
    itemSingular: "shipment",
    rowLabel: "Van",
    columnLabel: "Window",
    actorRole: "Driver",
    categoryRole: "Region",
    specialRequirementLabel: "Cold chain",
    specialRequirementDescription:
      "Cold-chain shipment requiring refrigeration",
    conflictLabel: "Driver conflict",
    destinationLabel: "dispatch cell",
  },

  clinic: {
    itemSingular: "duty",
    rowLabel: "Ward",
    columnLabel: "Shift",
    actorRole: "Nurse",
    categoryRole: "Specialty",
    specialRequirementLabel: "ICU",
    specialRequirementDescription:
      "Clinical duty requiring ICU-certified support",
    conflictLabel: "Nurse conflict",
    destinationLabel: "roster cell",
  },
};

const DELIVERY_TITLE_BY_ID: Readonly<
  Record<string, string>
> = {
  N1: "Priority medical supplies",
  N2: "Fresh produce delivery",
  N3: "Temperature-sensitive vaccines",
  N4: "University meal delivery",
  H1: "Hospital laboratory samples",
  H2: "Dairy order",
  H3: "Business equipment shipment",
  H4: "Old Town bakery order",
  R1: "Airport hotel seafood order",
  R2: "Pharmacy medication shipment",
  R3: "Event-centre floral order",
  R4: "South Complex office supplies",
};

const CLINIC_TITLE_BY_ID: Readonly<
  Record<string, string>
> = {
  N1: "Emergency intake coverage",
  N2: "Medication round",
  N3: "Critical patient monitoring",
  N4: "Discharge review",
  H1: "Postoperative observation",
  H2: "Wound-care round",
  H3: "Patient assessment",
  H4: "Evening handover",
  R1: "Respiratory support",
  R2: "ICU medication review",
  R3: "Rapid-response coverage",
  R4: "Rehabilitation assessment",
};

const DELIVERY_REGION_BY_TOPIC: Readonly<
  Record<string, string>
> = {
  NLP: "North region",
  Health: "Central region",
  Robotics: "South region",
};

const CLINIC_SPECIALTY_BY_TOPIC: Readonly<
  Record<string, string>
> = {
  NLP: "Emergency care",
  Health: "General medicine",
  Robotics: "Critical care",
};

function isTaskDomainId(
  value: unknown,
): value is TaskDomainId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

function getItemTitle(
  talk: Talk,
  taskId: TaskDomainId,
): string {
  switch (taskId) {
    case "delivery":
      return DELIVERY_TITLE_BY_ID[talk.id] ?? talk.title;

    case "clinic":
      return CLINIC_TITLE_BY_ID[talk.id] ?? talk.title;

    case "symposium":
    default:
      return talk.title;
  }
}

function getCategoryLabel(
  talk: Talk,
  taskId: TaskDomainId,
): string {
  switch (taskId) {
    case "delivery":
      return DELIVERY_REGION_BY_TOPIC[talk.topic] ?? talk.topic;

    case "clinic":
      return CLINIC_SPECIALTY_BY_TOPIC[talk.topic] ?? talk.topic;

    case "symposium":
    default:
      return talk.topic;
  }
}

function getActorLabel(
  talk: Talk,
  taskId: TaskDomainId,
): string {
  if (!talk.speaker) {
    return "";
  }

  const baseLabel = getSpeakerDisplayLabel(talk.speaker);

  if (taskId === "symposium") {
    return baseLabel;
  }

  const normalizedName = baseLabel.replace(
    /^Dr\.?\s+/i,
    "",
  );

  return taskId === "delivery"
    ? `Driver ${normalizedName}`
    : `Nurse ${normalizedName}`;
}

function getIllegalMoveLabel(
  reason: MoveValidationResult["reason"] | undefined,
  taskId: TaskDomainId,
): string {
  const presentation = TASK_PRESENTATION[taskId];

  switch (reason) {
    case "trial_locked":
      return "The trial is locked.";

    case "target_room_not_allowed":
    case "displaced_talk_room_not_allowed":
      if (taskId === "delivery") {
        return "The van is not allowed for this move or swap.";
      }

      if (taskId === "clinic") {
        return "The ward is not allowed for this move or swap.";
      }

      return "The room is not allowed for this move or swap.";

    case "target_slot_not_allowed":
    case "displaced_talk_slot_not_allowed":
      if (taskId === "delivery") {
        return "The route window is not allowed for this move or swap.";
      }

      if (taskId === "clinic") {
        return "The shift is not allowed for this move or swap.";
      }

      return "The slot is not allowed for this move or swap.";

    case "target_projector_required":
    case "displaced_talk_projector_required":
      if (taskId === "delivery") {
        return "Required refrigeration is unavailable for this move or swap.";
      }

      if (taskId === "clinic") {
        return "Required ICU certification is unavailable for this move or swap.";
      }

      return "A required projector is unavailable for this move or swap.";

    case "target_capacity_insufficient":
    case "displaced_talk_capacity_insufficient":
      if (taskId === "delivery") {
        return "The van capacity is insufficient for this move or swap.";
      }

      if (taskId === "clinic") {
        return "The ward capacity is insufficient for this move or swap.";
      }

      return "The room capacity is insufficient for this move or swap.";

    case "talk_not_found":
    case "source_not_found":
      return `The selected ${presentation.itemSingular} could not be moved.`;

    case "same_cell":
      return `The ${presentation.itemSingular} is already in this cell.`;

    case "tray_unplace_disabled":
      return `Returning this ${presentation.itemSingular} to the tray is disabled.`;

    default:
      return `Unavailable for the selected ${presentation.itemSingular} or swap.`;
  }
}

export default function ScheduleCell({
  room,
  slot,
  talk,
  hasConflict = false,
  taskId,
}: ScheduleCellProps) {
  const {
    taskId: routeTaskId,
  } = useParams<{
    taskId?: string;
  }>();

  const resolvedTaskId: TaskDomainId =
    isTaskDomainId(taskId)
      ? taskId
      : isTaskDomainId(routeTaskId)
        ? routeTaskId
        : "symposium";

  const presentation = TASK_PRESENTATION[resolvedTaskId];

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
   * Structural legality is evaluated by the shared store for both sides of
   * a possible swap. Actor conflicts remain visible and intentionally
   * violable so they can be measured consistently across all task skins.
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
     * Keep cells registered during a drag even when a move is illegal. The
     * parent DnD handler can then observe and record the illegal attempt.
     */
    disabled: activeTalkId === null,

    data: {
      type: "schedule-cell",
      room,
      slot,
      occupiedTalkId: talk?.id ?? null,
      dropIsLegal,
      illegalReason: moveValidation?.reason ?? null,
      taskId: resolvedTaskId,
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
      taskId: resolvedTaskId,
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
    `schedule-cell-dropzone-${resolvedTaskId}`,

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

  const itemTitle = talk
    ? getItemTitle(talk, resolvedTaskId)
    : "";

  const categoryLabel = talk
    ? getCategoryLabel(talk, resolvedTaskId)
    : "";

  const actorLabel = talk
    ? getActorLabel(talk, resolvedTaskId)
    : "";

  const movementLabel =
    activeTalkId !== null &&
    !dropIsLegal
      ? getIllegalMoveLabel(
          moveValidation?.reason,
          resolvedTaskId,
        )
      : "";

  const rowLabel =
    `${presentation.rowLabel} ${room}`;

  const columnLabel =
    `${presentation.columnLabel} ${slot}`;

  const cellLabel = talk
    ? [
        rowLabel,
        columnLabel,
        talk.id,
        itemTitle,
        categoryLabel
          ? `${presentation.categoryRole}: ${categoryLabel}`
          : "",
        actorLabel
          ? `${presentation.actorRole}: ${actorLabel}`
          : "",
        talk.demo
          ? presentation.specialRequirementDescription
          : "",
        hasConflict
          ? presentation.conflictLabel
          : "",
        movementLabel,
      ]
        .filter(Boolean)
        .join(", ")
    : [
        rowLabel,
        columnLabel,
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
      data-task-id={resolvedTaskId}
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
            `schedule-cell-${resolvedTaskId}`,

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
          title={
            trialLocked
              ? "The trial is locked"
              : `Drag this ${presentation.itemSingular} to another legal ${presentation.destinationLabel}`
          }
        >
          <div className="talk-card-content">
            <div className="talk-card-id">
              {talk.id}

              {talk.demo ? (
                <span
                  className="demo-indicator"
                  title={
                    presentation.specialRequirementDescription
                  }
                >
                  {
                    presentation.specialRequirementLabel
                  }
                </span>
              ) : null}

              {hasConflict ? (
                <span
                  className="conflict-indicator"
                  aria-label={
                    presentation.conflictLabel
                  }
                  title={
                    presentation.conflictLabel
                  }
                >
                  ⚠
                </span>
              ) : null}
            </div>

            <div className="talk-card-title">
              {itemTitle}
            </div>

            <div className="talk-card-speaker">
              {categoryLabel}
            </div>

            {actorLabel ? (
              <div className="talk-card-speaker">
                {actorLabel}
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
