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

const TOTAL_TRIALS = 3;

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

  const downloadEvents =
    useEventLogStore(
      (state) =>
        state.downloadEvents,
    );

  const [
    recordDownloaded,
    setRecordDownloaded,
  ] = useState(false);

  const disclosureLogged =
    useRef(false);

  const completedTrialCount =
    trials.filter(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    ).length;

  useEffect(() => {
    if (
      !postExperimentCompleted
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

        completedTrialCount,

        totalTrials:
          TOTAL_TRIALS,
      },
    });
  }, [
    addEvent,
    completedTrialCount,
    disclosureViewed,
    events,
    markDisclosureViewed,
    postExperimentCompleted,
    sessionId,
  ]);

  function handleDownload() {
    downloadEvents();

    setRecordDownloaded(
      true,
    );
  }

  function handleCompleteStudy() {
    if (
      studyCompleted
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
      completionAlreadyLogged
    ) {
      return;
    }

    addEvent({
      eventType:
        "study_completed",

      metadata: {
        page:
          "disclosure",

        completedTrialCount,

        totalTrials:
          TOTAL_TRIALS,

        disclosureViewed:
          true,

        recordDownloaded,
      },
    });
  }

  if (
    !postExperimentCompleted
  ) {
    return null;
  }

  return (
    <main className="study-page disclosure-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI Assisted Scheduling Study
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
              Scheduling tasks completed
            </h2>

            <p>
              Participant {participantId} completed{" "}
              {completedTrialCount} of {TOTAL_TRIALS} task
              questionnaires.
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
                complex scheduling tasks.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              In particular, the study investigates whether
              seeing a more concrete AI solution can make
              people focus on that solution, continue
              modifying it, or overlook alternative
              approaches when new information appears.
            </p>

            <p>
              This pattern is referred to as AI induced
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
              The recommendation content and schedule
              artifacts were prepared in advance and
              presented consistently according to the
              assigned study condition.
            </p>

            <p>
              Participants received one of three forms of
              assistance during each task:
            </p>

            <div className="disclosure-condition-list">
              <div className="disclosure-condition-item">
                <strong>
                  Strategy
                </strong>

                <span>
                  A general scheduling strategy without
                  placements on the grid.
                </span>
              </div>

              <div className="disclosure-condition-item">
                <strong>
                  Partial artifact
                </strong>

                <span>
                  The same strategy with several starting
                  placements.
                </span>
              </div>

              <div className="disclosure-condition-item">
                <strong>
                  Full artifact
                </strong>

                <span>
                  The same strategy with a complete proposed
                  schedule.
                </span>
              </div>
            </div>

            <p>
              The apparent analysis delay and assistant
              presentation were included to make the
              interaction feel consistent across
              participants.
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
                The update shown during the scheduling task
                was an intentional part of the study.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              The update was used to examine whether
              participants noticed, interpreted, and
              integrated new information after beginning
              work from an AI recommendation.
            </p>

            <p>
              Researchers are interested in the time required
              to respond to the update, the changes made
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
              Knowing the precise research purpose or that
              the AI output was prepared in advance could
              have caused participants to monitor their own
              behavior differently, search deliberately for
              differences, or respond to the task update in
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
                understand scheduling behavior.
              </p>
            </div>
          </div>

          <div className="disclosure-text-card">
            <p>
              Recorded information may include drag actions,
              schedule changes, timing, responses to task
              updates, submitted schedules, and questionnaire
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
                Save the local study record
              </h2>

              <p>
                Download the recorded study events as a JSON
                file before closing the browser.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="study-secondary-button"
            onClick={
              handleDownload
            }
          >
            <Download
              size={18}
              aria-hidden="true"
            />

            {recordDownloaded
              ? "Download again"
              : "Download study data"}
          </button>
        </section>

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
                Thank you for your participation. You may now
                close this browser window.
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