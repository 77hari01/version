const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT)
};

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running"
  });
});

app.get("/save-version", async (req, res) => {
  try {
    const { appName, userName, userEmail } = req.query;

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT IFNULL(MAX(VersionNo), 0) + 1 AS NextVersion
       FROM AppVersionHistory
       WHERE AppName = ?`,
      [appName]
    );

    const nextVersion = rows[0].NextVersion;

    await connection.execute(
      `INSERT INTO AppVersionHistory
       (AppName, VersionNo, UpdatedBy, UpdatedEmail)
       VALUES (?, ?, ?, ?)`,
      [appName, nextVersion, userName, userEmail]
    );

    await connection.end();

    res.json({
      success: true,
      message: "Version saved successfully",
      version: nextVersion
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/latest-version", async (req, res) => {
  try {
    const appName = req.query.appName || "IMS Incident System";

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT *
       FROM AppVersionHistory
       WHERE AppName = ?
       ORDER BY Id DESC
       LIMIT 1`,
      [appName]
    );

    await connection.end();

    res.json(rows[0] || {});

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/all-versions", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT *
       FROM AppVersionHistory
       ORDER BY Id DESC`
    );

    await connection.end();

    res.json(rows);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/", async (req, res) => {
  res.send(`
    <h2>IMS Version API Running</h2>
    <p><a href="/health">Health Check</a></p>
    <p><a href="/all-versions">All Versions JSON</a></p>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
