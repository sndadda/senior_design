const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const uploadRoutes = require("./routes/uploadRoutes");
const professorRoutes = require("./routes/professorRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
    origin: "http://10.246.250.47:3000",
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization"
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet()); 

app.use("/api/auth", authRoutes);
app.use("/api/professor", professorRoutes);


app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
