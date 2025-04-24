import { useNavigate } from "react-router-dom";
import axios from "axios";
// import CsvUploader component 
import CsvUploader from "./CsvUploader";

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

  return (
    <div>
      <h2>Professor Dashboard</h2>
      <p>Welcome, Professor!</p>

      <h3>Upload Survey CSV</h3>

    {/* /* user my CsvUploader component  */ }
      <CsvUploader />

      <br />

      <button onClick={handleLogout}>Logout</button> 
    </div>
  );
};

export default ProfessorDashboard;
