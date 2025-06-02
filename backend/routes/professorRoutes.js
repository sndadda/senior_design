const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("../middleware/authenticateToken");

router.get("/my-courses", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.course_name, s.section_num, s.term, s.year
      FROM Section s
      JOIN Course c ON s.course_num = c.course_num
      JOIN SectionProfessors sp ON sp.section_id = s.section_id
      WHERE sp.user_id = $1
    `, [req.user.user_id]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

router.post("/create-course", authenticateToken, async (req, res) => {
  const { course_name, section_num, term, year, students = [] } = req.body;

  try {
    const courseNum = course_name.toLowerCase().replace(/\s+/g, "_");

    await pool.query(
      "INSERT INTO Course (course_num, course_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [courseNum, course_name]
    );

    const section = await pool.query(
      `INSERT INTO Section (course_num, term, year, section_num)
       VALUES ($1, $2, $3, $4) RETURNING section_id`,
      [courseNum, term, year, section_num]
    );

    const sectionId = section.rows[0].section_id;

    await pool.query(
      "INSERT INTO SectionProfessors (section_id, user_id) VALUES ($1, $2)",
      [sectionId, req.user.user_id]
    );

    for (const student of students) {
      const { username, first_name, last_name } = student;

      const existing = await pool.query(
        "SELECT user_id FROM Users WHERE username = $1 AND role = 'student'",
        [username]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          "INSERT INTO Enrollments (stud_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [existing.rows[0].user_id, sectionId]
        );
      } else {
        await pool.query(
          `INSERT INTO PendingStudents (section_id, username, first_name, last_name)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [sectionId, username, first_name, last_name]
        );
      }
    }

    res.json({ message: "Course created with students!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating course" });
  }
});




router.post("/add-student", authenticateToken, async (req, res) => {
  const { section_id, username, first_name, last_name } = req.body;

  if (!section_id || !username || !first_name || !last_name) {
    return res.status(400).json({ message: "Missing fields." });
  }

  try {
    const existing = await pool.query(
      "SELECT user_id FROM Users WHERE username = $1 AND role = 'student'",
      [username]
    );

    if (existing.rows.length > 0) {
      // Enroll directly
      await pool.query(
        "INSERT INTO Enrollments (stud_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [existing.rows[0].user_id, section_id]
      );
      return res.json({ message: "Student enrolled successfully." });
    } else {
      // Add to pending
      await pool.query(
        `INSERT INTO PendingStudents (section_id, username, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [section_id, username, first_name, last_name]
      );
      return res.json({ message: "Student added to pending list." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error adding student." });
  }
});


router.get("/course-details/:section_id", authenticateToken, async (req, res) => {
  const sectionId = req.params.section_id;

  try {
    // Fetch section and course info
    const sectionInfo = await pool.query(`
      SELECT c.course_name, s.term, s.year, s.section_num
      FROM Section s
      JOIN Course c ON s.course_num = c.course_num
      WHERE s.section_id = $1
    `, [sectionId]);

    // Fetch enrolled students
    const enrolledStudents = await pool.query(`
      SELECT u.user_id, u.first_name, u.last_name, u.username
      FROM Enrollments e
      JOIN Users u ON e.stud_id = u.user_id
      WHERE e.section_id = $1
    `, [sectionId]);

    // Fetch pending students
    const pendingStudents = await pool.query(`
      SELECT username, first_name, last_name
      FROM PendingStudents
      WHERE section_id = $1
    `, [sectionId]);

    res.json({
      section: sectionInfo.rows[0],
      enrolled: enrolledStudents.rows,
      pending: pendingStudents.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching course details." });
  }
});


router.post("/assign-teams", authenticateToken, async (req, res) => {
  const { section_id, teams } = req.body;

  if (!section_id || !teams || !Array.isArray(teams)) {
    return res.status(400).json({ message: "Missing or invalid fields." });
  }

  try {
    for (const team of teams) {
      const { team_name, student_ids } = team;

      if (!team_name || !Array.isArray(student_ids)) continue;

      // Create team
      const result = await pool.query(
        "INSERT INTO Team (team_name) VALUES ($1) RETURNING team_id",
        [team_name]
      );
      const team_id = result.rows[0].team_id;

      // Link students
      for (const stud_id of student_ids) {
        await pool.query(
          "INSERT INTO TeamMembers (team_id, stud_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [team_id, stud_id]
        );
      }
    }

    res.json({ message: "Teams assigned successfully." });
  } catch (err) {
    console.error("Error assigning teams:", err);
    res.status(500).json({ message: "Server error while assigning teams." });
  }
});

router.get("/teams/:section_id", authenticateToken, async (req, res) => {
  const sectionId = req.params.section_id;

  try {
    // Get teams for students enrolled in this section
    const result = await pool.query(`
      SELECT t.team_id, t.team_name, u.user_id, u.first_name, u.last_name, u.username
      FROM Team t
      JOIN TeamMembers tm ON t.team_id = tm.team_id
      JOIN Users u ON tm.stud_id = u.user_id
      JOIN Enrollments e ON e.stud_id = u.user_id
      WHERE e.section_id = $1
    `, [sectionId]);

    // Group students under team names
    const teams = {};
    for (const row of result.rows) {
      if (!teams[row.team_id]) {
        teams[row.team_id] = {
          team_id: row.team_id,
          team_name: row.team_name,
          members: [],
        };
      }
      teams[row.team_id].members.push({
        user_id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        username: row.username,
      });
    }

    res.json(Object.values(teams));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching teams" });
  }
});

router.post("/delete-team", authenticateToken, async (req, res) => {
  const { team_id } = req.body;

  if (!team_id) {
    return res.status(400).json({ message: "Missing team ID." });
  }

  try {
    await pool.query("DELETE FROM Team WHERE team_id = $1", [team_id]);
    res.json({ message: "Team deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete team." });
  }
});


router.post("/remove-team-member", authenticateToken, async (req, res) => {
  const { team_id, user_id } = req.body;

  if (!team_id || !user_id) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    await pool.query(
      "DELETE FROM TeamMembers WHERE team_id = $1 AND stud_id = $2",
      [team_id, user_id]
    );
    res.json({ message: "Member removed from team." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove member." });
  }
});


router.post("/remove-student", authenticateToken, async (req, res) => {
  const { section_id, user_id } = req.body;

  if (!section_id || !user_id) {
    return res.status(400).json({ message: "Missing fields." });
  }

  try {
    await pool.query(
      "DELETE FROM Enrollments WHERE section_id = $1 AND stud_id = $2",
      [section_id, user_id]
    );
    res.json({ message: "Student removed from section." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing student." });
  }
});




module.exports = router;
