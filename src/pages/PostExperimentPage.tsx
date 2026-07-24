import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Eye,
  MessageSquareText,
  Scale,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  useNavigate,
} from "react-router";

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
  LikertRating,
  PrimaryInfluence,
  YesNoUnsure,
} from "../types/questionnaire";

import {
  downloadCsv,
} from "../utils/csvExport";

interface LikertQuestionProps {
  name:
    string;

  title:
    string;

  description:
    string;

  lowLabel:
    string;

  highLabel:
    string;

  value:
    LikertRating | null;

  onChange: (
    value:
      LikertRating,
  ) => void;
}

interface QuestionnaireSectionProps {
  icon:
    ReactNode;

  title:
    string;

  description:
    string;

  children:
    ReactNode;
}

interface ResponseOption {
  value:
    string;

  label:
    string;
}

const TOTAL_TRIALS =
  3;

const LIKERT_OPTIONS:
  LikertRating[] = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
  ];

const influenceOptions:
  ResponseOption[] = [
    {
      value:
        "own_reasoning",

      label:
        "My own reasoning and judgment",
    },

    {
      value:
        "ai_recommendation",

      label:
        "The AI recommendation",
    },

    {
      value:
        "task_rules",

      label:
        "The task constraints and preferences",
    },

    {
      value:
        "task_update",

      label:
        "The update that appeared during the task",
    },

    {
      value:
        "time_pressure",

      label:
        "The remaining time",
    },

    {
      value:
        "combination",

      label:
        "A combination of these factors",
    },
  ];

const yesNoUnsureOptions:
  ResponseOption[] = [
    {
      value:
        "yes",

      label:
        "Yes",
    },

    {
      value:
        "no",

      label:
        "No",
    },

    {
      value:
        "unsure",

      label:
        "Not sure",
    },
  ];

function QuestionnaireSection({
  icon,
  title,
  description,
  children,
}: QuestionnaireSectionProps) {
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

function LikertQuestion({
  name,
  title,
  description,
  lowLabel,
  highLabel,
  value,
  onChange,
}: LikertQuestionProps) {
  return (
    <fieldset className="likert-card">
      <legend>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </legend>

      <div className="likert-options">
        {LIKERT_OPTIONS.map(
          (option) => (
            <label
              key={
                option
              }
              className={[
                "likert-option",

                value ===
                option
                  ? "likert-option-selected"
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
                name={
                  name
                }
                value={
                  option
                }
                checked={
                  value ===
                  option
                }
                onChange={() => {
                  onChange(
                    option,
                  );
                }}
              />

              <span>
                {option}
              </span>
            </label>
          ),
        )}
      </div>

      <div
        className="likert-labels"
        aria-hidden="true"
      >
        <span>
          {lowLabel}
        </span>

        <span>
          {highLabel}
        </span>
      </div>
    </fieldset>
  );
}

function RadioQuestion({
  name,
  title,
  description,
  options,
  value,
  onChange,
}: {
  name:
    string;

  title:
    string;

  description:
    string;

  options:
    ResponseOption[];

  value:
    string;

  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <fieldset className="radio-question-card">
      <legend>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </legend>

      <div className="radio-question-options">
        {options.map(
          (option) => (
            <label
              key={
                option.value
              }
              className={[
                "radio-question-option",

                value ===
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
                name={
                  name
                }
                value={
                  option.value
                }
                checked={
                  value ===
                  option.value
                }
                onChange={() => {
                  onChange(
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

export default function PostExperimentPage() {
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

  const markPostExperimentCsvExported =
    useStudySessionStore(
      (state) =>
        state.markPostExperimentCsvExported,
    );

  const finalQuestionnaire =
    useQuestionnaireStore(
      (state) =>
        state.finalQuestionnaire,
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

  const allTrialsComplete =
    completedTrialCount ===
    TOTAL_TRIALS;

  const orderedTrials =
    [...trials].sort(
      (
        first,
        second,
      ) => {
        const firstOrder =
          first.trialOrder >
          0
            ? first.trialOrder
            : first.trialNumber;

        const secondOrder =
          second.trialOrder >
          0
            ? second.trialOrder
            : second.trialNumber;

        return (
          firstOrder -
          secondOrder
        );
      },
    );

  const finalTrial =
    orderedTrials[
      orderedTrials.length -
        1
    ];

  const {
    attributionCheck,
    funneledDebrief,
  } = finalQuestionnaire;

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
    postExperimentCompleted,
    procedureAccepted,
    sessionId,
    setEventParticipantId,
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

        completedTrialCount,

        totalTrials:
          TOTAL_TRIALS,

        selectedTrialOrder:
          orderedTrials.map(
            (trial) =>
              trial.trialNumber,
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
    completedTrialCount,
    events,
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

        completedTrialCount,

        totalTrials:
          TOTAL_TRIALS,

        attributionCheck: {
          ...submittedResponse
            .attributionCheck,
        },

        funneledDebrief: {
          ...submittedResponse
            .funneledDebrief,
        },

        questionnaireStartedAtIso:
          submittedResponse
            .startedAtIso,

        questionnaireSubmittedAtIso:
          submittedResponse
            .submittedAtIso,
      },
    });

    const exportedAtIso =
      new Date()
        .toISOString();

    const safeParticipantId =
      sanitizeFilePart(
        participantId,
      );

    const fileName =
      `${safeParticipantId}_post_task_questionnaire.csv`;

    setPostExperimentCsvExportStatus(
      "exporting",
    );

    try {
      const selectedTrialOrder =
        orderedTrials
          .map(
            (trial) =>
              trial.trialNumber,
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

          completed_trial_count:
            completedTrialCount,

          total_trial_count:
            TOTAL_TRIALS,

          selected_trial_order:
            selectedTrialOrder,

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
            AI Assisted Scheduling Study
          </div>

          <h1>
            Post Task Questionnaire
          </h1>

          <p>
            Please reflect on your experience across all
            three Symposium Scheduler tasks.
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
            You have completed all three scheduling tasks.
            Please answer the following questions based on
            your overall experience.
          </p>
        </section>

        <QuestionnaireSection
          icon={
            <Scale
              size={22}
              aria-hidden="true"
            />
          }
          title="Decision attribution"
          description="These questions ask what influenced your final scheduling decisions."
        >
          <div className="questionnaire-question-list">
            <RadioQuestion
              name="primaryInfluence"
              title="Primary influence"
              description="Which factor had the greatest influence on your final schedules overall?"
              options={
                influenceOptions
              }
              value={
                attributionCheck
                  .primaryInfluence
              }
              onChange={(value) => {
                setAttributionCheckValue(
                  "primaryInfluence",
                  value as PrimaryInfluence,
                );
              }}
            />

            <LikertQuestion
              name="aiInfluence"
              title="AI influence"
              description="How much did the AI recommendations influence your final scheduling decisions?"
              lowLabel="Not at all"
              highLabel="Very strongly"
              value={
                attributionCheck
                  .aiInfluence
              }
              onChange={(value) => {
                setAttributionCheckValue(
                  "aiInfluence",
                  value,
                );
              }}
            />

            <LikertQuestion
              name="aiReliance"
              title="Reliance on the AI"
              description="When you were uncertain, how often did you rely on the AI recommendation?"
              lowLabel="Never"
              highLabel="Always"
              value={
                attributionCheck
                  .aiReliance
              }
              onChange={(value) => {
                setAttributionCheckValue(
                  "aiReliance",
                  value,
                );
              }}
            />

            <LikertQuestion
              name="decisionConfidence"
              title="Decision confidence"
              description="How confident were you in the final schedules you submitted?"
              lowLabel="Not confident"
              highLabel="Very confident"
              value={
                attributionCheck
                  .decisionConfidence
              }
              onChange={(value) => {
                setAttributionCheckValue(
                  "decisionConfidence",
                  value,
                );
              }}
            />

            <LikertQuestion
              name="perceivedAiCompetence"
              title="Overall AI competence"
              description="How competent did the AI assistant appear across the three tasks?"
              lowLabel="Not competent"
              highLabel="Very competent"
              value={
                attributionCheck
                  .perceivedAiCompetence
              }
              onChange={(value) => {
                setAttributionCheckValue(
                  "perceivedAiCompetence",
                  value,
                );
              }}
            />
          </div>
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <Brain
              size={22}
              aria-hidden="true"
            />
          }
          title="Your understanding of the study"
          description="Please answer in your own words. There are no right or wrong answers."
        >
          <div className="open-response-card">
            <label htmlFor="perceivedPurpose">
              <strong>
                What do you think this study was investigating?
              </strong>

              <span>
                Describe the purpose of the study as you
                understood it.
              </span>
            </label>

            <textarea
              id="perceivedPurpose"
              value={
                funneledDebrief
                  .perceivedPurpose
              }
              onChange={(event) => {
                setFunneledDebriefValue(
                  "perceivedPurpose",
                  event.target.value,
                );
              }}
              rows={5}
              maxLength={1500}
              required
            />

            <div className="response-character-count">
              {
                funneledDebrief
                  .perceivedPurpose
                  .length
              }{" "}
              of 1500
            </div>
          </div>
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <Bot
              size={22}
              aria-hidden="true"
            />
          }
          title="AI assistance"
          description="Reflect on whether the AI assistance appeared different across the tasks."
        >
          <RadioQuestion
            name="noticedAiDifferences"
            title="Differences between tasks"
            description="Did the AI assistant appear to provide different amounts of detail or different forms of assistance across the three tasks?"
            options={
              yesNoUnsureOptions
            }
            value={
              funneledDebrief
                .noticedAiDifferences
            }
            onChange={(value) => {
              setFunneledDebriefValue(
                "noticedAiDifferences",
                value as YesNoUnsure,
              );
            }}
          />

          {(
            funneledDebrief
              .noticedAiDifferences ===
              "yes" ||
            funneledDebrief
              .noticedAiDifferences ===
              "unsure"
          ) && (
            <div className="open-response-card">
              <label htmlFor="aiDifferenceDescription">
                <strong>
                  Please describe any differences you noticed
                </strong>

                <span>
                  You may describe the content, detail,
                  presentation, or usefulness of the AI
                  assistance.
                </span>
              </label>

              <textarea
                id="aiDifferenceDescription"
                value={
                  funneledDebrief
                    .aiDifferenceDescription
                }
                onChange={(event) => {
                  setFunneledDebriefValue(
                    "aiDifferenceDescription",
                    event.target.value,
                  );
                }}
                rows={4}
                maxLength={1200}
                required={
                  funneledDebrief
                    .noticedAiDifferences ===
                  "yes"
                }
              />

              <div className="response-character-count">
                {
                  funneledDebrief
                    .aiDifferenceDescription
                    .length
                }{" "}
                of 1200
              </div>
            </div>
          )}
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <MessageSquareText
              size={22}
              aria-hidden="true"
            />
          }
          title="Task updates"
          description="Consider the information update that appeared while you were scheduling."
        >
          <RadioQuestion
            name="taskUpdateImpact"
            title="Effect of the update"
            description="Did an update that appeared during a task change your scheduling approach or final decision?"
            options={
              yesNoUnsureOptions
            }
            value={
              funneledDebrief
                .taskUpdateImpact
            }
            onChange={(value) => {
              setFunneledDebriefValue(
                "taskUpdateImpact",
                value as YesNoUnsure,
              );
            }}
          />

          {(
            funneledDebrief
              .taskUpdateImpact ===
              "yes" ||
            funneledDebrief
              .taskUpdateImpact ===
              "unsure"
          ) && (
            <div className="open-response-card">
              <label htmlFor="taskUpdateDescription">
                <strong>
                  Please describe the effect of the update
                </strong>

                <span>
                  Explain what you changed, considered
                  changing, or decided not to change.
                </span>
              </label>

              <textarea
                id="taskUpdateDescription"
                value={
                  funneledDebrief
                    .taskUpdateDescription
                }
                onChange={(event) => {
                  setFunneledDebriefValue(
                    "taskUpdateDescription",
                    event.target.value,
                  );
                }}
                rows={4}
                maxLength={1200}
                required={
                  funneledDebrief
                    .taskUpdateImpact ===
                  "yes"
                }
              />

              <div className="response-character-count">
                {
                  funneledDebrief
                    .taskUpdateDescription
                    .length
                }{" "}
                of 1200
              </div>
            </div>
          )}
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <Eye
              size={22}
              aria-hidden="true"
            />
          }
          title="Study awareness"
          description="These questions help us understand how participants interpreted the study."
        >
          <div className="questionnaire-question-list">
            <RadioQuestion
              name="noticedAnythingUnusual"
              title="Unusual features or suspicions"
              description="Did you notice anything unusual or form any suspicions about the task, AI assistant, or study purpose?"
              options={
                yesNoUnsureOptions
              }
              value={
                funneledDebrief
                  .noticedAnythingUnusual
              }
              onChange={(value) => {
                setFunneledDebriefValue(
                  "noticedAnythingUnusual",
                  value as YesNoUnsure,
                );
              }}
            />

            {(
              funneledDebrief
                .noticedAnythingUnusual ===
                "yes" ||
              funneledDebrief
                .noticedAnythingUnusual ===
                "unsure"
            ) && (
              <div className="open-response-card">
                <label htmlFor="suspicionDescription">
                  <strong>
                    Please describe what you noticed or
                    suspected
                  </strong>
                </label>

                <textarea
                  id="suspicionDescription"
                  value={
                    funneledDebrief
                      .suspicionDescription
                  }
                  onChange={(event) => {
                    setFunneledDebriefValue(
                      "suspicionDescription",
                      event.target.value,
                    );
                  }}
                  rows={4}
                  maxLength={1200}
                  required={
                    funneledDebrief
                      .noticedAnythingUnusual ===
                    "yes"
                  }
                />

                <div className="response-character-count">
                  {
                    funneledDebrief
                      .suspicionDescription
                      .length
                  }{" "}
                  of 1200
                </div>
              </div>
            )}

            <RadioQuestion
              name="priorStudyKnowledge"
              title="Prior knowledge"
              description="Before participating, had anyone told you about the study purpose, expected results, or different AI assistance conditions?"
              options={
                yesNoUnsureOptions
              }
              value={
                funneledDebrief
                  .priorStudyKnowledge
              }
              onChange={(value) => {
                setFunneledDebriefValue(
                  "priorStudyKnowledge",
                  value as YesNoUnsure,
                );
              }}
            />

            {(
              funneledDebrief
                .priorStudyKnowledge ===
                "yes" ||
              funneledDebrief
                .priorStudyKnowledge ===
                "unsure"
            ) && (
              <div className="open-response-card">
                <label htmlFor="priorKnowledgeDescription">
                  <strong>
                    Please describe what you knew
                  </strong>
                </label>

                <textarea
                  id="priorKnowledgeDescription"
                  value={
                    funneledDebrief
                      .priorKnowledgeDescription
                  }
                  onChange={(event) => {
                    setFunneledDebriefValue(
                      "priorKnowledgeDescription",
                      event.target.value,
                    );
                  }}
                  rows={4}
                  maxLength={1200}
                  required={
                    funneledDebrief
                      .priorStudyKnowledge ===
                    "yes"
                  }
                />

                <div className="response-character-count">
                  {
                    funneledDebrief
                      .priorKnowledgeDescription
                      .length
                  }{" "}
                  of 1200
                </div>
              </div>
            )}
          </div>
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <MessageSquareText
              size={22}
              aria-hidden="true"
            />
          }
          title="Additional feedback"
          description="This final response is optional."
        >
          <div className="open-response-card">
            <label htmlFor="additionalFeedback">
              <strong>
                Is there anything else you would like to tell
                us about your experience?
              </strong>
            </label>

            <textarea
              id="additionalFeedback"
              value={
                funneledDebrief
                  .additionalFeedback
              }
              onChange={(event) => {
                setFunneledDebriefValue(
                  "additionalFeedback",
                  event.target.value,
                );
              }}
              rows={5}
              maxLength={1500}
            />

            <div className="response-character-count">
              {
                funneledDebrief
                  .additionalFeedback
                  .length
              }{" "}
              of 1500
            </div>
          </div>
        </QuestionnaireSection>

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
            Your final responses will be recorded and one
            post task questionnaire CSV file will be
            downloaded after submission.
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
              ? "Preparing study file"
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