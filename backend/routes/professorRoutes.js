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
  const { course_name, section_num, term, year } = req.body;

  try {
    const courseNum = course_name.toLowerCase().replace(/\s+/g, "_");

    await pool.query("INSERT INTO Course (course_num, course_name) VALUES ($1, $2) ON CONFLICT DO NOTHING", [courseNum, course_name]);

    const section = await pool.query(`
      INSERT INTO Section (course_num, term, year, section_num)
      VALUES ($1, $2, $3, $4) RETURNING section_id
    `, [courseNum, term, year, section_num]);

    await pool.query("INSERT INTO SectionProfessors (section_id, user_id) VALUES ($1, $2)", [section.rows[0].section_id, req.user.user_id]);

    res.json({ message: "Course and section created!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating course" });
  }
});

module.exports = router;
