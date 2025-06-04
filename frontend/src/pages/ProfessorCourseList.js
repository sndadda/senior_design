import { useEffect, useState } from "react";
import axios from "axios";
import "./ProfessorCourseList.css";

const ProfessorCourseList = ({ setUser }) => {
  const [viewMode, setViewMode] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [sectionNum, setSectionNum] = useState("");
  const [term, setTerm] = useState("Fall");
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState("");

  // Students to be added
  const [students, setStudents] = useState([]);
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentUsername, setStudentUsername] = useState("");

  const handleAddStudent = () => {
    if (studentFirstName && studentLastName && studentUsername) {
      setStudents([
        ...students,
        {
          first_name: studentFirstName,
          last_name: studentLastName,
          username: studentUsername,
        },
      ]);
      setStudentFirstName("");
      setStudentLastName("");
      setStudentUsername("");
    }
  };

  const handleCreateCourse = async () => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/professor/create-course`,
        {
          course_name: courseTitle,
          section_num: parseInt(sectionNum),
          term,
          year,
          students, // 👈 include student list in request
        },
        { withCredentials: true }
      );

      setMessage(res.data.message);
      setCourseTitle("");
      setSectionNum("");
      setStudents([]);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error creating course.");
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/my-courses`, {
        withCredentials: true,
      });
      setCourses(res.data);
    } catch (err) {
      setMessage("Failed to load courses.");
    }
  };

  useEffect(() => {
    if (viewMode === "view") fetchCourses();
  }, [viewMode]);

  return (
    <div className="course-container">
      <h2>Professor Course List</h2>
      <div className="button-group">
        <button onClick={() => setViewMode("view")}>📋 View My Courses</button>
        <button onClick={() => setViewMode("create")}>➕ Create New Course</button>
      </div>

      {viewMode === "create" && (
        <div className="create-course-form">
          <input
            type="text"
            placeholder="Course Title"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
          />
          <input
            type="number"
            placeholder="Section Number"
            value={sectionNum}
            onChange={(e) => setSectionNum(e.target.value)}
          />
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>Fall</option>
            <option>Winter</option>
            <option>Spring</option>
            <option>Summer</option>
          </select>
          <input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />

          <h4>Add Students</h4>
          <input
            type="text"
            placeholder="First Name"
            value={studentFirstName}
            onChange={(e) => setStudentFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={studentLastName}
            onChange={(e) => setStudentLastName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Drexel Username (e.g. abc123)"
            value={studentUsername}
            onChange={(e) => setStudentUsername(e.target.value)}
          />
          <button onClick={handleAddStudent}>Add Student</button>

          <ul>
            {students.map((s, idx) => (
              <li key={idx}>
                {s.first_name} {s.last_name} ({s.username})
              </li>
            ))}
          </ul>

          <button onClick={handleCreateCourse}>Create Course</button>
        </div>
      )}

      {viewMode === "view" && (
        <div className="course-list">
          {courses.length === 0 ? (
            <p>No courses found.</p>
          ) : (
            courses.map((course, idx) => (
              <div key={idx} className="course-card">
                <strong>{course.course_name}</strong><br />
                Section {course.section_num} - {course.term} {course.year}
              </div>
            ))
          )}
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default ProfessorCourseList;
