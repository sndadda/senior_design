const express = require("express");
const session = require("express-session");
let { Pool } = require("pg");
const pg = require("pg");
const path = require('path');
const bcrypt = require("bcrypt");
require('dotenv').config();


let app = express();
let port = 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(
    session({
      secret: "Secret_key_session",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    })
  );

// Database connection setup using the .env file
// Make sure to include postgres information in .env
const db = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  
  db.connect()
    .then(() => console.log(`Connected to database ${process.env.DB_NAME}`))
    .catch((err) => console.error("Error connecting to database:", err));


// Route to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

// Signup Route
app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
        const userExists = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            "INSERT INTO users (email, password, account_type) VALUES ($1, $2, $3) RETURNING email, password, account_type",
            [email, hashedPassword, "student"]
        );

        req.session.userId = result.rows[0].id;
        req.session.email = result.rows[0].email;

        res.status(201).json({
            message: "User created successfully",
            user: { id: result.rows[0].id, email: result.rows[0].email },
        });
    } 
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Error creating user" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        req.session.userId = user.id;
        req.session.email = user.email;

        res.json({
            message: "Login successful",
            user: { 
              id: user.id, 
              email: user.email, 
              account_type: user.account_type  // 'student' or 'professor'
            },
          });

    } 
    catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Error logging in" });
    }
});

// Logout Route
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Error logging out" });
        }
        res.json({ message: "Logged out successfully" });
    });
});

// Get Current User
app.get("/user", (req, res) => {
    if (req.session.userId) {
        res.json({
            isLoggedIn: true,
            user: { id: req.session.userId, email: req.session.email },
        });
    } 
    else {
        res.status(404).json({ isLoggedIn: false });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
