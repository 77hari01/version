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
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT)
};

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Railway server is running"
  });
});

// Home page
app.get("/", async (req, res) => {

  try {

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(`
      SELECT *
      FROM AppVersionHistory
      ORDER BY Id DESC
    `);

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
      <html>
      <head>
        <title>IMS Version History</title>

        <style>
          body{
            font-family:Arial;
            padding:20px;
            background:#f4f6f8;
          }

          table{
            width:100%;
            border-collapse:collapse;
            background:white;
          }

          th,td{
            border:1px solid #ddd;
            padding:10px;
          }

          th{
            background:#1f3c88;
            color:white;
          }
        </style>

      </head>

      <body>

        <h1>IMS App Version History</h1>

        <p>
          <a href="/all-versions">View JSON Data</a>
        </p>

        <table>

          <tr>
            <th>ID</th>
            <th>App Name</th>
            <th>Version</th>
            <th>Updated By</th>
            <th>Email</th>
            <th>Updated At</th>
          </tr>

          ${tableRows || `
            <tr>
              <td colspan="6">No Records Found</td>
            </tr>
          `}

        </table>

      </body>
      </html>
    `);

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

// Save version
app.get("/save-version", async (req, res) => {

  try {

    const { appName, userName, userEmail } = req.query;

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `
      SELECT IFNULL(MAX(VersionNo),0)+1 AS NextVersion
      FROM AppVersionHistory
      WHERE AppName = ?
      `,
      [appName]
    );

    const nextVersion = rows[0].NextVersion;

    await connection.execute(
      `
      INSERT INTO AppVersionHistory
      (AppName, VersionNo, UpdatedBy, UpdatedEmail)
      VALUES (?, ?, ?, ?)
      `,
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

// Latest version
app.get("/latest-version", async (req, res) => {

  try {

    const { appName } = req.query;

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `
      SELECT *
      FROM AppVersionHistory
      WHERE AppName = ?
      ORDER BY Id DESC
      LIMIT 1
      `,
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

// All versions
app.get("/all-versions", async (req, res) => {

  try {

    const connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(`
      SELECT *
      FROM AppVersionHistory
      ORDER BY Id DESC
    `);

    await connection.end();

    res.json(rows);

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Railway Backend Running");
});
