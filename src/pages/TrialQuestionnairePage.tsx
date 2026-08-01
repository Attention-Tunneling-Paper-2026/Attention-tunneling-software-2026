import {
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
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
  useParams,
} from "react-router";

import LikertScale from "../components/forms/LikertScale";
import NasaTlxForm from "../components/forms/NasaTlxForm";

import {
  SEMANTIC_PROBE,
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
  StudyTrialProgress,
} from "../types/study";

import {
  MANIPULATION_CHECK_DIMENSIONS,
  isTrialQuestionnaireComplete,
} from "../types/questionnaire";

import type {
  LikertRating,
  ManipulationCheckDimension,
  ProbeRecallRoom,
  ProbeRecognitionChoice,
  TrialExperienceDimension,
  TrialExperienceRatings,
} from "../types/questionnaire";

import {
  isStudyTrialNumber,
} from "../types/scheduler";

import type {
  StudyTrialNumber,
  StudyTrialOrder,
} from "../types/scheduler";

import {
  downloadCsv,
  getTrialEventsCsvFileName,
  getTrialSummaryCsvFileName,
} from "../utils/csvExport";

type ExperienceDimension =
  TrialExperienceDimension;

type ManipulationDimension =
  ManipulationCheckDimension;

interface ExperienceQuestion {
  id:
    ExperienceDimension;

  title:
    string;

  description:
    string;

  lowLabel:
    string;

  highLabel:
    string;
}

const TOTAL_TRIALS =
  3;

function getParticipantTaskNumber(
  trial:
    StudyTrialProgress,
): StudyTrialOrder {
  return isStudyTrialNumber(
    trial.trialOrder,
  )
    ? trial.trialOrder
    : trial.trialNumber;
}

const EXPERIENCE_QUESTIONS:
  ExperienceQuestion[] = [
    {
      id:
        "scheduleCompleteness",

      title:
        "Schedule completeness",

      description:
        "My final schedule was complete and ready to submit.",

      lowLabel:
        "Strongly disagree",

      highLabel:
        "Strongly agree",
    },

    {
      id:
        "aiHelpfulness",

      title:
        "AI helpfulness",

      description:
        "The AI assistant recommendation was helpful for completing the task.",

      lowLabel:
        "Strongly disagree",

      highLabel:
        "Strongly agree",
    },

    {
      id:
        "aiCompetence",

      title:
        "AI competence",

      description:
        "The AI assistant appeared competent at solving this scheduling task.",

      lowLabel:
        "Strongly disagree",

      highLabel:
        "Strongly agree",
    },
  ];

const PROBE_ROOM_OPTIONS: Array<{
  value:
    Exclude<
      ProbeRecallRoom,
      ""
    >;

  label:
    string;
}> = [
  {
    value:
      "A",

    label:
      "Room A",
  },

  {
    value:
      "B",

    label:
      "Room B",
  },

  {
    value:
      "C",

    label:
      "Room C",
  },

  {
    value:
      "none",

    label:
      "No room was affected",
  },

  {
    value:
      "unsure",

    label:
      "Unsure",
  },
];

const PROBE_RECOGNITION_OPTIONS: Array<{
  value:
    Exclude<
      ProbeRecognitionChoice,
      ""
    >;

  label:
    string;
}> = [
  {
    value:
      "room_c_projector_failure",

    label:
      SEMANTIC_PROBE.message,
  },

  {
    value:
      "room_a_projector_failure",

    label:
      "The projector in Room A broke for the rest of the day",
  },

  {
    value:
      "room_b_unavailable",

    label:
      "Room B became unavailable for the rest of the day",
  },

  {
    value:
      "session_time_changed",

    label:
      "The time of one session changed",
  },

  {
    value:
      "no_update",

    label:
      "No facilities update was shown",
  },

  {
    value:
      "unsure",

    label:
      "Unsure",
  },
];

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

function humanizeKey(
  value:
    string,
): string {
  const separated =
    value
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2",
      )
      .replace(
        /_/g,
        " ",
      )
      .trim();

  if (
    separated.length ===
    0
  ) {
    return "AI presentation";
  }

  return (
    separated
      .charAt(
        0,
      )
      .toUpperCase() +
    separated.slice(
      1,
    )
  );
}

function getManipulationQuestion(
  dimension:
    ManipulationDimension,
): {
  title:
    string;

  description:
    string;
} {
  const key =
    String(
      dimension,
    );

  const normalizedKey =
    key.toLowerCase();

  if (
    normalizedKey.includes(
      "concrete",
    )
  ) {
    return {
      title:
        "AI output concreteness",

      description:
        "The AI recommendation presented a concrete scheduling solution.",
    };
  }

  if (
    normalizedKey.includes(
      "complete",
    )
  ) {
    return {
      title:
        "AI output completeness",

      description:
        "The AI recommendation presented a complete scheduling solution.",
    };
  }

  if (
    normalizedKey.includes(
      "detail",
    )
  ) {
    return {
      title:
        "AI output detail",

      description:
        "The AI recommendation included detailed scheduling information.",
    };
  }

  if (
    normalizedKey.includes(
      "specific",
    )
  ) {
    return {
      title:
        "AI output specificity",

      description:
        "The AI recommendation was specific about how talks should be scheduled.",
    };
  }

  if (
    normalizedKey.includes(
      "action",
    )
  ) {
    return {
      title:
        "AI solution actionability",

      description:
        "The AI recommendation made the scheduling actions needed to use its solution clear.",
    };
  }

  if (
    normalizedKey.includes(
      "usability",
    )
  ) {
    return {
      title:
        "AI output direct usability",

      description:
        "The AI recommendation could be applied directly without substantial additional interpretation.",
    };
  }

  return {
    title:
      humanizeKey(
        key,
      ),

    description:
      `Rate this aspect of the AI recommendation: ${humanizeKey(
        key,
      ).toLowerCase()}.`,
  };
}

function getExperienceValue(
  values:
    TrialExperienceRatings,

  dimension:
    ExperienceDimension,
): LikertRating | null {
  return values[
    dimension
  ];
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

export default function TrialQuestionnairePage() {
  const navigate =
    useNavigate();

  const {
    trialNumber:
      trialNumberParam,
  } = useParams<{
    trialNumber:
      string;
  }>();

  const parsedTrialNumber =
    Number(
      trialNumberParam,
    );

  const trialNumber:
    StudyTrialNumber | null =
      isStudyTrialNumber(
        parsedTrialNumber,
      )
        ? parsedTrialNumber
        : null;

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

  const openTrialQuestionnaire =
    useStudySessionStore(
      (state) =>
        state.openTrialQuestionnaire,
    );

  const completeTrialQuestionnaire =
    useStudySessionStore(
      (state) =>
        state.completeTrialQuestionnaire,
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

  const trialResponses =
    useQuestionnaireStore(
      (state) =>
        state.trialResponses,
    );

  const initializeTrialResponse =
    useQuestionnaireStore(
      (state) =>
        state.initializeTrialResponse,
    );

  const setNasaTlxValue =
    useQuestionnaireStore(
      (state) =>
        state.setNasaTlxValue,
    );

  const setExperienceRating =
    useQuestionnaireStore(
      (state) =>
        state.setExperienceRating,
    );

  const setManipulationCheckValue =
    useQuestionnaireStore(
      (state) =>
        state.setManipulationCheckValue,
    );

  const setProbeRecallValue =
    useQuestionnaireStore(
      (state) =>
        state.setProbeRecallValue,
    );

  const submitTrialQuestionnaire =
    useQuestionnaireStore(
      (state) =>
        state.submitTrialQuestionnaire,
    );

  const markTrialQuestionnaireExported =
    useQuestionnaireStore(
      (state) =>
        state.markTrialQuestionnaireExported,
    );

  const addEvent =
    useEventLogStore(
      (state) =>
        state.addEvent,
    );

  const getEventsForTrial =
    useEventLogStore(
      (state) =>
        state.getEventsForTrial,
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

  const pageInitializedRef =
    useRef<
      StudyTrialNumber | null
    >(
      null,
    );

  const questionnaireStartedRef =
    useRef<
      StudyTrialNumber | null
    >(
      null,
    );

  const submissionStartedRef =
    useRef(
      false,
    );

  const trial =
    trialNumber ===
    null
      ? undefined
      : trials.find(
          (item) =>
            item.trialNumber ===
            trialNumber,
        );

  const response =
    trialNumber ===
    null
      ? undefined
      : trialResponses.find(
          (item) =>
            item.trialNumber ===
            trialNumber,
        );

  const trialStatus =
    trial?.status;

  const trialCondition =
    trial?.condition;

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
      trialNumber ===
        null ||
      !trialStatus ||
      !trialCondition
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
      trialStatus ===
      "questionnaire_complete"
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
      trialStatus !==
      "submitted"
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
      pageInitializedRef.current ===
      trialNumber
    ) {
      return;
    }

    pageInitializedRef.current =
      trialNumber;

    openTrialQuestionnaire(
      trialNumber,
    );

    initializeTrialResponse(
      trialNumber,
      "symposium",
      trialCondition,
    );
  }, [
    initializeTrialResponse,
    navigate,
    openTrialQuestionnaire,
    procedureAccepted,
    trialCondition,
    trialNumber,
    trialStatus,
  ]);

  useEffect(() => {
    if (
      trialNumber ===
        null ||
      !trialCondition ||
      trialStatus !==
        "submitted" ||
      response
    ) {
      return;
    }

    initializeTrialResponse(
      trialNumber,
      "symposium",
      trialCondition,
    );
  }, [
    initializeTrialResponse,
    response,
    trialCondition,
    trialNumber,
    trialStatus,
  ]);

  useEffect(() => {
    if (
      trialNumber ===
        null ||
      !trial ||
      !response ||
      questionnaireStartedRef.current ===
        trialNumber
    ) {
      return;
    }

    questionnaireStartedRef.current =
      trialNumber;

    addEvent({
      eventType:
        "questionnaire_started",

      trialNumber,

      trialOrder:
        getParticipantTaskNumber(
          trial,
        ),

      condition:
        trial.condition,

      conditionOrder:
        trial.conditionOrder,

      isFirstTrial:
        trial.isFirstTrial,

      probeExposureNumber:
        trial.probeExposureNumber,

      probeNaive:
        trial.probeNaive,

      phase:
        "questionnaire",

      metadata: {
        taskId:
          "symposium",

        taskNumber:
          trialNumber,

        participantTaskNumber:
          getParticipantTaskNumber(
            trial,
          ),

        totalTrials:
          TOTAL_TRIALS,

        page:
          "trial_questionnaire",

        trialOrder:
          trial.trialOrder,

        conditionOrder:
          trial.conditionOrder,

        isFirstTrial:
          trial.isFirstTrial,

        probeExposureNumber:
          trial.probeExposureNumber,

        probeNaive:
          trial.probeNaive,
      },
    });
  }, [
    addEvent,
    response,
    trial,
    trialNumber,
  ]);

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      trialNumber ===
        null ||
      !trial ||
      !response ||
      submitting ||
      submissionStartedRef.current
    ) {
      return;
    }

    const currentResponse =
      useQuestionnaireStore
        .getState()
        .trialResponses
        .find(
          (item) =>
            item.trialNumber ===
            trialNumber,
        );

    if (
      !currentResponse ||
      !isTrialQuestionnaireComplete(
        currentResponse,
      )
    ) {
      setValidationMessage(
        "Please answer every questionnaire item before continuing.",
      );

      return;
    }

    setValidationMessage(
      "",
    );

    setSubmitting(
      true,
    );

    submissionStartedRef.current =
      true;

    const submittedResponse =
      submitTrialQuestionnaire(
        trialNumber,
      );

    if (
      !submittedResponse
    ) {
      submissionStartedRef.current =
        false;

      setSubmitting(
        false,
      );

      setValidationMessage(
        "Please answer every questionnaire item before continuing.",
      );

      return;
    }

    addEvent({
      eventType:
        "questionnaire_submitted",

      trialNumber,

      trialOrder:
        getParticipantTaskNumber(
          trial,
        ),

      condition:
        trial.condition,

      conditionOrder:
        trial.conditionOrder,

      isFirstTrial:
        trial.isFirstTrial,

      probeExposureNumber:
        trial.probeExposureNumber,

      probeNaive:
        trial.probeNaive,

      phase:
        "questionnaire",

      metadata: {
        taskId:
          "symposium",

        taskTitle:
          "Symposium Scheduler",

        taskNumber:
          trialNumber,

        participantTaskNumber:
          getParticipantTaskNumber(
            trial,
          ),

        totalTrials:
          TOTAL_TRIALS,

        trialOrder:
          trial.trialOrder,

        conditionOrder:
          trial.conditionOrder,

        isFirstTrial:
          trial.isFirstTrial,

        probeExposureNumber:
          trial.probeExposureNumber,

        probeNaive:
          trial.probeNaive,

        nasaTlx: {
          ...submittedResponse
            .nasaTlx,
        },

        experienceRatings: {
          ...submittedResponse
            .experienceRatings,
        },

        manipulationCheck: {
          ...submittedResponse
            .manipulationCheck,
        },

        probeRecall: {
          ...submittedResponse
            .probeRecall,
        },

        questionnaireStartedAtIso:
          submittedResponse
            .startedAtIso,

        questionnaireSubmittedAtIso:
          submittedResponse
            .submittedAtIso,
      },
    });

    const sessionUpdated =
      completeTrialQuestionnaire(
        trialNumber,
      );

    if (
      !sessionUpdated
    ) {
      submissionStartedRef.current =
        false;

      setSubmitting(
        false,
      );

      setValidationMessage(
        "The questionnaire could not be completed. Please return to task selection and try again.",
      );

      return;
    }

    const completedTrial =
      useStudySessionStore
        .getState()
        .getTrialProgress(
          trialNumber,
        ) ??
      trial;

    const eventsFileName =
      getTrialEventsCsvFileName(
        participantId,
        trialNumber,
        trial.condition,
      );

    const summaryFileName =
      getTrialSummaryCsvFileName(
        participantId,
        trialNumber,
        trial.condition,
      );

    const exportErrors:
      string[] = [];

    let eventsExported =
      false;

    let summaryExported =
      false;

    setTrialCsvExportStatus(
      trialNumber,
      "events",
      "exporting",
    );

    setTrialCsvExportStatus(
      trialNumber,
      "summary",
      "exporting",
    );

    const trialEvents =
      getEventsForTrial(
        trialNumber,
      );

    try {
      const eventRows =
        buildTrialEventRows(
          trialEvents,
        );

      downloadCsv(
        eventsFileName,
        eventRows,
      );

      markTrialEventsCsvExported(
        trialNumber,
      );

      eventsExported =
        true;
    } catch (
      error
    ) {
      const errorMessage =
        getErrorMessage(
          error,
        );

      exportErrors.push(
        `Events CSV: ${errorMessage}`,
      );

      setTrialCsvExportStatus(
        trialNumber,
        "events",
        "failed",
        errorMessage,
      );
    }

    try {
      const summaryRows =
        buildTrialSummaryRows({
          participantId,

          sessionId,

          trial:
            completedTrial,

          questionnaireResponse:
            submittedResponse,

          events:
            trialEvents,
        });

      downloadCsv(
        summaryFileName,
        summaryRows,
      );

      markTrialSummaryCsvExported(
        trialNumber,
      );

      summaryExported =
        true;
    } catch (
      error
    ) {
      const errorMessage =
        getErrorMessage(
          error,
        );

      exportErrors.push(
        `Summary CSV: ${errorMessage}`,
      );

      setTrialCsvExportStatus(
        trialNumber,
        "summary",
        "failed",
        errorMessage,
      );
    }

    if (
      eventsExported &&
      summaryExported
    ) {
      markTrialQuestionnaireExported(
        trialNumber,
      );
    }

    addEvent({
      eventType:
        "trial_csv_exported",

      trialNumber,

      trialOrder:
        getParticipantTaskNumber(
          trial,
        ),

      condition:
        trial.condition,

      conditionOrder:
        trial.conditionOrder,

      isFirstTrial:
        trial.isFirstTrial,

      probeExposureNumber:
        trial.probeExposureNumber,

      probeNaive:
        trial.probeNaive,

      phase:
        "questionnaire",

      metadata: {
        taskId:
          "symposium",

        taskNumber:
          trialNumber,

        participantTaskNumber:
          getParticipantTaskNumber(
            trial,
          ),

        eventsFileName,

        summaryFileName,

        eventsExported,

        summaryExported,

        exportErrors,

        exportedAtIso:
          new Date()
            .toISOString(),
      },
    });

    if (
      exportErrors.length >
      0
    ) {
      window.alert(
        [
          "The task was completed, but one or more CSV files could not be downloaded.",
          "",
          ...exportErrors,
          "",
          "Check whether your browser is blocking multiple automatic downloads.",
        ].join(
          "\n",
        ),
      );
    }

    window.setTimeout(
      () => {
        navigate(
          "/tasks",
          {
            replace:
              true,
          },
        );
      },
      0,
    );
  }

  if (
    !procedureAccepted ||
    trialNumber ===
      null ||
    !trial
  ) {
    return null;
  }

  const participantTaskNumber =
    getParticipantTaskNumber(
      trial,
    );

  if (
    !response
  ) {
    return (
      <main className="study-page questionnaire-page">
        <header className="study-page-header">
          <div className="study-page-header-content">
            <div className="study-page-eyebrow">
              AI Assisted Scheduling Study
            </div>

            <h1>
              Task Questionnaire
            </h1>

            <p>
              Preparing the questionnaire.
            </p>
          </div>

          <div className="study-progress-label">
            Task {participantTaskNumber} of{" "}
            {TOTAL_TRIALS}
          </div>
        </header>

        <div className="study-page-content">
          <section className="questionnaire-completion-note">
            <Brain
              size={20}
              aria-hidden="true"
            />

            <p>
              Loading your task questionnaire.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const manipulationDimensions:
    readonly ManipulationDimension[] =
      MANIPULATION_CHECK_DIMENSIONS;

  return (
    <main className="study-page questionnaire-page">
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI Assisted Scheduling Study
          </div>

          <h1>
            Task Questionnaire
          </h1>

          <p>
            Please rate your experience completing the
            Symposium Scheduler task.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label={`Questionnaire for task ${participantTaskNumber} of ${TOTAL_TRIALS}`}
        >
          Task {participantTaskNumber} of{" "}
          {TOTAL_TRIALS}
        </div>
      </header>

      <form
        className="study-page-content questionnaire-form"
        onSubmit={
          handleSubmit
        }
      >
        <QuestionnaireSection
          icon={
            <Brain
              size={22}
              aria-hidden="true"
            />
          }
          title="Task workload"
          description="Select one rating for each NASA TLX dimension. Ratings range from 0 to 7 in whole-number steps, where 0 is low and 7 is high."
        >
          <NasaTlxForm
            values={
              response.nasaTlx
            }
            onChange={(
              dimension,
              value,
            ) => {
              setNasaTlxValue(
                trialNumber,
                dimension,
                value,
              );
            }}
          />
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <ClipboardCheck
              size={22}
              aria-hidden="true"
            />
          }
          title="Task and AI ratings"
          description="Select one response on each 0 to 5 agreement scale."
        >
          <div className="likert-list">
            {EXPERIENCE_QUESTIONS.map(
              (question) => (
                <LikertScale
                  key={
                    question.id
                  }
                  name={`${question.id}_${trialNumber}`}
                  title={
                    question.title
                  }
                  description={
                    question.description
                  }
                  lowLabel={
                    question.lowLabel
                  }
                  highLabel={
                    question.highLabel
                  }
                  value={getExperienceValue(
                    response
                      .experienceRatings,
                    question.id,
                  )}
                  min={0}
                  max={5}
                  required
                  onChange={(
                    value,
                  ) => {
                    setExperienceRating(
                      trialNumber,
                      question.id,
                      value as LikertRating,
                    );
                  }}
                />
              ),
            )}
          </div>
        </QuestionnaireSection>

        {manipulationDimensions.length >
          0 && (
          <QuestionnaireSection
            icon={
              <Sparkles
                size={22}
                aria-hidden="true"
              />
            }
            title="AI presentation ratings"
            description="Rate the AI assistance on the required 0 to 5 manipulation check scales."
          >
            <div className="likert-list">
              {manipulationDimensions.map(
                (dimension) => {
                  const question =
                    getManipulationQuestion(
                      dimension,
                    );

                  return (
                    <LikertScale
                      key={
                        String(
                          dimension,
                        )
                      }
                      name={`${String(
                        dimension,
                      )}_${trialNumber}`}
                      title={
                        question.title
                      }
                      description={
                        question.description
                      }
                      lowLabel="Strongly disagree"
                      highLabel="Strongly agree"
                      value={
                        response
                          .manipulationCheck[
                          dimension
                        ]
                      }
                      min={0}
                      max={5}
                      required
                      onChange={(
                        value,
                      ) => {
                        setManipulationCheckValue(
                          trialNumber,
                          dimension,
                          value as LikertRating,
                        );
                      }}
                    />
                  );
                },
              )}
            </div>
          </QuestionnaireSection>
        )}

        <QuestionnaireSection
          icon={
            <Bell
              size={22}
              aria-hidden="true"
            />
          }
          title="Task update recall"
          description="Please answer these questions from memory without returning to the task."
        >
          <div className="likert-list">
            <fieldset className="radio-question-card">
              <legend>
                <strong>
                  Update detection
                </strong>

                <span>
                  Did you notice a new facilities update while
                  completing the task?
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
                        name={`noticed_update_${trialNumber}`}
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
                        onChange={() => {
                          setProbeRecallValue(
                            trialNumber,
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
                  htmlFor={`update-description-${trialNumber}`}
                >
                  <strong>
                    Update recall
                  </strong>

                  <span>
                    Briefly describe the update you remember.
                  </span>
                </label>

                <textarea
                  id={`update-description-${trialNumber}`}
                  value={
                    response
                      .probeRecall
                      .updateDescription
                  }
                  onChange={(event) => {
                    setProbeRecallValue(
                      trialNumber,
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
                  Affected room
                </strong>

                <span>
                  Which room was affected by the facilities
                  update?
                </span>
              </legend>

              <div className="radio-question-options">
                {PROBE_ROOM_OPTIONS.map(
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
                        name={`affected_room_${trialNumber}`}
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
                        onChange={() => {
                          setProbeRecallValue(
                            trialNumber,
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
              name={`recall_confidence_${trialNumber}`}
              title="Recall confidence"
              description="How confident are you that your answer about the affected room is correct?"
              lowLabel="Not at all confident"
              highLabel="Extremely confident"
              value={
                response
                  .probeRecall
                  .recallConfidence
              }
              min={0}
              max={5}
              required
              onChange={(value) => {
                setProbeRecallValue(
                  trialNumber,
                  "recallConfidence",
                  value as LikertRating,
                );
              }}
            />

            <fieldset className="radio-question-card">
              <legend>
                <strong>
                  Update recognition
                </strong>

                <span>
                  Which facilities update was shown during the task?
                </span>
              </legend>

              <div className="radio-question-options">
                {PROBE_RECOGNITION_OPTIONS.map(
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
                        name={`probe_recognition_${trialNumber}`}
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
                        onChange={() => {
                          setProbeRecallValue(
                            trialNumber,
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
            Your responses are recorded after you select the
            button below. Two study data files will also be
            downloaded for this task.
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
              : "Submit and return to task selection"}

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