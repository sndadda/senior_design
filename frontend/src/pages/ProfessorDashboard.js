import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./ProfessorDashboard.css"; // Import styles

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ProfessorDashboard = ({ setUser }) => {  // Get setUser from props
  const navigate = useNavigate();
  const [chartData, setChartData] = useState(null);

  // Dropdown state
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedSurveyType, setSelectedSurveyType] = useState("");

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
    navigate("/professor_grades");
  };

  // Fetch chart data from backend (placeholder API for now)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/survey-averages`);
        const backendData = response.data;

        setChartData({
          labels: backendData.labels,
          datasets: [{
            label: "Average Score",
            data: backendData.scores,
            borderColor: "#2c6bed",
            backgroundColor: "rgba(44, 107, 237, 0.2)",
            tension: 0.4,
          }],
        });
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
        // Fallback data for testing
        setChartData({
          labels: ["Survey 1", "Survey 2", "Survey 3"],
          datasets: [{
            label: "Average Score",
            data: [78, 85, 90],
            borderColor: "#2c6bed",
            backgroundColor: "rgba(44, 107, 237, 0.2)",
            tension: 0.4,
          }],
        });
      }
    };

    fetchData();
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Average Evaluation Scores Over Time" },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <div className="professor-dashboard">
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

      {/* Dropdown Filters */}
      <div className="grades-filters">
        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
          <option value="">Select Course</option>
          <option value="CS461">CS461</option>
          <option value="CS350">CS350</option>
        </select>

        <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
          <option value="">Select Term</option>
          <option value="Fall 24-25">Fall 24-25</option>
          <option value="Spring 24">Spring 24</option>
        </select>

        <select value={selectedSurveyType} onChange={(e) => setSelectedSurveyType(e.target.value)}>
          <option value="">Select Survey</option>
          <option value="Midterm">Midterm</option>
          <option value="Final">Final</option>
        </select>
      </div>

      {/* Chart Section */}
      <div className="chart-section">
        <h3>Survey Performance Overview</h3>
        {chartData ? <Line data={chartData} options={chartOptions} /> : <p>Loading chart...</p>}
      </div>
    </div>
  );
};

export default ProfessorDashboard;
