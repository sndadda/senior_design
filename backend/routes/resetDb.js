const pool = require("./db");

const resetDb = async () => {
  try {
    await pool.query("TRUNCATE TABLE EmailVerifications CASCADE;");
    await pool.query("TRUNCATE TABLE Users CASCADE;");
    console.log("Database reset.");
  } catch (err) {
    console.error("Reset error:", err);
  } finally {
    pool.end();
  }
};

resetDb();
