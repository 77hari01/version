const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "IMS",
  port: Number(process.env.DB_PORT || 3306)
};

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running"
  });
});

// Home page - check version history in browser
app.get("/", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT *
       FROM AppVersionHistory
       ORDER BY Id DESC`
    );

    await connection.end();

    const tableRows = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.Id)}</td>
        <td>${escapeHtml(row.AppName)}</td>
        <td>${escapeHtml(row.VersionNo)}</td>
        <td>${escapeHtml(row.UpdatedBy)}</td>
        <td>${escapeHtml(row.UpdatedEmail)}</td>
        <td>${escapeHtml(row.UpdatedAt)}</td>
      </tr>
    `).join("");

    res.send(`
      <h1>App Version History</h1>
      <p>
        <a href="/all-versions">All versions JSON</a>
      </p>
      <table border="1" cellpadding="10" cellspacing="0">
        <tr>
          <th>ID</th>
          <th>App Name</th>
          <th>Version No</th>
          <th>Updated By</th>
          <th>Updated Email</th>
          <th>Updated At</th>
        </tr>
        ${tableRows || '<tr><td colspan="6">No version records found</td></tr>'}
      </table>
    `);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save version record
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

// Get latest version
app.get("/latest-version", async (req, res) => {
  try {
    const { appName } = req.query;

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

// Get all version records
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

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server running: http://localhost:${port}`);
});
