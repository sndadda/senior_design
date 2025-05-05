import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router-dom";

const ProfessorDashboard = ({ setUser }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/professor/my-courses`, { withCredentials: true })
      .then(res => setCourses(res.data))
      .catch(err => console.error("Failed to fetch courses", err));
  }, []);

  const handleLogout = async () => {
    await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {}, { withCredentials: true });
    setUser(null);
    navigate("/");
  };

  return (
    <div>
      <h2>Professor Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>
      <h3>My Courses</h3>
      <ul>
        {courses.map((c, index) => (
          <li key={index}>
            <Link to={`/professor/course/${c.section_id}`}>
              {c.course_name} - Section {c.section_num} ({c.term} {c.year})
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProfessorDashboard;
