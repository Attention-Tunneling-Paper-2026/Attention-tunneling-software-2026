import {
  formatAllowedRooms,
  formatAllowedSlots,
  TALKS,
} from "../../data/symposium";

export default function TaskSummaryTable() {
  return (
    <section
      className="task-summary-wrapper"
      aria-labelledby="task-summary-title"
    >
      <div className="task-summary-introduction">
        <h2 id="task-summary-title">
          Symposium Talk Details
        </h2>

        <p>
          Review each talk's topic, speaker, equipment
          requirement, available slots, and allowed rooms
          before creating the schedule.
        </p>
      </div>

      <div className="task-summary-table-container">
        <table className="task-summary-table">
          <caption className="sr-only">
            Full list of symposium talks and their
            scheduling requirements
          </caption>

          <thead>
            <tr>
              <th scope="col">
                Talk
              </th>

              <th scope="col">
                Title
              </th>

              <th scope="col">
                Topic
              </th>

              <th scope="col">
                Speaker
              </th>

              <th scope="col">
                Demo
              </th>

              <th scope="col">
                Available Slots
              </th>

              <th scope="col">
                Allowed Rooms
              </th>
            </tr>
          </thead>

          <tbody>
            {TALKS.map((talk) => {
              const topicClass =
                `task-summary-topic task-summary-topic-${talk.topic.toLowerCase()}`;

              const speakerLabel =
                talk.speaker
                  ? `Dr. ${talk.speaker}`
                  : "Solo speaker";

              return (
                <tr key={talk.id}>
                  <th
                    scope="row"
                    className="task-summary-talk-id"
                  >
                    {talk.id}
                  </th>

                  <td>
                    {talk.title}
                  </td>

                  <td>
                    <span className={topicClass}>
                      {talk.topic}
                    </span>
                  </td>

                  <td>
                    {speakerLabel}
                  </td>

                  <td>
                    {talk.demo ? (
                      <span
                        className="task-summary-demo"
                        title="Projector required"
                      >
                        Demo
                      </span>
                    ) : (
                      <span className="task-summary-not-demo">
                        No
                      </span>
                    )}
                  </td>

                  <td>
                    {formatAllowedSlots(
                      talk.allowedSlots,
                    )}
                  </td>

                  <td>
                    {formatAllowedRooms(
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
        Demo talks require a projector and may only be
        placed in Room A or Room C. Talk N3 requires at
        least 80 seats and may only be placed in Room A or
        Room B.
      </div>
    </section>
  );
}