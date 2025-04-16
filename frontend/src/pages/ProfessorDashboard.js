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

const ProfessorDashboard = ({ setUser }) => {
  const navigate = useNavigate();
  const [chartData, setChartData] = useState(null);

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

  // Navigate to other pages
  const handleNavigateToEvaluation = () => navigate("/professor_survey_creation");
  const handleNavigateToCourseCreation = () => navigate("/course_creation");
  const handleNavigateToGrades = () => navigate("/grades");

  // Fetch chart data from backend (replace URL when ready)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Replace this endpoint with your real backend API
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/survey-averages`);
        const backendData = response.data; // Expecting { labels: [], scores: [] }

        setChartData({
          labels: backendData.labels,
          datasets: [
            {
              label: "Average Score",
              data: backendData.scores,
              borderColor: "#2c6bed",
              backgroundColor: "rgba(44, 107, 237, 0.2)",
              tension: 0.4,
            },
          ],
        });
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
        // Use fallback static data
        setChartData({
          labels: ["Survey 1", "Survey 2", "Survey 3"],
          datasets: [
            {
              label: "Average Score",
              data: [78, 85, 90],
              borderColor: "#2c6bed",
              backgroundColor: "rgba(44, 107, 237, 0.2)",
              tension: 0.4,
            },
          ],
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
    <div>
      <h2>Professor Dashboard</h2>
      <p>Welcome, professor!</p>

      {/* Navigate to other tools */}
      <button className="evaluation-btn" onClick={handleNavigateToEvaluation}>
        Create Evaluation Survey
      </button>
      <button className="course-creation-btn" onClick={handleNavigateToCourseCreation}>
        Course Creation
      </button>
      <button className="grades-btn" onClick={handleNavigateToGrades}>
        Grades
      </button>

      {/* Logout button */}
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>

      {/* Chart Section */}
      <div className="chart-section">
        <h3>Survey Performance Overview</h3>
        {chartData ? <Line data={chartData} options={chartOptions} /> : <p>Loading chart...</p>}
      </div>
    </div>
  );
};

export default ProfessorDashboard;
