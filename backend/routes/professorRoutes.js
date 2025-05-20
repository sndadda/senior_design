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
// Get all students in a specific section
router.get("/section-students/:section_id", authenticateToken, async (req, res) => {
  const sectionId = req.params.section_id;

  try {
    const result = await pool.query(`
      SELECT u.first_name, u.last_name, u.username
      FROM Enrollments e
      JOIN Users u ON e.stud_id = u.user_id
      WHERE e.section_id = $1
    `, [sectionId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch students." });
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



module.exports = router;
