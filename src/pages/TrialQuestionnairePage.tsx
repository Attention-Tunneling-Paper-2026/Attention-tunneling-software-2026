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
  ChangeEvent,
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
  StudyTrialProgress,
} from "../types/study";

import {
  MANIPULATION_CHECK_DIMENSIONS,
  isLikertRating,
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

interface TaskQuestionnaireCopy {
  taskTitle:
    string;

  solutionNoun:
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

const TASK_QUESTIONNAIRE_COPY: Record<
  StudyTaskId,
  TaskQuestionnaireCopy
> = {
  symposium: {
    taskTitle:
      "Symposium Scheduler",

    solutionNoun:
      "schedule",

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

    solutionNoun:
      "dispatch plan",

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

    solutionNoun:
      "roster",

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

function getTaskQuestionnaireCopy(
  taskId:
    StudyTaskId,
): TaskQuestionnaireCopy {
  return {
    ...TASK_QUESTIONNAIRE_COPY[
      taskId
    ],

    locationLabels: [
      ...TASK_QUESTIONNAIRE_COPY[
        taskId
      ].locationLabels,
    ],

    recognitionLabels: {
      ...TASK_QUESTIONNAIRE_COPY[
        taskId
      ].recognitionLabels,
    },

    recognitionValues: {
      ...TASK_QUESTIONNAIRE_COPY[
        taskId
      ].recognitionValues,
    },
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
        "Solution completeness",

      description:
        `My final ${taskCopy.solutionNoun} was complete and ready to submit.`,

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
        "The AI assistant appeared competent at solving this task.",

      lowLabel:
        "Strongly disagree",

      highLabel:
        "Strongly agree",
    },
  ];
}

function getProbeLocationOptions(
  taskCopy:
    TaskQuestionnaireCopy,
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
    TaskQuestionnaireCopy,
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
        "The AI recommendation presented a concrete solution.",
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
        "The AI recommendation presented a complete solution.",
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
        "The AI recommendation included detailed task information.",
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
        "The AI recommendation was specific about how the task should be completed.",
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
        "The AI recommendation made the actions needed to use its solution clear.",
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

  const trialExportsComplete =
    trial?.eventsCsvExportStatus ===
      "exported" &&
    trial.summaryCsvExportStatus ===
      "exported";

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
      if (
        trialExportsComplete
      ) {
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
      }

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
    trialExportsComplete,
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

    const completedTrial =
      useStudySessionStore
        .getState()
        .getTrialProgress(
          trialNumber,
          taskId,
        ) ??
      trial;

    const eventsFileName =
      getTrialEventsCsvFileName(
        participantId,
        trialNumber,
        trial.condition,
        taskId,
      );

    const summaryFileName =
      getTrialSummaryCsvFileName(
        participantId,
        trialNumber,
        trial.condition,
        taskId,
      );

    const exportErrors:
      string[] = [];

    let eventsExported =
      completedTrial
        .eventsCsvExportStatus ===
      "exported";

    let summaryExported =
      completedTrial
        .summaryCsvExportStatus ===
      "exported";

    const exportAttemptAtIso =
      new Date()
        .toISOString();

    const trialEvents =
      getEventsForTrial(
        trialNumber,
        taskId,
      );

    if (
      !eventsExported
    ) {
      setTrialCsvExportStatus(
        trialNumber,
        "events",
        "exporting",
        undefined,
        taskId,
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

        const statusMarked =
          markTrialEventsCsvExported(
            trialNumber,
            taskId,
            exportAttemptAtIso,
          );

        if (
          !statusMarked
        ) {
          throw new Error(
            "The event CSV download started, but its export status could not be recorded.",
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

        exportErrors.push(
          `Events CSV: ${errorMessage}`,
        );

        setTrialCsvExportStatus(
          trialNumber,
          "events",
          "failed",
          errorMessage,
          taskId,
        );
      }
    }

    if (
      !summaryExported
    ) {
      setTrialCsvExportStatus(
        trialNumber,
        "summary",
        "exporting",
        undefined,
        taskId,
      );

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

        const statusMarked =
          markTrialSummaryCsvExported(
            trialNumber,
            taskId,
            exportAttemptAtIso,
          );

        if (
          !statusMarked
        ) {
          throw new Error(
            "The summary CSV download started, but its export status could not be recorded.",
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

        exportErrors.push(
          `Summary CSV: ${errorMessage}`,
        );

        setTrialCsvExportStatus(
          trialNumber,
          "summary",
          "failed",
          errorMessage,
          taskId,
        );
      }
    }

    if (
      eventsExported &&
      summaryExported
    ) {
      markTrialQuestionnaireExported(
        trialNumber,
        taskId,
      );
    }

    addEvent({
      eventType:
        "trial_csv_exported",

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

      accepted:
        eventsExported &&
        summaryExported,

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

        eventsFileName,

        summaryFileName,

        eventsExported,

        summaryExported,

        exportErrors,

        exportedAtIso:
          exportAttemptAtIso,
      },
    });

    if (
      exportErrors.length >
      0
    ) {
      submissionStartedRef.current =
        false;

      setSubmitting(
        false,
      );

      setValidationMessage(
        "The questionnaire was saved, but one or more study files could not be downloaded. Select the button again to retry only the missing file download.",
      );

      window.alert(
        [
          "The questionnaire was saved, but one or more CSV files could not be downloaded.",
          "",
          ...exportErrors,
          "",
          "Check whether your browser is blocking automatic downloads, then select the button again to retry.",
        ].join(
          "\n",
        ),
      );

      return;
    }

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

  const experienceQuestions =
    getExperienceQuestions(
      taskCopy,
    );

  const probeLocationOptions =
    getProbeLocationOptions(
      taskCopy,
    );

  const probeRecognitionOptions =
    getProbeRecognitionOptions(
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
          description="Select one rating for each NASA TLX dimension. Ratings range from 1 to 7 in whole-number steps, where 1 is low and 7 is high."
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
          description="Select one response on each 1 to 5 agreement scale."
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
            description="Rate the AI assistance on the required 1 to 5 manipulation check scales."
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
                  Did you notice a new {taskCopy.updateLabel} while
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
                          questionnaireSubmitted
                        }
                        onChange={() => {
                          setProbeRecallValue(
                            trialNumber,
                            "noticedUpdate",
                            option.value,
                            taskId,
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
                    questionnaireSubmitted
                  }
                  onChange={(
                    event:
                      ChangeEvent<HTMLTextAreaElement>,
                  ) => {
                    setProbeRecallValue(
                      trialNumber,
                      "updateDescription",
                      event.target.value,
                      taskId,
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
                {probeLocationOptions.map(
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
                          questionnaireSubmitted
                        }
                        onChange={() => {
                          setProbeRecallValue(
                            trialNumber,
                            "affectedRoom",
                            option.value,
                            taskId,
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
                questionnaireSubmitted
              }
              onChange={(value) => {
                if (
                  !isLikertRating(
                    value,
                  )
                ) {
                  return;
                }

                setProbeRecallValue(
                  trialNumber,
                  "recallConfidence",
                  value,
                  taskId,
                );
              }}
            />

            <fieldset className="radio-question-card">
              <legend>
                <strong>
                  Update recognition
                </strong>

                <span>
                  Which {taskCopy.updateLabel} was shown during the task?
                </span>
              </legend>

              <div className="radio-question-options">
                {probeRecognitionOptions.map(
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
                          questionnaireSubmitted
                        }
                        onChange={() => {
                          setProbeRecallValue(
                            trialNumber,
                            "recognitionChoice",
                            option.value,
                            taskId,
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
            {questionnaireSubmitted
              ? "Your questionnaire responses are saved. Select the button below to retry any study file that has not yet been downloaded."
              : "Your responses will be saved after you select the button below. One event CSV and one summary CSV will then be downloaded for this task."}
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
              : questionnaireSubmitted
                ? "Retry missing study file downloads"
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