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
  STUDY_TASK_IDS,
  TOTAL_STUDY_TRIALS,
  isStudyTaskId,
  isStudyTrialNumber,
} from "../../types/scheduler";

import type {
  StudyTaskId,
  StudyTrialNumber,
} from "../../types/scheduler";

import type {
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

function getTrialTaskId(
  trial: unknown,
): StudyTaskId | null {
  if (
    typeof trial !==
      "object" ||
    trial === null ||
    !("taskId" in trial)
  ) {
    return null;
  }

  const taskId =
    (
      trial as {
        taskId?: unknown;
      }
    ).taskId;

  return isStudyTaskId(
    taskId,
  )
    ? taskId
    : null;
}

function hasExactlyOneCompletedTrialPerTask(
  trials:
    StudyTrialProgress[],
): boolean {
  const completedTrials =
    trials.filter(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    );

  if (
    completedTrials.length !==
    TOTAL_STUDY_TRIALS
  ) {
    return false;
  }

  const hasEachTaskExactlyOnce =
    STUDY_TASK_IDS.every(
      (taskId) =>
        completedTrials.filter(
          (trial) =>
            getTrialTaskId(
              trial,
            ) ===
            taskId,
        ).length ===
        1,
    );

  return hasEachTaskExactlyOnce;
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
            getTrialTaskId(
              trial,
            ) ===
              routeTaskId &&
            trial.trialNumber ===
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

  const openTrialTaskId =
    openTrial
      ? getTrialTaskId(
          openTrial,
        )
      : null;

  const allTrialsComplete =
    hasExactlyOneCompletedTrialPerTask(
      trials,
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

  function getTaskSelectionPath(
    taskId:
      StudyTaskId | null,
  ): string {
    return taskId
      ? `/tasks/${taskId}`
      : "/tasks";
  }

  function getOpenTrialPath():
    string {
    if (
      !openTrial ||
      !openTrialTaskId
    ) {
      return "/tasks";
    }

    if (
      openTrial.status ===
      "submitted"
    ) {
      return `/trial-questionnaire/${openTrialTaskId}/${openTrial.trialNumber}`;
    }

    return `/task/${openTrialTaskId}/${openTrial.trialNumber}`;
  }

  if (
    !procedureAccepted
  ) {
    return redirect(
      "/procedure",
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
        getOpenTrialPath(),
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
        undefined &&
      routeTaskId ===
        null
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
      openTrial
    ) {
      return redirect(
        getOpenTrialPath(),
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
        null
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      routeTrialNumber ===
        null ||
      !routeTrial
    ) {
      return redirect(
        getTaskSelectionPath(
          routeTaskId,
        ),
      );
    }

    if (
      routeTrial.status ===
      "questionnaire_complete"
    ) {
      return redirect(
        getTaskSelectionPath(
          routeTaskId,
        ),
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
      "active"
    ) {
      return redirect(
        getTaskSelectionPath(
          routeTaskId,
        ),
      );
    }

    const openTrialIsDifferent =
      Boolean(
        openTrial,
      ) &&
      (
        openTrialTaskId !==
          routeTaskId ||
        openTrial?.trialNumber !==
          routeTrialNumber
      );

    if (
      openTrialIsDifferent
    ) {
      return redirect(
        getOpenTrialPath(),
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
        null
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      routeTrialNumber ===
        null ||
      !routeTrial
    ) {
      return redirect(
        getTaskSelectionPath(
          routeTaskId,
        ),
      );
    }

    if (
      routeTrial.status ===
      "questionnaire_complete"
    ) {
      return redirect(
        getTaskSelectionPath(
          routeTaskId,
        ),
      );
    }

    if (
      routeTrial.status ===
      "active"
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
        getTaskSelectionPath(
          routeTaskId,
        ),
      );
    }

    const openTrialIsDifferent =
      Boolean(
        openTrial,
      ) &&
      (
        openTrialTaskId !==
          routeTaskId ||
        openTrial?.trialNumber !==
          routeTrialNumber
      );

    if (
      openTrialIsDifferent
    ) {
      return redirect(
        getOpenTrialPath(),
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
        getOpenTrialPath(),
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
        getOpenTrialPath(),
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
