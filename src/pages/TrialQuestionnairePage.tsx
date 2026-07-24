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

import {
  isTrialQuestionnaireComplete,
} from "../types/questionnaire";

import type {
  LikertRating,
  ManipulationCheckDimension,
  NasaTlxDimension,
  NasaTlxRatings,
  ProbeRecallRoom,
  TrialExperienceDimension,
  TrialExperienceRatings,
} from "../types/questionnaire";

import {
  isStudyTrialNumber,
} from "../types/scheduler";

import type {
  StudyTrialNumber,
} from "../types/scheduler";

import {
  downloadCsv,
  getTrialEventsCsvFileName,
  getTrialSummaryCsvFileName,
} from "../utils/csvExport";

type NasaDimension =
  NasaTlxDimension;

type ExperienceDimension =
  TrialExperienceDimension;

type ManipulationDimension =
  ManipulationCheckDimension;

interface NasaScaleProps {
  id:
    NasaDimension;

  title:
    string;

  question:
    string;

  lowLabel:
    string;

  highLabel:
    string;

  value:
    number;

  onChange: (
    value:
      number,
  ) => void;
}

interface LikertScaleProps {
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

interface NasaQuestion {
  id:
    NasaDimension;

  title:
    string;

  question:
    string;

  lowLabel:
    string;

  highLabel:
    string;
}

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

const NASA_QUESTIONS:
  NasaQuestion[] = [
    {
      id:
        "mentalDemand",

      title:
        "Mental demand",

      question:
        "How mentally demanding was the task?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      id:
        "physicalDemand",

      title:
        "Physical demand",

      question:
        "How physically demanding was the task?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      id:
        "temporalDemand",

      title:
        "Temporal demand",

      question:
        "How hurried or rushed did you feel while completing the task?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      id:
        "performance",

      title:
        "Performance",

      question:
        "How unsuccessful do you think you were in accomplishing the task?",

      lowLabel:
        "Perfect",

      highLabel:
        "Failure",
    },

    {
      id:
        "effort",

      title:
        "Effort",

      question:
        "How hard did you have to work to accomplish your level of performance?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },

    {
      id:
        "frustration",

      title:
        "Frustration",

      question:
        "How insecure, discouraged, irritated, stressed, or annoyed did you feel?",

      lowLabel:
        "Very low",

      highLabel:
        "Very high",
    },
  ];

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

function NasaScale({
  id,
  title,
  question,
  lowLabel,
  highLabel,
  value,
  onChange,
}: NasaScaleProps) {
  return (
    <div className="nasa-scale-card">
      <div className="nasa-scale-header">
        <div>
          <label
            className="nasa-scale-title"
            htmlFor={id}
          >
            {title}
          </label>

          <p>
            {question}
          </p>
        </div>

        <output
          className="nasa-scale-value"
          htmlFor={id}
        >
          {value}
        </output>
      </div>

      <input
        id={id}
        className="nasa-scale-input"
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(event) => {
          onChange(
            Number(
              event.target.value,
            ),
          );
        }}
      />

      <div
        className="nasa-scale-labels"
        aria-hidden="true"
      >
        <span>
          0

          <small>
            {lowLabel}
          </small>
        </span>

        <span>
          100

          <small>
            {highLabel}
          </small>
        </span>
      </div>
    </div>
  );
}

function LikertScale({
  name,
  title,
  description,
  lowLabel,
  highLabel,
  value,
  onChange,
}: LikertScaleProps) {
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
              key={option}
              className={[
                "likert-option",

                value === option
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
                name={name}
                value={option}
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
    ) ||
    normalizedKey.includes(
      "usability",
    )
  ) {
    return {
      title:
        "AI output actionability",

      description:
        "The AI recommendation gave actions that could be applied directly to the schedule.",
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

function getNasaValue(
  values:
    NasaTlxRatings,

  dimension:
    NasaDimension,
): number {
  const value =
    values[
      dimension
    ];

  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  )
    ? value
    : 50;
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

      condition:
        trial.condition,

      phase:
        "questionnaire",

      metadata: {
        taskId:
          "symposium",

        taskNumber:
          trialNumber,

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

      condition:
        trial.condition,

      phase:
        "questionnaire",

      metadata: {
        taskId:
          "symposium",

        taskTitle:
          "Symposium Scheduler",

        taskNumber:
          trialNumber,

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

      condition:
        trial.condition,

      phase:
        "questionnaire",

      metadata: {
        taskId:
          "symposium",

        taskNumber:
          trialNumber,

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
            Task {trialNumber} of{" "}
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

  const manipulationDimensions =
    Object.keys(
      response.manipulationCheck,
    ) as ManipulationDimension[];

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
          aria-label={`Questionnaire for task ${trialNumber} of ${TOTAL_TRIALS}`}
        >
          Task {trialNumber} of{" "}
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
          description="Move each slider to reflect your experience during the task. Ratings range from 0 to 100."
        >
          <div className="nasa-scale-list">
            {NASA_QUESTIONS.map(
              (question) => (
                <NasaScale
                  key={
                    question.id
                  }
                  id={
                    question.id
                  }
                  title={
                    question.title
                  }
                  question={
                    question.question
                  }
                  lowLabel={
                    question.lowLabel
                  }
                  highLabel={
                    question.highLabel
                  }
                  value={getNasaValue(
                    response.nasaTlx,
                    question.id,
                  )}
                  onChange={(
                    value,
                  ) => {
                    setNasaTlxValue(
                      trialNumber,
                      question.id,
                      value,
                    );
                  }}
                />
              ),
            )}
          </div>
        </QuestionnaireSection>

        <QuestionnaireSection
          icon={
            <ClipboardCheck
              size={22}
              aria-hidden="true"
            />
          }
          title="Task and AI ratings"
          description="Select one response for each statement."
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
                  onChange={(
                    value,
                  ) => {
                    setExperienceRating(
                      trialNumber,
                      question.id,
                      value,
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
            description="Rate how the AI recommendation was presented during this task."
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
                      onChange={(
                        value,
                      ) => {
                        setManipulationCheckValue(
                          trialNumber,
                          dimension,
                          value,
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
            <fieldset className="likert-card">
              <legend>
                <strong>
                  Update detection
                </strong>

                <span>
                  Did you notice a new facilities update while
                  completing the task?
                </span>
              </legend>

              <div className="likert-options">
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
                        "likert-option",

                        response
                          .probeRecall
                          .noticedUpdate ===
                        option.value
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
                        name={`noticed_update_${trialNumber}`}
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
              <div className="nasa-scale-card">
                <label
                  className="nasa-scale-title"
                  htmlFor={`update-description-${trialNumber}`}
                >
                  Update recall
                </label>

                <p>
                  Briefly describe the update you remember.
                </p>

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
                />
              </div>
            )}

            <fieldset className="likert-card">
              <legend>
                <strong>
                  Affected room
                </strong>

                <span>
                  Which room was affected by the facilities
                  update?
                </span>
              </legend>

              <div className="likert-options">
                {PROBE_ROOM_OPTIONS.map(
                  (option) => (
                    <label
                      key={
                        option.value
                      }
                      className={[
                        "likert-option",

                        response
                          .probeRecall
                          .affectedRoom ===
                        option.value
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
                        name={`affected_room_${trialNumber}`}
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
              onChange={(value) => {
                setProbeRecallValue(
                  trialNumber,
                  "recallConfidence",
                  value,
                );
              }}
            />
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