import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const CourseDetails = () => {
  const { sectionId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [newStudent, setNewStudent] = useState({ username: "", first_name: "", last_name: "" });
  const [existingTeams, setExistingTeams] = useState([]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/course-details/${sectionId}`, {
          withCredentials: true,
        });
        setCourseData(res.data);
      } catch (err) {
        console.error("Failed to fetch course details", err);
      }
    };

    const fetchTeams = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/teams/${sectionId}`, {
          withCredentials: true,
        });
        setExistingTeams(res.data);
      } catch (err) {
        console.error("Failed to fetch existing teams", err);
      }
    };

    fetchCourse();
    fetchTeams();
  }, [sectionId]);

  const handleCheckboxChange = (user_id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(user_id) ? prev.filter((id) => id !== user_id) : [...prev, user_id]
    );
  };

  const addTeam = () => {
    if (!teamName || selectedStudentIds.length === 0) return;
    setTeams((prev) => [...prev, { team_name: teamName, student_ids: selectedStudentIds }]);
    setTeamName("");
    setSelectedStudentIds([]);
  };

  const handleAddStudent = async () => {
    if (!newStudent.username || !newStudent.first_name || !newStudent.last_name) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/professor/add-student`, {
        section_id: sectionId,
        ...newStudent,
      }, { withCredentials: true });

      alert("Student added");
      setNewStudent({ username: "", first_name: "", last_name: "" });

      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/course-details/${sectionId}`, {
        withCredentials: true,
      });
      setCourseData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to add student.");
    }
  };

  const handleRemoveStudent = async (user_id) => {
    if (!window.confirm("Are you sure you want to remove this student?")) return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/professor/remove-student`, {
        section_id: sectionId,
        user_id,
      }, { withCredentials: true });

      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/course-details/${sectionId}`, {
        withCredentials: true,
      });
      setCourseData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to remove student.");
    }
  };

  const submitTeams = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/professor/assign-teams`, {
        section_id: sectionId,
        teams,
      }, { withCredentials: true });

      alert("Teams assigned successfully!");
      setTeams([]);

      // Refresh team list
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/teams/${sectionId}`, {
        withCredentials: true,
      });
      setExistingTeams(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to assign teams.");
    }
  };
  
  const handleRemoveMember = async (team_id, user_id) => {
  if (!window.confirm("Remove this student from the team?")) return;

  try {
    await axios.post(`${process.env.REACT_APP_API_URL}/api/professor/remove-team-member`, {
      team_id,
      user_id,
    }, { withCredentials: true });

    const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/professor/teams/${sectionId}`, {
      withCredentials: true,
    });
    setExistingTeams(res.data);
  } catch (err) {
    console.error(err);
    alert("Failed to remove team member.");
  }
};


  

  if (!courseData) return <p>Loading course details...</p>;

  const { section, enrolled, pending } = courseData;

  return (
    <div>
      <h2>{section.course_name} - Section {section.section_num}</h2>
      <p>Term: {section.term}, Year: {section.year}</p>

      <h3>Enrolled Students</h3>
      <ul className="student-list">
        {enrolled.map((s) => (
          <li key={s.user_id}>
            {s.first_name} {s.last_name} ({s.username}){" "}
            <button onClick={() => handleRemoveStudent(s.user_id)}>Remove</button>
          </li>
        ))}
      </ul>

      <h4>Add Student</h4>
      <input
        type="text"
        placeholder="Username"
        value={newStudent.username}
        onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
      />
      <input
        type="text"
        placeholder="First Name"
        value={newStudent.first_name}
        onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
      />
      <input
        type="text"
        placeholder="Last Name"
        value={newStudent.last_name}
        onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
      />
      <button onClick={handleAddStudent}>Add Student</button>

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

      <hr />

      <h3>Existing Teams</h3>
      {existingTeams.length === 0 ? (
        <p>No teams assigned yet.</p>
      ) : (
        existingTeams.map((team) => (
          <div key={team.team_id}>
            <h4>{team.team_name}</h4>
            <ul>
              {team.members.map((member) => (
                <li key={member.user_id}>
                  {member.first_name} {member.last_name} ({member.username}){" "}
				  <button onClick={() => handleRemoveMember(team.team_id, member.user_id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default CourseDetails;
