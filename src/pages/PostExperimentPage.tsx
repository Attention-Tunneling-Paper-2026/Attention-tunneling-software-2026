import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  useNavigate,
} from "react-router";

import DebriefForm from "../components/forms/DebriefForm";

import type {
  DebriefFormValues,
} from "../components/forms/DebriefForm";

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

import type {
  StudyTrialProgress,
} from "../types/study";

import {
  downloadCsv,
} from "../utils/csvExport";

const TOTAL_TASKS =
  3;

const TRIALS_PER_TASK =
  3;

const TOTAL_STUDY_TRIALS =
  TOTAL_TASKS *
  TRIALS_PER_TASK;

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
      TOTAL_STUDY_TRIALS
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
      TOTAL_STUDY_TRIALS
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
      TOTAL_STUDY_TRIALS
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
      TOTAL_STUDY_TRIALS
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

        return (
          taskTrials.length ===
            TRIALS_PER_TASK &&
          taskTrials.every(
            (trial) =>
              trial.status ===
              "questionnaire_complete",
          )
        );
      },
    ).length;

  const allTrialsComplete =
    trials.length ===
      TOTAL_STUDY_TRIALS &&
    completedTrialCount ===
      TOTAL_STUDY_TRIALS &&
    completedTaskCount ===
      TOTAL_TASKS;

  const orderedTrials =
    useMemo(
      () =>
        [...trials].sort(
          (
            first,
            second,
          ) =>
            getGlobalTrialNumber(
              first,
            ) -
            getGlobalTrialNumber(
              second,
            ),
        ),
      [trials],
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
      `${safeParticipantId}_post_experiment_questionnaire.csv`;

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
            Please answer the following questions based on
            your overall experience.
          </p>
        </section>

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
            Your final responses will be recorded and one
            post-experiment questionnaire CSV file will be
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