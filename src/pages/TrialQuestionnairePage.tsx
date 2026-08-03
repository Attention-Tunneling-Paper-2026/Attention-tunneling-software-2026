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
}

const TOTAL_TRIALS =
  3;

const TOTAL_STUDY_TRIALS =
  9;

const TASK_QUESTIONNAIRE_COPY: Record<
  string,
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
        SEMANTIC_PROBE.message,

      alternativeA:
        "The projector in Room A broke for the rest of the day",

      alternativeB:
        "Room B became unavailable for the rest of the day",

      timeChanged:
        "The time of one session changed",

      noUpdate:
        "No facilities update was shown",
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
        "The refrigeration unit in Van C failed for the rest of the day",

      alternativeA:
        "The refrigeration unit in Van A failed for the rest of the day",

      alternativeB:
        "Van B became unavailable for the rest of the day",

      timeChanged:
        "The route window of one shipment changed",

      noUpdate:
        "No vehicle update was shown",
    },
  },

  clinic: {
    taskTitle:
      "Clinic Roster",

    solutionNoun:
      "roster",

    updateLabel:
      "staffing update",

    affectedLocationTitle:
      "Affected ward",

    affectedLocationQuestion:
      "Which ward was affected by the staffing update?",

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
        "Ward C lost ICU certification for the rest of the day",

      alternativeA:
        "Ward A lost ICU certification for the rest of the day",

      alternativeB:
        "Ward B became unavailable for the rest of the day",

      timeChanged:
        "The shift time of one duty changed",

      noUpdate:
        "No staffing update was shown",
    },
  },
};

function isStudyTaskId(
  value:
    unknown,
): value is StudyTaskId {
  return (
    value ===
      "symposium" ||
    value ===
      "delivery" ||
    value ===
      "clinic"
  );
}

function getTaskQuestionnaireCopy(
  taskId:
    StudyTaskId,
): TaskQuestionnaireCopy {
  return (
    TASK_QUESTIONNAIRE_COPY[
      taskId as string
    ] ??
    TASK_QUESTIONNAIRE_COPY
      .symposium
  );
}

function getGlobalTrialNumber(
  taskId:
    StudyTaskId,

  trialNumber:
    StudyTrialNumber,
): number {
  const normalizedTaskId =
    String(
      taskId,
    );

  const taskOffset =
    normalizedTaskId ===
      "delivery"
      ? 3
      : normalizedTaskId ===
          "clinic"
        ? 6
        : 0;

  return (
    taskOffset +
    trialNumber
  );
}

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
        "room_c_projector_failure",

      label:
        taskCopy
          .recognitionLabels
          .correct,
    },

    {
      value:
        "room_a_projector_failure",

      label:
        taskCopy
          .recognitionLabels
          .alternativeA,
    },

    {
      value:
        "room_b_unavailable",

      label:
        taskCopy
          .recognitionLabels
          .alternativeB,
    },

    {
      value:
        "session_time_changed",

      label:
        taskCopy
          .recognitionLabels
          .timeChanged,
    },

    {
      value:
        "no_update",

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

  const globalTrialNumber =
    taskId ===
      null ||
    trialNumber ===
      null
      ? null
      : getGlobalTrialNumber(
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
        `/tasks/${taskId}`,
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
        `/tasks/${taskId}`,
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

    (
      openTrialQuestionnaire as unknown as (
        trialNumber:
          StudyTrialNumber,

        taskId:
          StudyTaskId,
      ) => boolean
    )(
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
      globalTrialNumber ===
        null ||
      trialNumber ===
        null ||
      !taskCopy ||
      !trial ||
      !response ||
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
        taskId,

        taskTitle:
          taskCopy.taskTitle,

        taskNumber:
          trialNumber,

        innerTaskNumber:
          trialNumber,

        globalTrialNumber,

        participantTaskNumber:
          getParticipantTaskNumber(
            trial,
          ),

        totalTrials:
          TOTAL_TRIALS,

        totalStudyTrials:
          TOTAL_STUDY_TRIALS,

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
    globalTrialNumber,
    response,
    taskCopy,
    taskId,
    taskKey,
    trial,
    trialNumber,
  ]);

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      taskId ===
        null ||
      globalTrialNumber ===
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

    const submittedResponse =
      (
        submitTrialQuestionnaire as unknown as (
          trialNumber:
            StudyTrialNumber,

          taskId:
            StudyTaskId,
        ) => ReturnType<
          typeof submitTrialQuestionnaire
        >
      )(
        trialNumber,
        taskId,
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
        taskId,

        taskTitle:
          taskCopy.taskTitle,

        taskNumber:
          trialNumber,

        innerTaskNumber:
          trialNumber,

        globalTrialNumber,

        participantTaskNumber:
          getParticipantTaskNumber(
            trial,
          ),

        totalTrials:
          TOTAL_TRIALS,

        totalStudyTrials:
          TOTAL_STUDY_TRIALS,

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
      (
        completeTrialQuestionnaire as unknown as (
          trialNumber:
            StudyTrialNumber,

          taskId:
            StudyTaskId,
        ) => boolean
      )(
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

    const completedTrial =
      (
        useStudySessionStore
          .getState()
          .getTrialProgress as unknown as (
            trialNumber:
              StudyTrialNumber,

            taskId:
              StudyTaskId,
          ) =>
            | StudyTrialProgress
            | undefined
      )(
        trialNumber,
        taskId,
      ) ??
      trial;

    const eventsFileName =
      `${taskId}_${getTrialEventsCsvFileName(
        participantId,
        trialNumber,
        trial.condition,
      )}`;

    const summaryFileName =
      `${taskId}_${getTrialSummaryCsvFileName(
        participantId,
        trialNumber,
        trial.condition,
      )}`;

    const exportErrors:
      string[] = [];

    let eventsExported =
      false;

    let summaryExported =
      false;

    (
      setTrialCsvExportStatus as unknown as (
        trialNumber:
          StudyTrialNumber,

        exportType:
          "events" | "summary",

        status:
          "exporting" | "exported" | "failed",

        errorMessage?:
          string,

        taskId?:
          StudyTaskId,
      ) => boolean
    )(
      trialNumber,
      "events",
      "exporting",
      undefined,
      taskId,
    );

    (
      setTrialCsvExportStatus as unknown as (
        trialNumber:
          StudyTrialNumber,

        exportType:
          "events" | "summary",

        status:
          "exporting" | "exported" | "failed",

        errorMessage?:
          string,

        taskId?:
          StudyTaskId,
      ) => boolean
    )(
      trialNumber,
      "summary",
      "exporting",
      undefined,
      taskId,
    );

    const trialEvents =
      (
        getEventsForTrial as unknown as (
          trialNumber:
            StudyTrialNumber,

          taskId:
            StudyTaskId,
        ) => ReturnType<
          typeof getEventsForTrial
        >
      )(
        trialNumber,
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

      (
        markTrialEventsCsvExported as unknown as (
          trialNumber:
            StudyTrialNumber,

          taskId:
            StudyTaskId,
        ) => boolean
      )(
        trialNumber,
        taskId,
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

      (
        setTrialCsvExportStatus as unknown as (
          trialNumber:
            StudyTrialNumber,

          exportType:
            "events" | "summary",

          status:
            "exporting" | "exported" | "failed",

          errorMessage?:
            string,

          taskId?:
            StudyTaskId,
        ) => boolean
      )(
        trialNumber,
        "events",
        "failed",
        errorMessage,
        taskId,
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

      (
        markTrialSummaryCsvExported as unknown as (
          trialNumber:
            StudyTrialNumber,

          taskId:
            StudyTaskId,
        ) => boolean
      )(
        trialNumber,
        taskId,
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

      (
        setTrialCsvExportStatus as unknown as (
          trialNumber:
            StudyTrialNumber,

          exportType:
            "events" | "summary",

          status:
            "exporting" | "exported" | "failed",

          errorMessage?:
            string,

          taskId?:
            StudyTaskId,
        ) => boolean
      )(
        trialNumber,
        "summary",
        "failed",
        errorMessage,
        taskId,
      );
    }

    if (
      eventsExported &&
      summaryExported
    ) {
      (
        markTrialQuestionnaireExported as unknown as (
          trialNumber:
            StudyTrialNumber,

          taskId:
            StudyTaskId,
        ) => ReturnType<
          typeof markTrialQuestionnaireExported
        >
      )(
        trialNumber,
        taskId,
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
        taskId,

        taskTitle:
          taskCopy.taskTitle,

        taskNumber:
          trialNumber,

        innerTaskNumber:
          trialNumber,

        globalTrialNumber,

        participantTaskNumber:
          getParticipantTaskNumber(
            trial,
          ),

        totalTrials:
          TOTAL_TRIALS,

        totalStudyTrials:
          TOTAL_STUDY_TRIALS,

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
          `/tasks/${taskId}`,
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
    !taskCopy ||
    !trial
  ) {
    return null;
  }

  const participantTaskNumber =
    getParticipantTaskNumber(
      trial,
    );

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
              (
                setNasaTlxValue as unknown as (
                  trialNumber:
                    StudyTrialNumber,

                  dimension:
                    typeof dimension,

                  value:
                    typeof value,

                  taskId:
                    StudyTaskId,
                ) => void
              )(
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
          description="Select one response on each 0 to 5 agreement scale."
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
                  min={0}
                  max={5}
                  required
                  onChange={(
                    value,
                  ) => {
                    (
                      setExperienceRating as unknown as (
                        trialNumber:
                          StudyTrialNumber,

                        dimension:
                          ExperienceDimension,

                        value:
                          LikertRating,

                        taskId:
                          StudyTaskId,
                      ) => void
                    )(
                      trialNumber,
                      question.id,
                      value as LikertRating,
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
                      min={0}
                      max={5}
                      required
                      onChange={(
                        value,
                      ) => {
                        (
                          setManipulationCheckValue as unknown as (
                            trialNumber:
                              StudyTrialNumber,

                            dimension:
                              ManipulationDimension,

                            value:
                              LikertRating,

                            taskId:
                              StudyTaskId,
                          ) => void
                        )(
                          trialNumber,
                          dimension,
                          value as LikertRating,
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
                        onChange={() => {
                          (setProbeRecallValue as unknown as (...args: unknown[]) => void)(
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
                  onChange={(event) => {
                    (setProbeRecallValue as unknown as (...args: unknown[]) => void)(
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
                        onChange={() => {
                          (setProbeRecallValue as unknown as (...args: unknown[]) => void)(
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
              min={0}
              max={5}
              required
              onChange={(value) => {
                (setProbeRecallValue as unknown as (...args: unknown[]) => void)(
                  trialNumber,
                  "recallConfidence",
                  value as LikertRating,
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
                        onChange={() => {
                          (setProbeRecallValue as unknown as (...args: unknown[]) => void)(
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