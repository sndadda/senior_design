import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const CourseDetails = () => {
  const { sectionId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/professor/course-details/${sectionId}`, {
        withCredentials: true,
      })
      .then((res) => setCourseData(res.data))
      .catch((err) => console.error("Failed to fetch course details", err));
  }, [sectionId]);

  const handleCheckboxChange = (user_id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(user_id)
        ? prev.filter((id) => id !== user_id)
        : [...prev, user_id]
    );
  };

  const addTeam = () => {
    if (!teamName || selectedStudentIds.length === 0) return;
    setTeams((prev) => [
      ...prev,
      { team_name: teamName, student_ids: selectedStudentIds },
    ]);
    setTeamName("");
    setSelectedStudentIds([]);
  };

  const submitTeams = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/professor/assign-teams`,
        {
          section_id: sectionId,
          teams,
        },
        { withCredentials: true }
      );
      alert("Teams assigned successfully!");
      setTeams([]);
    } catch (err) {
      console.error(err);
      alert("Failed to assign teams.");
    }
  };

  if (!courseData) return <p>Loading course details...</p>;

  const { section, enrolled, pending } = courseData;

  return (
    <div>
      <h2>
        {section.course_name} - Section {section.section_num}
      </h2>
      <p>
        Term: {section.term}, Year: {section.year}
      </p>

      <h3>Enrolled Students</h3>
      <ul>
        {enrolled.map((s) => (
          <li key={s.user_id}>
            {s.first_name} {s.last_name} ({s.username})
          </li>
        ))}
      </ul>

      <h3>Pending Students</h3>
      <ul>
        {pending.map((s, index) => (
          <li key={index}>
            {s.first_name} {s.last_name} ({s.username})
          </li>
        ))}
      </ul>

      <hr />

      <h3>Assign Teams</h3>
      <input
        type="text"
        placeholder="Team Name"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />
      <ul>
        {enrolled.map((s) => (
          <li key={s.user_id}>
            <input
              type="checkbox"
              checked={selectedStudentIds.includes(s.user_id)}
              onChange={() => handleCheckboxChange(s.user_id)}
            />
            {s.first_name} {s.last_name}
          </li>
        ))}
      </ul>
      <button onClick={addTeam}>Add Team</button>

      {teams.length > 0 && (
        <>
          <h4>Teams Preview</h4>
          <ul>
            {teams.map((team, i) => (
              <li key={i}>
                {team.team_name} - {team.student_ids.length} students
              </li>
            ))}
          </ul>
          <button onClick={submitTeams}>Submit Teams</button>
        </>
      )}
    </div>
  );
};

export default CourseDetails;
