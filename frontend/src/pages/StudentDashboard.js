import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import Navbar from "../components/Navbar";
import axios from "axios";
import "./StudentDashboard.css"; // Import styles

const StudentDashboard = ({ setUser }) => {
  const navigate = useNavigate();
  const [user, setUserData] = useState({ first_name: "Student", last_name: "" });

  useEffect(() => {
    // Fetch current user details
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/user`, {
          withCredentials: true,
        });
        setUserData(response.data);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    fetchUserData();
  }, []);
  
  // eslint-disable-next-line no-unused-vars
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
      if (setUser) setUser(null);
      navigate("/");
    }
  };

  // Navigate to student evaluation page
  const handleNavigateToEvaluation = () => {
    navigate("/student_evaluation");
  };

    // Navigate to student grades page
  const handleNavigateToStudentGrades = () => {
    navigate("/evaluation_results");
  };

  return (
    <div className="dashboard-container">
      

      {/* 🔹 Welcome Message & Logout */}
      <div className="dashboard-header">
        <h2>Student Dashboard</h2>
        <p>Welcome, {user.first_name}!</p>
  
      </div>

      {/* 🔹 Survey Performance Section */}
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
      </div>

      {/* 🔹 Navigate to Evaluation Button */}
      <button className="evaluation-btn" onClick={handleNavigateToEvaluation}>Go to Evaluation</button>

      {/* Navigate to Evaluation Results */}
      <button className="stu-grade-btn" onClick={handleNavigateToStudentGrades}>Go to Evaluation Results</button>
    </div>
  );
};

export default StudentDashboard;
