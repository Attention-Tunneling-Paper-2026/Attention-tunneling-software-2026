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
  isStudyTrialNumber,
} from "../../types/scheduler";

import type {
  StudyTrialNumber,
} from "../../types/scheduler";

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

  totalTrials?:
    number;
}

export default function ProtectedStudyRoute({
  stage,
  children,
  totalTrials = 3,
}: ProtectedStudyRouteProps) {
  const location =
    useLocation();

  const {
    trialNumber:
      trialNumberParam,
  } = useParams<{
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
    routeTrialNumber ===
    null
      ? undefined
      : trials.find(
          (trial) =>
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

  const completedTrialCount =
    trials.filter(
      (trial) =>
        trial.status ===
        "questionnaire_complete",
    ).length;

  const allTrialsComplete =
    trials.length ===
      totalTrials &&
    completedTrialCount ===
      totalTrials;

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

  if (
    !procedureAccepted
  ) {
    return redirect(
      "/procedure",
    );
  }

  if (
    studyCompleted ||
    postExperimentCompleted
  ) {
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
    return renderRoute();
  }

  if (
    stage ===
    "task"
  ) {
    if (
      routeTrialNumber ===
        null ||
      !routeTrial
    ) {
      return redirect(
        "/tasks",
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
        `/trial-questionnaire/${routeTrialNumber}`,
      );
    }

    if (
      routeTrial.status !==
      "active"
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      openTrial &&
      openTrial.trialNumber !==
        routeTrialNumber
    ) {
      if (
        openTrial.status ===
        "submitted"
      ) {
        return redirect(
          `/trial-questionnaire/${openTrial.trialNumber}`,
        );
      }

      return redirect(
        `/task/${openTrial.trialNumber}`,
      );
    }

    return renderRoute();
  }

  if (
    stage ===
    "trial-questionnaire"
  ) {
    if (
      routeTrialNumber ===
        null ||
      !routeTrial
    ) {
      return redirect(
        "/tasks",
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
      "active"
    ) {
      return redirect(
        `/task/${routeTrialNumber}`,
      );
    }

    if (
      routeTrial.status !==
      "submitted"
    ) {
      return redirect(
        "/tasks",
      );
    }

    if (
      openTrial &&
      openTrial.trialNumber !==
        routeTrialNumber
    ) {
      if (
        openTrial.status ===
        "submitted"
      ) {
        return redirect(
          `/trial-questionnaire/${openTrial.trialNumber}`,
        );
      }

      return redirect(
        `/task/${openTrial.trialNumber}`,
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
      if (
        openTrial?.status ===
        "submitted"
      ) {
        return redirect(
          `/trial-questionnaire/${openTrial.trialNumber}`,
        );
      }

      if (
        openTrial?.status ===
        "active"
      ) {
        return redirect(
          `/task/${openTrial.trialNumber}`,
        );
      }

      return redirect(
        "/tasks",
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
        "/tasks",
      );
    }

    if (
      !postExperimentCompleted
    ) {
      return redirect(
        "/post-experiment",
      );
    }

    return renderRoute();
  }

  return redirect(
    "/tasks",
  );
}