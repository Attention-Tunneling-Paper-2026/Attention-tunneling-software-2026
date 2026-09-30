import {
  ArrowRight,
  Bell,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
  FormEvent,
  ReactNode,
} from "react";

import {
  useNavigate,
} from "react-router";

import DebriefForm from "../components/forms/DebriefForm";
import LikertScale from "../components/forms/LikertScale";

import type {
  DebriefFormValues,
} from "../components/forms/DebriefForm";

import {
  getSemanticProbe,
} from "../data/symposium";

import {
  buildTrialEventRows,
  buildTrialSummaryRows,
} from "../metrics/trialMetrics";

import {
  useEventLogStore,
} from "../store/eventLogStore";

import {
  useQuestionnaireStore,
} from "../store/questionnaireStore";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

import type {
  StudyEvent,
} from "../types/events";

import type {
  LikertRating,
  PrimaryInfluence,
  ProbeRecallResponses,
  ProbeRecallRoom,
  ProbeRecognitionChoice,
  TrialQuestionnaireResponse,
  YesNoUnsure,
} from "../types/questionnaire";

import {
  isLikertRating,
  isProbeRecallComplete,
} from "../types/questionnaire";

import type {
  StudyTrialProgress,
} from "../types/study";

import {
  downloadCsv,
  getTrialEventsCsvFileName,
  getTrialSummaryCsvFileName,
} from "../utils/csvExport";

const TOTAL_TASKS =
  3;

const TRIALS_PER_TASK =
  3;

const TOTAL_SELECTABLE_TRIAL_OPTIONS =
  TOTAL_TASKS *
  TRIALS_PER_TASK;

const TOTAL_STUDY_TRIALS =
  TOTAL_TASKS;

type SupportedStudyTaskId =
  | "symposium"
  | "delivery"
  | "clinic";

const STUDY_TASK_IDS:
  readonly SupportedStudyTaskId[] = [
    "symposium",
    "delivery",
    "clinic",
  ];

type StudyTrialWithIdentity =
  StudyTrialProgress & {
    taskId?:
      SupportedStudyTaskId;

    globalTrialNumber?:
      number;

    outerTaskNumber?:
      number;

    innerTaskNumber?:
      number;

    trialId?:
      string;
  };

interface TaskRecallCopy {
  taskTitle:
    string;

  updateLabel:
    string;

  affectedLocationTitle:
    string;

  affectedLocationQuestion:
    string;

  recallConfidenceDescription:
    string;

  locationLabels:
    readonly [
      string,
      string,
      string
    ];

  noLocationAffectedLabel:
    string;

  recognitionLabels: {
    correct:
      string;

    alternativeA:
      string;

    alternativeB:
      string;

    timeChanged:
      string;

    noUpdate:
      string;
  };

  recognitionValues: {
    correct:
      Exclude<
        ProbeRecognitionChoice,
        ""
      >;

    alternativeA:
      Exclude<
        ProbeRecognitionChoice,
        ""
      >;

    alternativeB:
      Exclude<
        ProbeRecognitionChoice,
        ""
      >;

    timeChanged:
      Exclude<
        ProbeRecognitionChoice,
        ""
      >;

    noUpdate:
      Exclude<
        ProbeRecognitionChoice,
        ""
      >;
  };
}

// ADVISER FIX: The existing task-specific recall questions now appear only here.
const TASK_RECALL_COPY: Record<
  SupportedStudyTaskId,
  TaskRecallCopy
> = {
  symposium: {
    taskTitle:
      "Symposium Scheduler",

    updateLabel:
      "facilities update",

    affectedLocationTitle:
      "Affected room",

    affectedLocationQuestion:
      "Which room was affected by the facilities update?",

    recallConfidenceDescription:
      "How confident are you that your answer about the affected room is correct?",

    locationLabels: [
      "Room A",
      "Room B",
      "Room C",
    ],

    noLocationAffectedLabel:
      "No room was affected",

    recognitionLabels: {
      correct:
        getSemanticProbe(
          "symposium",
        ).message,

      alternativeA:
        "The projector in Room A broke for the rest of the day",

      alternativeB:
        "Room B became unavailable for the rest of the day",

      timeChanged:
        "The time of one session changed",

      noUpdate:
        "No facilities update was shown",
    },

    recognitionValues: {
      correct:
        "room_c_projector_failure",

      alternativeA:
        "room_a_projector_failure",

      alternativeB:
        "room_b_unavailable",

      timeChanged:
        "session_time_changed",

      noUpdate:
        "no_update",
    },
  },

  delivery: {
    taskTitle:
      "Delivery Dispatch",

    updateLabel:
      "vehicle update",

    affectedLocationTitle:
      "Affected van",

    affectedLocationQuestion:
      "Which van was affected by the vehicle update?",

    recallConfidenceDescription:
      "How confident are you that your answer about the affected van is correct?",

    locationLabels: [
      "Van A",
      "Van B",
      "Van C",
    ],

    noLocationAffectedLabel:
      "No van was affected",

    recognitionLabels: {
      correct:
        getSemanticProbe(
          "delivery",
        ).message,

      alternativeA:
        "The refrigeration unit in Van A failed for the rest of the day",

      alternativeB:
        "Van B became unavailable for the rest of the day",

      timeChanged:
        "The route window of one shipment changed",

      noUpdate:
        "No vehicle update was shown",
    },

    recognitionValues: {
      correct:
        "van_c_refrigeration_failure",

      alternativeA:
        "van_a_refrigeration_failure",

      alternativeB:
        "van_b_unavailable",

      timeChanged:
        "shipment_route_window_changed",

      noUpdate:
        "no_update",
    },
  },

  clinic: {
    taskTitle:
      "Clinic Roster",

    updateLabel:
      "ward update",

    affectedLocationTitle:
      "Affected ward",

    affectedLocationQuestion:
      "Which ward was affected by the ward update?",

    recallConfidenceDescription:
      "How confident are you that your answer about the affected ward is correct?",

    locationLabels: [
      "Ward A",
      "Ward B",
      "Ward C",
    ],

    noLocationAffectedLabel:
      "No ward was affected",

    recognitionLabels: {
      correct:
        getSemanticProbe(
          "clinic",
        ).message,

      alternativeA:
        "Ward A lost ICU certification for the rest of the day",

      alternativeB:
        "Ward B became unavailable for the rest of the day",

      timeChanged:
        "The shift time of one duty changed",

      noUpdate:
        "No ward update was shown",
    },

    recognitionValues: {
      correct:
        "ward_c_icu_certification_loss",

      alternativeA:
        "ward_a_icu_certification_loss",

      alternativeB:
        "ward_b_unavailable",

      timeChanged:
        "duty_shift_changed",

      noUpdate:
        "no_update",
    },
  },
};

function getTaskRecallCopy(
  taskId:
    SupportedStudyTaskId,
): TaskRecallCopy {
  const copy =
    TASK_RECALL_COPY[
      taskId
    ];

  return {
    ...copy,

    locationLabels: [
      ...copy.locationLabels,
    ],

    recognitionLabels: {
      ...copy.recognitionLabels,
    },

    recognitionValues: {
      ...copy.recognitionValues,
    },
  };
}

function getProbeLocationOptions(
  taskCopy:
    TaskRecallCopy,
): Array<{
  value:
    Exclude<
      ProbeRecallRoom,
      ""
    >;

  label:
    string;
}> {
  return [
    {
      value:
        "A",

      label:
        taskCopy.locationLabels[
          0
        ],
    },

    {
      value:
        "B",

      label:
        taskCopy.locationLabels[
          1
        ],
    },

    {
      value:
        "C",

      label:
        taskCopy.locationLabels[
          2
        ],
    },

    {
      value:
        "none",

      label:
        taskCopy.noLocationAffectedLabel,
    },

    {
      value:
        "unsure",

      label:
        "Unsure",
    },
  ];
}

function getProbeRecognitionOptions(
  taskCopy:
    TaskRecallCopy,
): Array<{
  value:
    Exclude<
      ProbeRecognitionChoice,
      ""
    >;

  label:
    string;
}> {
  return [
    {
      value:
        taskCopy
          .recognitionValues
          .correct,

      label:
        taskCopy
          .recognitionLabels
          .correct,
    },

    {
      value:
        taskCopy
          .recognitionValues
          .alternativeA,

      label:
        taskCopy
          .recognitionLabels
          .alternativeA,
    },

    {
      value:
        taskCopy
          .recognitionValues
          .alternativeB,

      label:
        taskCopy
          .recognitionLabels
          .alternativeB,
    },

    {
      value:
        taskCopy
          .recognitionValues
          .timeChanged,

      label:
        taskCopy
          .recognitionLabels
          .timeChanged,
    },

    {
      value:
        taskCopy
          .recognitionValues
          .noUpdate,

      label:
        taskCopy
          .recognitionLabels
          .noUpdate,
    },

    {
      value:
        "unsure",

      label:
        "Unsure",
    },
  ];
}

function QuestionnaireSection({
  icon,
  title,
  description,
  children,
}: {
  icon:
    ReactNode;

  title:
    string;

  description:
    string;

  children:
    ReactNode;
}) {
  return (
    <section className="questionnaire-section">
      <div className="study-section-heading">
        <div className="questionnaire-section-icon">
          {icon}
        </div>

        <div>
          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

interface DelayedRecallSectionProps {
  taskId:
    SupportedStudyTaskId;

  trialNumber:
    StudyTrialProgress["trialNumber"];

  trialOrder:
    number;

  condition:
    StudyTrialProgress["condition"];

  probeVersion:
    string;

  response:
    TrialQuestionnaireResponse;

  disabled:
    boolean;

  onChange:
    <Key extends keyof ProbeRecallResponses>(
      dimension:
        Key,

      value:
        ProbeRecallResponses[Key],
    ) => void;
}

function DelayedRecallSection({
  taskId,
  trialNumber,
  trialOrder,
  condition,
  probeVersion,
  response,
  disabled,
  onChange,
}: DelayedRecallSectionProps) {
  const taskCopy =
    getTaskRecallCopy(
      taskId,
    );

  const locationOptions =
    getProbeLocationOptions(
      taskCopy,
    );

  const recognitionOptions =
    getProbeRecognitionOptions(
      taskCopy,
    );

  const formScope =
    `delayed_recall_${taskId}_${trialNumber}`;

  return (
    <QuestionnaireSection
      icon={
        <Bell
          size={22}
          aria-hidden="true"
        />
      }
      title={`Task update recall — Task ${trialOrder}: ${taskCopy.taskTitle}`}
      description="Please answer these questions from memory without returning to the task."
    >
      <div
        className="likert-list"
        data-task-id={taskId}
        data-trial-number={trialNumber}
        data-trial-order={trialOrder}
        data-condition={condition}
        data-probe-version={probeVersion}
      >
        <fieldset className="radio-question-card">
          <legend>
            <strong>
              Update detection
            </strong>

            <span>
              Did you notice a new {taskCopy.updateLabel} while
              completing this task?
            </span>
          </legend>

          <div className="radio-question-options">
            {[
              {
                value:
                  "yes" as const,

                label:
                  "Yes",
              },

              {
                value:
                  "no" as const,

                label:
                  "No",
              },

              {
                value:
                  "unsure" as const,

                label:
                  "Unsure",
              },
            ].map(
              (option) => (
                <label
                  key={
                    option.value
                  }
                  className={[
                    "radio-question-option",

                    response
                      .probeRecall
                      .noticedUpdate ===
                    option.value
                      ? "radio-question-option-selected"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )}
                >
                  <input
                    type="radio"
                    name={`noticed_update_${formScope}`}
                    required
                    value={
                      option.value
                    }
                    checked={
                      response
                        .probeRecall
                        .noticedUpdate ===
                      option.value
                    }
                    disabled={
                      disabled
                    }
                    onChange={() => {
                      onChange(
                        "noticedUpdate",
                        option.value,
                      );
                    }}
                  />

                  <span>
                    {option.label}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        {response
          .probeRecall
          .noticedUpdate ===
          "yes" && (
          <div className="open-response-card">
            <label
              htmlFor={`update-description-${formScope}`}
            >
              <strong>
                Update recall
              </strong>

              <span>
                Briefly describe the update you remember.
              </span>
            </label>

            <textarea
              id={`update-description-${formScope}`}
              value={
                response
                  .probeRecall
                  .updateDescription
              }
              disabled={
                disabled
              }
              onChange={(
                event:
                  ChangeEvent<HTMLTextAreaElement>,
              ) => {
                onChange(
                  "updateDescription",
                  event.target.value,
                );
              }}
              rows={4}
              required
            />
          </div>
        )}

        <fieldset className="radio-question-card">
          <legend>
            <strong>
              {taskCopy.affectedLocationTitle}
            </strong>

            <span>
              {taskCopy.affectedLocationQuestion}
            </span>
          </legend>

          <div className="radio-question-options">
            {locationOptions.map(
              (option) => (
                <label
                  key={
                    option.value
                  }
                  className={[
                    "radio-question-option",

                    response
                      .probeRecall
                      .affectedRoom ===
                    option.value
                      ? "radio-question-option-selected"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )}
                >
                  <input
                    type="radio"
                    name={`affected_location_${formScope}`}
                    required
                    value={
                      option.value
                    }
                    checked={
                      response
                        .probeRecall
                        .affectedRoom ===
                      option.value
                    }
                    disabled={
                      disabled
                    }
                    onChange={() => {
                      onChange(
                        "affectedRoom",
                        option.value,
                      );
                    }}
                  />

                  <span>
                    {option.label}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <LikertScale
          name={`recall_confidence_${formScope}`}
          title="Recall confidence"
          description={
            taskCopy.recallConfidenceDescription
          }
          lowLabel="Not at all confident"
          highLabel="Extremely confident"
          value={
            response
              .probeRecall
              .recallConfidence
          }
          min={1}
          max={5}
          required
          disabled={
            disabled
          }
          onChange={(value) => {
            if (
              !isLikertRating(
                value,
              )
            ) {
              return;
            }

            onChange(
              "recallConfidence",
              value,
            );
          }}
        />

        <fieldset className="radio-question-card">
          <legend>
            <strong>
              Update recognition
            </strong>

            <span>
              Which {taskCopy.updateLabel} was shown during this task?
            </span>
          </legend>

          <div className="radio-question-options">
            {recognitionOptions.map(
              (option) => (
                <label
                  key={
                    option.value
                  }
                  className={[
                    "radio-question-option",

                    response
                      .probeRecall
                      .recognitionChoice ===
                    option.value
                      ? "radio-question-option-selected"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )}
                >
                  <input
                    type="radio"
                    name={`probe_recognition_${formScope}`}
                    required
                    value={
                      option.value
                    }
                    checked={
                      response
                        .probeRecall
                        .recognitionChoice ===
                      option.value
                    }
                    disabled={
                      disabled
                    }
                    onChange={() => {
                      onChange(
                        "recognitionChoice",
                        option.value,
                      );
                    }}
                  />

                  <span>
                    {option.label}
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>
      </div>
    </QuestionnaireSection>
  );
}

function sanitizeFilePart(
  value:
    string,
): string {
  const normalized =
    value
      .trim()
      .replace(
        /[^a-zA-Z0-9_]/g,
        "_",
      );

  return normalized.length >
    0
    ? normalized
    : "participant";
}

function getErrorMessage(
  error:
    unknown,
): string {
  if (
    error instanceof
      Error &&
    error.message
      .trim()
      .length >
      0
  ) {
    return error.message;
  }

  return "Unknown CSV export error.";
}

function isStudyTaskId(
  value:
    unknown,
): value is SupportedStudyTaskId {
  return (
    value ===
      "symposium" ||
    value ===
      "delivery" ||
    value ===
      "clinic"
  );
}

function getTrialTaskId(
  trial:
    StudyTrialProgress,
): SupportedStudyTaskId {
  const trialWithIdentity =
    trial as
      StudyTrialWithIdentity;

  const {
    taskId,
    outerTaskNumber,
    globalTrialNumber,
    trialId,
  } = trialWithIdentity;

  if (
    isStudyTaskId(
      taskId,
    )
  ) {
    return taskId;
  }

  if (
    outerTaskNumber ===
      2
  ) {
    return "delivery";
  }

  if (
    outerTaskNumber ===
      3
  ) {
    return "clinic";
  }

  if (
    outerTaskNumber ===
      1
  ) {
    return "symposium";
  }

  if (
    typeof globalTrialNumber ===
      "number" &&
    Number.isInteger(
      globalTrialNumber,
    ) &&
    globalTrialNumber >=
      1 &&
    globalTrialNumber <=
      TOTAL_SELECTABLE_TRIAL_OPTIONS
  ) {
    if (
      globalTrialNumber <=
        TRIALS_PER_TASK
    ) {
      return "symposium";
    }

    if (
      globalTrialNumber <=
        TRIALS_PER_TASK *
          2
    ) {
      return "delivery";
    }

    return "clinic";
  }

  if (
    typeof trialId ===
      "string"
  ) {
    const normalizedTrialId =
      trialId
        .trim()
        .toLowerCase();

    if (
      normalizedTrialId.startsWith(
        "delivery",
      )
    ) {
      return "delivery";
    }

    if (
      normalizedTrialId.startsWith(
        "clinic",
      )
    ) {
      return "clinic";
    }

    if (
      normalizedTrialId.startsWith(
        "symposium",
      )
    ) {
      return "symposium";
    }
  }

  return "symposium";
}

function getOuterTaskNumber(
  trial:
    StudyTrialProgress,
): number {
  const explicitTaskNumber =
    (
      trial as
        StudyTrialWithIdentity
    ).outerTaskNumber;

  if (
    explicitTaskNumber ===
      1 ||
    explicitTaskNumber ===
      2 ||
    explicitTaskNumber ===
      3
  ) {
    return explicitTaskNumber;
  }

  const taskId =
    getTrialTaskId(
      trial,
    );

  return taskId ===
    "delivery"
    ? 2
    : taskId ===
        "clinic"
      ? 3
      : 1;
}

function getInnerTaskNumber(
  trial:
    StudyTrialProgress,
): number {
  const trialWithIdentity =
    trial as
      StudyTrialWithIdentity;

  const explicitTaskNumber =
    trialWithIdentity
      .innerTaskNumber;

  if (
    explicitTaskNumber ===
      1 ||
    explicitTaskNumber ===
      2 ||
    explicitTaskNumber ===
      3
  ) {
    return explicitTaskNumber;
  }

  const explicitGlobalTrialNumber =
    trialWithIdentity
      .globalTrialNumber;

  if (
    typeof explicitGlobalTrialNumber ===
      "number" &&
    Number.isInteger(
      explicitGlobalTrialNumber,
    ) &&
    explicitGlobalTrialNumber >=
      1 &&
    explicitGlobalTrialNumber <=
      TOTAL_SELECTABLE_TRIAL_OPTIONS
  ) {
    return (
      (
        explicitGlobalTrialNumber -
        1
      ) %
        TRIALS_PER_TASK
    ) +
      1;
  }

  if (
    Number.isInteger(
      trial.trialNumber,
    ) &&
    trial.trialNumber >=
      1 &&
    trial.trialNumber <=
      TRIALS_PER_TASK
  ) {
    return trial.trialNumber;
  }

  if (
    Number.isInteger(
      trial.trialNumber,
    ) &&
    trial.trialNumber >=
      1 &&
    trial.trialNumber <=
      TOTAL_SELECTABLE_TRIAL_OPTIONS
  ) {
    return (
      (
        trial.trialNumber -
        1
      ) %
        TRIALS_PER_TASK
    ) +
      1;
  }

  return 1;
}

function getGlobalTrialNumber(
  trial:
    StudyTrialProgress,
): number {
  const explicitGlobalTrialNumber =
    (
      trial as
        StudyTrialWithIdentity
    ).globalTrialNumber;

  if (
    typeof explicitGlobalTrialNumber ===
      "number" &&
    Number.isInteger(
      explicitGlobalTrialNumber,
    ) &&
    explicitGlobalTrialNumber >=
      1 &&
    explicitGlobalTrialNumber <=
      TOTAL_SELECTABLE_TRIAL_OPTIONS
  ) {
    return explicitGlobalTrialNumber;
  }

  return (
    (
      getOuterTaskNumber(
        trial,
      ) -
      1
    ) *
      TRIALS_PER_TASK +
    getInnerTaskNumber(
      trial,
    )
  );
}

function getCompositeTrialId(
  trial:
    StudyTrialProgress,
): string {
  const explicitTrialId =
    (
      trial as
        StudyTrialWithIdentity
    ).trialId;

  if (
    typeof explicitTrialId ===
      "string" &&
    explicitTrialId
      .trim()
      .length >
      0
  ) {
    return explicitTrialId;
  }

  return `${getTrialTaskId(
    trial,
  )}-${trial.condition}`;
}

function getChronologicalTrialOrder(
  trial:
    StudyTrialProgress,
): number {
  return trial.trialOrder ===
      1 ||
    trial.trialOrder ===
      2 ||
    trial.trialOrder ===
      3
    ? trial.trialOrder
    : TOTAL_STUDY_TRIALS +
        getGlobalTrialNumber(
          trial,
        );
}

function isPlainRecord(
  value:
    unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function getLoggedProbeVersion(
  trial:
    StudyTrialProgress,

  events:
    StudyEvent[],
): string {
  const taskId =
    getTrialTaskId(
      trial,
    );

  const probeShownEvent =
    events.find(
      (event) =>
        event.taskId ===
          taskId &&
        event.trialNumber ===
          trial.trialNumber &&
        event.eventType ===
          "probe_shown",
    );

  const metadata =
    isPlainRecord(
      probeShownEvent?.metadata,
    )
      ? probeShownEvent.metadata
      : {};

  const metadataVersion =
    metadata.probeVersion;

  if (
    typeof probeShownEvent?.contentVersion ===
      "string" &&
    probeShownEvent.contentVersion
      .trim()
      .length >
      0
  ) {
    return probeShownEvent.contentVersion;
  }

  if (
    typeof metadataVersion ===
      "string" &&
    metadataVersion
      .trim()
      .length >
      0
  ) {
    return metadataVersion;
  }

  return getSemanticProbe(
    taskId,
  ).version ??
    "";
}

interface DelayedRecallRecord {
  trial:
    StudyTrialProgress;

  taskId:
    SupportedStudyTaskId;

  trialOrder:
    number;

  probeVersion:
    string;

  response:
    TrialQuestionnaireResponse;
}

function getDelayedRecallValidationMessage(
  records:
    DelayedRecallRecord[],
): string {
  if (
    records.length !==
    TOTAL_STUDY_TRIALS
  ) {
    return "The delayed recall responses for all three tasks could not be loaded.";
  }

  const incompleteRecord =
    records.find(
      (record) =>
        !isProbeRecallComplete(
          record.response
            .probeRecall,
        ),
    );

  if (
    !incompleteRecord
  ) {
    return "";
  }

  return `Please complete every task-update recall item for Task ${incompleteRecord.trialOrder}: ${TASK_RECALL_COPY[incompleteRecord.taskId].taskTitle}.`;
}

function getPostExperimentRecallColumns(
  records:
    DelayedRecallRecord[],

  collectedAtIso:
    string,
): Record<string, string | number | null> {
  const columns:
    Record<string, string | number | null> = {};

  for (
    const record of
      records
  ) {
    const prefix =
      `trial_${record.trialOrder}`;

    const recall =
      record.response
        .probeRecall;

    columns[
      `${prefix}_task_id`
    ] = record.taskId;

    columns[
      `${prefix}_trial_number`
    ] = record.trial.trialNumber;

    columns[
      `${prefix}_trial_order`
    ] = record.trialOrder;

    columns[
      `${prefix}_condition`
    ] = record.trial.condition;

    columns[
      `${prefix}_probe_version`
    ] = record.probeVersion;

    columns[
      `${prefix}_probe_recall_noticed_update`
    ] = recall.noticedUpdate;

    columns[
      `${prefix}_probe_recall_description`
    ] = recall.updateDescription;

    columns[
      `${prefix}_probe_recall_affected_resource`
    ] = recall.affectedRoom;

    columns[
      `${prefix}_probe_recall_affected_room`
    ] = recall.affectedRoom;

    columns[
      `${prefix}_probe_recall_confidence`
    ] = recall.recallConfidence;

    columns[
      `${prefix}_probe_recognition_choice`
    ] = recall.recognitionChoice;

    columns[
      `${prefix}_probe_recall_collected_at_iso`
    ] = collectedAtIso;
  }

  return columns;
}

export default function PostExperimentPage() {
  const navigate =
    useNavigate();

  const participantId =
    useStudySessionStore(
      (state) =>
        state.participantId,
    );

  const participantToken =
    useStudySessionStore(
      (state) =>
        state.participantToken,
    );

  const sessionId =
    useStudySessionStore(
      (state) =>
        state.sessionId,
    );

  const procedureAccepted =
    useStudySessionStore(
      (state) =>
        state.procedureAccepted,
    );

  const trials =
    useStudySessionStore(
      (state) =>
        state.trials,
    );

  const postExperimentCompleted =
    useStudySessionStore(
      (state) =>
        state.postExperimentCompleted,
    );

  const openPostExperiment =
    useStudySessionStore(
      (state) =>
        state.openPostExperiment,
    );

  const completePostExperiment =
    useStudySessionStore(
      (state) =>
        state.completePostExperiment,
    );

  const setPostExperimentCsvExportStatus =
    useStudySessionStore(
      (state) =>
        state.setPostExperimentCsvExportStatus,
    );

  const postExperimentCsvExportStatus =
    useStudySessionStore(
      (state) =>
        state.postExperimentCsvExportStatus,
    );

  const markPostExperimentCsvExported =
    useStudySessionStore(
      (state) =>
        state.markPostExperimentCsvExported,
    );

  const setTrialCsvExportStatus =
    useStudySessionStore(
      (state) =>
        state.setTrialCsvExportStatus,
    );

  const markTrialEventsCsvExported =
    useStudySessionStore(
      (state) =>
        state.markTrialEventsCsvExported,
    );

  const markTrialSummaryCsvExported =
    useStudySessionStore(
      (state) =>
        state.markTrialSummaryCsvExported,
    );

  const markDelayedRecallCollected =
    useStudySessionStore(
      (state) =>
        state.markDelayedRecallCollected,
    );

  const finalQuestionnaire =
    useQuestionnaireStore(
      (state) =>
        state.finalQuestionnaire,
    );

  const trialResponses =
    useQuestionnaireStore(
      (state) =>
        state.trialResponses,
    );

  const setProbeRecallValue =
    useQuestionnaireStore(
      (state) =>
        state.setProbeRecallValue,
    );

  const initializeFinalQuestionnaire =
    useQuestionnaireStore(
      (state) =>
        state.initializeFinalQuestionnaire,
    );

  const setAttributionCheckValue =
    useQuestionnaireStore(
      (state) =>
        state.setAttributionCheckValue,
    );

  const setFunneledDebriefValue =
    useQuestionnaireStore(
      (state) =>
        state.setFunneledDebriefValue,
    );

  const getFinalQuestionnaireValidationMessage =
    useQuestionnaireStore(
      (state) =>
        state.getFinalQuestionnaireValidationMessage,
    );

  const submitFinalQuestionnaire =
    useQuestionnaireStore(
      (state) =>
        state.submitFinalQuestionnaire,
    );

  const markFinalQuestionnaireExported =
    useQuestionnaireStore(
      (state) =>
        state.markFinalQuestionnaireExported,
    );

  const markTrialQuestionnaireExported =
    useQuestionnaireStore(
      (state) =>
        state.markTrialQuestionnaireExported,
    );

  const setEventParticipantId =
    useEventLogStore(
      (state) =>
        state.setParticipantId,
    );

  const setEventParticipantToken =
    useEventLogStore(
      (state) =>
        state.setParticipantToken,
    );

  const setEventSessionId =
    useEventLogStore(
      (state) =>
        state.setSessionId,
    );

  const events =
    useEventLogStore(
      (state) =>
        state.events,
    );

  const addEvent =
    useEventLogStore(
      (state) =>
        state.addEvent,
    );

  const [
    validationMessage,
    setValidationMessage,
  ] = useState(
    "",
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false,
  );

  const pageStartedLogged =
    useRef(
      false,
    );

  const completedTrialCount =
    trials.filter(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    ).length;

  const completedTaskCount =
    STUDY_TASK_IDS.filter(
      (taskId) => {
        const taskTrials =
          trials.filter(
            (trial) =>
              getTrialTaskId(
                trial,
              ) ===
              taskId,
          );

        return taskTrials.some(
          (trial) =>
            trial.status ===
            "questionnaire_complete",
        );
      },
    ).length;

  const allTrialsComplete =
    completedTrialCount ===
      TOTAL_STUDY_TRIALS &&
    completedTaskCount ===
      TOTAL_TASKS;

  // ADVISER FIX: Delayed recall follows the participant's actual trial order.
  const orderedTrials =
    useMemo(
      () =>
        trials
          .filter(
            (trial) =>
              trial.status ===
              "questionnaire_complete",
          )
          .sort(
            (
              first,
              second,
            ) =>
              getChronologicalTrialOrder(
                first,
              ) -
              getChronologicalTrialOrder(
                second,
              ),
          ),
      [trials],
    );

  const delayedRecallRecords =
    useMemo(
      () =>
        orderedTrials.flatMap(
          (trial) => {
            const taskId =
              getTrialTaskId(
                trial,
              );

            const response =
              trialResponses.find(
                (item) =>
                  item.taskId ===
                    taskId &&
                  item.trialNumber ===
                    trial.trialNumber,
              );

            return response
              ? [
                  {
                    trial,

                    taskId,

                    trialOrder:
                      getChronologicalTrialOrder(
                        trial,
                      ),

                    probeVersion:
                      getLoggedProbeVersion(
                        trial,
                        events,
                      ),

                    response,
                  },
                ]
              : [];
          },
        ),
      [
        events,
        orderedTrials,
        trialResponses,
      ],
    );

  const finalTrial =
    orderedTrials[
      orderedTrials.length -
        1
    ];

  const finalTaskId =
    finalTrial
      ? getTrialTaskId(
          finalTrial,
        )
      : null;

  const finalGlobalTrialNumber =
    finalTrial
      ? getGlobalTrialNumber(
          finalTrial,
        )
      : null;

  const {
    attributionCheck,
    funneledDebrief,
  } = finalQuestionnaire;

  const debriefValues:
    DebriefFormValues = {
      primaryInfluence:
        attributionCheck
          .primaryInfluence,

      aiInfluence:
        attributionCheck
          .aiInfluence,

      aiReliance:
        attributionCheck
          .aiReliance,

      decisionConfidence:
        attributionCheck
          .decisionConfidence,

      perceivedAiCompetence:
        attributionCheck
          .perceivedAiCompetence,

      perceivedPurpose:
        funneledDebrief
          .perceivedPurpose,

      noticedAiDifferences:
        funneledDebrief
          .noticedAiDifferences,

      aiDifferenceDescription:
        funneledDebrief
          .aiDifferenceDescription,

      taskUpdateImpact:
        funneledDebrief
          .taskUpdateImpact,

      taskUpdateDescription:
        funneledDebrief
          .taskUpdateDescription,

      noticedAnythingUnusual:
        funneledDebrief
          .noticedAnythingUnusual,

      suspicionDescription:
        funneledDebrief
          .suspicionDescription,

      priorStudyKnowledge:
        funneledDebrief
          .priorStudyKnowledge,

      priorKnowledgeDescription:
        funneledDebrief
          .priorKnowledgeDescription,

      additionalFeedback:
        funneledDebrief
          .additionalFeedback,
    };

  function handleDebriefChange(
    nextValues:
      DebriefFormValues,
  ) {
    if (
      nextValues.primaryInfluence !==
      attributionCheck
        .primaryInfluence
    ) {
      setAttributionCheckValue(
        "primaryInfluence",
        nextValues.primaryInfluence as
          PrimaryInfluence,
      );
    }

    if (
      nextValues.aiInfluence !==
      attributionCheck
        .aiInfluence
    ) {
      setAttributionCheckValue(
        "aiInfluence",
        nextValues.aiInfluence as
          LikertRating | null,
      );
    }

    if (
      nextValues.aiReliance !==
      attributionCheck
        .aiReliance
    ) {
      setAttributionCheckValue(
        "aiReliance",
        nextValues.aiReliance as
          LikertRating | null,
      );
    }

    if (
      nextValues.decisionConfidence !==
      attributionCheck
        .decisionConfidence
    ) {
      setAttributionCheckValue(
        "decisionConfidence",
        nextValues.decisionConfidence as
          LikertRating | null,
      );
    }

    if (
      nextValues.perceivedAiCompetence !==
      attributionCheck
        .perceivedAiCompetence
    ) {
      setAttributionCheckValue(
        "perceivedAiCompetence",
        nextValues.perceivedAiCompetence as
          LikertRating | null,
      );
    }

    if (
      nextValues.perceivedPurpose !==
      funneledDebrief
        .perceivedPurpose
    ) {
      setFunneledDebriefValue(
        "perceivedPurpose",
        nextValues.perceivedPurpose,
      );
    }

    if (
      nextValues.noticedAiDifferences !==
      funneledDebrief
        .noticedAiDifferences
    ) {
      setFunneledDebriefValue(
        "noticedAiDifferences",
        nextValues.noticedAiDifferences as
          YesNoUnsure,
      );
    }

    if (
      nextValues.aiDifferenceDescription !==
      funneledDebrief
        .aiDifferenceDescription
    ) {
      setFunneledDebriefValue(
        "aiDifferenceDescription",
        nextValues.aiDifferenceDescription,
      );
    }

    if (
      nextValues.taskUpdateImpact !==
      funneledDebrief
        .taskUpdateImpact
    ) {
      setFunneledDebriefValue(
        "taskUpdateImpact",
        nextValues.taskUpdateImpact as
          YesNoUnsure,
      );
    }

    if (
      nextValues.taskUpdateDescription !==
      funneledDebrief
        .taskUpdateDescription
    ) {
      setFunneledDebriefValue(
        "taskUpdateDescription",
        nextValues.taskUpdateDescription,
      );
    }

    if (
      nextValues.noticedAnythingUnusual !==
      funneledDebrief
        .noticedAnythingUnusual
    ) {
      setFunneledDebriefValue(
        "noticedAnythingUnusual",
        nextValues.noticedAnythingUnusual as
          YesNoUnsure,
      );
    }

    if (
      nextValues.suspicionDescription !==
      funneledDebrief
        .suspicionDescription
    ) {
      setFunneledDebriefValue(
        "suspicionDescription",
        nextValues.suspicionDescription,
      );
    }

    if (
      nextValues.priorStudyKnowledge !==
      funneledDebrief
        .priorStudyKnowledge
    ) {
      setFunneledDebriefValue(
        "priorStudyKnowledge",
        nextValues.priorStudyKnowledge as
          YesNoUnsure,
      );
    }

    if (
      nextValues.priorKnowledgeDescription !==
      funneledDebrief
        .priorKnowledgeDescription
    ) {
      setFunneledDebriefValue(
        "priorKnowledgeDescription",
        nextValues.priorKnowledgeDescription,
      );
    }

    if (
      nextValues.additionalFeedback !==
      funneledDebrief
        .additionalFeedback
    ) {
      setFunneledDebriefValue(
        "additionalFeedback",
        nextValues.additionalFeedback,
      );
    }
  }

  useEffect(() => {
    if (
      !procedureAccepted
    ) {
      navigate(
        "/procedure",
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      !allTrialsComplete
    ) {
      navigate(
        "/tasks",
        {
          replace:
            true,
        },
      );

      return;
    }

    if (
      postExperimentCompleted
    ) {
      navigate(
        "/disclosure",
        {
          replace:
            true,
        },
      );

      return;
    }

    setEventParticipantId(
      participantId,
    );

    setEventParticipantToken(
      participantToken,
    );

    setEventSessionId(
      sessionId,
    );

    const opened =
      openPostExperiment();

    if (
      !opened
    ) {
      navigate(
        "/tasks",
        {
          replace:
            true,
        },
      );

      return;
    }

    initializeFinalQuestionnaire();
  }, [
    allTrialsComplete,
    initializeFinalQuestionnaire,
    navigate,
    openPostExperiment,
    participantId,
    participantToken,
    postExperimentCompleted,
    procedureAccepted,
    sessionId,
    setEventParticipantId,
    setEventParticipantToken,
    setEventSessionId,
  ]);

  useEffect(() => {
    if (
      pageStartedLogged.current ||
      !allTrialsComplete ||
      postExperimentCompleted ||
      !finalTrial
    ) {
      return;
    }

    const alreadyLogged =
      events.some(
        (event) =>
          event.sessionId ===
            sessionId &&
          event.eventType ===
            "post_experiment_started",
      );

    pageStartedLogged.current =
      true;

    if (
      alreadyLogged
    ) {
      return;
    }

    addEvent({
      eventType:
        "post_experiment_started",

      trialNumber:
        finalTrial.trialNumber,

      condition:
        finalTrial.condition,

      trialOrder:
        finalTrial.trialOrder,

      conditionOrder:
        finalTrial.conditionOrder,

      isFirstTrial:
        finalTrial.isFirstTrial,

      probeExposureNumber:
        finalTrial.probeExposureNumber,

      probeNaive:
        finalTrial.probeNaive,

      phase:
        "post_experiment",

      metadata: {
        page:
          "post_experiment",

        participantToken,

        completedTaskCount,

        totalTasks:
          TOTAL_TASKS,

        completedTrialCount,

        totalTrials:
          TOTAL_STUDY_TRIALS,

        finalTaskId,

        finalGlobalTrialNumber,

        compositeTrialOrder:
          orderedTrials.map(
            getCompositeTrialId,
          ),

        globalTrialOrder:
          orderedTrials.map(
            getGlobalTrialNumber,
          ),

        taskOrder:
          orderedTrials.map(
            getTrialTaskId,
          ),

        innerTaskOrder:
          orderedTrials.map(
            getInnerTaskNumber,
          ),

        conditionOrder:
          orderedTrials.map(
            (trial) =>
              trial.condition,
          ),
      },
    });
  }, [
    addEvent,
    allTrialsComplete,
    completedTaskCount,
    completedTrialCount,
    events,
    finalGlobalTrialNumber,
    finalTaskId,
    finalTrial,
    orderedTrials,
    postExperimentCompleted,
    sessionId,
  ]);

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitting ||
      !finalTrial
    ) {
      return;
    }

    const delayedRecallValidationResult =
      getDelayedRecallValidationMessage(
        delayedRecallRecords,
      );

    if (
      delayedRecallValidationResult.length >
      0
    ) {
      setValidationMessage(
        delayedRecallValidationResult,
      );

      return;
    }

    const validationResult =
      getFinalQuestionnaireValidationMessage();

    if (
      validationResult.length >
      0
    ) {
      setValidationMessage(
        validationResult,
      );

      return;
    }

    setValidationMessage(
      "",
    );

    setSubmitting(
      true,
    );

    const submittedResponse =
      submitFinalQuestionnaire();

    if (
      !submittedResponse
    ) {
      setSubmitting(
        false,
      );

      setValidationMessage(
        "Please complete all required questionnaire items.",
      );

      return;
    }

    const recallCollectedAtIso =
      new Date()
        .toISOString();

    // ADVISER FIX: Log one delayed-recall event against each exact trial identity.
    for (
      const record of
        delayedRecallRecords
    ) {
      const probe =
        getSemanticProbe(
          record.taskId,
        );

      const alreadyLogged =
        useEventLogStore
          .getState()
          .getEventsForTrial(
            record.trial
              .trialNumber,
            record.taskId,
          )
          .some(
            (loggedEvent) =>
              loggedEvent.eventType ===
                "form_submitted" &&
              isPlainRecord(
                loggedEvent.metadata,
              ) &&
              loggedEvent.metadata.formId ===
                "delayed_probe_recall",
          );

      if (
        alreadyLogged
      ) {
        continue;
      }

      const recall = {
        ...record.response
          .probeRecall,
      };

      addEvent({
        eventType:
          "form_submitted",

        participantToken,

        taskId:
          record.taskId,

        skin:
          record.taskId,

        trialId:
          getCompositeTrialId(
            record.trial,
          ),

        compositeTrialId:
          getCompositeTrialId(
            record.trial,
          ),

        trialNumber:
          record.trial
            .trialNumber,

        trialOrder:
          record.trial
            .trialOrder,

        globalOptionNumber:
          getGlobalTrialNumber(
            record.trial,
          ),

        globalTrialNumber:
          getGlobalTrialNumber(
            record.trial,
          ),

        outerTaskNumber:
          getOuterTaskNumber(
            record.trial,
          ),

        innerTaskNumber:
          getInnerTaskNumber(
            record.trial,
          ) as StudyTrialProgress["trialNumber"],

        condition:
          record.trial
            .condition,

        conditionOrder:
          record.trial
            .conditionOrder,

        isFirstTrial:
          record.trial
            .isFirstTrial,

        probeExposureNumber:
          record.trial
            .probeExposureNumber,

        probeNaive:
          record.trial
            .probeNaive,

        phase:
          "post_experiment",

        messageId:
          probe.id,

        contentVersion:
          record.probeVersion,

        metadata: {
          formId:
            "delayed_probe_recall",

          participantToken,

          taskId:
            record.taskId,

          trialNumber:
            record.trial
              .trialNumber,

          trialOrder:
            record.trialOrder,

          condition:
            record.trial
              .condition,

          probeId:
            probe.id,

          probeVersion:
            record.probeVersion,

          recallCollectedAtIso,

          probeRecall:
            recall,
        },

        payload: {
          probeRecall:
            recall,
        },
      });
    }

    if (
      !markDelayedRecallCollected()
    ) {
      setSubmitting(
        false,
      );

      setValidationMessage(
        "The delayed task-update recall responses could not be finalized.",
      );

      return;
    }

    const postExperimentSubmissionAlreadyLogged =
      useEventLogStore
        .getState()
        .events
        .some(
          (loggedEvent) =>
            loggedEvent.sessionId ===
              sessionId &&
            loggedEvent.eventType ===
              "post_experiment_submitted",
        );

    if (
      !postExperimentSubmissionAlreadyLogged
    ) {
      addEvent({
        eventType:
          "post_experiment_submitted",

      trialNumber:
        finalTrial.trialNumber,

      condition:
        finalTrial.condition,

      trialOrder:
        finalTrial.trialOrder,

      conditionOrder:
        finalTrial.conditionOrder,

      isFirstTrial:
        finalTrial.isFirstTrial,

      probeExposureNumber:
        finalTrial.probeExposureNumber,

      probeNaive:
        finalTrial.probeNaive,

      phase:
        "post_experiment",

      metadata: {
        page:
          "post_experiment",

        completedTaskCount,

        totalTasks:
          TOTAL_TASKS,

        completedTrialCount,

        totalTrials:
          TOTAL_STUDY_TRIALS,

        finalTaskId,

        finalGlobalTrialNumber,

        compositeTrialOrder:
          orderedTrials.map(
            getCompositeTrialId,
          ),

        globalTrialOrder:
          orderedTrials.map(
            getGlobalTrialNumber,
          ),

        taskOrder:
          orderedTrials.map(
            getTrialTaskId,
          ),

        innerTaskOrder:
          orderedTrials.map(
            getInnerTaskNumber,
          ),

        conditionOrder:
          orderedTrials.map(
            (trial) =>
              trial.condition,
          ),

        attributionCheck: {
          ...submittedResponse
            .attributionCheck,
        },

        funneledDebrief: {
          ...submittedResponse
            .funneledDebrief,
        },

        delayedProbeRecall:
          delayedRecallRecords.map(
            (record) => ({
              participantToken,

              taskId:
                record.taskId,

              trialNumber:
                record.trial
                  .trialNumber,

              trialOrder:
                record.trialOrder,

              condition:
                record.trial
                  .condition,

              probeVersion:
                record.probeVersion,

              recallCollectedAtIso,

              probeRecall: {
                ...record.response
                  .probeRecall,
              },
            }),
          ),

        questionnaireStartedAtIso:
          submittedResponse
            .startedAtIso,

        questionnaireSubmittedAtIso:
          submittedResponse
            .submittedAtIso,
        },
      });
    }

    // ADVISER FIX: Export each finalized trial only after its delayed recall event exists.
    const trialExportErrors:
      string[] = [];

    for (
      const record of
        delayedRecallRecords
    ) {
      const exportAttemptAtIso =
        new Date()
          .toISOString();

      const currentTrial =
        useStudySessionStore
          .getState()
          .getTrialProgress(
            record.trial
              .trialNumber,
            record.taskId,
          ) ??
        record.trial;

      const trialEvents =
        useEventLogStore
          .getState()
          .getEventsForTrial(
            record.trial
              .trialNumber,
            record.taskId,
          );

      const eventsFileName =
        getTrialEventsCsvFileName(
          participantToken,
          record.trial
            .trialNumber,
          record.trial
            .condition,
          record.taskId,
        );

      const summaryFileName =
        getTrialSummaryCsvFileName(
          participantToken,
          record.trial
            .trialNumber,
          record.trial
            .condition,
          record.taskId,
        );

      let eventsExported =
        currentTrial
          .eventsCsvExportStatus ===
        "exported";

      let summaryExported =
        currentTrial
          .summaryCsvExportStatus ===
        "exported";

      if (
        !eventsExported
      ) {
        setTrialCsvExportStatus(
          record.trial
            .trialNumber,
          "events",
          "exporting",
          undefined,
          record.taskId,
          exportAttemptAtIso,
        );

        try {
          downloadCsv(
            eventsFileName,
            buildTrialEventRows(
              trialEvents,
            ),
          );

          if (
            !markTrialEventsCsvExported(
              record.trial
                .trialNumber,
              record.taskId,
              exportAttemptAtIso,
            )
          ) {
            throw new Error(
              "The event CSV downloaded, but its completed status could not be recorded.",
            );
          }

          eventsExported =
            true;
        } catch (
          error
        ) {
          const errorMessage =
            getErrorMessage(
              error,
            );

          trialExportErrors.push(
            `${eventsFileName}: ${errorMessage}`,
          );

          setTrialCsvExportStatus(
            record.trial
              .trialNumber,
            "events",
            "failed",
            errorMessage,
            record.taskId,
            exportAttemptAtIso,
          );
        }
      }

      if (
        !summaryExported
      ) {
        setTrialCsvExportStatus(
          record.trial
            .trialNumber,
          "summary",
          "exporting",
          undefined,
          record.taskId,
          exportAttemptAtIso,
        );

        try {
          downloadCsv(
            summaryFileName,
            buildTrialSummaryRows({
              participantId,

              sessionId,

              trial:
                currentTrial,

              questionnaireResponse:
                record.response,

              events:
                trialEvents,
            }),
          );

          if (
            !markTrialSummaryCsvExported(
              record.trial
                .trialNumber,
              record.taskId,
              exportAttemptAtIso,
            )
          ) {
            throw new Error(
              "The summary CSV downloaded, but its completed status could not be recorded.",
            );
          }

          summaryExported =
            true;
        } catch (
          error
        ) {
          const errorMessage =
            getErrorMessage(
              error,
            );

          trialExportErrors.push(
            `${summaryFileName}: ${errorMessage}`,
          );

          setTrialCsvExportStatus(
            record.trial
              .trialNumber,
            "summary",
            "failed",
            errorMessage,
            record.taskId,
            exportAttemptAtIso,
          );
        }
      }

      if (
        eventsExported &&
        summaryExported
      ) {
        markTrialQuestionnaireExported(
          record.trial
            .trialNumber,
          record.taskId,
        );
      }

      addEvent({
        eventType:
          "trial_csv_exported",

        participantToken,

        taskId:
          record.taskId,

        trialId:
          getCompositeTrialId(
            record.trial,
          ),

        trialNumber:
          record.trial
            .trialNumber,

        trialOrder:
          record.trial
            .trialOrder,

        condition:
          record.trial
            .condition,

        conditionOrder:
          record.trial
            .conditionOrder,

        isFirstTrial:
          record.trial
            .isFirstTrial,

        probeExposureNumber:
          record.trial
            .probeExposureNumber,

        probeNaive:
          record.trial
            .probeNaive,

        phase:
          "post_experiment",

        accepted:
          eventsExported &&
          summaryExported,

        metadata: {
          eventsFileName,

          summaryFileName,

          eventsExported,

          summaryExported,

          delayedRecallCollected:
            true,

          exportedAtIso:
            exportAttemptAtIso,
        },
      });
    }

    if (
      trialExportErrors.length >
      0
    ) {
      setSubmitting(
        false,
      );

      setValidationMessage(
        "The delayed recall was saved, but one or more finalized trial CSV files could not be downloaded. Select Continue again to retry only missing files.",
      );

      return;
    }

    const exportedAtIso =
      new Date()
        .toISOString();

    const safeParticipantToken =
      sanitizeFilePart(
        participantToken,
      );

    const fileName =
      `${safeParticipantToken}_post_experiment_questionnaire.csv`;

    if (
      postExperimentCsvExportStatus !==
      "exported"
    ) {
      setPostExperimentCsvExportStatus(
        "exporting",
      );

      try {
      const compositeTrialOrder =
        orderedTrials
          .map(
            getCompositeTrialId,
          )
          .join(
            "|",
          );

      const globalTrialOrder =
        orderedTrials
          .map(
            getGlobalTrialNumber,
          )
          .join(
            "|",
          );

      const taskOrder =
        orderedTrials
          .map(
            getTrialTaskId,
          )
          .join(
            "|",
          );

      const outerTaskOrder =
        orderedTrials
          .map(
            getOuterTaskNumber,
          )
          .join(
            "|",
          );

      const innerTaskOrder =
        orderedTrials
          .map(
            getInnerTaskNumber,
          )
          .join(
            "|",
          );

      const conditionOrder =
        orderedTrials
          .map(
            (trial) =>
              trial.condition,
          )
          .join(
            "|",
          );

      const rows = [
        {
          participant_id:
            participantId,

          participant_token:
            participantToken,

          session_id:
            sessionId,

          questionnaire_started_at_iso:
            submittedResponse
              .startedAtIso,

          questionnaire_submitted_at_iso:
            submittedResponse
              .submittedAtIso,

          exported_at_iso:
            exportedAtIso,

          completed_task_count:
            completedTaskCount,

          total_task_count:
            TOTAL_TASKS,

          completed_trial_count:
            completedTrialCount,

          total_trial_count:
            TOTAL_STUDY_TRIALS,

          final_task_id:
            finalTaskId,

          final_global_trial_number:
            finalGlobalTrialNumber,

          composite_trial_order:
            compositeTrialOrder,

          global_trial_order:
            globalTrialOrder,

          task_order:
            taskOrder,

          outer_task_order:
            outerTaskOrder,

          inner_task_order:
            innerTaskOrder,

          condition_order:
            conditionOrder,

          primary_influence:
            submittedResponse
              .attributionCheck
              .primaryInfluence,

          ai_influence:
            submittedResponse
              .attributionCheck
              .aiInfluence,

          ai_reliance:
            submittedResponse
              .attributionCheck
              .aiReliance,

          decision_confidence:
            submittedResponse
              .attributionCheck
              .decisionConfidence,

          perceived_ai_competence:
            submittedResponse
              .attributionCheck
              .perceivedAiCompetence,

          perceived_study_purpose:
            submittedResponse
              .funneledDebrief
              .perceivedPurpose,

          noticed_ai_differences:
            submittedResponse
              .funneledDebrief
              .noticedAiDifferences,

          ai_difference_description:
            submittedResponse
              .funneledDebrief
              .aiDifferenceDescription,

          task_update_impact:
            submittedResponse
              .funneledDebrief
              .taskUpdateImpact,

          task_update_description:
            submittedResponse
              .funneledDebrief
              .taskUpdateDescription,

          noticed_anything_unusual:
            submittedResponse
              .funneledDebrief
              .noticedAnythingUnusual,

          suspicion_description:
            submittedResponse
              .funneledDebrief
              .suspicionDescription,

          prior_study_knowledge:
            submittedResponse
              .funneledDebrief
              .priorStudyKnowledge,

          prior_knowledge_description:
            submittedResponse
              .funneledDebrief
              .priorKnowledgeDescription,

          additional_feedback:
            submittedResponse
              .funneledDebrief
              .additionalFeedback,

          ...getPostExperimentRecallColumns(
            delayedRecallRecords,
            recallCollectedAtIso,
          ),
        },
      ];

      downloadCsv(
        fileName,
        rows,
      );

      markFinalQuestionnaireExported();

      markPostExperimentCsvExported();

      addEvent({
        eventType:
          "post_experiment_csv_exported",

        trialNumber:
          finalTrial.trialNumber,

        condition:
          finalTrial.condition,

        trialOrder:
          finalTrial.trialOrder,

        conditionOrder:
          finalTrial.conditionOrder,

        isFirstTrial:
          finalTrial.isFirstTrial,

        probeExposureNumber:
          finalTrial.probeExposureNumber,

        probeNaive:
          finalTrial.probeNaive,

        phase:
          "post_experiment",

        metadata: {
          page:
            "post_experiment",

          fileName,

          completedTaskCount,

          totalTasks:
            TOTAL_TASKS,

          completedTrialCount,

          totalTrials:
            TOTAL_STUDY_TRIALS,

          finalTaskId,

          finalGlobalTrialNumber,

          rowCount:
            rows.length,

          exportedAtIso,
        },
      });
      } catch (
        error
      ) {
        const errorMessage =
          getErrorMessage(
            error,
          );

        setPostExperimentCsvExportStatus(
          "failed",
        );

        setSubmitting(
          false,
        );

        setValidationMessage(
          `The questionnaire was recorded, but the CSV file could not be downloaded. ${errorMessage}`,
        );

        return;
      }
    }

    const completed =
      completePostExperiment();

    if (
      !completed
    ) {
      setSubmitting(
        false,
      );

      setValidationMessage(
        "The questionnaire file was downloaded, but the study could not continue to disclosure.",
      );

      return;
    }

    navigate(
      "/disclosure",
      {
        replace:
          true,
      },
    );
  }

  if (
    !procedureAccepted ||
    !allTrialsComplete ||
    postExperimentCompleted
  ) {
    return null;
  }

  return (
    <main className="study-page questionnaire-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI-Assisted Constraint-Solving Study
          </div>

          <h1>
            Post-Experiment Questionnaire
          </h1>

          <p>
            Please reflect on your experience across all three
            experiment tasks.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label="Post task questionnaire"
        >
          Final questions
        </div>
      </header>

      <form
        className="study-page-content questionnaire-form"
        onSubmit={
          handleSubmit
        }
      >
        <section className="questionnaire-completion-note">
          <CheckCircle2
            size={20}
            aria-hidden="true"
          />

          <p>
            You have completed all three experiment tasks.
            First answer the task-update questions from memory,
            then answer the questions about your overall experience.
          </p>
        </section>

        {delayedRecallRecords.map(
          (record) => (
            <DelayedRecallSection
              key={`${record.taskId}:${record.trial.trialNumber}`}
              taskId={
                record.taskId
              }
              trialNumber={
                record.trial
                  .trialNumber
              }
              trialOrder={
                record.trialOrder
              }
              condition={
                record.trial
                  .condition
              }
              probeVersion={
                record.probeVersion
              }
              response={
                record.response
              }
              disabled={
                submitting
              }
              onChange={(
                dimension,
                value,
              ) => {
                setProbeRecallValue(
                  record.trial
                    .trialNumber,
                  dimension,
                  value,
                  record.taskId,
                );
              }}
            />
          ),
        )}

        <DebriefForm
          values={
            debriefValues
          }
          onChange={
            handleDebriefChange
          }
          disabled={
            submitting
          }
        />

        {validationMessage && (
          <div
            className="questionnaire-validation-message"
            role="alert"
          >
            {validationMessage}
          </div>
        )}

        <section className="questionnaire-completion-note">
          <CheckCircle2
            size={20}
            aria-hidden="true"
          />

          <p>
            Your final responses will be recorded, then the
            finalized trial CSV files and post-experiment CSV
            will be downloaded after submission.
          </p>
        </section>

        <div className="study-page-actions">
          <button
            type="submit"
            className="study-primary-button"
            disabled={
              submitting
            }
          >
            {submitting
              ? "Preparing study files"
              : "Continue to disclosure"}

            {!submitting && (
              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
