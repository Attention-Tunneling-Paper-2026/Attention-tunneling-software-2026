import {
  SYMPOSIUM_TASK_DATA,
} from "../../data/tasks/symposium";

export default function ConstraintsPanel() {
  return (
    <aside
      className="panel constraint-panel"
      aria-labelledby="task-rules-title"
    >
      <div
        id="task-rules-title"
        className="panel-title"
      >
        Task Rules
      </div>

      <section
        className="constraint-section"
        aria-labelledby="scheduling-constraints-title"
      >
        <div
          id="scheduling-constraints-title"
          className="constraint-section-title"
        >
          Scheduling Constraints
        </div>

        <div
          className="constraint-rules-list"
          role="list"
        >
          {SYMPOSIUM_TASK_DATA.constraints.map(
            (constraint, index) => (
              <div
                key={constraint.id}
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
                  {constraint.description}
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section
        className="preference-section"
        aria-labelledby="scheduling-preferences-title"
      >
        <div
          id="scheduling-preferences-title"
          className="preference-section-title"
        >
          Scheduling Preferences
        </div>

        <div
          className="preference-rules-list"
          role="list"
        >
          {SYMPOSIUM_TASK_DATA.preferences.map(
            (preference, index) => (
              <div
                key={preference.id}
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
                  {preference.description}
                </span>
              </div>
            ),
          )}
        </div>
      </section>
    </aside>
  );
}
