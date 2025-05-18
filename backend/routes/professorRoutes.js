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

// Get list of courses for the grade dashboard
router.get("/grade-course-list", authenticateToken, async (req, res) => {
  const professorId = req.user.user_id;
  const result = await pool.query(
    `SELECT c.course_num, c.course_name
       FROM SectionProfessors sp
       JOIN Section s       ON sp.section_id = s.section_id
       JOIN Course  c       ON s.course_num   = c.course_num
      WHERE sp.user_id = $1`,
    [professorId]
  );
  res.json(result.rows);
});


// Get route used to display information for the grades dashboard
router.get("/grades_dashboard", authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { courseNum } = req.query;
  // This should filter by courseNum/sectionNum, but for now it pulls all assignments for the professor:
  const rows = await pool.query(`
    WITH relevant_instances AS (
      SELECT si.instance_id, sia.student_id, sf.created_by, sf.form_title
      FROM SurveyInstanceAssignments sia
      JOIN SurveyInstances si ON sia.instance_id = si.instance_id
      JOIN SurveyForms sf ON si.survey_form_id = sf.survey_form_id
      WHERE sf.created_by = $1
        AND ($2::VARCHAR IS NULL OR si.section_id = (
          SELECT section_id FROM Section WHERE course_num = $2 LIMIT 1
        ))
    ),
    answered AS (
      SELECT DISTINCT r.instance_id, r.submitted_by
      FROM SurveyResponses r
      WHERE r.is_submitted = TRUE
    ),
    student_progress AS (
      SELECT
        ri.student_id,
        COUNT(*) AS total_surveys,
        COUNT(a.instance_id) AS completed_surveys,
        ARRAY_AGG(ri.form_title) AS assigned_titles,
        ARRAY_AGG(CASE WHEN a.instance_id IS NOT NULL THEN ri.form_title END) AS completed_titles,
        ARRAY_AGG(CASE WHEN a.instance_id IS NULL THEN ri.form_title END) AS incomplete_titles
      FROM relevant_instances ri
      LEFT JOIN answered a
        ON a.instance_id = ri.instance_id AND a.submitted_by = ri.student_id
      GROUP BY ri.student_id
    )

    SELECT
      u.user_id AS student_id,
      u.first_name || ' ' || u.last_name AS student_name,
      sp.total_surveys,
      sp.completed_surveys,
      sp.assigned_titles,
      sp.completed_titles,
      sp.incomplete_titles
    FROM student_progress sp
    JOIN Users u ON u.user_id = sp.student_id
    ORDER BY student_name
  `, [userId, courseNum || null]);
  
  const out = rows.rows.map(r => {
    const pc = r.total_surveys
      ? Math.round((r.completed_surveys / r.total_surveys) * 100)
      : 0;

  return {
    student_id: r.student_id,
    student_name: r.student_name,
    percent_complete: pc,
    total_surveys: r.total_surveys,
    completed_surveys: r.completed_surveys,
    assigned_titles: r.assigned_titles || [],
    completed_titles: r.completed_titles?.filter(Boolean) || [],
    incomplete_titles: r.incomplete_titles?.filter(Boolean) || []
  };
  });

  res.json(out);
});

// Returns responses/answers used to view the evaluation results of a student
router.get("/answers/:responseId", authenticateToken, async (req, res) => {
  const rid = parseInt(req.params.responseId, 10);

  const ans = await pool.query(`
    SELECT 
      q.question_id,
      q.question_text,
      q.question_type,
      qc.choice_text,
      qc.choice_id,
      CASE 
        WHEN q.question_type = 'rating' THEN 
          (a.answer_value::int = ROW_NUMBER() OVER (
            PARTITION BY qc.question_id 
            ORDER BY qc.choice_id
          ) - 1)
        ELSE NULL
      END AS is_selected,
      CASE 
        WHEN q.question_type = 'text' THEN a.answer_value
        ELSE NULL
      END AS answer_value
    FROM SurveyAnswers a
    JOIN SurveyQuestions q ON a.question_id = q.question_id
    LEFT JOIN QuestionChoices qc ON qc.question_id = q.question_id
    WHERE a.response_id = $1
    ORDER BY q.question_id, qc.choice_id;
  `, [rid]);

  res.json(ans.rows);
});


// Returns information for completed survey's for a given student as well as other information
// related to survey instance
router.get("/completed_surveys/:studentId", authenticateToken, async (req, res) => {
  const professorId = req.user.user_id;
  const studentId = parseInt(req.params.studentId, 10);

  try {
    const results = await pool.query(`
      SELECT 
        r.response_id, 
        sf.form_title AS survey_title, 
        sf.survey_form_id,
        sf.instructions AS survey_description,
        r.submitted_at AS submission_date,
        si.deadline,
        evaluator.first_name || ' ' || evaluator.last_name AS evaluator_name,
        evaluated.first_name || ' ' || evaluated.last_name AS evaluated_user_name
      FROM SurveyResponses r
      JOIN SurveyInstances si ON r.instance_id = si.instance_id
      JOIN SurveyForms sf ON si.survey_form_id = sf.survey_form_id
      JOIN Users evaluator ON r.submitted_by = evaluator.user_id
      JOIN Users evaluated ON r.evaluated_user = evaluated.user_id
      WHERE r.submitted_by = $1
        AND r.is_submitted = TRUE
        AND sf.created_by = $2
    `, [studentId, professorId]);

    res.json(results.rows);
  } catch (err) {
    console.error("Error fetching completed surveys:", err);
    res.status(500).json({ error: "Failed to fetch completed surveys" });
  }
});


module.exports = router;
