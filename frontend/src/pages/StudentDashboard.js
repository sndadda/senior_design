import { useNavigate } from "react-router-dom";
import axios from "axios";

<<<<<<< HEAD
const StudentDashboard = ({ setUser }) => {
=======
const StudentDashboard = ({ setUser }) => {  // get setUser from props
>>>>>>> origin/prof-verif
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
<<<<<<< HEAD
      navigate("/");
    }
  };

  // navigate to student_evaluation page
  const handleNavigateToEvaluation = () => {
    navigate("/student_evaluation");
  };

=======
      navigate("/");  // redirect to login after logout
    }
  };

>>>>>>> origin/prof-verif
  return (
    <div>
      <h2>Student Dashboard</h2>
      <p>Welcome, student!</p>
<<<<<<< HEAD
      <button onClick={handleLogout}>Logout</button>
      <button onClick={handleNavigateToEvaluation}>Go to Evaluation</button>
=======
      <button onClick={handleLogout}>Logout</button> 
>>>>>>> origin/prof-verif
    </div>
  );
};

export default StudentDashboard;
<<<<<<< HEAD

=======
>>>>>>> origin/prof-verif
