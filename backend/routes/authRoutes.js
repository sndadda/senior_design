const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,  // Drexel SMTP server
    port: process.env.EMAIL_PORT,  // Usually 587 for STARTTLS or 465 for SSL
    secure: process.env.EMAIL_SECURE === "true", // True for 465, False for 587
    auth: {
        user: process.env.EMAIL_USER,  // Drexel email
        pass: process.env.EMAIL_PASS,  // Drexel email password
    },
    tls: {
        rejectUnauthorized: false,  // Allows self-signed certificates if needed
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
        const userRole = role === "professor" ? "professor" : "student";

        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Generate email verification token
            const verificationToken = crypto.randomBytes(32).toString("hex");
            const verificationExpires = new Date();
            verificationExpires.setHours(verificationExpires.getHours() + 1); // Expires in 1 hour

            // Insert user with unverified status
            const result = await pool.query(
                `INSERT INTO Users (first_name, last_name, username, email, password_hash, role, is_verified, verification_token, verification_expires)
                 VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8) RETURNING user_id, role`,
                [first_name, last_name, username, email, hashedPassword, userRole, verificationToken, verificationExpires]
            );

            // Send verification email
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            await transporter.sendMail({
                from: `"Dragon Insight" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Verify Your Email - Dragon Insight",
                html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
            });

            res.status(201).json({ message: "User registered successfully. Please check your email for verification.", role: userRole });
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

        if (!user.is_verified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });

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
  
router.get("/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: "Invalid verification link." });
    }

    try {
        const user = await pool.query("SELECT user_id FROM Users WHERE verification_token = $1 AND verification_expires > NOW()", [token]);

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        // Mark user as verified
        await pool.query("UPDATE Users SET is_verified = true, verification_token = NULL, verification_expires = NULL WHERE user_id = $1", [user.rows[0].user_id]);

        res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
        console.error("Email Verification Error:", error);
        res.status(500).json({ message: "Error verifying email.", error: error.message });
    }
});

  

module.exports = router;
