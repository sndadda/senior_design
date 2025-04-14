const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");
const db = require("../db");

const uploadRoutes = multer({ dest: "uploads/" }); 

router.post("/survey_forms", uploadRoutes.single("csv"), (req, res) => {
    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
            results.push(data);
            console.log(data)
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    const { form_title, instructions, is_default } = row;
                    await db.query(
                        `INSERT INTO SurveyForms (created_by , form_title, instructions, is_default) VALUES ($1, $2, $3,$4)`,
                        [1 , form_title, instructions, is_default === "true"]
                    );
                }
                fs.unlinkSync(req.file.path); 
                res.json({ message: "CSV uploaded and data inserted!" });
            } catch (err) {
                console.error("Error inserting into DB:", err);
                res.status(500).json({ error: "Database insert failed" });
            }
        });
});

router.post("/upload_teams", uploadRoutes.single("csv"), (req, res) => {
    const results = [];

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
                }

                fs.unlinkSync(req.file.path); 
                res.json({ message: "Team CSV uploaded and data inserted!" });
            } catch (err) {
                console.error("Database insert error:", err);
                res.status(500).json({ error: "Failed to insert data" });
            }
        });
});




router.post("/upload_team_members", uploadRoutes.single("csv"), (req, res) => {
    const results = [];

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

                    await db.query(
                        `INSERT INTO TeamMembers (
                            team_id, stud_id
                        ) VALUES ($1,$2)`,
                        [
                            team_id, student_id
                        ]
                    );
                }

                fs.unlinkSync(req.file.path); 
                res.json({ message: "TeamMembers CSV uploaded and data inserted!" });
            } catch (err) {
                console.error("Database insert error:", err);
                res.status(500).json({ error: "Failed to insert data" });
            }
        });
});



// user_id	first_name	last_name	username	email	password


router.post("/upload_students", uploadRoutes.single("csv"), (req, res) => {
    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
            results.push(data);
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    const {
                        "user_id": user_id,
                        "first_name": first_name,
                        "last_name": last_name,
                        "username": username,
                        "email": email,
                        "password": password
                    } = row;
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await db.query(
                        `INSERT INTO Users  VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                        [
                            user_id, first_name,last_name,username,email,hashedPassword,'student'
                        ]
                    );
                }

                fs.unlinkSync(req.file.path); 
                res.json({ message: "student CSV uploaded and data inserted!" });
            } catch (err) {
                console.error("Database insert error:", err);
                res.status(500).json({ error: "Failed to insert data" });
            }
        });
});


module.exports = router;
