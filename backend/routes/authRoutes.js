const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { body, validationResult } = require("express-validator");

require("dotenv").config();

const router = express.Router();

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    });
  };
  
router.get("/user", authenticateToken, async (req, res) => {
    try {
      const userQuery = await pool.query("SELECT user_id, role FROM Users WHERE user_id = $1", [req.user.user_id]);
  
      if (userQuery.rows.length === 0) return res.status(404).json({ message: "User not found" });
  
      res.json(userQuery.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
});


router.post(
    "/signup",
    [
      body("first_name").notEmpty(),
      body("last_name").notEmpty(),
      body("email").isEmail().matches(/@drexel\.edu$/),
      body("password").isLength({ min: 8 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid input", errors: errors.array() });
      }
  
      const { first_name, last_name, email, password, role } = req.body;
      const username = email.split("@")[0];
      const userRole = role === "professor" ? "professor" : "student"; // defaults student
  
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
          "INSERT INTO Users (first_name, last_name, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, role",
          [first_name, last_name, username, email, hashedPassword, userRole]
        );
  
        res.status(201).json({ message: "User registered successfully", role: userRole });
      } catch (error) {
        console.error("Signup Error:", error);
  
        if (error.code === "23505") {
          return res.status(400).json({ message: "Email or username already exists." });
        }
  
        res.status(500).json({ message: "Error signing up", error: error.message });
      }
    }
);
  

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = userQuery.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ message: "Login successful", role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json({ message: "Logged out successfully" });
  });
  

module.exports = router;
