const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306)
};

app.get("/", (req, res) => {
  res.send("IMS Version API Running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    dbConfig: {
      host: dbConfig.host ? "OK" : "MISSING",
      user: dbConfig.user ? "OK" : "MISSING",
      password: dbConfig.password ? "OK" : "MISSING",
      database: dbConfig.database ? "OK" : "MISSING",
      port: dbConfig.port
    }
  });
});

app.get("/save-version", async (req, res) => {
  let connection;

  try {
    const appName = req.query.appName || "IMS Incident System";
    const userName = req.query.userName || "Unknown";
    const userEmail = req.query.userEmail || "unknown@email.com";

    connection = await mysql.createConnection(dbConfig);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS AppVersionHistory (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        AppName VARCHAR(100),
        VersionNo INT,
        UpdatedBy VARCHAR(100),
        UpdatedEmail VARCHAR(150),
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    res.json({
      success: true,
      message: "Version saved successfully",
      version: nextVersion
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/all-versions", async (req, res) => {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT * FROM AppVersionHistory ORDER BY Id DESC`
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/latest-version", async (req, res) => {
  let connection;

  try {
    const appName = req.query.appName || "IMS Incident System";

    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
      `SELECT * FROM AppVersionHistory
       WHERE AppName = ?
       ORDER BY Id DESC
       LIMIT 1`,
      [appName]
    );

    res.json(rows[0] || {});

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  } finally {
    if (connection) await connection.end();
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("IMS Version API running");
});
