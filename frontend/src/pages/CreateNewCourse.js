import React, { useState } from "react";
import "./CreateCoursePage.css";

const CreateCoursePage = () => {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSection, setCourseSection] = useState("");
  const [students, setStudents] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [drexelID, setDrexelID] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);

  const handleAddStudent = () => {
    if (firstName && lastName && drexelID) {
      setStudents([...students, { firstName, lastName, drexelID }]);
      setFirstName("");
      setLastName("");
      setDrexelID("");
    }
  };

  const handleDeleteStudent = (index) => {
    const updated = [...students];
    updated.splice(index, 1);
    setStudents(updated);
  };

  const handleTeamCheckbox = (id) => {
    setSelectedTeamMembers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddTeam = () => {
    if (teamName && selectedTeamMembers.length > 0) {
      const members = students.filter((s) => selectedTeamMembers.includes(s.drexelID));
      setTeams([...teams, { name: teamName, members }]);
      setTeamName("");
      setSelectedTeamMembers([]);
    }
  };

  const handleDeleteTeam = (index) => {
    const updated = [...teams];
    updated.splice(index, 1);
    setTeams(updated);
  };

  return (
    <div className="course-container">
      <div className="top-buttons">
        <button>View Course Details</button>
        <button>Create New Course</button>
      </div>

      <h2>Create New Course</h2>

      {/* Course Info */}
      <label>Course Title *</label>
      <input
        type="text"
        value={courseTitle}
        onChange={(e) => setCourseTitle(e.target.value)}
      />

      <label>Course Section (optional)</label>
      <input
        type="text"
        value={courseSection}
        onChange={(e) => setCourseSection(e.target.value)}
      />

      {/* Add Students */}
      <h3>Add Students</h3>
      <div className="manual-add">
        <input
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          placeholder="Drexel ID"
          value={drexelID}
          onChange={(e) => setDrexelID(e.target.value)}
        />
        <button onClick={handleAddStudent}>Add Student</button>
      </div>

      <p>Or Import Students from CSV</p>
      <input type="file" onChange={(e) => setCsvFile(e.target.files[0])} />
      <button>Import CSV</button>

      {/* Student List */}
      <h3>Student List</h3>
      <table>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Drexel ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={i}>
              <td>{s.firstName}</td>
              <td>{s.lastName}</td>
              <td>{s.drexelID}</td>
              <td>
                <button onClick={() => handleDeleteStudent(i)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Team Creation */}
      <h3>Team Creation</h3>
      <input
        type="text"
        placeholder="Team Name"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />
      <div>
        {students.map((s) => (
          <div key={s.drexelID}>
            <label>
              <input
                type="checkbox"
                checked={selectedTeamMembers.includes(s.drexelID)}
                onChange={() => handleTeamCheckbox(s.drexelID)}
              />
              {`${s.firstName} ${s.lastName} (${s.drexelID})`}
            </label>
          </div>
        ))}
      </div>
      <button onClick={handleAddTeam}>Add Team</button>

      {/* Created Teams */}
      <h3>Created Teams</h3>
      <table>
        <thead>
          <tr>
            <th>Team Name</th>
            <th>Members</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => (
            <tr key={i}>
              <td>{team.name}</td>
              <td>
                <ul>
                  {team.members.map((m) => (
                    <li key={m.drexelID}>{`${m.firstName} ${m.lastName}`}</li>
                  ))}
                </ul>
              </td>
              <td>
                <button onClick={() => handleDeleteTeam(i)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="create-course-final">Create Course</button>
    </div>
  );
};

export default CreateCoursePage;