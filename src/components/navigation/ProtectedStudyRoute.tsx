import type {
  ReactNode,
} from "react";

import {
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router";

import {
  useStudySessionStore,
} from "../../store/studySessionStore";

import {
  TOTAL_STUDY_TRIALS,
  isStudyTaskId,
  isStudyTrialNumber,
} from "../../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../../types/scheduler";

import type {
  StudyTrialAssignment,
  StudyTrialProgress,
} from "../../types/study";

export type ProtectedStudyStage =
  | "tasks"
  | "task"
  | "trial-questionnaire"
  | "post-experiment"
  | "disclosure";

interface ProtectedStudyRouteProps {
  stage:
    ProtectedStudyStage;

  children?:
    ReactNode;

  /*
   * Retained only so older route declarations that pass this prop continue
   * to type-check. Study completion is always exactly three trials:
   * one Symposium, one Delivery, and one Clinic.
   */
  totalTrials?:
    number;
}

function trialMatchesAssignment(
  trial:
    StudyTrialProgress,

  assignment:
    StudyTrialAssignment,
): boolean {
  return (
    trial.taskId ===
      assignment.taskId &&
    trial.trialNumber ===
      assignment.trialNumber
  );
}

function allAssignedTrialsAreComplete(
  assignments:
    StudyTrialAssignment[],

  trials:
    StudyTrialProgress[],
): boolean {
  if (
    assignments.length !==
      TOTAL_STUDY_TRIALS ||
    trials.length !==
      TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  return assignments.every(
    (assignment) =>
      trials.some(
        (trial) =>
          trialMatchesAssignment(
            trial,
            assignment,
          ) &&
          trial.status ===
            "questionnaire_complete",
      ),
  );
}

export default function ProtectedStudyRoute({
  stage,
  children,
}: ProtectedStudyRouteProps) {
  const location =
    useLocation();

  const {
    taskId:
      taskIdParam,
    trialNumber:
      trialNumberParam,
  } = useParams<{
    taskId?:
      string;

    trialNumber?:
      string;
  }>();

  const participantToken =
    useStudySessionStore(
      (state) =>
        state.participantToken,
    );

  const assignmentStatus =
    useStudySessionStore(
      (state) =>
        state.assignmentStatus,
    );

  const assignments =
    useStudySessionStore(
      (state) =>
        state.assignments,
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

  const studyCompleted =
    useStudySessionStore(
      (state) =>
        state.studyCompleted,
    );

  const assignmentReady =
    assignmentStatus ===
      "valid" &&
    participantToken.length >
      0 &&
    assignments.length ===
      TOTAL_STUDY_TRIALS &&
    trials.length ===
      TOTAL_STUDY_TRIALS;

  const orderedAssignments =
    assignments
      .slice()
      .sort(
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
      );

  const routeTaskId:
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

  const routeTrialNumber:
    StudyTrialNumber | null =
      isStudyTrialNumber(
        parsedTrialNumber,
      )
        ? parsedTrialNumber
        : null;

  const routeTrial =
    routeTaskId ===
        null ||
      routeTrialNumber ===
        null
      ? undefined
      : trials.find(
          (trial) =>
            trial.taskId ===
              routeTaskId &&
            trial.trialNumber ===
              routeTrialNumber,
        );

  const routeAssignment =
    routeTaskId ===
        null ||
      routeTrialNumber ===
        null
      ? undefined
      : orderedAssignments.find(
          (assignment) =>
            assignment.taskId ===
              routeTaskId &&
            assignment.trialNumber ===
              routeTrialNumber,
        );

  const openTrial =
    trials.find(
      (trial) =>
        trial.status ===
          "active" ||
        trial.status ===
          "submitted",
    );

  const openAssignment =
    openTrial
      ? orderedAssignments.find(
          (assignment) =>
            trialMatchesAssignment(
              openTrial,
              assignment,
            ),
        )
      : undefined;

  const nextAssignment =
    orderedAssignments.find(
      (assignment) => {
        const matchingTrial =
          trials.find(
            (trial) =>
              trialMatchesAssignment(
                trial,
                assignment,
              ),
          );

        return matchingTrial?.status ===
          "pending";
      },
    );

  // ADVISER FIX: Protected routes follow only the open or next token assignment.
  const currentAssignment =
    openAssignment ??
    nextAssignment;

  const currentTrial =
    currentAssignment
      ? trials.find(
          (trial) =>
            trialMatchesAssignment(
              trial,
              currentAssignment,
            ),
        )
      : undefined;

  const allTrialsComplete =
    allAssignedTrialsAreComplete(
      orderedAssignments,
      trials,
    );

  const routeMatchesCurrentAssignment =
    Boolean(
      routeAssignment &&
      currentAssignment &&
      routeAssignment.taskId ===
        currentAssignment.taskId &&
      routeAssignment.trialNumber ===
        currentAssignment.trialNumber,
    );

  function renderRoute() {
    return (
      children ??
      <Outlet />
    );
  }

  function redirect(
    path:
      string,
  ) {
    return (
      <Navigate
        to={
          path
        }
        replace
        state={{
          redirectedFrom:
            location.pathname,
        }}
      />
    );
  }

  function getProcedurePath():
    string {
    const tokenFromQuery =
      new URLSearchParams(
        location.search,
      )
        .get(
          "token",
        )
        ?.trim() ??
      "";

    const token =
      participantToken.trim() ||
      tokenFromQuery;

    // ADVISER FIX: Preserve the validated token when a guard returns to procedure.
    return token
      ? `/procedure?token=${encodeURIComponent(
          token,
        )}`
      : "/procedure";
  }

  function getCurrentAssignedPath():
    string {
    if (
      !currentAssignment ||
      !currentTrial
    ) {
      return "/tasks";
    }

    if (
      currentTrial.status ===
      "submitted"
    ) {
      return `/trial-questionnaire/${currentAssignment.taskId}/${currentAssignment.trialNumber}`;
    }

    return `/task/${currentAssignment.taskId}/${currentAssignment.trialNumber}`;
  }

  function getResumePath():
    string {
    return openAssignment
      ? getCurrentAssignedPath()
      : "/tasks";
  }

  if (
    !procedureAccepted ||
    !assignmentReady
  ) {
    return redirect(
      getProcedurePath(),
    );
  }

  if (
    studyCompleted
  ) {
    return stage ===
      "disclosure"
      ? renderRoute()
      : redirect(
          "/disclosure",
        );
  }

  if (
    postExperimentCompleted
  ) {
    if (
      !allTrialsComplete
    ) {
      return redirect(
        getResumePath(),
      );
    }

    return stage ===
      "disclosure"
      ? renderRoute()
      : redirect(
          "/disclosure",
        );
  }

  if (
    stage ===
    "tasks"
  ) {
    if (
      taskIdParam !==
      undefined
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      allTrialsComplete
    ) {
      return redirect(
        "/post-experiment",
      );
    }

    if (
      openAssignment
    ) {
      return redirect(
        getCurrentAssignedPath(),
      );
    }

    return renderRoute();
  }

  if (
    stage ===
    "task"
  ) {
    if (
      allTrialsComplete
    ) {
      return redirect(
        "/post-experiment",
      );
    }

    if (
      routeTaskId ===
        null ||
      routeTrialNumber ===
        null ||
      !routeTrial ||
      !routeAssignment ||
      !routeMatchesCurrentAssignment
    ) {
      return redirect(
        getCurrentAssignedPath(),
      );
    }

    if (
      routeTrial.status ===
      "questionnaire_complete"
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      routeTrial.status ===
      "submitted"
    ) {
      return redirect(
        `/trial-questionnaire/${routeTaskId}/${routeTrialNumber}`,
      );
    }

    if (
      routeTrial.status !==
        "pending" &&
      routeTrial.status !==
        "active"
    ) {
      return redirect(
        getCurrentAssignedPath(),
      );
    }

    return renderRoute();
  }

  if (
    stage ===
    "trial-questionnaire"
  ) {
    if (
      allTrialsComplete
    ) {
      return redirect(
        "/post-experiment",
      );
    }

    if (
      routeTaskId ===
        null ||
      routeTrialNumber ===
        null ||
      !routeTrial ||
      !routeAssignment ||
      !routeMatchesCurrentAssignment
    ) {
      return redirect(
        getCurrentAssignedPath(),
      );
    }

    if (
      routeTrial.status ===
      "questionnaire_complete"
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      routeTrial.status ===
        "active" ||
      routeTrial.status ===
        "pending"
    ) {
      return redirect(
        `/task/${routeTaskId}/${routeTrialNumber}`,
      );
    }

    if (
      routeTrial.status !==
      "submitted"
    ) {
      return redirect(
        getCurrentAssignedPath(),
      );
    }

    return renderRoute();
  }

  if (
    stage ===
    "post-experiment"
  ) {
    if (
      !allTrialsComplete
    ) {
      return redirect(
        getResumePath(),
      );
    }

    return renderRoute();
  }

  if (
    stage ===
    "disclosure"
  ) {
    if (
      !allTrialsComplete
    ) {
      return redirect(
        getResumePath(),
      );
    }

    return redirect(
      "/post-experiment",
    );
  }

  return redirect(
    "/tasks",
  );
}
