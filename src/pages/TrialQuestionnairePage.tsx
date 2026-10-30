import {
  ArrowRight,
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
  NASA_TLX_DIMENSIONS,
  TRIAL_EXPERIENCE_DIMENSIONS,
  isSevenPointRating,
  isLikertRating,
  isTrialQuestionnaireComplete,
} from "../types/questionnaire";

import type {
  SevenPointRating,
  ManipulationCheckDimension,
  TrialExperienceDimension,
  TrialExperienceRatings,
  TrialQuestionnaireResponse,
} from "../types/questionnaire";

import type {
  QuestionnaireItemResponse,
} from "../types/events";

import {
  TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,
  TOTAL_STUDY_TRIALS,
  createCompositeTrialId,
  getGlobalOptionNumber,
  isStudyTaskId,
  isStudyTrialNumber,
  isStudyTrialOrder,
} from "../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
  StudyTrialOrder,
} from "../types/scheduler";

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

interface TaskQuestionnaireCopy {
  taskTitle:
    string;

  solutionNoun:
    string;
}

const TASK_QUESTIONNAIRE_COPY: Record<
  StudyTaskId,
  TaskQuestionnaireCopy
> = {
  symposium: {
    taskTitle:
      "Symposium Scheduler",

    solutionNoun:
      "schedule",
  },

  delivery: {
    taskTitle:
      "Delivery Dispatch",

    solutionNoun:
      "dispatch plan",
  },

  clinic: {
    taskTitle:
      "Clinic Roster",

    solutionNoun:
      "roster",
  },
};

function getTaskQuestionnaireCopy(
  taskId:
    StudyTaskId,
): TaskQuestionnaireCopy {
  return {
    ...TASK_QUESTIONNAIRE_COPY[
      taskId
    ],
  };
}

function getParticipantTaskNumber(
  trial:
    StudyTrialProgress,
): StudyTrialOrder | null {
  return isStudyTrialOrder(
    trial.trialOrder,
  )
    ? trial.trialOrder
    : null;
}

function getExperienceQuestions(
  taskCopy:
    TaskQuestionnaireCopy,
): ExperienceQuestion[] {
  return [
    {
      id:
        "scheduleCompleteness",

      title:
        "Completeness of the AI's help",

      description:
        `How complete was the AI's help with your ${taskCopy.solutionNoun}?`,

      lowLabel:
        "The AI gave me a general direction",

      highLabel:
        "The AI gave me a finished solution",
    },

    {
      id:
        "aiHelpfulness",

      title:
        "AI helpfulness",

      description:
        "The AI recommendation helped me complete the task.",

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
        "The AI seemed capable of solving this task well.",

      lowLabel:
        "Strongly disagree",

      highLabel:
        "Strongly agree",
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

  taskId:
    StudyTaskId,
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
        "Specific assignments",

      description:
        taskId === "delivery"
          ? "The AI recommendation showed specific assignments, such as which shipment to put in which van and route window."
          : taskId === "clinic"
            ? "The AI recommendation showed specific assignments, such as which duty to put in which ward and shift."
            : "The AI recommendation showed specific assignments, such as which talk to put in which room and time slot.",
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
        "The AI recommendation provided a whole solution, with no assignments left for me to fill in.",
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
        "The AI recommendation gave detailed information about how to arrange the items.",
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
        "The AI recommendation clearly specified how I should complete the task.",
    };
  }

  if (
    normalizedKey.includes(
      "action",
    )
  ) {
    return {
      title:
        "Clear actions to take",

      description:
        "The AI recommendation made it clear what actions I should take to put its solution into practice.",
    };
  }

  if (
    normalizedKey.includes(
      "usability",
    )
  ) {
    return {
      title:
        "Ease of using the recommendation",

      description:
        "I could use the AI recommendation directly without having to work out much more about what it meant.",
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
): SevenPointRating | null {
  return values[
    dimension
  ];
}

function getRenderedQuestionnaireItems(
  form: HTMLFormElement,
  response: TrialQuestionnaireResponse,
  formScope: string,
): QuestionnaireItemResponse[] | null {
  const inputs = Array.from(
    form.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  );

  const expectedItems = [
    ...NASA_TLX_DIMENSIONS.map((dimension) => ({
      itemId: dimension,
      answer: response.nasaTlx[dimension],
      maximum: 7,
      matchesName: (name: string) => name.endsWith(`-${dimension}`),
    })),
    ...TRIAL_EXPERIENCE_DIMENSIONS.map((dimension) => ({
      itemId: dimension,
      answer: response.experienceRatings[dimension],
      maximum: 7,
      matchesName: (name: string) => name === `${dimension}_${formScope}`,
    })),
    ...MANIPULATION_CHECK_DIMENSIONS.map((dimension) => ({
      itemId: dimension,
      answer: response.manipulationCheck[dimension],
      maximum: 5,
      matchesName: (name: string) => name === `${dimension}_${formScope}`,
    })),
  ];

  const items: QuestionnaireItemResponse[] = [];

  for (const expected of expectedItems) {
    const options = inputs.filter((input) => expected.matchesName(input.name));
    const card = options[0]?.closest("fieldset");
    const questionText = card?.querySelector(".questionnaire-rating-question")
      ?.textContent?.trim();
    const labels = card?.querySelectorAll(".questionnaire-rating-labels small");
    const scaleMinimumLabel = labels?.[0]?.textContent?.trim();
    const scaleMaximumLabel = labels?.[1]?.textContent?.trim();
    const ratings = options.map((input) => Number(input.value));
    const selected = options.find((input) => input.checked);

    if (
      !questionText || !scaleMinimumLabel || !scaleMaximumLabel ||
      ratings.length !== expected.maximum ||
      ratings.some((rating, index) => rating !== index + 1) ||
      !selected || Number(selected.value) !== expected.answer
    ) {
      return null;
    }

    items.push({
      itemId: expected.itemId,
      questionText,
      scaleMinimum: 1,
      scaleMaximum: expected.maximum,
      scaleMinimumLabel,
      scaleMaximumLabel,
      answer: expected.answer,
    });
  }

  return items;
}

export default function TrialQuestionnairePage() {
  const navigate =
    useNavigate();

  const {
    taskId:
      taskIdParam,

    trialNumber:
      trialNumberParam,
  } = useParams<{
    taskId:
      string;

    trialNumber:
      string;
  }>();

  const taskId:
    StudyTaskId | null =
      isStudyTaskId(
        taskIdParam,
      )
        ? taskIdParam
        : null;

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

  const taskKey =
    taskId !==
      null &&
    trialNumber !==
      null
      ? `${taskId}:${trialNumber}`
      : null;

  const taskCopy =
    taskId ===
      null
      ? null
      : getTaskQuestionnaireCopy(
          taskId,
        );

  const globalOptionNumber =
    taskId ===
      null ||
    trialNumber ===
      null
      ? null
      : getGlobalOptionNumber(
          taskId,
          trialNumber,
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

  const submitTrialQuestionnaire =
    useQuestionnaireStore(
      (state) =>
        state.submitTrialQuestionnaire,
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

  const pageInitializedRef =
    useRef<
      string | null
    >(
      null,
    );

  const questionnaireStartedRef =
    useRef<
      string | null
    >(
      null,
    );

  const submissionStartedRef =
    useRef(
      false,
    );

  const trial =
    taskId ===
      null ||
    trialNumber ===
      null
      ? undefined
      : trials.find(
          (item) =>
            item.taskId ===
              taskId &&
            item.trialNumber ===
              trialNumber,
        );

  const response =
    taskId ===
      null ||
    trialNumber ===
      null
      ? undefined
      : trialResponses.find(
          (item) =>
            item.taskId ===
              taskId &&
            item.trialNumber ===
              trialNumber,
        );

  const trialStatus =
    trial?.status;

  const trialCondition =
    trial?.condition;

  const participantTaskNumber =
    trial
      ? getParticipantTaskNumber(
          trial,
        )
      : null;

  const trialId =
    taskId !==
      null &&
    trialNumber !==
      null
      ? trial?.trialId ??
        createCompositeTrialId(
          taskId,
          trialNumber,
        )
      : null;

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
      taskId ===
        null ||
      trialNumber ===
        null ||
      taskKey ===
        null ||
      !taskCopy ||
      !trialStatus ||
      !trialCondition ||
      participantTaskNumber ===
        null
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
      // ADVISER FIX: Per-trial files remain pending until delayed recall is collected.
      const allTrialsComplete =
        useStudySessionStore
          .getState()
          .areAllTrialsComplete();

      navigate(
        allTrialsComplete
          ? "/post-experiment"
          : "/tasks",
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
      taskKey
    ) {
      return;
    }

    pageInitializedRef.current =
      taskKey;

    openTrialQuestionnaire(
      trialNumber,
      taskId,
    );

    initializeTrialResponse(
      trialNumber,
      taskId,
      trialCondition,
    );
  }, [
    initializeTrialResponse,
    navigate,
    openTrialQuestionnaire,
    participantTaskNumber,
    procedureAccepted,
    taskCopy,
    taskId,
    taskKey,
    trialCondition,
    trialNumber,
    trialStatus,
  ]);


  useEffect(() => {
    if (
      taskId ===
        null ||
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
      taskId,
      trialCondition,
    );
  }, [
    initializeTrialResponse,
    response,
    taskId,
    trialCondition,
    trialNumber,
    trialStatus,
  ]);

  useEffect(() => {
    if (
      taskId ===
        null ||
      taskKey ===
        null ||
      globalOptionNumber ===
        null ||
      trialNumber ===
        null ||
      participantTaskNumber ===
        null ||
      trialId ===
        null ||
      !taskCopy ||
      !trial ||
      !response ||
      trialStatus !==
        "submitted" ||
      questionnaireStartedRef.current ===
        taskKey
    ) {
      return;
    }

    questionnaireStartedRef.current =
      taskKey;

    addEvent({
      eventType:
        "questionnaire_started",

      taskId,

      trialId,

      trialNumber,

      trialOrder:
        participantTaskNumber,

      globalOptionNumber,

      globalTrialNumber:
        globalOptionNumber,

      outerTaskNumber:
        trial.outerTaskNumber,

      innerTaskNumber:
        trialNumber,

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
        taskId,

        taskTitle:
          taskCopy.taskTitle,

        taskNumber:
          participantTaskNumber,

        conditionOptionNumber:
          trialNumber,

        innerTaskNumber:
          trialNumber,

        globalOptionNumber,

        globalTrialNumber:
          globalOptionNumber,

        participantTaskNumber,

        totalTrials:
          TOTAL_STUDY_TRIALS,

        totalStudyTrials:
          TOTAL_STUDY_TRIALS,

        totalSelectableTaskConditionOptions:
          TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

        page:
          "trial_questionnaire",

        trialOrder:
          participantTaskNumber,

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
    globalOptionNumber,
    participantTaskNumber,
    response,
    taskCopy,
    taskId,
    taskKey,
    trial,
    trialId,
    trialNumber,
    trialStatus,
  ]);


  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      taskId ===
        null ||
      globalOptionNumber ===
        null ||
      participantTaskNumber ===
        null ||
      trialId ===
        null ||
      trialNumber ===
        null ||
      !taskCopy ||
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
            item.taskId ===
              taskId &&
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

    const questionnaireItems = getRenderedQuestionnaireItems(
      event.currentTarget,
      currentResponse,
      `${taskId}_${trialNumber}`,
    );

    if (!questionnaireItems) {
      setValidationMessage(
        "Some questionnaire details could not be saved. Please check your answers and try again.",
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

    let submittedResponse =
      currentResponse;

    if (
      submittedResponse.submittedAtIso ===
      null
    ) {
      const submitted =
        submitTrialQuestionnaire(
          trialNumber,
          taskId,
        );

      if (
        !submitted
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

      submittedResponse =
        submitted;

      addEvent({
        eventType:
          "questionnaire_submitted",

        taskId,

        trialId,

        trialNumber,

        trialOrder:
          participantTaskNumber,

        globalOptionNumber,

        globalTrialNumber:
          globalOptionNumber,

        outerTaskNumber:
          trial.outerTaskNumber,

        innerTaskNumber:
          trialNumber,

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

        questionnaireItems,

        metadata: {
          questionnaireItems,

          taskId,

          taskTitle:
            taskCopy.taskTitle,

          taskNumber:
            participantTaskNumber,

          conditionOptionNumber:
            trialNumber,

          innerTaskNumber:
            trialNumber,

          globalOptionNumber,

          globalTrialNumber:
            globalOptionNumber,

          participantTaskNumber,

          totalTrials:
            TOTAL_STUDY_TRIALS,

          totalStudyTrials:
            TOTAL_STUDY_TRIALS,

          totalSelectableTaskConditionOptions:
            TOTAL_SELECTABLE_TASK_CONDITION_OPTIONS,

          trialOrder:
            participantTaskNumber,

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

          questionnaireStartedAtIso:
            submittedResponse
              .startedAtIso,

          questionnaireSubmittedAtIso:
            submittedResponse
              .submittedAtIso,
        },
      });
    }

    if (
      trial.status !==
      "questionnaire_complete"
    ) {
      const sessionUpdated =
        completeTrialQuestionnaire(
          trialNumber,
          taskId,
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
    }

    // ADVISER FIX: Final trial CSVs are generated only after delayed recall.
    const allTrialsComplete =
      useStudySessionStore
        .getState()
        .areAllTrialsComplete();

    window.setTimeout(
      () => {
        navigate(
          allTrialsComplete
            ? "/post-experiment"
            : "/tasks",
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
    taskId ===
      null ||
    trialNumber ===
      null ||
    participantTaskNumber ===
      null ||
    globalOptionNumber ===
      null ||
    trialId ===
      null ||
    !taskCopy ||
    !trial
  ) {
    return null;
  }

  // ADVISER FIX: Probe recall is deferred to the post-experiment page.
  const experienceQuestions =
    getExperienceQuestions(
      taskCopy,
    );

  const formScope =
    `${taskId}_${trialNumber}`;

  if (
    !response
  ) {
    return (
      <main
      className={`study-page questionnaire-page questionnaire-page-${taskId}`}
      data-task-id={taskId}
    >
        <header className="study-page-header">
          <div className="study-page-header-content">
            <div className="study-page-eyebrow">
              AI Assisted Constraint-Solving Study
            </div>

            <h1>
              Task Questionnaire
            </h1>

            <p>
              Preparing the {taskCopy.taskTitle} questionnaire.
            </p>
          </div>

          <div className="study-progress-label">
            Task {participantTaskNumber} of{" "}
            {TOTAL_STUDY_TRIALS}
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

  const questionnaireSubmitted =
    response.submittedAtIso !==
      null ||
    trialStatus ===
      "questionnaire_complete";

  const manipulationDimensions:
    readonly ManipulationDimension[] =
      MANIPULATION_CHECK_DIMENSIONS;

  return (
    <main
      className={`study-page questionnaire-page questionnaire-page-${taskId}`}
      data-task-id={taskId}
    >
      <header className="study-page-header">
        <div className="study-page-header-content">
          <div className="study-page-eyebrow">
            AI Assisted Constraint-Solving Study
          </div>

          <h1>
            Task Questionnaire
          </h1>

          <p>
            Please rate your experience completing the{" "}
            {taskCopy.taskTitle} task.
          </p>
        </div>

        <div
          className="study-progress-label"
          aria-label={`Questionnaire for task ${participantTaskNumber} of ${TOTAL_STUDY_TRIALS}`}
        >
          Task {participantTaskNumber} of{" "}
          {TOTAL_STUDY_TRIALS}
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
          description="Choose a rating from 1 to 7 for each question about the effort and demands of the task. Read the labels at both ends of each scale."
        >
          <NasaTlxForm
            values={
              response.nasaTlx
            }
            disabled={
              questionnaireSubmitted
            }
            onChange={(
              dimension,
              value,
            ) => {
              setNasaTlxValue(
                trialNumber,
                dimension,
                value,
                taskId,
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
          description="Choose one rating from 1 to 7 for each question about the AI's help. Read the labels at both ends of each scale."
        >
          <div className="likert-list">
            {experienceQuestions.map(
              (question) => (
                <LikertScale
                  key={
                    question.id
                  }
                  name={`${question.id}_${formScope}`}
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
                  min={1}
                  max={7}
                  required
                  disabled={
                    questionnaireSubmitted
                  }
                  onChange={(
                    value,
                  ) => {
                    if (
                      !isSevenPointRating(
                        value,
                      )
                    ) {
                      return;
                    }

                    setExperienceRating(
                      trialNumber,
                      question.id,
                      value,
                      taskId,
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
            description="For each statement, choose how much you agree: 1 means strongly disagree and 5 means strongly agree."
          >
            <div className="likert-list">
              {manipulationDimensions.map(
                (dimension) => {
                  const question =
                    getManipulationQuestion(
                      dimension,
                      taskId,
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
                      )}_${formScope}`}
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
                      min={1}
                      max={5}
                      required
                      disabled={
                        questionnaireSubmitted
                      }
                      onChange={(
                        value,
                      ) => {
                        if (
                          !isLikertRating(
                            value,
                          )
                        ) {
                          return;
                        }

                        setManipulationCheckValue(
                          trialNumber,
                          dimension,
                          value,
                          taskId,
                        );
                      }}
                    />
                  );
                },
              )}
            </div>
          </QuestionnaireSection>
        )}

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
            {questionnaireSubmitted
              ? "Your questionnaire responses are saved."
              : "Your responses will be saved after you select the button below."}
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
              ? "Saving responses"
              : questionnaireSubmitted
                ? "Continue"
                : "Submit and continue"}

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
