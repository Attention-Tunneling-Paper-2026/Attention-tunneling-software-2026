import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import {
  useMemo,
} from "react";

import {
  useParams,
} from "react-router";

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

type TaskDomainId =
  | "symposium"
  | "delivery"
  | "clinic";

interface UnassignedTrayProps {
  taskId?:
    TaskDomainId;
}

interface UnassignedTalkProps {
  talk:
    Talk;

  disabled:
    boolean;

  taskId:
    TaskDomainId;
}

interface TaskPresentation {
  trayAriaLabel:
    string;

  trayTitle:
    string;

  itemSingular:
    string;

  itemPlural:
    string;

  actorRole:
    string;

  specialRequirementLabel:
    string;

  specialRequirementDescription:
    string;

  destinationLabel:
    string;

  lockedTitle:
    string;

  emptyMessage:
    string;
}

const TASK_PRESENTATION: Record<
  TaskDomainId,
  TaskPresentation
> = {
  symposium: {
    trayAriaLabel:
      "Unassigned talks",

    trayTitle:
      "Unassigned talks",

    itemSingular:
      "talk",

    itemPlural:
      "talks",

    actorRole:
      "Speaker",

    specialRequirementLabel:
      "Demo",

    specialRequirementDescription:
      "Demo talk requiring a projector",

    destinationLabel:
      "schedule cell",

    lockedTitle:
      "The trial is locked",

    emptyMessage:
      "All talks are assigned.",
  },

  delivery: {
    trayAriaLabel:
      "Unassigned shipments",

    trayTitle:
      "Unassigned shipments",

    itemSingular:
      "shipment",

    itemPlural:
      "shipments",

    actorRole:
      "Driver",

    specialRequirementLabel:
      "Cold chain",

    specialRequirementDescription:
      "Cold-chain shipment requiring refrigeration",

    destinationLabel:
      "dispatch cell",

    lockedTitle:
      "The trial is locked",

    emptyMessage:
      "All shipments are assigned.",
  },

  clinic: {
    trayAriaLabel:
      "Unassigned clinical duties",

    trayTitle:
      "Unassigned duties",

    itemSingular:
      "duty",

    itemPlural:
      "duties",

    actorRole:
      "Nurse",

    specialRequirementLabel:
      "ICU",

    specialRequirementDescription:
      "Clinical duty requiring ICU-certified support",

    destinationLabel:
      "roster cell",

    lockedTitle:
      "The trial is locked",

    emptyMessage:
      "All clinical duties are assigned.",
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
  value:
    unknown,
): value is TaskDomainId {
  return (
    value === "symposium" ||
    value === "delivery" ||
    value === "clinic"
  );
}

function getItemTitle(
  talk:
    Talk,
  taskId:
    TaskDomainId,
): string {
  switch (
    taskId
  ) {
    case "delivery":
      return (
        DELIVERY_TITLE_BY_ID[
          talk.id
        ] ??
        talk.title
      );

    case "clinic":
      return (
        CLINIC_TITLE_BY_ID[
          talk.id
        ] ??
        talk.title
      );

    case "symposium":
    default:
      return talk.title;
  }
}

function getCategoryLabel(
  talk:
    Talk,
  taskId:
    TaskDomainId,
): string {
  switch (
    taskId
  ) {
    case "delivery":
      return (
        DELIVERY_REGION_BY_TOPIC[
          talk.topic
        ] ??
        talk.topic
      );

    case "clinic":
      return (
        CLINIC_SPECIALTY_BY_TOPIC[
          talk.topic
        ] ??
        talk.topic
      );

    case "symposium":
    default:
      return talk.topic;
  }
}

function getActorLabel(
  talk:
    Talk,
  taskId:
    TaskDomainId,
): string {
  if (
    !talk.speaker
  ) {
    return "";
  }

  const baseLabel =
    getSpeakerDisplayLabel(
      talk.speaker,
    );

  if (
    taskId ===
    "symposium"
  ) {
    return baseLabel;
  }

  const normalizedName =
    baseLabel.replace(
      /^Dr\.?\s+/i,
      "",
    );

  return taskId ===
    "delivery"
    ? `Driver ${normalizedName}`
    : `Nurse ${normalizedName}`;
}

function UnassignedTalk({
  talk,
  disabled,
  taskId,
}: UnassignedTalkProps) {
  const presentation =
    TASK_PRESENTATION[
      taskId
    ];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id:
      `talk-${talk.id}`,

    disabled,

    data: {
      type:
        "talk",

      talkId:
        talk.id,

      origin:
        "tray",

      source:
        "unassigned_tray",

      taskId,
    },
  });

  const style = transform
    ? {
        transform:
          `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const itemTitle =
    getItemTitle(
      talk,
      taskId,
    );

  const categoryLabel =
    getCategoryLabel(
      talk,
      taskId,
    );

  const actorLabel =
    getActorLabel(
      talk,
      taskId,
    );

  const accessibilityLabel = [
    talk.id,
    itemTitle,
    categoryLabel,
    actorLabel
      ? `${presentation.actorRole}: ${actorLabel}`
      : "",
    talk.demo
      ? presentation.specialRequirementDescription
      : "",
  ]
    .filter(
      Boolean,
    )
    .join(
      ", ",
    );

  return (
    <div
      ref={
        setNodeRef
      }
      style={
        style
      }
      {...listeners}
      {...attributes}
      className={[
        "unassigned-talk",
        `unassigned-${talk.topic.toLowerCase()}`,
        `unassigned-talk-${taskId}`,
        isDragging
          ? "unassigned-talk-dragging"
          : "",
        disabled
          ? "unassigned-talk-disabled"
          : "",
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        )}
      aria-label={
        accessibilityLabel
      }
      aria-grabbed={
        isDragging
      }
      aria-disabled={
        disabled
      }
      data-task-id={
        taskId
      }
      data-item-id={
        talk.id
      }
      title={
        disabled
          ? presentation.lockedTitle
          : `Drag this ${presentation.itemSingular} to an empty legal ${presentation.destinationLabel}`
      }
    >
      <div className="unassigned-talk-header">
        <strong>
          {talk.id}
        </strong>

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
      </div>

      <span className="unassigned-talk-title">
        {itemTitle}
      </span>

      <span className="unassigned-talk-speaker">
        {categoryLabel}
      </span>

      {actorLabel ? (
        <span className="unassigned-talk-speaker">
          {actorLabel}
        </span>
      ) : null}
    </div>
  );
}

export default function UnassignedTray({
  taskId,
}: UnassignedTrayProps) {
  const {
    taskId:
      routeTaskId,
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
              routeTaskId,
            )
          ? routeTaskId
          : "symposium";

  const presentation =
    TASK_PRESENTATION[
      resolvedTaskId
    ];

  const unassignedTalkIds =
    useSchedulerStore(
      (state) =>
        state.unassignedTalkIds,
    );

  const activeTalkId =
    useSchedulerStore(
      (state) =>
        state.activeTalkId,
    );

  const activeDragOrigin =
    useSchedulerStore(
      (state) =>
        state.activeDragOrigin,
    );

  const allowTrayUnplace =
    useSchedulerStore(
      (state) =>
        state.allowTrayUnplace,
    );

  const trialLocked =
    useSchedulerStore(
      (state) =>
        state.trialLocked,
    );

  const talks = useMemo(
    () =>
      unassignedTalkIds
        .map(
          (talkId) =>
            getTalkById(
              talkId,
            ),
        )
        .filter(
          (
            talk,
          ): talk is Talk =>
            talk !==
            undefined,
        ),
    [
      unassignedTalkIds,
    ],
  );

  const scheduledTalkBeingDragged =
    activeTalkId !==
      null &&
    activeDragOrigin ===
      "grid";

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
    id:
      "unassigned-tray-dropzone",

    /*
     * Keep the tray registered while a placed item is dragged, even when
     * unplacement is disabled. The parent DnD handler can then record the
     * attempted illegal drop instead of losing the drop target entirely.
     */
    disabled:
      !scheduledTalkBeingDragged ||
      trialLocked,

    data: {
      type:
        "unassigned-tray",

      acceptsScheduledTalk:
        trayAcceptsDrop,

      allowTrayUnplace,

      dropIsLegal:
        trayAcceptsDrop,

      illegalReason:
        trayIllegalReason,

      taskId:
        resolvedTaskId,
    },
  });

  const trayDescription =
    allowTrayUnplace
      ? `Drag unassigned ${presentation.itemPlural} into empty legal cells. Assigned ${presentation.itemPlural} may also be returned to this tray.`
      : `Drag unassigned ${presentation.itemPlural} into empty legal cells. Once assigned, ${presentation.itemPlural} may be moved or swapped but cannot be returned to this tray.`;

  const trayStatusMessage =
    isOver &&
    scheduledTalkBeingDragged
      ? trayAcceptsDrop
        ? `Return ${presentation.itemSingular} to the unassigned tray`
        : `Returning ${presentation.itemPlural} to the tray is disabled`
      : null;

  return (
    <section
      ref={
        setNodeRef
      }
      className={[
        "unassigned-tray",
        `unassigned-tray-${resolvedTaskId}`,
        trayAcceptsDrop
          ? "unassigned-tray-drop-enabled"
          : "",
        isOver &&
        trayAcceptsDrop
          ? "unassigned-tray-over"
          : "",
        trialLocked
          ? "unassigned-tray-locked"
          : "",
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        )}
      aria-label={
        presentation.trayAriaLabel
      }
      aria-disabled={
        trialLocked
      }
      data-task-id={
        resolvedTaskId
      }
      data-allow-tray-unplace={
        allowTrayUnplace
      }
      data-drop-enabled={
        trayAcceptsDrop
      }
      data-drop-legal={
        scheduledTalkBeingDragged
          ? trayAcceptsDrop
          : undefined
      }
      data-illegal-reason={
        trayIllegalReason ??
        undefined
      }
    >
      <div className="unassigned-tray-title">
        {
          presentation.trayTitle
        }
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

      {talks.length ===
      0 ? (
        <div
          className="unassigned-empty"
          role="status"
        >
          {
            presentation.emptyMessage
          }
        </div>
      ) : (
        <div className="unassigned-list">
          {talks.map(
            (talk) => (
              <UnassignedTalk
                key={
                  talk.id
                }
                talk={
                  talk
                }
                disabled={
                  trialLocked
                }
                taskId={
                  resolvedTaskId
                }
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
