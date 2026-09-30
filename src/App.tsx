import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";

import ProtectedStudyRoute from "./components/navigation/ProtectedStudyRoute.tsx";

import DisclosurePage from "./pages/DisclosurePage.tsx";
import PostExperimentPage from "./pages/PostExperimentPage.tsx";
import ProcedurePage from "./pages/ProcedurePage.tsx";
import TaskPage from "./pages/TaskPage.tsx";
import TaskSelectionPage from "./pages/TaskSelectionPage.tsx";
import TrialQuestionnairePage from "./pages/TrialQuestionnairePage.tsx";

import "./styles/studyPages.css";
import "./styles/forms.css";


function ProcedureRedirect() {
  const { search } = useLocation();

  return (
    <Navigate
      to={{
        pathname: "/procedure",
        search,
      }}
      replace
    />
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<ProcedureRedirect />}
      />

      <Route
        path="/procedure"
        element={<ProcedurePage />}
      />

      <Route
        path="/tasks"
        element={
          <ProtectedStudyRoute stage="tasks">
            <TaskSelectionPage />
          </ProtectedStudyRoute>
        }
      />

      {/* ADVISER FIX: The manual task/condition-selection route is retired. */}
      <Route
        path="/task/:taskId/:trialNumber"
        element={
          <ProtectedStudyRoute stage="task">
            <TaskPage />
          </ProtectedStudyRoute>
        }
      />

      <Route
        path="/trial-questionnaire/:taskId/:trialNumber"
        element={
          <ProtectedStudyRoute stage="trial-questionnaire">
            <TrialQuestionnairePage />
          </ProtectedStudyRoute>
        }
      />

      <Route
        path="/post-experiment"
        element={
          <ProtectedStudyRoute stage="post-experiment">
            <PostExperimentPage />
          </ProtectedStudyRoute>
        }
      />

      <Route
        path="/disclosure"
        element={
          <ProtectedStudyRoute stage="disclosure">
            <DisclosurePage />
          </ProtectedStudyRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/procedure"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
