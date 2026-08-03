import {
  STUDY_TASK_IDS,
  isStudyTaskId,
} from "../types/scheduler";

import type {
  IllegalMoveReason,
  Room,
  Slot,
  StudyTaskId,
  Topic,
} from "../types/scheduler";

export type TaskSkinId = StudyTaskId;

export const TASK_SKIN_IDS:
  readonly TaskSkinId[] = STUDY_TASK_IDS;

export interface TaskVocabulary {
  itemSingular: string;
  itemPlural: string;
  resourceSingular: string;
  resourcePlural: string;
  periodSingular: string;
  periodPlural: string;
  actorSingular: string;
  actorPlural: string;
  categorySingular: string;
  categoryPlural: string;
  planSingular: string;
  planVerb: string;
  assignmentVerb: string;
  unassignedTrayTitle: string;
  unassignedTrayDescription: string;
}

export interface TaskCounts {
  items: number;
  resources: number;
  periods: number;
  durationMinutes: number;
}

export interface TaskRequirementPresentation {
  fieldLabel: string;
  shortLabel: string;
  presentLabel: string;
  absentLabel: string;
  requiredTitle: string;
  availableLabel: string;
  unavailableLabel: string;
  affectedItemPlural: string;
}

export interface TaskGridPresentation {
  unlockedAriaLabel: string;
  lockedAriaLabel: string;
  rowAxisLabel: string;
  emptyCellLabel: string;
  hint: string;
  capacityUnitSingular: string;
  capacityUnitPlural: string;
}

export interface TaskDetailsPresentation {
  title: string;
  introduction: string;
  caption: string;
  itemColumn: string;
  titleColumn: string;
  categoryColumn: string;
  actorColumn: string;
  requirementColumn: string;
  availabilityColumn: string;
  resourceColumn: string;
  note: string;
}

export interface TaskProbePresentation {
  title: string;
  collapsedLabel: string;
  updateLabel: string;
  message: string;
  noticedQuestionLabel: string;
  descriptionPrompt: string;
  affectedResourceQuestion: string;
  recognitionQuestion: string;
  affectedResource: Room;
  requiredResource: Room;
}

export interface TaskCssClasses {
  schedulerPage: string;
  scheduleCell: string;
  scheduleCellDropzone: string;
  unassignedItem: string;
  unassignedTray: string;
  taskOverview: string;
}

export interface TaskSkin {
  id: TaskSkinId;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  objective: string;
  vocabulary: TaskVocabulary;
  counts: TaskCounts;
  requirement: TaskRequirementPresentation;
  grid: TaskGridPresentation;
  details: TaskDetailsPresentation;
  probe: TaskProbePresentation;
  css: TaskCssClasses;
  itemTitles: Readonly<Record<string, string>>;
  categoryLabels: Readonly<Record<Topic, string>>;
  actorLabels: Readonly<Record<string, string>>;
  noActorConstraintLabel: string;
  resourceLabels: Readonly<Record<Room, string>>;
  periodLabels: Readonly<Record<Slot, string>>;
}

const SYMPOSIUM_ITEM_TITLES: Readonly<
  Record<string, string>
> = {
  N1: "NLP Keynote",
  N2: "NLP Invited Talk",
  N3: "Advanced NLP",
  N4: "Language Models",
  H1: "Digital Health",
  H2: "Health Analytics",
  H3: "Health Systems",
  H4: "Closing Panel",
  R1: "Robotics Demo",
  R2: "Robot Control",
  R3: "Industrial Robotics",
  R4: "Robotics Future",
};

/*
 * These participant-facing titles are intentionally kept in one place so
 * every delivery component presents the same shipment names.
 */
const DELIVERY_ITEM_TITLES: Readonly<
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

/*
 * These participant-facing titles are intentionally kept in one place so
 * every clinic component presents the same duty names.
 */
const CLINIC_ITEM_TITLES: Readonly<
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

const SYMPOSIUM_ACTOR_LABELS: Readonly<
  Record<string, string>
> = {
  Osei: "Dr. Osei",
  Kim: "Dr. Chaky",
  Laurent: "Dr. Laurent",
};

const DELIVERY_ACTOR_LABELS: Readonly<
  Record<string, string>
> = {
  Osei: "Driver Osei",
  Kim: "Driver Chaky",
  Laurent: "Driver Laurent",
};

const CLINIC_ACTOR_LABELS: Readonly<
  Record<string, string>
> = {
  Osei: "Nurse Osei",
  Kim: "Nurse Chaky",
  Laurent: "Nurse Laurent",
};

const SYMPOSIUM_RESOURCE_LABELS: Readonly<
  Record<Room, string>
> = {
  A: "Room A",
  B: "Room B",
  C: "Room C",
};

const DELIVERY_RESOURCE_LABELS: Readonly<
  Record<Room, string>
> = {
  A: "Van A",
  B: "Van B",
  C: "Van C",
};

const CLINIC_RESOURCE_LABELS: Readonly<
  Record<Room, string>
> = {
  A: "Ward A",
  B: "Ward B",
  C: "Ward C",
};

const SYMPOSIUM_PERIOD_LABELS: Readonly<
  Record<Slot, string>
> = {
  1: "Slot 1",
  2: "Slot 2",
  3: "Slot 3",
  4: "Slot 4",
};

const DELIVERY_PERIOD_LABELS: Readonly<
  Record<Slot, string>
> = {
  1: "Window 1",
  2: "Window 2",
  3: "Window 3",
  4: "Window 4",
};

const CLINIC_PERIOD_LABELS: Readonly<
  Record<Slot, string>
> = {
  1: "Shift 1",
  2: "Shift 2",
  3: "Shift 3",
  4: "Shift 4",
};

export const TASK_SKINS: Readonly<
  Record<TaskSkinId, TaskSkin>
> = {
  symposium: {
    id: "symposium",
    title: "Symposium Scheduler",
    shortTitle: "Symposium",
    eyebrow: "Scheduling task",
    description:
      "Arrange twelve symposium talks across three rooms and four time slots while satisfying the scheduling requirements.",
    objective:
      "Create a complete symposium schedule that assigns every talk to a suitable room and time slot while satisfying the scheduling constraints.",
    vocabulary: {
      itemSingular: "talk",
      itemPlural: "talks",
      resourceSingular: "room",
      resourcePlural: "rooms",
      periodSingular: "time slot",
      periodPlural: "time slots",
      actorSingular: "speaker",
      actorPlural: "speakers",
      categorySingular: "topic",
      categoryPlural: "topics",
      planSingular: "schedule",
      planVerb: "schedule",
      assignmentVerb: "place",
      unassignedTrayTitle: "Unassigned talks",
      unassignedTrayDescription:
        "Drag each talk into a suitable room and time slot.",
    },
    counts: {
      items: 12,
      resources: 3,
      periods: 4,
      durationMinutes: 15,
    },
    requirement: {
      fieldLabel: "Projector requirement",
      shortLabel: "Projector",
      presentLabel: "Demo",
      absentLabel: "No",
      requiredTitle: "Projector required",
      availableLabel: "Projector available",
      unavailableLabel: "No projector",
      affectedItemPlural: "demo talks",
    },
    grid: {
      unlockedAriaLabel: "Symposium schedule",
      lockedAriaLabel: "Symposium schedule, locked",
      rowAxisLabel: "Room",
      emptyCellLabel: "Empty schedule cell",
      hint:
        "Demo talks require a projector room. Availability windows, room restrictions, and capacity requirements are enforced while dragging. Speaker conflicts remain visible.",
      capacityUnitSingular: "seat",
      capacityUnitPlural: "seats",
    },
    details: {
      title: "Symposium Talk Details",
      introduction:
        "Review each talk's topic, speaker, equipment requirement, available slots, and allowed rooms before creating the schedule.",
      caption:
        "Full list of symposium talks and their scheduling requirements",
      itemColumn: "Talk",
      titleColumn: "Title",
      categoryColumn: "Topic",
      actorColumn: "Speaker",
      requirementColumn: "Demo",
      availabilityColumn: "Available Slots",
      resourceColumn: "Allowed Rooms",
      note:
        "Demo talks require a projector and may only be placed in Room A or Room C. Talk N3 requires at least 80 seats and may only be placed in Room A or Room B.",
    },
    probe: {
      title: "Facilities update",
      collapsedLabel: "Facilities update",
      updateLabel: "facilities update",
      message:
        "The projector in Room C is broken for the rest of the day.",
      noticedQuestionLabel:
        "Did you notice the facilities update?",
      descriptionPrompt:
        "Briefly describe the facilities update you remember.",
      affectedResourceQuestion:
        "Which room was affected by the facilities update?",
      recognitionQuestion:
        "Which facilities update do you recognize?",
      affectedResource: "C",
      requiredResource: "A",
    },
    css: {
      schedulerPage: "scheduler-page-symposium",
      scheduleCell: "schedule-cell-symposium",
      scheduleCellDropzone:
        "schedule-cell-dropzone-symposium",
      unassignedItem: "unassigned-talk-symposium",
      unassignedTray: "unassigned-tray-symposium",
      taskOverview: "task-selection-overview-symposium",
    },
    itemTitles: SYMPOSIUM_ITEM_TITLES,
    categoryLabels: {
      NLP: "NLP",
      Health: "Health",
      Robotics: "Robotics",
    },
    actorLabels: SYMPOSIUM_ACTOR_LABELS,
    noActorConstraintLabel:
      "No shared speaker constraint",
    resourceLabels: SYMPOSIUM_RESOURCE_LABELS,
    periodLabels: SYMPOSIUM_PERIOD_LABELS,
  },

  delivery: {
    id: "delivery",
    title: "Delivery Dispatch",
    shortTitle: "Delivery",
    eyebrow: "Dispatch task",
    description:
      "Arrange twelve shipments across three vans and four route windows while satisfying the dispatch requirements.",
    objective:
      "Create a complete delivery plan that assigns every shipment to a suitable van and route window while satisfying the dispatch constraints.",
    vocabulary: {
      itemSingular: "shipment",
      itemPlural: "shipments",
      resourceSingular: "van",
      resourcePlural: "vans",
      periodSingular: "route window",
      periodPlural: "route windows",
      actorSingular: "driver",
      actorPlural: "drivers",
      categorySingular: "region",
      categoryPlural: "regions",
      planSingular: "dispatch plan",
      planVerb: "dispatch",
      assignmentVerb: "assign",
      unassignedTrayTitle: "Unassigned shipments",
      unassignedTrayDescription:
        "Drag each shipment into a suitable van and route window.",
    },
    counts: {
      items: 12,
      resources: 3,
      periods: 4,
      durationMinutes: 15,
    },
    requirement: {
      fieldLabel: "Refrigeration requirement",
      shortLabel: "Cold chain",
      presentLabel: "Cold chain",
      absentLabel: "No",
      requiredTitle: "Refrigeration required",
      availableLabel: "Refrigeration available",
      unavailableLabel: "No refrigeration",
      affectedItemPlural: "cold-chain shipments",
    },
    grid: {
      unlockedAriaLabel: "Delivery dispatch plan",
      lockedAriaLabel: "Delivery dispatch plan, locked",
      rowAxisLabel: "Van",
      emptyCellLabel: "Empty dispatch cell",
      hint:
        "Cold-chain shipments require a refrigerated van. Availability windows, vehicle restrictions, and capacity requirements are enforced while dragging. Driver conflicts remain visible.",
      capacityUnitSingular: "unit",
      capacityUnitPlural: "units",
    },
    details: {
      title: "Delivery Shipment Details",
      introduction:
        "Review each shipment's region, driver, refrigeration requirement, available route windows, and allowed vans before creating the dispatch plan.",
      caption:
        "Full list of delivery shipments and their dispatch requirements",
      itemColumn: "Shipment",
      titleColumn: "Delivery",
      categoryColumn: "Region",
      actorColumn: "Driver",
      requirementColumn: "Cold Chain",
      availabilityColumn: "Available Windows",
      resourceColumn: "Allowed Vans",
      note:
        "Cold-chain shipments require refrigeration and may only be assigned to Van A or Van C. Shipment N3 requires a high-capacity vehicle and may only be assigned to Van A or Van B.",
    },
    probe: {
      title: "Vehicle update",
      collapsedLabel: "Vehicle update",
      updateLabel: "vehicle update",
      message:
        "The refrigeration unit in Van C has failed for the rest of the dispatch period.",
      noticedQuestionLabel:
        "Did you notice the vehicle update?",
      descriptionPrompt:
        "Briefly describe the vehicle update you remember.",
      affectedResourceQuestion:
        "Which van was affected by the vehicle update?",
      recognitionQuestion:
        "Which vehicle update do you recognize?",
      affectedResource: "C",
      requiredResource: "A",
    },
    css: {
      schedulerPage: "scheduler-page-delivery",
      scheduleCell: "schedule-cell-delivery",
      scheduleCellDropzone:
        "schedule-cell-dropzone-delivery",
      unassignedItem: "unassigned-talk-delivery",
      unassignedTray: "unassigned-tray-delivery",
      taskOverview: "task-selection-overview-delivery",
    },
    itemTitles: DELIVERY_ITEM_TITLES,
    categoryLabels: {
      NLP: "North region",
      Health: "Central region",
      Robotics: "South region",
    },
    actorLabels: DELIVERY_ACTOR_LABELS,
    noActorConstraintLabel:
      "No shared driver constraint",
    resourceLabels: DELIVERY_RESOURCE_LABELS,
    periodLabels: DELIVERY_PERIOD_LABELS,
  },

  clinic: {
    id: "clinic",
    title: "Clinic Roster",
    shortTitle: "Clinic",
    eyebrow: "Roster task",
    description:
      "Arrange twelve clinical duties across three wards and four shifts while satisfying the roster requirements.",
    objective:
      "Create a complete clinic roster that assigns every duty to a suitable ward and shift while satisfying the staffing constraints.",
    vocabulary: {
      itemSingular: "duty",
      itemPlural: "duties",
      resourceSingular: "ward",
      resourcePlural: "wards",
      periodSingular: "shift",
      periodPlural: "shifts",
      actorSingular: "nurse",
      actorPlural: "nurses",
      categorySingular: "specialty",
      categoryPlural: "specialties",
      planSingular: "roster",
      planVerb: "roster",
      assignmentVerb: "assign",
      unassignedTrayTitle: "Unassigned duties",
      unassignedTrayDescription:
        "Drag each duty into a suitable ward and shift.",
    },
    counts: {
      items: 12,
      resources: 3,
      periods: 4,
      durationMinutes: 15,
    },
    requirement: {
      fieldLabel: "ICU requirement",
      shortLabel: "ICU",
      presentLabel: "ICU",
      absentLabel: "No",
      requiredTitle: "ICU-certified ward required",
      availableLabel: "ICU certified",
      unavailableLabel: "Not ICU certified",
      affectedItemPlural: "ICU-required duties",
    },
    grid: {
      unlockedAriaLabel: "Clinic roster",
      lockedAriaLabel: "Clinic roster, locked",
      rowAxisLabel: "Ward",
      emptyCellLabel: "Empty roster cell",
      hint:
        "ICU-required duties must be assigned to an ICU-certified ward. Availability windows, ward restrictions, and capacity requirements are enforced while dragging. Nurse conflicts remain visible.",
      capacityUnitSingular: "patient",
      capacityUnitPlural: "patients",
    },
    details: {
      title: "Clinic Duty Details",
      introduction:
        "Review each duty's specialty, assigned nurse, ICU requirement, available shifts, and allowed wards before creating the roster.",
      caption:
        "Full list of clinic duties and their roster requirements",
      itemColumn: "Duty",
      titleColumn: "Assignment",
      categoryColumn: "Specialty",
      actorColumn: "Nurse",
      requirementColumn: "ICU Required",
      availabilityColumn: "Available Shifts",
      resourceColumn: "Allowed Wards",
      note:
        "ICU-required duties may only be assigned to Ward A or Ward C. Duty N3 requires a ward capacity of at least 80 and may only be assigned to Ward A or Ward B.",
    },
    probe: {
      title: "Ward update",
      collapsedLabel: "Ward update",
      updateLabel: "ward update",
      message:
        "Ward C has lost ICU certification for the remainder of the roster period.",
      noticedQuestionLabel:
        "Did you notice the ward update?",
      descriptionPrompt:
        "Briefly describe the ward update you remember.",
      affectedResourceQuestion:
        "Which ward was affected by the ward update?",
      recognitionQuestion:
        "Which ward update do you recognize?",
      affectedResource: "C",
      requiredResource: "A",
    },
    css: {
      schedulerPage: "scheduler-page-clinic",
      scheduleCell: "schedule-cell-clinic",
      scheduleCellDropzone:
        "schedule-cell-dropzone-clinic",
      unassignedItem: "unassigned-talk-clinic",
      unassignedTray: "unassigned-tray-clinic",
      taskOverview: "task-selection-overview-clinic",
    },
    itemTitles: CLINIC_ITEM_TITLES,
    categoryLabels: {
      NLP: "Emergency care",
      Health: "General medicine",
      Robotics: "Critical care",
    },
    actorLabels: CLINIC_ACTOR_LABELS,
    noActorConstraintLabel:
      "No shared nurse constraint",
    resourceLabels: CLINIC_RESOURCE_LABELS,
    periodLabels: CLINIC_PERIOD_LABELS,
  },
};

export function isTaskSkinId(
  value: unknown,
): value is TaskSkinId {
  return isStudyTaskId(value);
}

export function resolveTaskSkinId(
  value: unknown,
  fallback: TaskSkinId = "symposium",
): TaskSkinId {
  return isTaskSkinId(value)
    ? value
    : fallback;
}

export function getTaskSkin(
  taskId: TaskSkinId,
): TaskSkin {
  return TASK_SKINS[taskId];
}

export function getTaskItemTitle(
  taskId: TaskSkinId,
  itemId: string,
  fallbackTitle = itemId,
): string {
  return (
    TASK_SKINS[taskId].itemTitles[itemId] ??
    fallbackTitle
  );
}

export function getTaskCategoryLabel(
  taskId: TaskSkinId,
  topic: Topic,
): string {
  return TASK_SKINS[taskId].categoryLabels[topic];
}

export function getTaskActorLabel(
  taskId: TaskSkinId,
  actor: string | undefined,
): string {
  const skin = TASK_SKINS[taskId];

  if (!actor) {
    return skin.noActorConstraintLabel;
  }

  const mappedLabel = skin.actorLabels[actor];

  if (mappedLabel) {
    return mappedLabel;
  }

  switch (taskId) {
    case "delivery":
      return `Driver ${actor}`;

    case "clinic":
      return `Nurse ${actor}`;

    case "symposium":
    default:
      return `Dr. ${actor}`;
  }
}

export function getTaskResourceLabel(
  taskId: TaskSkinId,
  room: Room,
): string {
  return TASK_SKINS[taskId].resourceLabels[room];
}

export function getTaskPeriodLabel(
  taskId: TaskSkinId,
  slot: Slot,
): string {
  return TASK_SKINS[taskId].periodLabels[slot];
}

export function formatTaskResources(
  taskId: TaskSkinId,
  rooms: readonly Room[],
): string {
  return rooms
    .map((room) =>
      getTaskResourceLabel(taskId, room),
    )
    .join(", ");
}

export function formatTaskPeriods(
  taskId: TaskSkinId,
  slots: readonly Slot[],
): string {
  return slots
    .map((slot) =>
      getTaskPeriodLabel(taskId, slot),
    )
    .join(", ");
}

export function getTaskCapacityLabel(
  taskId: TaskSkinId,
  capacity: number,
): string {
  const {
    capacityUnitSingular,
    capacityUnitPlural,
  } = TASK_SKINS[taskId].grid;

  const unit =
    capacity === 1
      ? capacityUnitSingular
      : capacityUnitPlural;

  return `${capacity} ${unit}`;
}

export function getTaskEquipmentLabel(
  taskId: TaskSkinId,
  available: boolean,
): string {
  const requirement =
    TASK_SKINS[taskId].requirement;

  return available
    ? requirement.availableLabel
    : requirement.unavailableLabel;
}

export function getTaskRequirementLabel(
  taskId: TaskSkinId,
  required: boolean,
): string {
  const requirement =
    TASK_SKINS[taskId].requirement;

  return required
    ? requirement.presentLabel
    : requirement.absentLabel;
}

export function getTaskIllegalMoveMessage(
  taskId: TaskSkinId,
  reason: IllegalMoveReason | undefined,
): string {
  const skin = TASK_SKINS[taskId];
  const {
    itemSingular,
    resourceSingular,
    periodSingular,
  } = skin.vocabulary;

  switch (reason) {
    case "trial_locked":
      return "The task is locked.";

    case "target_room_not_allowed":
    case "displaced_talk_room_not_allowed":
      return `The ${resourceSingular} is not allowed for this move or swap.`;

    case "target_slot_not_allowed":
    case "displaced_talk_slot_not_allowed":
      return `The ${periodSingular} is not allowed for this move or swap.`;

    case "target_projector_required":
    case "displaced_talk_projector_required":
      return `${skin.requirement.requiredTitle} for this move or swap.`;

    case "target_capacity_insufficient":
    case "displaced_talk_capacity_insufficient":
      return `The ${resourceSingular} capacity is insufficient for this move or swap.`;

    case "talk_not_found":
    case "source_not_found":
      return `The selected ${itemSingular} could not be moved.`;

    case "same_cell":
      return `The ${itemSingular} is already in this cell.`;

    case "tray_unplace_disabled":
      return `Returning this ${itemSingular} to the tray is disabled.`;

    default:
      return `Unavailable for the selected ${itemSingular} or swap.`;
  }
}

export function getTaskPageClassName(
  taskId: TaskSkinId,
): string {
  return TASK_SKINS[taskId].css.schedulerPage;
}

export function getTaskScheduleCellClassName(
  taskId: TaskSkinId,
): string {
  return TASK_SKINS[taskId].css.scheduleCell;
}

export function getTaskDropzoneClassName(
  taskId: TaskSkinId,
): string {
  return TASK_SKINS[taskId].css.scheduleCellDropzone;
}

export function getTaskUnassignedItemClassName(
  taskId: TaskSkinId,
): string {
  return TASK_SKINS[taskId].css.unassignedItem;
}

export function getTaskUnassignedTrayClassName(
  taskId: TaskSkinId,
): string {
  return TASK_SKINS[taskId].css.unassignedTray;
}
