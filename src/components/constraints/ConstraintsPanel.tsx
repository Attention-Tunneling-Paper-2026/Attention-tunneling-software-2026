import {
  useParams,
} from "react-router";

import {
  SYMPOSIUM_TASK_DATA,
} from "../../data/tasks/symposium";

import {
  isStudyTaskId,
} from "../../types/scheduler";

import type {
  StudyTaskId,
} from "../../types/scheduler";

interface TaskRule {
  id: string;
  title: string;
  description: string;
}

interface ConstraintsPanelProps {
  taskId?: StudyTaskId;
}

interface TaskRulesContent {
  constraintsTitle: string;
  preferencesTitle: string;
  constraints: readonly TaskRule[];
  preferences: readonly TaskRule[];
}

const DELIVERY_CONSTRAINTS: readonly TaskRule[] = [
  {
    id: "refrigeration_requirement",
    title: "Refrigeration requirement",
    description:
      "Cold-chain shipments N1, R1, R2, and R3 require refrigeration. They may only use Van A or Van C.",
  },
  {
    id: "van_capacity_requirement",
    title: "Van capacity requirement",
    description:
      "Shipment N3 requires a van capacity of at least 80 units. It may only use Van A or Van B.",
  },
  {
    id: "driver_availability",
    title: "Driver availability",
    description:
      "A driver cannot handle more than one shipment during the same route window.",
  },
];

const DELIVERY_PREFERENCES: readonly TaskRule[] = [
  {
    id: "delivery-region-grouping",
    title: "Group delivery regions",
    description:
      "Where possible, keep shipments from the same delivery region on the same van.",
  },
  {
    id: "delivery-priority-placement",
    title: "Priority shipment placement",
    description:
      "Prefer Priority medical supplies (N1) in Van A during Window 1.",
  },
];

const CLINIC_CONSTRAINTS: readonly TaskRule[] = [
  {
    id: "icu_requirement",
    title: "ICU requirement",
    description:
      "ICU-required duties N1, R1, R2, and R3 must use an ICU-certified ward. They may only use Ward A or Ward C.",
  },
  {
    id: "ward_capacity_requirement",
    title: "Ward capacity requirement",
    description:
      "Duty N3 requires a ward capacity of at least 80 patients. It may only use Ward A or Ward B.",
  },
  {
    id: "nurse_availability",
    title: "Nurse availability",
    description:
      "A nurse cannot perform more than one duty during the same shift.",
  },
];

const CLINIC_PREFERENCES: readonly TaskRule[] = [
  {
    id: "clinic-specialty-grouping",
    title: "Group clinical specialties",
    description:
      "Where possible, keep duties from the same specialty in the same ward.",
  },
  {
    id: "clinic-priority-placement",
    title: "Emergency intake placement",
    description:
      "Prefer Emergency ICU Intake (N1) in Ward A during Shift 1.",
  },
];

const TASK_RULES: Record<
  StudyTaskId,
  TaskRulesContent
> = {
  symposium: {
    constraintsTitle:
      "Scheduling Constraints",
    preferencesTitle:
      "Scheduling Preferences",
    constraints:
      SYMPOSIUM_TASK_DATA.constraints,
    preferences:
      SYMPOSIUM_TASK_DATA.preferences,
  },
  delivery: {
    constraintsTitle:
      "Delivery Constraints",
    preferencesTitle:
      "Delivery Preferences",
    constraints:
      DELIVERY_CONSTRAINTS,
    preferences:
      DELIVERY_PREFERENCES,
  },
  clinic: {
    constraintsTitle:
      "Roster Constraints",
    preferencesTitle:
      "Roster Preferences",
    constraints:
      CLINIC_CONSTRAINTS,
    preferences:
      CLINIC_PREFERENCES,
  },
};

export default function ConstraintsPanel({
  taskId,
}: ConstraintsPanelProps) {
  const {
    taskId: routeTaskId,
  } = useParams<{
    taskId?: string;
  }>();

  const resolvedTaskId:
    StudyTaskId =
      isStudyTaskId(
        taskId,
      )
        ? taskId
        : isStudyTaskId(
              routeTaskId,
            )
          ? routeTaskId
          : "symposium";

  const taskRules =
    TASK_RULES[
      resolvedTaskId
    ];

  const panelTitleId =
    `${resolvedTaskId}-task-rules-title`;

  const constraintsTitleId =
    `${resolvedTaskId}-constraints-title`;

  const preferencesTitleId =
    `${resolvedTaskId}-preferences-title`;

  return (
    <aside
      className="panel constraint-panel"
      aria-labelledby={
        panelTitleId
      }
      data-task-id={
        resolvedTaskId
      }
    >
      <div
        id={
          panelTitleId
        }
        className="panel-title"
      >
        Task Rules
      </div>

      <section
        className="constraint-section"
        aria-labelledby={
          constraintsTitleId
        }
      >
        <div
          id={
            constraintsTitleId
          }
          className="constraint-section-title"
        >
          {
            taskRules.constraintsTitle
          }
        </div>

        <div
          className="constraint-rules-list"
          role="list"
        >
          {taskRules.constraints.map(
            (
              constraint,
              index,
            ) => (
              <div
                key={
                  constraint.id
                }
                className="constraint-rule"
                role="listitem"
                aria-label={`${constraint.title}: ${constraint.description}`}
              >
                <span
                  className="constraint-rule-icon"
                  aria-hidden="true"
                >
                  <span className="constraint-rule-number">
                    {index + 1}
                  </span>
                </span>

                <span>
                  {
                    constraint.description
                  }
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section
        className="preference-section"
        aria-labelledby={
          preferencesTitleId
        }
      >
        <div
          id={
            preferencesTitleId
          }
          className="preference-section-title"
        >
          {
            taskRules.preferencesTitle
          }
        </div>

        <div
          className="preference-rules-list"
          role="list"
        >
          {taskRules.preferences.map(
            (
              preference,
              index,
            ) => (
              <div
                key={
                  preference.id
                }
                className="preference-rule"
                role="listitem"
                aria-label={`${preference.title}: ${preference.description}`}
              >
                <span
                  className="preference-rule-icon"
                  aria-hidden="true"
                >
                  <span className="preference-rule-number">
                    {index + 1}
                  </span>
                </span>

                <span>
                  {
                    preference.description
                  }
                </span>
              </div>
            ),
          )}
        </div>
      </section>
    </aside>
  );
}
