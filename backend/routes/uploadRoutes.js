const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
const db = require("../db");
const jwt = require("jsonwebtoken");


const uploadRoutes = multer({ dest: "uploads/" }); 



const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      req.user = user;
      next();
    });
  };

  router.get("/CsvUploader", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/CsvUploader")); 
});

  router.post("/survey_forms", authenticateToken, uploadRoutes.single("csv"), (req, res) => {
    const results = [];
    const failedEntries = [];
    let successCount = 0;
    const user_id = req.user.user_id;

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
            // 
            if (Object.values(data).some(value => value && value.trim() !== "")) {
                results.push(data);
            }
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    const { form_title, instructions, is_default } = row;
                    const errors = [];
                    console.log(form_title, instructions, is_default)
                    // check form_title
                    if (!form_title || form_title.trim() === "") {
                        errors.push("form_title is required");
                    }

                    // check is_default（true/false/）
                    if (is_default && !["true", "false"].includes(is_default.toLowerCase())) {
                        errors.push("is_default must be 'true' or 'false' if provided");
                    }

                    if (errors.length > 0) {
                        failedEntries.push({ form_title: form_title || "(empty)", reason: errors.join(", ") });
                        continue;
                    }

                    // data
                    await db.query(
                        `INSERT INTO SurveyForms (created_by, form_title, instructions, is_default) 
                         VALUES ($1, $2, $3, $4)`,
                        [
                            user_id,
                            form_title.trim(),          // 
                            instructions ? instructions.trim() : null,
                            is_default ? is_default.toLowerCase() === "true" : false
                        ]
                    );

                    successCount++;
                }

                fs.unlinkSync(req.file.path);

                res.json({
                    message: "SurveyForms CSV processed.",
                    successCount: successCount,
                    failedCount: failedEntries.length,
                    failedData: failedEntries
                });

            } catch (err) {
                console.error("Error inserting into DB:", err);
                res.status(500).json({ error: "Database insert failed" });
            }
        });
});



router.post("/upload_teams", uploadRoutes.single("csv"), (req, res) => {
    const results = [];
    const failedTeamIds = [];
    let successCount = 0;

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
            results.push(data);
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    const {
                        "Group Code": team_id,
                        "Title": title,
                        "Description": description,
                        "Group Set": group_set,
                        "Available": available,
                        "Personalization": personalization,
                        "Self Enroll": self_enroll,
                        "Max Enrollment": max_enrollment,
                        "Show Members": show_members,
                        "Sign Up From Group List": sign_up_from_group_list,
                        "Sign Up Name": sign_up_name,
                        "Sign Up Instructions": sign_up_instructions
                    } = row;

                    // check team_id
                    const checkResult = await db.query(
                        "SELECT 1 FROM Team WHERE team_id = $1",
                        [team_id]
                    );

                    if (checkResult.rows.length > 0) {
                        // 
                        failedTeamIds.push({"teamid":team_id});
                        continue;
                    }

                    // new team
                    await db.query(
                        `INSERT INTO Team (
                            team_id, title, description, group_set, available,
                            personalization, self_enroll, max_enrollment,
                            show_members, sign_up_from_group_list,
                            sign_up_name, sign_up_instructions
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                        [
                            team_id, title, description || null, group_set, available,
                            personalization, self_enroll,
                            max_enrollment ? parseInt(max_enrollment) : null,
                            show_members, sign_up_from_group_list,
                            sign_up_name, sign_up_instructions
                        ]
                    );
                    successCount++;
                }

                fs.unlinkSync(req.file.path);

                res.json({
                    message: "Team CSV processed.",
                    successCount: successCount,
                    failedCount: failedTeamIds.length,
                    failedData: failedTeamIds
                });
            } catch (err) {
                console.error("Database operation error:", err);
                res.status(500).json({ error: "Failed to process data" });
            }
        });
});




router.post("/upload_team_members", uploadRoutes.single("csv"), (req, res) => {
    const results = [];
    const failedEntries = [];
    let successCount = 0;

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
            results.push(data);
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    const {
                        "Group Code": team_id,
                        "Student Id": student_id
                    } = row;

                    const errors = [];

                    // check team_id on Team
                    const teamCheck = await db.query("SELECT 1 FROM Team WHERE team_id = $1", [team_id]);
                    if (teamCheck.rows.length === 0) {
                        errors.push("team_id not found");
                    }

                    // check student_id on Users
                    const studentCheck = await db.query("SELECT 1 FROM Users WHERE user_id = $1", [student_id]);
                    if (studentCheck.rows.length === 0) {
                        errors.push("student_id not found");
                    }

                    // check team_id + student_id on TeamMembers
                    const combinationCheck = await db.query(
                        "SELECT 1 FROM TeamMembers WHERE team_id = $1 AND stud_id = $2",
                        [team_id, student_id]
                    );
                    if (combinationCheck.rows.length > 0) {
                        errors.push("team_id and student_id combination already exists");
                    }

                    if (errors.length > 0) {
                        failedEntries.push({ team_id, student_id, reason: errors.join(", ") });
                        continue;
                    }

                    await db.query(
                        `INSERT INTO TeamMembers (team_id, stud_id) VALUES ($1, $2)`,
                        [team_id, student_id]
                    );

                    successCount++;
                }

                fs.unlinkSync(req.file.path);

                res.json({
                    message: "TeamMembers CSV processed.",
                    successCount: successCount,
                    failedCount: failedEntries.length,
                    failedData: failedEntries
                });
            } catch (err) {
                console.error("Database insert error:", err);
                res.status(500).json({ error: "Failed to insert data" });
            }
        });
});



// user_id	first_name	last_name	username	email	password


router.post("/upload_students", uploadRoutes.single("csv"), (req, res) => {
    const results = [];
    const failedRows = [];
    let successCount = 0;

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
            results.push(data);
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    const {
                        first_name,
                        last_name,
                        username
                    } = row;

                    const errors = [];

                    // Basic field validation
                    if (!first_name || !last_name || !username) {
                        errors.push("Missing one or more required fields");
                    }

                    if (errors.length > 0) {
                        failedRows.push({ username, reason: errors.join(", ") });
                        continue;
                    }

                    try {
                        await db.query(
                            `INSERT INTO StudentCSVImport (first_name, last_name, username)
                             VALUES ($1, $2, $3)`,
                            [first_name, last_name, username]
                        );
                        successCount++;
                    } catch (err) {
                        if (err.code === '23505') { // Unique violation (if you added constraint later)
                            failedRows.push({ username, reason: "Username already exists in import table" });
                        } else {
                            failedRows.push({ username, reason: "Database error" });
                            console.error("Insert error:", err);
                        }
                    }
                }

                res.json({
                    message: "CSV upload complete.",
                    successCount,
                    failedCount: failedRows.length,
                    failedData: failedRows
                });
            } catch (err) {
                console.error("Processing error:", err);
                res.status(500).json({ error: "Failed to process file" });
            } finally {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error("File deletion error:", err);
                });
            }
        })
        .on("error", (err) => {
            console.error("CSV reading error:", err);
            res.status(500).json({ error: "Failed to read CSV" });
        });
});


module.exports = router;