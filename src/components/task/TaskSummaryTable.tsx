import {
  useParams,
} from "react-router";

import {
  formatAllowedRooms,
  formatAllowedSlots,
  getSpeakerDisplayLabel,
  TALKS,
} from "../../data/symposium";

import type {
  Room,
  Slot,
} from "../../types/scheduler";

type TaskDomainId =
  | "symposium"
  | "delivery"
  | "clinic";

interface TaskSummaryTableProps {
  taskId?: TaskDomainId;
}

interface TaskPresentation {
  title: string;
  introduction: string;
  caption: string;
  itemColumn: string;
  titleColumn: string;
  categoryColumn: string;
  personColumn: string;
  requirementColumn: string;
  availabilityColumn: string;
  resourceColumn: string;
  requirementPresentLabel: string;
  requirementPresentTitle: string;
  requirementAbsentLabel: string;
  note: string;
}

const DELIVERY_TITLES: Record<string, string> = {
  N1: "Northern Vaccine Shipment",
  N2: "Northern Priority Parcel",
  N3: "Northern Medical Supplies",
  N4: "Northern Retail Delivery",
  H1: "Central Hospital Supplies",
  H2: "Central Grocery Delivery",
  H3: "Central General Freight",
  H4: "Central Closing Dispatch",
  R1: "Southern Frozen Goods",
  R2: "Southern Biologics Shipment",
  R3: "Southern Cold Storage Load",
  R4: "Southern General Freight",
};

const CLINIC_TITLES: Record<string, string> = {
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

const DELIVERY_REGIONS: Record<string, string> = {
  NLP: "North",
  Health: "Central",
  Robotics: "South",
};

const CLINIC_SPECIALTIES: Record<string, string> = {
  NLP: "Emergency Care",
  Health: "General Medicine",
  Robotics: "Critical Care",
};

const DELIVERY_DRIVER_LABELS: Record<string, string> = {
  Osei: "Driver Osei",
  Kim: "Driver Chaky",
  Laurent: "Driver Laurent",
};

const CLINIC_NURSE_LABELS: Record<string, string> = {
  Osei: "Nurse Osei",
  Kim: "Nurse Chaky",
  Laurent: "Nurse Laurent",
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

function getTaskPresentation(
  taskId: TaskDomainId,
): TaskPresentation {
  switch (taskId) {
    case "delivery":
      return {
        title: "Delivery Shipment Details",
        introduction:
          "Review each shipment's region, driver, refrigeration requirement, available route windows, and allowed vans before creating the dispatch plan.",
        caption:
          "Full list of delivery shipments and their dispatch requirements",
        itemColumn: "Shipment",
        titleColumn: "Delivery",
        categoryColumn: "Region",
        personColumn: "Driver",
        requirementColumn: "Cold Chain",
        availabilityColumn: "Available Windows",
        resourceColumn: "Allowed Vans",
        requirementPresentLabel: "Cold chain",
        requirementPresentTitle: "Refrigeration required",
        requirementAbsentLabel: "No",
        note:
          "Cold-chain shipments require refrigeration and may only be assigned to Van A or Van C. Shipment N3 requires a high-capacity vehicle and may only be assigned to Van A or Van B.",
      };

    case "clinic":
      return {
        title: "Clinic Duty Details",
        introduction:
          "Review each duty's specialty, assigned nurse, ICU requirement, available shifts, and allowed wards before creating the roster.",
        caption:
          "Full list of clinic duties and their roster requirements",
        itemColumn: "Duty",
        titleColumn: "Assignment",
        categoryColumn: "Specialty",
        personColumn: "Nurse",
        requirementColumn: "ICU Required",
        availabilityColumn: "Available Shifts",
        resourceColumn: "Allowed Wards",
        requirementPresentLabel: "ICU",
        requirementPresentTitle: "ICU-certified ward required",
        requirementAbsentLabel: "No",
        note:
          "ICU-required duties may only be assigned to Ward A or Ward C. Duty N3 requires a ward capacity of at least 80 and may only be assigned to Ward A or Ward B.",
      };

    case "symposium":
    default:
      return {
        title: "Symposium Talk Details",
        introduction:
          "Review each talk's topic, speaker, equipment requirement, available slots, and allowed rooms before creating the schedule.",
        caption:
          "Full list of symposium talks and their scheduling requirements",
        itemColumn: "Talk",
        titleColumn: "Title",
        categoryColumn: "Topic",
        personColumn: "Speaker",
        requirementColumn: "Demo",
        availabilityColumn: "Available Slots",
        resourceColumn: "Allowed Rooms",
        requirementPresentLabel: "Demo",
        requirementPresentTitle: "Projector required",
        requirementAbsentLabel: "No",
        note:
          "Demo talks require a projector and may only be placed in Room A or Room C. Talk N3 requires at least 80 seats and may only be placed in Room A or Room B.",
      };
  }
}

function getItemTitle(
  taskId: TaskDomainId,
  itemId: string,
  symposiumTitle: string,
): string {
  if (taskId === "delivery") {
    return DELIVERY_TITLES[itemId] ?? symposiumTitle;
  }

  if (taskId === "clinic") {
    return CLINIC_TITLES[itemId] ?? symposiumTitle;
  }

  return symposiumTitle;
}

function getCategoryLabel(
  taskId: TaskDomainId,
  topic: string,
): string {
  if (taskId === "delivery") {
    return DELIVERY_REGIONS[topic] ?? topic;
  }

  if (taskId === "clinic") {
    return CLINIC_SPECIALTIES[topic] ?? topic;
  }

  return topic;
}

function getPersonLabel(
  taskId: TaskDomainId,
  person: string | undefined,
): string {
  if (taskId === "delivery") {
    if (!person) {
      return "No shared driver constraint";
    }

    return (
      DELIVERY_DRIVER_LABELS[person] ??
      `Driver ${person}`
    );
  }

  if (taskId === "clinic") {
    if (!person) {
      return "No shared nurse constraint";
    }

    return (
      CLINIC_NURSE_LABELS[person] ??
      `Nurse ${person}`
    );
  }

  return getSpeakerDisplayLabel(person);
}

function formatAvailability(
  taskId: TaskDomainId,
  slots: Slot[],
): string {
  if (taskId === "symposium") {
    return formatAllowedSlots(slots);
  }

  const label =
    taskId === "delivery"
      ? "Window"
      : "Shift";

  return slots
    .map((slot) => `${label} ${slot}`)
    .join(", ");
}

function formatResources(
  taskId: TaskDomainId,
  rooms: Room[],
): string {
  if (taskId === "symposium") {
    return formatAllowedRooms(rooms);
  }

  const label =
    taskId === "delivery"
      ? "Van"
      : "Ward";

  return rooms
    .map((room) => `${label} ${room}`)
    .join(", ");
}

export default function TaskSummaryTable({
  taskId: taskIdProp,
}: TaskSummaryTableProps) {
  const {
    taskId: routeTaskId,
  } = useParams<{
    taskId?: string;
  }>();

  const taskId =
    taskIdProp ??
    (isTaskDomainId(routeTaskId)
      ? routeTaskId
      : "symposium");

  const presentation =
    getTaskPresentation(taskId);

  const titleId =
    `${taskId}-task-summary-title`;

  return (
    <section
      className="task-summary-wrapper"
      aria-labelledby={titleId}
      data-task-id={taskId}
    >
      <div className="task-summary-introduction">
        <h2 id={titleId}>
          {presentation.title}
        </h2>

        <p>
          {presentation.introduction}
        </p>
      </div>

      <div className="task-summary-table-container">
        <table className="task-summary-table">
          <caption className="sr-only">
            {presentation.caption}
          </caption>

          <thead>
            <tr>
              <th scope="col">
                {presentation.itemColumn}
              </th>

              <th scope="col">
                {presentation.titleColumn}
              </th>

              <th scope="col">
                {presentation.categoryColumn}
              </th>

              <th scope="col">
                {presentation.personColumn}
              </th>

              <th scope="col">
                {presentation.requirementColumn}
              </th>

              <th scope="col">
                {presentation.availabilityColumn}
              </th>

              <th scope="col">
                {presentation.resourceColumn}
              </th>
            </tr>
          </thead>

          <tbody>
            {TALKS.map((talk) => {
              const topicClass =
                `task-summary-topic task-summary-topic-${talk.topic.toLowerCase()}`;

              const itemTitle =
                getItemTitle(
                  taskId,
                  talk.id,
                  talk.title,
                );

              const categoryLabel =
                getCategoryLabel(
                  taskId,
                  talk.topic,
                );

              const personLabel =
                getPersonLabel(
                  taskId,
                  talk.speaker,
                );

              return (
                <tr key={talk.id}>
                  <th
                    scope="row"
                    className="task-summary-talk-id"
                  >
                    {talk.id}
                  </th>

                  <td>
                    {itemTitle}
                  </td>

                  <td>
                    <span className={topicClass}>
                      {categoryLabel}
                    </span>
                  </td>

                  <td>
                    {personLabel}
                  </td>

                  <td>
                    {talk.demo ? (
                      <span
                        className="task-summary-demo"
                        title={
                          presentation.requirementPresentTitle
                        }
                      >
                        {
                          presentation.requirementPresentLabel
                        }
                      </span>
                    ) : (
                      <span className="task-summary-not-demo">
                        {
                          presentation.requirementAbsentLabel
                        }
                      </span>
                    )}
                  </td>

                  <td>
                    {formatAvailability(
                      taskId,
                      talk.allowedSlots,
                    )}
                  </td>

                  <td>
                    {formatResources(
                      taskId,
                      talk.allowedRooms,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="task-summary-note"
        role="note"
      >
        {presentation.note}
      </div>
    </section>
  );
}
