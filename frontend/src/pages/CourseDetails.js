import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const CourseDetails = () => {
  const { sectionId } = useParams();
  const [courseData, setCourseData] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/professor/course-details/${sectionId}`, { withCredentials: true })
      .then(res => setCourseData(res.data))
      .catch(err => console.error("Failed to fetch course details", err));
  }, [sectionId]);

  if (!courseData) return <p>Loading course details...</p>;

  const { section, enrolled, pending } = courseData;

  return (
    <div>
      <h2>{section.course_name} - Section {section.section_num}</h2>
      <p>Term: {section.term}, Year: {section.year}</p>

      <h3>Enrolled Students</h3>
      <ul>
        {enrolled.map((s) => (
          <li key={s.user_id}>{s.first_name} {s.last_name} ({s.username})</li>
        ))}
      </ul>

      <h3>Pending Students</h3>
      <ul>
        {pending.map((s, index) => (
          <li key={index}>{s.first_name} {s.last_name} ({s.username})</li>
        ))}
      </ul>
    </div>
  );
};

export default CourseDetails;
