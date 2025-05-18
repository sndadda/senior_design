const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateToken = require("../middleware/authenticateToken");

// Used to get all survey instances assigned to the logged-in student
router.get("/my-surveys", authenticateToken, async (req, res) => {
  const studentId = req.user.user_id;
  try {
    const result = await db.query(
      `SELECT 
        si.instance_id,
        sf.survey_form_id,
        sf.form_title,
        si.section_id,
        si.deadline,
        u.first_name || ' ' || u.last_name AS professor_name
      FROM SurveyInstanceAssignments sia
      JOIN SurveyInstances si ON sia.instance_id = si.instance_id
      JOIN SurveyForms sf ON si.survey_form_id = sf.survey_form_id
      LEFT JOIN Users u ON sf.created_by = u.user_id
      WHERE sia.student_id = $1
        AND sia.completed = FALSE
        AND NOT EXISTS (
          SELECT 1
          FROM SurveyResponses r
          WHERE r.submitted_by = sia.student_id
            AND r.instance_id = sia.instance_id
            AND r.is_submitted = FALSE
        )
      ORDER BY si.assigned_at DESC`,
      [studentId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching my surveys", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Used to load in the information of suvey that was assigned. I.E title, description, and questions
// This is done either when a student starts a new survey or continues an existing survey
router.get("/load/:instanceId", authenticateToken, async (req, res) => {
    const instanceId = parseInt(req.params.instanceId, 10);
    if (isNaN(instanceId)) return res.status(400).json({ error:"bad instanceId" });

    try {
      const formRows = await db.query(
        `SELECT sf.survey_form_id, sf.form_title, sf.instructions
           FROM SurveyInstances si
           JOIN SurveyForms    sf ON si.survey_form_id = sf.survey_form_id
          WHERE si.instance_id = $1`,
        [instanceId]
      );
      if (formRows.rowCount === 0) return res.status(404).json({ error:"not found" });
      const form = formRows.rows[0];

      const qRows = await db.query(
        `SELECT sq.question_id, sq.question_text, sq.question_type
           FROM SurveyQuestions sq
           JOIN SurveyForms     sf ON sq.survey_form_id = sf.survey_form_id
          WHERE sf.survey_form_id = $1
          ORDER BY sq.question_id`,
        [form.survey_form_id]
      );

      const questionIds = qRows.rows.map(r=>r.question_id);
      let choicesMap = {};
      if (questionIds.length) {
        const cRows = await db.query(
          `SELECT question_id, choice_text
             FROM QuestionChoices
            WHERE question_id = ANY($1)
            ORDER BY choice_id`,
          [questionIds]
        );
        choicesMap = cRows.rows.reduce((m,r)=>{
          (m[r.question_id]||(m[r.question_id]=[])).push(r.choice_text);
          return m;
        }, {});
      }

      const questions = qRows.rows.map(r=>({
        question_id: r.question_id,
        question_text: r.question_text,
        question_type: r.question_type,
        options: choicesMap[r.question_id]||[]
      }));

      res.json({ 
        survey_form_id:   form.survey_form_id,
        form_title:       form.form_title,
        form_description: form.instructions,
        questions 
      });
      

    } catch (err) {
      console.error("load/:instanceId error", err);
      res.status(500).json({ error:"Internal Server Error" });
    }
  }
);

// Used to submit a survey
router.post("/submit", authenticateToken, async (req, res) => {
  const studentId = req.user.user_id;
  const { instanceId, answers } = req.body;

  const evaluatedUserId = req.body.evaluatedUserId == null
    ? studentId
    : req.body.evaluatedUserId;

  if (!instanceId || typeof answers !== "object") {
    return res.status(400).json({ message: "Missing instanceId or answers" });
  }

  try {
    const instR = await db.query(
      `SELECT survey_form_id, section_id
         FROM SurveyInstances
        WHERE instance_id = $1`,
      [instanceId]
    );
    if (instR.rowCount === 0)
      return res.status(404).json({ message: "Instance not found" });
    const { survey_form_id, section_id } = instR.rows[0];

    const draftR = await db.query(
      `SELECT response_id
         FROM SurveyResponses
        WHERE instance_id   = $1
          AND submitted_by  = $2
          AND evaluated_user = $3
          AND is_submitted  = FALSE`,
      [instanceId, studentId, evaluatedUserId]
    );

    let responseId;
    if (draftR.rowCount > 0) {
      // reuse draft if there is one
      responseId = draftR.rows[0].response_id;

      // remove old draft
      await db.query(
        `DELETE FROM SurveyAnswers
           WHERE response_id = $1`,
        [responseId]
      );

      // update the draft as submitted
      await db.query(
        `UPDATE SurveyResponses
            SET is_submitted  = TRUE,
                submitted_at = NOW()
          WHERE response_id = $1`,
        [responseId]
      );
    } else {
      // If there isn't a draft, than insert a new response
      const respR = await db.query(
        `INSERT INTO SurveyResponses
            (instance_id, survey_form_id, section_id, submitted_by, evaluated_user, is_submitted, submitted_at)
         VALUES ($1,$2,$3,$4,$5, TRUE, NOW())
         RETURNING response_id`,
        [instanceId, survey_form_id, section_id, studentId, evaluatedUserId]
      );
      responseId = respR.rows[0].response_id;
    }

    for (const [questionId, answerValue] of Object.entries(answers)) {
      await db.query(
        `INSERT INTO SurveyAnswers (response_id, question_id, answer_value)
         VALUES ($1, $2, $3)`,
        [responseId, questionId, answerValue]
      );
    }

    await db.query(
      `UPDATE SurveyInstanceAssignments
          SET completed = TRUE
        WHERE instance_id = $1
          AND student_id  = $2`,
      [instanceId, studentId]
    );

    res.status(200).json({ message: "Survey submitted" });
  } catch (err) {
    console.error("Error submitting survey:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Same thing as the /my-surveys route but for drafts
router.get("/my-drafts", authenticateToken, async (req, res) => {
  const studentId = req.user.user_id;

  try {
    const result = await db.query(
      `SELECT
        r.response_id,
        r.instance_id,
        r.survey_form_id,
        sf.form_title,
        r.saved_at,
        si.deadline,
        u.first_name || ' ' || u.last_name AS professor_name
      FROM SurveyResponses r
      JOIN SurveyForms     sf ON r.survey_form_id = sf.survey_form_id
      JOIN SurveyInstances si ON r.instance_id     = si.instance_id
      LEFT JOIN Users       u ON sf.created_by     = u.user_id
      WHERE r.submitted_by = $1
        AND r.is_submitted = FALSE
      ORDER BY r.saved_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching saved drafts:", err);
    res.status(500).json({ error: "Failed to load saved drafts" });
  }
});

// Used to save a draft
// Drafts are saved into the SurveyResponses table, but is_submitted is set to false
router.post("/save-draft", authenticateToken, async (req, res) => {
  const studentId = req.user.user_id;
  let { instanceId, answers, evaluatedUserId } = req.body;
  if (!evaluatedUserId) evaluatedUserId = studentId;

  if (!instanceId || typeof answers !== "object") {
    return res.status(400).json({ message: "Missing instanceId or answers" });
  }

  try {
    // look for an existing draft
    const draftCheck = await db.query(
      `SELECT response_id
        FROM SurveyResponses
        WHERE instance_id   = $1
          AND submitted_by  = $2
          AND evaluated_user = $3
          AND is_submitted  = FALSE`,
      [instanceId, studentId, evaluatedUserId]
    );

    let responseId;
    if (draftCheck.rowCount > 0) {
      // If there already is a draft, overwrite it
      responseId = draftCheck.rows[0].response_id;
      await db.query(
        `UPDATE SurveyResponses
            SET saved_at = NOW()
          WHERE response_id = $1`,
        [responseId]
      );
    }
    else {
      // Add a new draft if there isn't one
      const respR = await db.query(
        `INSERT INTO SurveyResponses
          (instance_id, survey_form_id, section_id, submitted_by, evaluated_user, is_submitted, saved_at)
        VALUES (
          $1,
          (SELECT survey_form_id FROM SurveyInstances WHERE instance_id=$1),
          (SELECT section_id    FROM SurveyInstances WHERE instance_id=$1),
          $2, $3, FALSE, NOW()
        )
        RETURNING response_id`,
        [instanceId, studentId, evaluatedUserId]
      );
      responseId = respR.rows[0].response_id;
    }

    // remove old response and insert new ones
    await db.query(
      `DELETE FROM SurveyAnswers
         WHERE response_id = $1`,
      [responseId]
    );

    for (const [qid, val] of Object.entries(answers)) {
      await db.query(
        `INSERT INTO SurveyAnswers(response_id, question_id, answer_value)
           VALUES ($1, $2, $3)`,
        [responseId, qid, val]
      );
    }

    res.json({ message: "Draft saved", responseId });
  }
  catch (err) {
    console.error(" Error saving draft:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Used to load a draft answers into the survey when a student continues taking a saved evaluation
router.get('/draft-answers/:responseId', authenticateToken, async (req, res) => {
  const { responseId } = req.params;
  const userId = req.user.user_id;
  if (!userId) return res.status(401).send("Not logged in");

  try {
    // Make sure the draft belongs to the student
    const check = await db.query(`
      SELECT * FROM SurveyResponses
      WHERE response_id = $1 AND submitted_by = $2 AND is_submitted = FALSE
    `, [responseId, userId]);

    if (check.rowCount === 0) return res.status(404).send("Draft not found");

    const answersResult = await db.query(`
      SELECT question_id, answer_value
      FROM SurveyAnswers
      WHERE response_id = $1
    `, [responseId]);

    const answers = {};
    for (const row of answersResult.rows) {
      answers[row.question_id] = row.answer_value;
    }

    res.json(answers);
  } catch (err) {
    console.error("Error loading draft answers:", err);
    res.status(500).send("Internal server error");
  }
});

// used to get a list of students to choose for evaluation
// currently gets all students, but should be based off teammates
router.get("/evaluate-choice", authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.user_id;

    const result = await db.query(
      `SELECT user_id, first_name, last_name
         FROM Users
        WHERE role = 'student' AND user_id != $1
        ORDER BY last_name, first_name`,
      [currentUserId]
    );

    const students = result.rows.map(s => ({
      value: s.user_id,
      label: `${s.first_name} ${s.last_name}`,
    }));

    res.json(students);
  } catch (err) {
    console.error("Error fetching all students", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
