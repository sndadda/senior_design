const express = require("express");
const db = require("../db"); 
const router = express.Router();

// Get all users
router.get("/users", async (req, res) => {
    try {
        const result = await db.query("SELECT user_id, first_name, last_name, username, email, role FROM Users");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Get all courses
router.get("/courses", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Course");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

// Get all survey forms
router.get("/surveys", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM SurveyForms");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch surveys" });
    }
});

module.exports = router;
