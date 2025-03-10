const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { body, validationResult } = require("express-validator");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

require("dotenv").config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
router.get("/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: "Invalid verification link." });
    }

    try {
        // Check if the token exists and is not expired
        const result = await pool.query(
            "SELECT email FROM EmailVerifications WHERE verification_token = $1 AND expires_at > NOW()",
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired token." });
        }

        const email = result.rows[0].email;
        const username = email.split("@")[0];

        // Hash a temporary password (user should reset later)
        const tempPassword = crypto.randomBytes(10).toString("hex");
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user in the Users table
        await pool.query(
            `INSERT INTO Users (first_name, last_name, username, email, password_hash, role)
             VALUES ('', '', $1, $2, $3, 'student')`,
            [username, email, hashedPassword]
        );

        // Remove the verification record
        await pool.query("DELETE FROM EmailVerifications WHERE email = $1", [email]);

        res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
        console.error("Email Verification Error:", error);
        res.status(500).json({ message: "Error verifying email.", error: error.message });
    }
});



router.post("/signup", [
    body("email").isEmail().matches(/@drexel\.edu$/)
], async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email is already registered
        const existingUser = await pool.query("SELECT user_id FROM Users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        // Generate a 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date();
        verificationExpires.setMinutes(verificationExpires.getMinutes() + 10); // Code expires in 10 minutes

        // Insert the verification code into the database
        await pool.query(
            `INSERT INTO EmailVerifications (email, verification_code, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) DO UPDATE SET verification_code = $2, expires_at = $3`,
            [email, verificationCode, verificationExpires]
        );

        // Send the email with the code
        const msg = {
            to: email,
            from: "verify@dragoninsight.us",
            subject: "Your Verification Code - Dragon Insight",
            html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>
                   <p>This code will expire in 10 minutes.</p>`,
        };
        await sgMail.send(msg);

        res.status(200).json({ message: "Verification code sent. Please check your inbox." });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Error sending verification code", error: error.message });
    }
});


router.post("/verify-code", [
    body("email").isEmail().matches(/@drexel\.edu$/),
    body("code").isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
    const { email, code } = req.body;

    try {
        // Check if the verification code is valid
        const result = await pool.query(
            "SELECT * FROM EmailVerifications WHERE email = $1 AND verification_code = $2 AND expires_at > NOW()",
            [email, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired verification code." });
        }

        // Mark email as verified
        await pool.query("DELETE FROM EmailVerifications WHERE email = $1", [email]);

        res.status(200).json({ message: "Email verified. You can now create your account." });
    } catch (error) {
        console.error("Verification Code Error:", error);
        res.status(500).json({ message: "Error verifying code.", error: error.message });
    }
});

router.post("/create-account", [
    body("first_name").notEmpty(),
    body("last_name").notEmpty(),
    body("email").isEmail().matches(/@drexel\.edu$/),
    body("password").isLength({ min: 8 })
], async (req, res) => {
    const { first_name, last_name, email, password, role } = req.body;
    const username = email.split("@")[0];

    try {
        // Ensure email has been verified
        const existingVerification = await pool.query("SELECT email FROM EmailVerifications WHERE email = $1", [email]);
        if (existingVerification.rows.length > 0) {
            return res.status(400).json({ message: "Please verify your email before creating an account." });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database
        await pool.query(
            `INSERT INTO Users (first_name, last_name, username, email, password_hash, role)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id`,
            [first_name, last_name, username, email, hashedPassword, role]
        );

        res.status(201).json({ message: "Account created successfully! You can now log in." });
    } catch (error) {
        console.error("Account Creation Error:", error);
        res.status(500).json({ message: "Error creating account", error: error.message });
    }
});


  

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
  


  

module.exports = router;
