const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/", (req, res) => {
  res.send("Railway Version API Running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API working",
    database: process.env.DATABASE_URL ? "Connected variable found" : "DATABASE_URL missing"
  });
});

app.get("/setup", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS versions (
        id SERIAL PRIMARY KEY,
        app_name TEXT,
        version_no TEXT,
        description TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.json({ success: true, message: "Table created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/versions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM versions ORDER BY id DESC");
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/versions", async (req, res) => {
  try {
    const { app_name, version_no, description, created_by } = req.body;

    const result = await pool.query(
      `INSERT INTO versions 
      (app_name, version_no, description, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [app_name, version_no, description, created_by]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/versions/:id", async (req, res) => {
  try {
    const { app_name, version_no, description, created_by } = req.body;

    const result = await pool.query(
      `UPDATE versions
       SET app_name=$1, version_no=$2, description=$3, created_by=$4
       WHERE id=$5
       RETURNING *`,
      [app_name, version_no, description, created_by, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/versions/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM versions WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
