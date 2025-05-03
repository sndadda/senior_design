const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("./authRoutes");

// Route for saving survey
router.post("/save", authenticateToken, async (req, res) => {
  const { title, instructions, questions, forceOverwrite } = req.body;
  const userId = req.user.user_id;

  if (!title || !Array.isArray(questions)) {
    return res.status(400).json({ message: "Cannot save survey. Please add a Title for the survey" });
  }

  try {
    // Check if the survey already exists by title and by who the survey was created by
    const existingSurveyResult = await db.query(
      `SELECT survey_form_id
      FROM SurveyForms
      WHERE form_title = $1 AND created_by = $2`,
      [title, userId]
    );

    let surveyFormId;
    let isUpdate = false;

    if (existingSurveyResult.rowCount > 0) {
      if (!forceOverwrite) {
        return res.status(409).json({ message: `A survey with the title "${title}" already exists.` });
      }

      // If survey exists in DB and user wants to overwrite it
      isUpdate = true;
      surveyFormId = existingSurveyResult.rows[0].survey_form_id;

      // Remove old questions and choices before updating
      await db.query(
        `DELETE FROM QuestionChoices WHERE question_id IN (
          SELECT question_id FROM SurveyQuestions WHERE survey_form_id = $1
        )`,
        [surveyFormId]
      );
      await db.query(
        `DELETE FROM SurveyQuestions WHERE survey_form_id = $1`,
        [surveyFormId]
      );

      await db.query(
        `UPDATE SurveyForms
        SET form_title = $1, instructions = $2
        WHERE survey_form_id = $3`,
        [title, instructions, surveyFormId]
      );
    } else {
      // Insert new Survey if there is no duplicate
      const formResult = await db.query(
        `INSERT INTO SurveyForms (form_title, instructions, created_by)
         VALUES ($1, $2, $3)
         RETURNING survey_form_id`,
        [title, instructions, userId]
      );
      surveyFormId = formResult.rows[0].survey_form_id;
    }

    // Insert new questions and choices
    for (let q of questions) {
      const questionType = q.type === "Short Answer" ? "text" : "rating";
      const maxRating = q.type === "Short Answer" ? null : (Array.isArray(q.choices) ? q.choices.length : null);

      const questionResult = await db.query(
        `INSERT INTO SurveyQuestions
          (survey_form_id, question_text, question_type, max_rating)
        VALUES ($1, $2, $3, $4)
        RETURNING question_id`,
        [surveyFormId, q.text, questionType, maxRating]
      );
      const questionId = questionResult.rows[0].question_id;

      if (Array.isArray(q.choices)) {
        for (let choiceText of q.choices) {
          await db.query(
            `INSERT INTO QuestionChoices (question_id, choice_text)
            VALUES ($1, $2)`,
            [questionId, choiceText]
          );
        }
      }
    }

    // Return message whether update or insert
    if (isUpdate) {
      res.status(200).json({ message: "Survey updated", surveyFormId });
    } else {
      res.status(201).json({ message: "Survey created", surveyFormId });
    }

  } catch (err) {
    console.error("Error saving survey:", err);
    res.status(500).json({ message: "Error saving survey", error: err.message });
  }
});



// Used to display the list of surveys in DB
router.get("/list", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT survey_form_id AS id, form_title AS title, is_default, created_by
      FROM SurveyForms
      ORDER BY survey_form_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Database query failed:", err);
    res.status(500).json({ message: err.message });
  }
});

// Loads in the survey that the user chooses
router.get("/load/:id", authenticateToken, async (req, res) => {
  try {
    const formId = parseInt(req.params.id, 10);

    // Get form
    const formResult = await db.query(
      `SELECT survey_form_id, form_title, instructions
         FROM SurveyForms
        WHERE survey_form_id = $1`,
      [formId]
    );
    if (formResult.rowCount === 0) return res.status(404).json({ message: "Not found" });
    const form = formResult.rows[0];

    // get all questions in the form
    const qResult = await db.query(
      `SELECT question_id, question_text, question_type
         FROM SurveyQuestions
        WHERE survey_form_id = $1
        ORDER BY question_id`,
      [formId]
    );

    // Get all choices for MC
    const questionIds = qResult.rows.map((q) => q.question_id);
    let choicesMap = {};
    if (questionIds.length) {
      const cResult = await db.query(
        `SELECT question_id, choice_text
           FROM QuestionChoices
          WHERE question_id = ANY($1)
          ORDER BY choice_id`,
        [questionIds]
      );
      // group by question_id
      choicesMap = cResult.rows.reduce((acc, { question_id, choice_text }) => {
        acc[question_id] = acc[question_id] || [];
        acc[question_id].push(choice_text);
        return acc;
      }, {});
    }

    // Creates the question array used to load in questions in the survey creation page
    const questions = qResult.rows.map((q) => ({
      question_id:  q.question_id,
      question_text: q.question_text,
      question_type: q.question_type,
      choices:       choicesMap[q.question_id] || []
    }));

    res.json({
      survey_form_id: form.survey_form_id,
      form_title:     form.form_title,
      instructions:   form.instructions,
      questions
    });
  } catch (err) {
    console.error("Error fetching survey:", err);
    res.status(500).json({ message: "Error fetching survey" });
  }
});

// Deletes a survey from the DB
router.delete("/delete/:id", authenticateToken, async (req, res) => {
  const surveyId = parseInt(req.params.id, 10);

  try {
    // Delete MC choices first
    await db.query(
      `DELETE FROM QuestionChoices
       WHERE question_id IN (
         SELECT question_id FROM SurveyQuestions WHERE survey_form_id = $1
       )`,
      [surveyId]
    );

    // Delete the questions
    await db.query(
      `DELETE FROM SurveyQuestions WHERE survey_form_id = $1`,
      [surveyId]
    );

    // Delete the whole form
    await db.query(
      `DELETE FROM SurveyForms WHERE survey_form_id = $1`,
      [surveyId]
    );

    res.status(200).json({ message: "Survey deleted successfully" });
  } catch (err) {
    console.error("Error deleting survey:", err);
    res.status(500).json({ message: "Error deleting survey", error: err.message });
  }
});

// Lists the students in the system (Should be change for course creation)
// Used for displaying students to assign to
router.get("/students/list", authenticateToken, async (req, res) => {
  const sectionId = req.query.section_id;

  try {
    let result;

    if (sectionId) {
      result = await db.query(`
        SELECT u.user_id, u.first_name, u.last_name, u.email
        FROM Users
        INNER JOIN Enrollments e ON u.user_id = e.stud_id
        WHERE e.section_id = $1 AND u.role = 'student'
        ORDER BY u.last_name, u.first_name
      `, [sectionId]);
    } else {

      // Returns all user's with student role if there isn't a given sectionID
      // Change when sectionID can be included
      result = await db.query(`
        SELECT user_id, first_name, last_name, email
        FROM Users
        WHERE role = 'student'
        ORDER BY last_name, first_name
      `);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch students:", err.message || err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Used to assign a survey to a student
router.post("/assign", authenticateToken, async (req, res) => {
  const { surveyId, studentId, sectionId, deadline } = req.body;

  if (!surveyId || !deadline || (!sectionId && !studentId)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    let result;

    if (sectionId) {
      // Assign to a section if sectionID is given
      result = await db.query(`
        INSERT INTO SurveyInstances (survey_form_id, section_id, deadline)
        VALUES ($1, $2, $3)
        RETURNING instance_id
      `, [surveyId, sectionId, deadline]);

    } else {
      // Assign to a specific student
      result = await db.query(`
        INSERT INTO SurveyInstances (survey_form_id, deadline)
        VALUES ($1, $2)
        RETURNING instance_id
      `, [surveyId, deadline]);

      await db.query(`
        INSERT INTO SurveyInstanceAssignments (instance_id, student_id)
        VALUES ($1, $2)
      `, [result.rows[0].instance_id, studentId]);
    }

    res.status(201).json({ message: "Survey assigned", instance_id: result.rows[0].instance_id });
  } catch (err) {
    console.error("Failed to assign survey:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get the students that were assigned a specific survey with surveyFormID
// Used for Unassigning surveys
router.get("/assigned/:surveyFormId", authenticateToken, async (req, res) => {
    const formId = parseInt(req.params.surveyFormId,10);

    const result = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email
         FROM SurveyInstanceAssignments a
         JOIN SurveyInstances i ON a.instance_id = i.instance_id
         JOIN Users u ON a.student_id = u.user_id
        WHERE i.survey_form_id = $1
          AND a.completed = FALSE`,
      [formId]
    );
    res.json(result.rows);
  }
);

// Used to Unassign a survey from a student
router.post("/unassign", authenticateToken, async (req, res) => {
    const { surveyId, studentId } = req.body;
    if (!surveyId || !studentId) {
      return res.status(400).json({ message: "Missing surveyId or studentId" });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Delete any saved drafts for assigned survey
      await client.query(
        `DELETE FROM SurveyResponses r
           USING SurveyInstances i
          WHERE r.instance_id    = i.instance_id
            AND i.survey_form_id = $1
            AND r.submitted_by   = $2
            AND r.is_submitted   = FALSE`,
        [surveyId, studentId]
      );

      // Delete the assignment 
      await client.query(
        `DELETE FROM SurveyInstanceAssignments a
           USING SurveyInstances i
          WHERE a.instance_id    = i.instance_id
            AND i.survey_form_id = $1
            AND a.student_id     = $2
            AND a.completed      = FALSE`,
        [surveyId, studentId]
      );

      await client.query("COMMIT");
      res.json({ message: "Unassigned and draft cleared" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("unassign failed:", err);
      res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

module.exports = router;