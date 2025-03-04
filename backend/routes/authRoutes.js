const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
require("dotenv").config();

const router = express.Router();

router.post("/signup", async (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;

    if (!email.endsWith("@drexel.edu")) {
        return res.status(400).json({ message: "Email must be a @drexel.edu address." });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const username = email.split("@")[0]; //get username

    try {
        const existingUser = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO Users (first_name, last_name, username, email, pass, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, role",
            [first_name, last_name, username, email, hashedPassword, role]
        );

        res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
