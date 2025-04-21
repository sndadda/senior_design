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
        // returns 409 with given scenerio
        // this shouldn't happen, but just in case
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

module.exports = router;