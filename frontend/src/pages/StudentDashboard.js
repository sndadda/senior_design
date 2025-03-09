import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentDashboard.css"; // Import styles 

const StudentDashboard = ({ setUser }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      navigate("/"); // Redirect to login after logout
    }
  };

  return (
    <div className="dashboard-container">
      {/* 🔹 Fixed Navigation Bar */}
      <nav className="dashboard-nav">
        <img src="/logo.png" alt="Logo" className="logo" />
        <div className="nav-links">
          <button onClick={() => navigate("/surveys")}>Surveys</button>
          <button onClick={() => navigate("/report")}>Report</button>
        </div>
        <div className="user-dropdown">
          <span>John Doe ▼</span>
        </div>
      </nav>

      {/* 🔹 Welcome Message & Logout */}
      <div className="dashboard-header">
        <h2>Student Dashboard</h2>
        <p>Welcome, student!</p>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* 🔹 Survey Performance Section (Now Centered) */}
      <div className="performance-section">
        <h3>Survey Performance</h3>
        <p>Select a course to view your survey performance over time:</p>

        <select className="course-select">
          <option value="course1">Course 1</option>
          <option value="course2">Course 2</option>
        </select>

        <button className="generate-graph-btn">Generate Graph</button>

        <div className="graph-placeholder">
          <p>[Graph Placeholder]</p>
        </div>

        <h4>Overall Average Score: <span>84.78</span></h4>
        <h4>Student Feedback:</h4>
        <ul>
          <li>Great collaborator and always offers insightful comments.</li>
          <li>Shows consistent improvement and is a pleasure to work with.</li>
          <li>Needs to communicate more clearly at times, but overall performs well.</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentDashboard;
