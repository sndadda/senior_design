import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfessorDashboard.css"; // Import styles

const ProfessorDashboard = ({ setUser }) => {  // get setUser from props
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      navigate("/");  // redirect to login after logout
    }
  };

  const handleNavigateToEvaluation = () => {
    navigate("/professor_survey_creation");
  };

  return (
    <div>
      <h2>Professor Dashboard</h2>
      <p>Welcome, professor!</p>
      
      {/*Navigate to Survey Creation Page */}
      <button className="evaluation-btn" onClick={handleNavigateToEvaluation}>Create Eavluation Survey</button>
      <button onClick={handleLogout}>Logout</button> 
    </div>
  );
};

export default ProfessorDashboard;
