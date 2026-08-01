import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
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

import {
  downloadCsv,
} from "../utils/csvExport";

const TOTAL_TRIALS =
  3;

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