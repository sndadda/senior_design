const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require("../middleware/authenticateToken");

// Get completed survey's to list out
router.get('/completed', authenticateToken, async (req, res) => {
  const userId = req.user?.user_id || req.session?.user?.user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await pool.query(
      `SELECT 
          sra.instance_id AS survey_id,
          sf.form_title,
          sra.submitted_at
      FROM SurveyResponses sra
      JOIN SurveyForms sf ON sra.survey_form_id = sf.survey_form_id
      WHERE sra.evaluated_user = $1 AND sra.is_submitted = true
      GROUP BY sra.instance_id, sf.form_title, sra.submitted_at
      ORDER BY sra.submitted_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching completed surveys:", err);
    res.status(500).json({ error: "Server error fetching completed surveys" });
  }
});

// Returns the results/answers from the selected survey
router.get('/results/:surveyId', authenticateToken, async (req, res) => {
  const { surveyId } = req.params;

  try {
    const questionsRes = await pool.query(`
      SELECT q.question_id, q.question_text, q.question_type, q.max_rating
      FROM SurveyQuestions q
      JOIN SurveyForms f ON q.survey_form_id = f.survey_form_id
      JOIN SurveyInstances i ON i.survey_form_id = f.survey_form_id
      WHERE i.instance_id = $1
    `, [surveyId]);

    const choicesRes = await pool.query(`
      SELECT qc.question_id, qc.choice_text
      FROM QuestionChoices qc
      JOIN SurveyQuestions q ON qc.question_id = q.question_id
      JOIN SurveyInstances i ON i.survey_form_id = q.survey_form_id
      WHERE i.instance_id = $1
      ORDER BY qc.choice_id ASC
    `, [surveyId]);


    const answersRes = await pool.query(`
      SELECT q.question_id, q.question_type, sa.answer_value
      FROM SurveyAnswers sa
      JOIN SurveyResponses sr ON sa.response_id = sr.response_id
      JOIN SurveyQuestions q ON sa.question_id = q.question_id
      WHERE sr.instance_id = $1 AND sr.is_submitted = true
    `, [surveyId]);

    const questionChoicesMap = {};
    for (const row of choicesRes.rows) {
      if (!questionChoicesMap[row.question_id]) {
        questionChoicesMap[row.question_id] = [];
      }
      questionChoicesMap[row.question_id].push(row.choice_text);
    }


    const questionData = {};
    for (const row of questionsRes.rows) {
      questionData[row.question_id] = {
        question_text: row.question_text,
        question_type: row.question_type,
        average_rating: 0,
        max_rating: row.max_rating,
        comments: [],
        choices: questionChoicesMap[row.question_id] || []
      };
    }

    const ratingSums = {};
    const ratingCounts = {};

    for (const row of answersRes.rows) {
      if (row.question_type === 'rating') {
        const val = parseInt(row.answer_value);
        if (!isNaN(val)) {
          ratingSums[row.question_id] = (ratingSums[row.question_id] || 0) + val;
          ratingCounts[row.question_id] = (ratingCounts[row.question_id] || 0) + 1;
        }
      } else if (row.question_type === 'text') {
        questionData[row.question_id].comments.push(row.answer_value);
      }
    }

    Object.keys(ratingSums).forEach(qid => {
      questionData[qid].average_rating = ratingSums[qid] / ratingCounts[qid];
    });

    const formInfo = await pool.query(`
      SELECT f.form_title, f.instructions AS form_description
      FROM SurveyInstances i
      JOIN SurveyForms f ON i.survey_form_id = f.survey_form_id
      WHERE i.instance_id = $1
    `, [surveyId]);

    res.json({
      form_title: formInfo.rows[0]?.form_title,
      form_description: formInfo.rows[0]?.form_description,
      questions: Object.values(questionData)
    });

  } catch (err) {
    console.error('Error fetching evaluation results:', err);
    res.status(500).json({ error: 'Server error fetching results' });
  }
});


module.exports = router;
