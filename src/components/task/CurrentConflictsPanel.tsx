import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import {
  useParams,
} from "react-router";

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

import type {
  Talk,
} from "../../types/scheduler";

type TaskDomainId =
  | "symposium"
  | "delivery"
  | "clinic";

interface CurrentConflictsPanelProps {
  taskId?:
    TaskDomainId;
}

interface ConflictPresentation {
  actorSingular:
    string;

  columnLabel:
    string;

  clearTitle:
    string;

  conflictTitle:
    string;

  clearMessage:
    string;
}

const CONFLICT_PRESENTATION: Record<
  TaskDomainId,
  ConflictPresentation
> = {
  symposium: {
    actorSingular:
      "speaker",

    columnLabel:
      "Slot",

    clearTitle:
      "No current speaker conflicts",

    conflictTitle:
      "Current speaker conflicts",

    clearMessage:
      "No speaker conflicts are currently present. Continue checking the projector requirement and room-capacity requirement before submitting the schedule.",
  },

  delivery: {
    actorSingular:
      "driver",

    columnLabel:
      "Window",

    clearTitle:
      "No current driver conflicts",

    conflictTitle:
      "Current driver conflicts",

    clearMessage:
      "No driver conflicts are currently present. Continue checking the refrigeration requirement and van-capacity requirement before submitting the dispatch plan.",
  },

  clinic: {
    actorSingular:
      "nurse",

    columnLabel:
      "Shift",

    clearTitle:
      "No current nurse conflicts",

    conflictTitle:
      "Current nurse conflicts",

    clearMessage:
      "No nurse conflicts are currently present. Continue checking the ICU-ward requirement and ward-capacity requirement before submitting the roster.",
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
  N1: "Emergency ICU Intake",
  N2: "Emergency Medication Round",
  N3: "Emergency High-Demand Duty",
  N4: "Emergency Follow-Up",
  H1: "General Medicine Intake",
  H2: "General Medicine Round",
  H3: "General Ward Support",
  H4: "General Discharge Review",
  R1: "Critical Care Assessment",
  R2: "Critical Care Monitoring",
  R3: "Critical Care Procedure",
  R4: "Critical Care Follow-Up",
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

function getItemLabel(
  talkId:
    string,
  taskId:
    TaskDomainId,
): string {
  const talk =
    getTalkById(
      talkId,
    );

  return talk
    ? `${talk.id} ${getItemTitle(talk, taskId)}`
    : talkId;
}

function getActorDisplayLabel(
  actorId:
    string,
  taskId:
    TaskDomainId,
): string {
  const baseLabel =
    getSpeakerDisplayLabel(
      actorId,
    );

  if (
    taskId === "symposium"
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

export default function CurrentConflictsPanel({
  taskId,
}: CurrentConflictsPanelProps) {
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
    CONFLICT_PRESENTATION[
      resolvedTaskId
    ];

  const placements =
    useSchedulerStore(
      (state) =>
        state.placements,
    );

  /*
   * The shared constraint engine stores the responsible person in the
   * speaker field. In the delivery and clinic task skins, the same field
   * represents the assigned driver or nurse.
   */
  const conflicts =
    getSpeakerViolations(
      placements,
    );

  const allConflictsResolved =
    conflicts.length === 0;

  return (
    <section
      className={[
        "current-conflicts-panel",

        allConflictsResolved
          ? "current-conflicts-panel-clear"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="current-conflicts-title"
      data-task-id={
        resolvedTaskId
      }
      data-conflict-resource={
        presentation
          .actorSingular
      }
    >
      <div className="current-conflicts-header">
        <div
          id="current-conflicts-title"
          className="current-conflicts-title"
        >
          {allConflictsResolved ? (
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
            {allConflictsResolved
              ? presentation
                  .clearTitle
              : presentation
                  .conflictTitle}
          </span>
        </div>

        <span className="current-conflicts-count">
          {conflicts.length}{" "}
          {conflicts.length === 1
            ? "conflict"
            : "conflicts"}
        </span>
      </div>

      {allConflictsResolved ? (
        <div className="current-conflicts-list">
          <div className="current-conflict-item">
            <CheckCircle2
              size={16}
              aria-hidden="true"
            />

            <span>
              {
                presentation
                  .clearMessage
              }
            </span>
          </div>
        </div>
      ) : (
        <div className="current-conflicts-list">
          {conflicts.map(
            (conflict) => {
              const itemLabels =
                conflict.talkIds.map(
                  (talkId) =>
                    getItemLabel(
                      talkId,
                      resolvedTaskId,
                    ),
                );

              return (
                <div
                  key={[
                    resolvedTaskId,
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
                    {getActorDisplayLabel(
                      conflict.speaker,
                      resolvedTaskId,
                    )}{" "}
                    is assigned to{" "}
                    {itemLabels.join(
                      " and ",
                    )}{" "}
                    during{" "}
                    {
                      presentation
                        .columnLabel
                    }{" "}
                    {conflict.slot}.
                  </span>
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}
