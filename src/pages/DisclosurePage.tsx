import {
  Bell,
  Bot,
  Brain,
  CheckCircle2,
  Download,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  useEventLogStore,
} from "../store/eventLogStore";

import {
  useStudySessionStore,
} from "../store/studySessionStore";

import {
  downloadCsv,
} from "../utils/csvExport";

import {
  STUDY_TASK_IDS,
  STUDY_TRIAL_ORDERS,
  TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,
  TOTAL_STUDY_TRIALS,
  isStudyTrialOrder,
} from "../types/scheduler";

const TOTAL_EXPERIMENT_TASKS =
  STUDY_TASK_IDS.length;

type CsvCell =
  | string
  | number
  | boolean
  | null
  | undefined;

type SessionEventCsvRow =
  Record<
    string,
    CsvCell
  >;

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
      )
      .replace(
        /_+/g,
        "_",
      )
      .replace(
        /^_+|_+$/g,
        "",
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

  return "The session CSV could not be downloaded.";
}

function isPlainRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
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

function toCsvCell(
  value:
    unknown,
): CsvCell {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return value;
  }

  return JSON.stringify(
    value,
  );
}

function flattenCsvObject(
  target:
    SessionEventCsvRow,

  prefix:
    string,

  value:
    unknown,
): void {
  if (
    !isPlainRecord(
      value,
    )
  ) {
    target[
      prefix
    ] =
      toCsvCell(
        value,
      );

    return;
  }

  for (
    const [
      key,
      nestedValue,
    ] of
    Object.entries(
      value,
    )
  ) {
    const nestedKey =
      `${prefix}.${key}`;

    if (
      isPlainRecord(
        nestedValue,
      )
    ) {
      flattenCsvObject(
        target,
        nestedKey,
        nestedValue,
      );
    } else {
      target[
        nestedKey
      ] =
        toCsvCell(
          nestedValue,
        );
    }
  }
}

function createSessionEventCsvRow(
  event:
    unknown,
): SessionEventCsvRow {
  const source =
    isPlainRecord(
      event,
    )
      ? event
      : {};

  const row:
    SessionEventCsvRow = {
      event_id:
        toCsvCell(
          source.eventId,
        ),

      session_id:
        toCsvCell(
          source.sessionId,
        ),

      participant_id:
        toCsvCell(
          source.participantId,
        ),

      participant_token:
        toCsvCell(
          source.participantToken,
        ),

      trial_index:
        toCsvCell(
          source.trialIndex ??
          source.globalOptionNumber ??
          source.globalTrialNumber,
        ),

      trial_id:
        toCsvCell(
          source.trialId ??
          source.compositeTrialId,
        ),

      trial_number:
        toCsvCell(
          source.trialNumber,
        ),

      trial_order:
        toCsvCell(
          source.trialOrder,
        ),

      task_id:
        toCsvCell(
          source.taskId,
        ),

      condition:
        toCsvCell(
          source.condition,
        ),

      skin:
        toCsvCell(
          source.skin ??
          source.taskId,
        ),

      build_hash:
        toCsvCell(
          source.buildHash,
        ),

      t_ms:
        toCsvCell(
          source.tMs ??
          source.elapsedMs,
        ),

      iso_time:
        toCsvCell(
          source.timestampIso,
        ),

      event_type:
        toCsvCell(
          source.eventType,
        ),

      phase:
        toCsvCell(
          source.phase,
        ),

      event_index:
        toCsvCell(
          source.eventIndex,
        ),
    };

  flattenCsvObject(
    row,
    "payload",
    source.payload,
  );

  flattenCsvObject(
    row,
    "metadata",
    source.metadata,
  );

  return row;
}

export default function DisclosurePage() {
  const navigate =
    useNavigate();

  const participantId =
    useStudySessionStore(
      (state) =>
        state.participantId,
    );

  const sessionId =
    useStudySessionStore(
      (state) =>
        state.sessionId,
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

  const disclosureViewed =
    useStudySessionStore(
      (state) =>
        state.disclosureViewed,
    );

  const studyCompleted =
    useStudySessionStore(
      (state) =>
        state.studyCompleted,
    );

  const markDisclosureViewed =
    useStudySessionStore(
      (state) =>
        state.markDisclosureViewed,
    );

  const completeStudy =
    useStudySessionStore(
      (state) =>
        state.completeStudy,
    );

  const setEventParticipantId =
    useEventLogStore(
      (state) =>
        state.setParticipantId,
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
    recordDownloaded,
    setRecordDownloaded,
  ] = useState(false);

  const [
    exportErrorMessage,
    setExportErrorMessage,
  ] = useState(
    "",
  );

  const disclosureLogged =
    useRef(false);

  const completedTrials =
    useMemo(
      () =>
        trials.filter(
          (trial) =>
            trial.status ===
            "questionnaire_complete",
        ),
      [
        trials,
      ],
    );

  const completedTrialCount =
    completedTrials.length;

  const completedTaskCount =
    STUDY_TASK_IDS.filter(
      (taskId) =>
        completedTrials.filter(
          (trial) =>
            trial.taskId ===
            taskId,
        ).length ===
        1,
    ).length;

  const chronologicalTrialOrders =
    completedTrials
      .map(
        (trial) =>
          trial.trialOrder,
      )
      .filter(
        isStudyTrialOrder,
      );

  const allStudyTrialsComplete =
    completedTrialCount ===
      TOTAL_STUDY_TRIALS &&
    completedTaskCount ===
      TOTAL_EXPERIMENT_TASKS &&
    chronologicalTrialOrders.length ===
      TOTAL_STUDY_TRIALS &&
    new Set(
      chronologicalTrialOrders,
    ).size ===
      TOTAL_STUDY_TRIALS &&
    STUDY_TRIAL_ORDERS.every(
      (trialOrder) =>
        chronologicalTrialOrders.includes(
          trialOrder,
        ),
    );

  const orderedCompletedTrials =
    useMemo(
      () =>
        [
          ...completedTrials,
        ].sort(
          (
            first,
            second,
          ) =>
            Number(
              first.trialOrder,
            ) -
            Number(
              second.trialOrder,
            ),
        ),
      [
        completedTrials,
      ],
    );

  const completedTaskOrder =
    useMemo(
      () =>
        orderedCompletedTrials.map(
          (trial) =>
            trial.taskId,
        ),
      [
        orderedCompletedTrials,
      ],
    );

  const completedConditionOrder =
    useMemo(
      () =>
        orderedCompletedTrials.map(
          (trial) =>
            trial.condition,
        ),
      [
        orderedCompletedTrials,
      ],
    );

  useEffect(() => {
    if (
      !postExperimentCompleted ||
      !allStudyTrialsComplete
    ) {
      navigate(
        "/post-experiment",
        {
          replace: true,
        },
      );

      return;
    }

    setEventParticipantId(
      participantId,
    );

    setEventSessionId(
      sessionId,
    );
  }, [
    allStudyTrialsComplete,
    navigate,
    participantId,
    postExperimentCompleted,
    sessionId,
    setEventParticipantId,
    setEventSessionId,
  ]);

  useEffect(() => {
    if (
      !postExperimentCompleted ||
      !allStudyTrialsComplete ||
      disclosureLogged.current
    ) {
      return;
    }

    const disclosureMarked =
      disclosureViewed ||
      markDisclosureViewed();

    if (
      !disclosureMarked
    ) {
      return;
    }

    disclosureLogged.current =
      true;

    const alreadyLogged =
      events.some(
        (event) =>
          event.sessionId ===
            sessionId &&
          event.eventType ===
            "disclosure_viewed",
      );

    if (
      alreadyLogged
    ) {
      return;
    }

    addEvent({
      eventType:
        "disclosure_viewed",

      metadata: {
        page:
          "disclosure",

        completedTaskCount,

        totalExperimentTasks:
          TOTAL_EXPERIMENT_TASKS,

        completedTrialCount,

        totalTrials:
          TOTAL_STUDY_TRIALS,

        totalSelectableTaskConditionOptions:
          TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

        completedTaskOrder,

        completedConditionOrder,

        chronologicalTrialOrders,
      },
    });
  }, [
    addEvent,
    allStudyTrialsComplete,
    completedConditionOrder,
    completedTaskCount,
    completedTaskOrder,
    completedTrialCount,
    chronologicalTrialOrders,
    disclosureViewed,
    events,
    markDisclosureViewed,
    postExperimentCompleted,
    sessionId,
  ]);

  function handleDownload() {
    if (
      !studyCompleted
    ) {
      return;
    }

    setExportErrorMessage(
      "",
    );

    const sessionEventsBeforeExport =
      useEventLogStore
        .getState()
        .events
        .filter(
          (event) =>
            event.sessionId ===
            sessionId,
        );

    addEvent({
      eventType:
        "export_downloaded",

      phase:
        "complete",

      metadata: {
        page:
          "disclosure",

        by:
          "completion_screen",

        fileFormat:
          "csv",

        rowCount:
          sessionEventsBeforeExport.length +
          1,

        completedTaskCount,

        completedTrialCount,

        totalTrials:
          TOTAL_STUDY_TRIALS,

        totalSelectableTaskConditionOptions:
          TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,
      },
    });

    const sessionEvents =
      useEventLogStore
        .getState()
        .events
        .filter(
          (event) =>
            event.sessionId ===
            sessionId,
        )
        .sort(
          (
            first,
            second,
          ) =>
            Number(
              first.tMs ??
              first.elapsedMs ??
              0,
            ) -
              Number(
                second.tMs ??
                second.elapsedMs ??
                0,
              ) ||
            Number(
              first.eventIndex ??
              0,
            ) -
              Number(
                second.eventIndex ??
                0,
              ),
        );

    const rows =
      sessionEvents.map(
        createSessionEventCsvRow,
      );

    const fileName =
      `${sanitizeFilePart(
        participantId,
      )}_${sanitizeFilePart(
        sessionId,
      )}_session_events.csv`;

    try {
      downloadCsv(
        fileName,
        rows,
      );

      const sessionStore =
        useStudySessionStore
          .getState() as
          ReturnType<
            typeof useStudySessionStore.getState
          > & {
            markSessionCsvExported?:
              () => boolean;
          };

      sessionStore
        .markSessionCsvExported?.();

      setRecordDownloaded(
        true,
      );
    } catch (
      error
    ) {
      setExportErrorMessage(
        getErrorMessage(
          error,
        ),
      );
    }
  }

  function handleCompleteStudy() {
    if (
      studyCompleted ||
      !allStudyTrialsComplete
    ) {
      return;
    }

    const completed =
      completeStudy();

    if (
      !completed
    ) {
      return;
    }

    const completionAlreadyLogged =
      events.some(
        (event) =>
          event.sessionId ===
            sessionId &&
          event.eventType ===
            "study_completed",
      );

    if (
      !completionAlreadyLogged
    ) {
      addEvent({
        eventType:
          "study_completed",

        phase:
          "complete",

        metadata: {
          page:
            "disclosure",

          completedTaskCount,

          totalExperimentTasks:
            TOTAL_EXPERIMENT_TASKS,

          completedTrialCount,

          totalTrials:
            TOTAL_STUDY_TRIALS,

          totalSelectableTaskConditionOptions:
            TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

          completedTaskOrder,

          completedConditionOrder,

          chronologicalTrialOrders,

          disclosureViewed:
            true,

          recordDownloaded,
        },
      });
    }

    const sessionEndAlreadyLogged =
      events.some(
        (event) =>
          event.sessionId ===
            sessionId &&
          event.eventType ===
            "session_end",
      );

    if (
      !sessionEndAlreadyLogged
    ) {
      addEvent({
        eventType:
          "session_end",

        phase:
          "complete",

        metadata: {
          page:
            "disclosure",

          completedTaskCount,

          completedTrialCount,

          totalTrials:
            TOTAL_STUDY_TRIALS,

          totalSelectableTaskConditionOptions:
            TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

          completedTaskOrder,

          completedConditionOrder,

          chronologicalTrialOrders,

          eventCountBeforeSessionEnd:
            events.filter(
              (event) =>
                event.sessionId ===
                sessionId,
            ).length,
        },
      });
    }
  }

  if (
    !postExperimentCompleted ||
    !allStudyTrialsComplete
  ) {
    return null;
  }

  return (
    <main className="study-page disclosure-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI-Assisted Problem-Solving Study
          </div>

          <h1>
            Study Disclosure
          </h1>

          <p>
            Thank you for completing the study. Please review
            the information below about the study purpose and
            procedure.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label="Final study step"
        >
          Final step
        </div>
      </header>

      <div className="study-page-content">
        <section
          className="disclosure-completion-card"
          aria-labelledby="completion-title"
        >
          <div className="disclosure-completion-icon">
            <CheckCircle2
              size={34}
              aria-hidden="true"
            />
          </div>

          <div>
            <h2 id="completion-title">
              Experiment tasks completed
            </h2>

            <p>
              Participant {participantId} completed all{" "}
              {TOTAL_EXPERIMENT_TASKS} experiment tasks and{" "}
              {completedTrialCount} task questionnaires.
            </p>
          </div>
        </section>

        <section
          className="disclosure-section"
          aria-labelledby="purpose-title"
        >
          <div className="study-section-heading">
            <Brain
              size={23}
              aria-hidden="true"
            />

            <div>
              <h2 id="purpose-title">
                Purpose of the study
              </h2>

              <p>
                The study examines how the form of an AI
                recommendation may influence attention,
                decision making, and adaptation during
                complex constraint-satisfaction problems.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              The three problem domains were symposium
              scheduling, delivery dispatch, and clinic roster
              allocation. You completed one assigned AI
              assistance condition in each domain.
            </p>

            <p>
              In particular, the study investigates whether
              seeing a more concrete AI solution can make
              people focus on that solution, continue
              modifying it, or overlook alternative
              approaches when new information appears.
            </p>

            <p>
              This pattern is referred to as AI-induced
              attentional tunneling. It describes a situation
              in which attention becomes concentrated on a
              locally attractive representation while other
              relevant options receive less consideration.
            </p>
          </div>
        </section>

        <section
          className="disclosure-section"
          aria-labelledby="ai-disclosure-title"
        >
          <div className="study-section-heading">
            <Bot
              size={23}
              aria-hidden="true"
            />

            <div>
              <h2 id="ai-disclosure-title">
                AI assistant disclosure
              </h2>

              <p>
                The AI assistant did not perform a new live
                analysis during each task.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              The recommendation content and task artifacts
              were prepared in advance and presented
              consistently according to the assigned study
              condition.
            </p>

            <p>
              Across the experiment, the recommendation was
              presented in three forms. Within this session,
              one form was assigned to each problem domain:
            </p>

            <div className="disclosure-condition-list">
              <div className="disclosure-condition-item">
                <strong>
                  Low concretization
                </strong>

                <span>
                  A general strategy without placements on the
                  task grid.
                </span>
              </div>

              <div className="disclosure-condition-item">
                <strong>
                  Medium concretization
                </strong>

                <span>
                  The same strategy with a partially completed
                  task artifact and several starting
                  placements.
                </span>
              </div>

              <div className="disclosure-condition-item">
                <strong>
                  High concretization
                </strong>

                <span>
                  The same strategy with a complete proposed
                  task solution.
                </span>
              </div>
            </div>

            <p>
              The condition-to-domain pairing and serial order
              were counterbalanced across participants. The
              apparent analysis delay and assistant presentation
              were held consistent so that the manipulation
              concerned solution concretization rather than
              conversational style.
            </p>
          </div>
        </section>

        <section
          className="disclosure-section"
          aria-labelledby="update-disclosure-title"
        >
          <div className="study-section-heading">
            <Bell
              size={23}
              aria-hidden="true"
            />

            <div>
              <h2 id="update-disclosure-title">
                Task update disclosure
              </h2>

              <p>
                The updates shown while tasks were in progress
                were intentional parts of the study.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              The updates concerned a projector failure in the
              symposium task, a refrigeration failure in the
              delivery task, and a change in ICU certification
              availability in the clinic task.
            </p>

            <p>
              These updates were used to examine whether
              participants noticed, interpreted, and
              integrated new information after beginning work
              from an AI recommendation.
            </p>

            <p>
              Researchers are interested in the time required
              to respond to each update, the changes made
              afterward, and whether participants continued
              following the original solution structure.
            </p>
          </div>
        </section>

        <section
          className="disclosure-section"
          aria-labelledby="withholding-title"
        >
          <div className="study-section-heading">
            <LockKeyhole
              size={23}
              aria-hidden="true"
            />

            <div>
              <h2 id="withholding-title">
                Why this information was not provided earlier
              </h2>

              <p>
                Some details were withheld until the end of
                the study to avoid changing natural
                participant behavior.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              Knowing the precise research purpose, the three
              assistance conditions, or that the AI output was
              prepared in advance could have caused
              participants to monitor their behavior
              differently, deliberately search for condition
              differences, or respond to the task updates in
              an unnatural way.
            </p>

            <p>
              Your task performance is not being used as an
              individual assessment of intelligence, ability,
              or professional competence.
            </p>
          </div>
        </section>

        <section
          className="disclosure-section"
          aria-labelledby="data-title"
        >
          <div className="study-section-heading">
            <ShieldCheck
              size={23}
              aria-hidden="true"
            />

            <div>
              <h2 id="data-title">
                Study data
              </h2>

              <p>
                The study records interactions needed to
                understand constraint-solving behavior.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              Recorded information may include drag actions,
              task-state changes, timing, responses to task
              updates, submitted solutions, and questionnaire
              responses.
            </p>

            <p>
              For questions about participation, the research
              purpose, or handling of study data, use the
              contact information provided in the study
              consent materials.
            </p>
          </div>
        </section>

        <section
          className="disclosure-record-card"
          aria-labelledby="record-title"
        >
          <div className="disclosure-record-content">
            <FileText
              size={23}
              aria-hidden="true"
            />

            <div>
              <h2 id="record-title">
                Researcher session export
              </h2>

              <p>
                After the study is finished, download the
                complete session event log as one CSV file.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="study-secondary-button"
            onClick={
              handleDownload
            }
            disabled={
              !studyCompleted
            }
          >
            <Download
              size={18}
              aria-hidden="true"
            />

            {recordDownloaded
              ? "Download session CSV again"
              : studyCompleted
                ? "Download session CSV"
                : "Finish study before export"}
          </button>
        </section>

        {exportErrorMessage && (
          <div
            className="questionnaire-validation-message"
            role="alert"
          >
            {exportErrorMessage}
          </div>
        )}

        {studyCompleted ? (
          <section
            className="study-complete-card"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={28}
              aria-hidden="true"
            />

            <div>
              <h2>
                Study complete
              </h2>

              <p>
                Thank you for your participation. The
                researcher may now export the complete session
                CSV before this browser window is closed.
              </p>
            </div>
          </section>
        ) : (
          <div className="study-page-actions">
            <button
              type="button"
              className="study-primary-button"
              onClick={
                handleCompleteStudy
              }
            >
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />

              Finish study
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
