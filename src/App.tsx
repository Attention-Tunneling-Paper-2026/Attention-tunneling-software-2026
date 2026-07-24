import {
  Navigate,
  Route,
  Routes,
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

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/procedure"
            replace
          />
        }
      />

      <Route
        path="/procedure"
        element={
          <ProcedurePage />
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedStudyRoute stage="tasks">
            <TaskSelectionPage />
          </ProtectedStudyRoute>
        }
      />

      <Route
        path="/task/:trialNumber"
        element={
          <ProtectedStudyRoute stage="task">
            <TaskPage />
          </ProtectedStudyRoute>
        }
      />

      <Route
        path="/trial-questionnaire/:trialNumber"
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