import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import StudentEvaluation from "./pages/StudentEvaluation";
import EvaluationResults from "./pages/EvaluationResults";
import ProfessorSurveyCreation from "./pages/ProfessorSurveyCreation";
import ProfessorGrades from "./pages/ProfessorGrades";
import Navbar from "./components/Navbar";
import VerifyEmail from "./pages/VerifyEmail";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // check if the user is already logged in
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/user`, {
          withCredentials: true, // ensures the cookie is sent
        });
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <div className="page-container">
        <Routes>
          <Route path="/" element={user ? <Navigate to={`/${user.role}_dashboard`} /> : <Login setUser={setUser} />} />
          <Route path="/signup" element={user ? <Navigate to={`/${user.role}_dashboard`} /> : <Signup />} />
          <Route path="/student_dashboard" element={user?.role === "student" ? <StudentDashboard setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/student_evaluation" element={user?.role === "student" ? <StudentEvaluation setUser={setUser} /> : <Navigate to="/" />} />    
          <Route path="/evaluation_results" element={user?.role === "student" ? <EvaluationResults setUser={setUser} /> : <Navigate to="/" />} />    
          <Route path="/professor_dashboard" element={user?.role === "professor" ? <ProfessorDashboard setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/professor_grades" element={user?.role === "professor" ? <ProfessorGrades setUser={setUser} /> : <Navigate to="/" />} />
		      <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/professor_survey_creation" element={user?.role === "professor" ? <ProfessorSurveyCreation setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
