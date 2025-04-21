const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { body, validationResult } = require("express-validator");
const axios = require("axios");
const { chromium } = require("playwright");
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

  const verifyProfessorEmail = async (email1, email2) => {
    const baseUrl = "https://drexel.edu/cci/about/directory/?q&sortBy=relevance&sortOrder=asc&page=";
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        for (let pageNum = 1; pageNum <= 11; pageNum++) {
            const url = `${baseUrl}${pageNum}`;
            console.log(`Scraping: ${url}`);

            await page.goto(url, { waitUntil: "networkidle" });

            // extract and clean emails
            const scrapedEmails = await page.evaluate(() => {
                const emailPattern = /[a-zA-Z0-9._%+-]+@drexel\.edu/g;
                const pageText = document.body.innerText; // get full page text
                return Array.from(pageText.match(emailPattern) || []);
            });

            console.log(`Extracted Emails on Page ${pageNum}:`, scrapedEmails);

            const cleanedEmails = scrapedEmails.map(email => email.toLowerCase());

            // check if either of the professor's emails are found
            if (cleanedEmails.includes(email1.toLowerCase()) || cleanedEmails.includes(email2.toLowerCase())) {
                console.log(`Found match for ${email1} or ${email2}`);
                await browser.close();
                return true;
            }
        }

        console.log(`No match found for ${email1} or ${email2}`);
        await browser.close();
        return false;
    } catch (error) {
        console.error("Error scraping faculty directory:", error);
        await browser.close();
        return false;
    }
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


router.get("/professor/my-courses", authenticateToken, async (req, res) => {
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
  

  router.post("/professor/create-course", authenticateToken, async (req, res) => {
    const { course_name, section_num, term, year } = req.body;
  
    try {
      const courseNum = course_name.toLowerCase().replace(/\s+/g, "_");
  
      await pool.query("INSERT INTO Course (course_num, course_name) VALUES ($1, $2) ON CONFLICT DO NOTHING", [courseNum, course_name]);
  
      const section = await pool.query(`
        INSERT INTO Section (course_num, term, year, section_num)
        VALUES ($1, $2, $3, $4) RETURNING section_id
      `, [courseNum, term, year, section_num]);
  
      await pool.query("INSERT INTO SectionProfessors (section_id, user_id) VALUES ($1, $2)", [section.rows[0].section_id, req.user.user_id]);
  
      res.json({ message: "Course and section created!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating course" });
    }
  });
  

router.post("/signup", [
    body("first_name").notEmpty(),
    body("last_name").notEmpty(),
    body("email").isEmail().matches(/@drexel\.edu$/),
    body("password").isLength({ min: 8 }),
    body("role").isIn(["student", "professor"]),
    body("alias_email").optional().isEmail().matches(/@drexel\.edu$/)
], async (req, res) => {
    const { first_name, last_name, email, password, role, alias_email } = req.body;

    try {
        const existingUser = await pool.query("SELECT user_id FROM Users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date();
        verificationExpires.setMinutes(verificationExpires.getMinutes() + 10);

        await pool.query(
            `INSERT INTO EmailVerifications (email, first_name, last_name, password_hash, role, alias_email, verification_code, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [email, first_name, last_name, hashedPassword, role, alias_email, verificationCode, verificationExpires]
        );

        await sgMail.send({
            to: email,
            from: "verify@dragoninsight.us",
            subject: "Your Verification Code - Dragon Insight",
            html: `<p>Your verification code is: <strong>${verificationCode}</strong></p><p>This code will expire in 10 minutes.</p>`,
        });

        res.status(200).json({ message: "Verification code sent. Please check your inbox." });
    } catch (error) {
        res.status(500).json({ message: "Error sending verification code", error: error.message });
    }
});

router.post("/verify-code", [
    body("email").isEmail().matches(/@drexel\.edu$/),
    body("code").isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
    const { email, code } = req.body;

    try {
        const result = await pool.query(
            "SELECT * FROM EmailVerifications WHERE email = $1 AND verification_code = $2 AND expires_at > NOW()",
            [email, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired verification code." });
        }

        const { first_name, last_name, password_hash, role, alias_email } = result.rows[0];

        if (role === "student") {
            await pool.query(
                `INSERT INTO Users (first_name, last_name, username, email, password_hash, role)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id`,
                [first_name, last_name, email.split("@")[0], email, password_hash, role]
            );

            await pool.query("DELETE FROM EmailVerifications WHERE email = $1", [email]);
            return res.status(201).json({ message: "Account created successfully!", role });
        }

        // Start verifying professor email via scraping
        //const isVerified = await verifyProfessorEmail(email, alias_email);
        //TEMPORARY - override and accept following emails as professors.
        const autoVerifiedEmails = ["snd63@drexel.edu", "np842@drexel.edu", "am4529@drexel.edu", "mar558@drexel.edu", "ll927@drexel.edu", "ll927@drexel.edu"];
        let isVerified = false;

        if (autoVerifiedEmails.includes(email.toLowerCase())) {
            console.log(`Bypassing verification for whitelisted email: ${email}`);
            isVerified = true;
        } else {
            isVerified = await verifyProfessorEmail(email, alias_email);
        }

        
        // Remove the professor's entry from EmailVerifications after scraping
        await pool.query("DELETE FROM EmailVerifications WHERE email = $1", [email]);

        if (!isVerified) {
            return res.status(403).json({ message: "Professor verification failed. Email not found in faculty directory." });
        }

        // Create the professor account if verified
        const professor = await pool.query(
            `INSERT INTO Users (first_name, last_name, username, email, password_hash, role)
             VALUES ($1, $2, $3, $4, $5, 'professor') RETURNING user_id, role`,
            [first_name, last_name, email.split("@")[0], email, password_hash]
        );

        const token = jwt.sign({ user_id: professor.rows[0].user_id, role: "professor" }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });

        res.status(201).json({ message: "Professor verified and logged in!", role: "professor" });
    } catch (error) {
        res.status(500).json({ message: "Error verifying code", error: error.message });
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

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });

        res.json({ message: "Login successful", role: user.role });
    } catch (error) {
        console.error("Login Error:", error);
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
  


  
router.authenticateToken = authenticateToken;
module.exports = router;
