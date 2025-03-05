import { useNavigate } from "react-router-dom";
import axios from "axios";

const StudentDashboard = ({ setUser }) => {  // get setUser from props
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

  return (
    <div>
      <h2>Student Dashboard</h2>
      <p>Welcome, student!</p>
      <button onClick={handleLogout}>Logout</button> 
    </div>
  );
};

export default StudentDashboard;
