
const { Pool, Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();


const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const createDatabaseIfNotExists = async () => {
    try {
        await client.connect();
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]);
        if (res.rowCount === 0) {
            console.log(`Database ${process.env.DB_NAME} not found. Creating...`);
            await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`Database ${process.env.DB_NAME} created successfully!`);
        }
    } catch (err) {
        console.error("Error checking/creating database:", err);
    } finally {
        await client.end();
    }
};

createDatabaseIfNotExists();

console.log("Database User:", process.env.DB_USER);
console.log("Database Host:", process.env.DB_HOST);
console.log("Database Name:", process.env.DB_NAME);
console.log("Database Password:", process.env.DB_PASSWORD);
console.log("Database Port:", process.env.DB_PORT);

// main connection pool for queries
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const initDatabase = async () => {
    try {
        const schemaPath = path.join(__dirname, "../database/nas_schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        await pool.query(schemaSql);
        console.log("Database schema applied successfully");
    } catch (err) {
        console.error("Error applying database schema:", err);
    }
};

// run schema setup 
setTimeout(initDatabase, 3000);

module.exports = pool;
