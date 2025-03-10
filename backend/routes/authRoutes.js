const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { body, validationResult } = require("express-validator");
const axios = require("axios");
const { chromium } = require("playwright");

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

    const { first_name, last_name, email, password, role, alias_email } = req.body;
    const username = email.split("@")[0];

    try {
      // Verify professor email if role is professor
      if (role === "professor") {
        if (!alias_email) {
          return res.status(400).json({ message: "Alias email is required for professor signup." });
        }

        const isVerified = await verifyProfessorEmail(email, alias_email);

        if (!isVerified) {
          return res.status(403).json({ message: "Professor email verification failed." });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO Users (first_name, last_name, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, role",
        [first_name, last_name, username, email, hashedPassword, role]
      );

      res.status(201).json({ message: "User registered successfully", role: result.rows[0].role });
    } catch (error) {
      console.error("Signup Error:", error);

      if (error.code === "23505") {
        return res.status(400).json({ message: "Email or username already exists." });
      }

      res.status(500).json({ message: "Error signing up", error: error.message });
    }
  }
);

router.post("/verify-professor", async (req, res) => {
  const { email1, email2 } = req.body;

  if (!email1 || !email2) {
      return res.status(400).json({ message: "Both professor email addresses are required." });
  }

  const isVerified = await verifyProfessorEmail(email1, email2);

  if (isVerified) {
      res.json({ message: "Professor verified successfully!" });
  } else {
      res.status(403).json({ message: "Professor verification failed. Email not found." });
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
