import {
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react";

import {
  TALKS,
} from "../../data/symposium";

import {
  useSchedulerStore,
} from "../../store/schedulerStore";

import type {
  Placement,
  Room,
  Slot,
} from "../../types/scheduler";

type RuleStatus =
  | "satisfied"
  | "unsatisfied"
  | "pending";

type PreferenceStatus =
  RuleStatus;

interface ConstraintRule {
  number:
    number;

  text:
    string;

  status:
    RuleStatus;
}

const DEMO_TALK_IDS =
  new Set([
    "N1",
    "R1",
    "R2",
    "R3",
  ]);

const PROJECTOR_ROOMS =
  new Set<Room>([
    "A",
    "C",
  ]);

const N3_ALLOWED_ROOMS =
  new Set<Room>([
    "A",
    "B",
  ]);

function getTalkById(
  talkId:
    string,
) {
  return TALKS.find(
    (talk) =>
      talk.id ===
      talkId,
  );
}

function getTalkRecord(
  talk:
    unknown,
): Record<
  string,
  unknown
> {
  if (
    typeof talk ===
      "object" &&
    talk !==
      null
  ) {
    return talk as Record<
      string,
      unknown
    >;
  }

  return {};
}

function getAllowedRooms(
  talk:
    unknown,
): Room[] {
  const record =
    getTalkRecord(
      talk,
    );

  const value =
    record.allowedRooms;

  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    (
      room,
    ): room is Room =>
      room ===
        "A" ||
      room ===
        "B" ||
      room ===
        "C",
  );
}

function getAvailableSlots(
  talk:
    unknown,
): Slot[] {
  const record =
    getTalkRecord(
      talk,
    );

  const value =
    record.availableSlots;

  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    (
      slot,
    ): slot is Slot =>
      slot ===
        1 ||
      slot ===
        2 ||
      slot ===
        3 ||
      slot ===
        4,
  );
}

function getSpeakerName(
  talk:
    unknown,
): string {
  const record =
    getTalkRecord(
      talk,
    );

  const speaker =
    record.speaker;

  return typeof speaker ===
    "string"
    ? speaker.trim()
    : "";
}

function scheduleIsComplete(
  placements:
    Placement[],
): boolean {
  if (
    placements.length !==
    TALKS.length
  ) {
    return false;
  }

  const scheduledTalkIds =
    new Set(
      placements.map(
        (placement) =>
          placement.talkId,
      ),
    );

  if (
    scheduledTalkIds.size !==
    TALKS.length
  ) {
    return false;
  }

  return TALKS.every(
    (talk) =>
      scheduledTalkIds.has(
        talk.id,
      ),
  );
}

function getEveryTalkScheduledStatus(
  placements:
    Placement[],
): RuleStatus {
  const validTalkIds =
    new Set(
      TALKS.map(
        (talk) =>
          talk.id,
      ),
    );

  const scheduledTalkIds =
    placements.map(
      (placement) =>
        placement.talkId,
    );

  const uniqueScheduledTalkIds =
    new Set(
      scheduledTalkIds,
    );

  const hasDuplicateTalk =
    uniqueScheduledTalkIds.size !==
    scheduledTalkIds.length;

  const hasUnknownTalk =
    scheduledTalkIds.some(
      (talkId) =>
        !validTalkIds.has(
          talkId,
        ),
    );

  if (
    hasDuplicateTalk ||
    hasUnknownTalk ||
    placements.length >
      TALKS.length
  ) {
    return "unsatisfied";
  }

  return scheduleIsComplete(
    placements,
  )
    ? "satisfied"
    : "pending";
}

function getUniqueCellStatus(
  placements:
    Placement[],
): RuleStatus {
  if (
    placements.length ===
    0
  ) {
    return "pending";
  }

  const occupiedCells =
    new Set<string>();

  for (
    const placement of
    placements
  ) {
    const cellId =
      `${placement.room}_${placement.slot}`;

    if (
      occupiedCells.has(
        cellId,
      )
    ) {
      return "unsatisfied";
    }

    occupiedCells.add(
      cellId,
    );
  }

  return "satisfied";
}

function placementUsesAllowedLocation(
  placement:
    Placement,
): boolean {
  const talk =
    getTalkById(
      placement.talkId,
    );

  if (
    !talk
  ) {
    return false;
  }

  const allowedRooms =
    getAllowedRooms(
      talk,
    );

  const availableSlots =
    getAvailableSlots(
      talk,
    );

  const roomAllowed =
    allowedRooms.length ===
      0 ||
    allowedRooms.includes(
      placement.room,
    );

  const slotAllowed =
    availableSlots.length ===
      0 ||
    availableSlots.includes(
      placement.slot,
    );

  return (
    roomAllowed &&
    slotAllowed
  );
}

function getAllowedLocationStatus(
  placements:
    Placement[],
): RuleStatus {
  if (
    placements.length ===
    0
  ) {
    return "pending";
  }

  return placements.every(
    placementUsesAllowedLocation,
  )
    ? "satisfied"
    : "unsatisfied";
}

function getDemoProjectorStatus(
  placements:
    Placement[],
): RuleStatus {
  const demoPlacements =
    placements.filter(
      (placement) =>
        DEMO_TALK_IDS.has(
          placement.talkId,
        ),
    );

  const invalidDemoPlacement =
    demoPlacements.some(
      (placement) =>
        !PROJECTOR_ROOMS.has(
          placement.room,
        ),
    );

  if (
    invalidDemoPlacement
  ) {
    return "unsatisfied";
  }

  const placedDemoTalkIds =
    new Set(
      demoPlacements.map(
        (placement) =>
          placement.talkId,
      ),
    );

  const allDemoTalksPlaced =
    Array.from(
      DEMO_TALK_IDS,
    ).every(
      (talkId) =>
        placedDemoTalkIds.has(
          talkId,
        ),
    );

  return allDemoTalksPlaced
    ? "satisfied"
    : "pending";
}

function getN3CapacityStatus(
  placements:
    Placement[],
): RuleStatus {
  const placement =
    placements.find(
      (item) =>
        item.talkId ===
        "N3",
    );

  if (
    !placement
  ) {
    return "pending";
  }

  return N3_ALLOWED_ROOMS.has(
    placement.room,
  )
    ? "satisfied"
    : "unsatisfied";
}

function getSpeakerConflictStatus(
  placements:
    Placement[],
): RuleStatus {
  if (
    placements.length ===
    0
  ) {
    return "pending";
  }

  const speakerSlots =
    new Set<string>();

  for (
    const placement of
    placements
  ) {
    const talk =
      getTalkById(
        placement.talkId,
      );

    if (
      !talk
    ) {
      continue;
    }

    const speaker =
      getSpeakerName(
        talk,
      );

    if (
      speaker.length ===
      0
    ) {
      continue;
    }

    const speakerSlotKey =
      `${speaker.toLowerCase()}_${placement.slot}`;

    if (
      speakerSlots.has(
        speakerSlotKey,
      )
    ) {
      return "unsatisfied";
    }

    speakerSlots.add(
      speakerSlotKey,
    );
  }

  return "satisfied";
}

function topicsAreGroupedByRoom(
  placements:
    Placement[],
): boolean {
  const roomTopics =
    new Map<
      string,
      Set<string>
    >();

  for (
    const placement of
    placements
  ) {
    const talk =
      getTalkById(
        placement.talkId,
      );

    if (
      !talk
    ) {
      continue;
    }

    const topics =
      roomTopics.get(
        placement.room,
      ) ??
      new Set<string>();

    topics.add(
      talk.topic,
    );

    roomTopics.set(
      placement.room,
      topics,
    );
  }

  return Array.from(
    roomTopics.values(),
  ).every(
    (topics) =>
      topics.size <=
      1,
  );
}

function keynoteOpensInRoomA(
  placements:
    Placement[],
): boolean {
  return placements.some(
    (placement) =>
      placement.talkId ===
        "N1" &&
      placement.room ===
        "A" &&
      placement.slot ===
        1,
  );
}

function getRuleClass(
  status:
    RuleStatus,
): string {
  return [
    "constraint-rule",

    status ===
      "satisfied"
      ? "constraint-rule-satisfied"
      : "",

    status ===
      "unsatisfied"
      ? "constraint-rule-unsatisfied"
      : "",

    status ===
      "pending"
      ? "constraint-rule-pending"
      : "",
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );
}

function RuleStatusIcon({
  status,
  number,
}: {
  status:
    RuleStatus;

  number:
    number;
}) {
  if (
    status ===
    "satisfied"
  ) {
    return (
      <CheckCircle2
        size={19}
        aria-label={`Constraint ${number} satisfied`}
      />
    );
  }

  if (
    status ===
    "unsatisfied"
  ) {
    return (
      <XCircle
        size={19}
        aria-label={`Constraint ${number} not satisfied`}
      />
    );
  }

  return (
    <span
      className="constraint-rule-number"
      aria-label={`Constraint ${number} pending`}
    >
      {number}
    </span>
  );
}

function getPreferenceClass(
  status:
    PreferenceStatus,
): string {
  if (
    status ===
    "satisfied"
  ) {
    return "preference-item preference-satisfied";
  }

  if (
    status ===
    "unsatisfied"
  ) {
    return "preference-item preference-unsatisfied";
  }

  return "preference-item";
}

function PreferenceStatusIcon({
  status,
}: {
  status:
    PreferenceStatus;
}) {
  if (
    status ===
    "satisfied"
  ) {
    return (
      <CheckCircle2
        size={17}
        aria-hidden="true"
      />
    );
  }

  if (
    status ===
    "unsatisfied"
  ) {
    return (
      <XCircle
        size={17}
        aria-hidden="true"
      />
    );
  }

  return (
    <Circle
      size={17}
      aria-hidden="true"
    />
  );
}

export default function ConstraintsPanel() {
  const placements =
    useSchedulerStore(
      (state) =>
        state.placements,
    );

  const complete =
    scheduleIsComplete(
      placements,
    );

  const topicsGrouped =
    topicsAreGroupedByRoom(
      placements,
    );

  const keynoteSatisfied =
    keynoteOpensInRoomA(
      placements,
    );

  const topicsStatus:
    PreferenceStatus =
      !complete
        ? "pending"
        : topicsGrouped
          ? "satisfied"
          : "unsatisfied";

  const keynoteStatus:
    PreferenceStatus =
      keynoteSatisfied
        ? "satisfied"
        : complete
          ? "unsatisfied"
          : "pending";

  const constraints:
    ConstraintRule[] = [
      {
        number:
          1,

        text:
          "Schedule every talk exactly once.",

        status:
          getEveryTalkScheduledStatus(
            placements,
          ),
      },

      {
        number:
          2,

        text:
          "Each room and slot can contain only one talk.",

        status:
          getUniqueCellStatus(
            placements,
          ),
      },

      {
        number:
          3,

        text:
          "Talks may only use their allowed rooms and available slots. Unavailable cells cannot be used.",

        status:
          getAllowedLocationStatus(
            placements,
          ),
      },

      {
        number:
          4,

        text:
          "Demo talks N1, R1, R2, and R3 require a projector. They may only use Room A or Room C.",

        status:
          getDemoProjectorStatus(
            placements,
          ),
      },

      {
        number:
          5,

        text:
          "Talk N3 requires at least 80 seats. It may only use Room A or Room B.",

        status:
          getN3CapacityStatus(
            placements,
          ),
      },

      {
        number:
          6,

        text:
          "A speaker cannot present more than one talk during the same slot.",

        status:
          getSpeakerConflictStatus(
            placements,
          ),
      },
    ];

  return (
    <aside className="panel constraint-panel">
      <div className="panel-title">
        Task Rules
      </div>

      <section className="constraint-section">
        <div className="constraint-section-title">
          Scheduling Constraints
        </div>

        <div className="constraint-rules-list">
          {constraints.map(
            (constraint) => (
              <div
                key={
                  constraint.number
                }
                className={getRuleClass(
                  constraint.status,
                )}
              >
                <span className="constraint-rule-icon">
                  <RuleStatusIcon
                    status={
                      constraint.status
                    }
                    number={
                      constraint.number
                    }
                  />
                </span>

                <span>
                  {constraint.text}
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="preference-card">
        <div className="preference-heading">
          Scheduling Preferences
        </div>

        <div
          className={getPreferenceClass(
            topicsStatus,
          )}
        >
          <PreferenceStatusIcon
            status={
              topicsStatus
            }
          />

          <span>
            Keep talks from the same topic grouped in the
            same room
          </span>
        </div>

        <div
          className={getPreferenceClass(
            keynoteStatus,
          )}
        >
          <PreferenceStatusIcon
            status={
              keynoteStatus
            }
          />

          <span>
            Place keynote N1 in Room A during Slot 1
          </span>
        </div>

        {!complete && (
          <div className="preference-item">
            <Circle
              size={17}
              aria-hidden="true"
            />

            <span>
              Preference results will be final after all
              twelve talks are scheduled
            </span>
          </div>
        )}
      </section>
    </aside>
  );
}