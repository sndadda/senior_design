import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfessorDashboard.css"; // Import styles

const ProfessorDashboard = ({ setUser }) => {  // Get setUser from props
  const navigate = useNavigate();

  // Handle logout logic
  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      navigate("/");  // Redirect to login after logout
    }
  };

  // Navigate to survey creation page
  const handleNavigateToEvaluation = () => {
    navigate("/professor_survey_creation");
  };

  // Navigate to course creation page
  const handleNavigateToCourseCreation = () => {
    navigate("/course_creation");
  };

  // Navigate to grades page
  const handleNavigateToGrades = () => {
    navigate("/grades");
  };

  return (
    <div>
      <h2>Professor Dashboard</h2>
      <p>Welcome, professor!</p>
      
      {/* Navigate to survey creation page */}
      <button className="evaluation-btn" onClick={handleNavigateToEvaluation}>
        Create Evaluation Survey
      </button>

      {/* Navigate to course creation page */}
      <button className="course-creation-btn" onClick={handleNavigateToCourseCreation}>
        Course Creation
      </button>

      {/* Navigate to grades page */}
      <button className="grades-btn" onClick={handleNavigateToGrades}>
        Grades
      </button>

      {/* Logout button */}
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default ProfessorDashboard;
