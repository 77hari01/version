const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

function checkDbVariables() {
  const missing = [];

  if (!process.env.DB_HOST) missing.push("DB_HOST");
  if (!process.env.DB_PORT) missing.push("DB_PORT");
  if (!process.env.DB_USER) missing.push("DB_USER");
  if (!process.env.DB_PASSWORD) missing.push("DB_PASSWORD");
  if (!process.env.DB_NAME) missing.push("DB_NAME");

  return missing;
}

async function getConnection() {
  const missing = checkDbVariables();

  if (missing.length > 0) {
    throw new Error("Missing Railway variables: " + missing.join(", "));
  }

  return await mysql.createConnection(dbConfig);
}

// HOME
app.get("/", (req, res) => {
  res.send(`
    <h2>IMS Version API Running</h2>
    <p><a href="/health">Health Check</a></p>
    <p><a href="/save-version?appName=IMS&userName=Hari&userEmail=test@gmail.com">Test Insert</a></p>
    <p><a href="/latest-version?appName=IMS">Latest Version</a></p>
    <p><a href="/all-versions">All Versions</a></p>
  `);
});

// HEALTH
app.get("/health", (req, res) => {
  res.json({
    success: true,
    dbConfig: {
      host: process.env.DB_HOST ? "OK" : "MISSING",
      port: process.env.DB_PORT || "MISSING",
      user: process.env.DB_USER ? "OK" : "MISSING",
      password: process.env.DB_PASSWORD ? "OK" : "MISSING",
      database: process.env.DB_NAME ? "OK" : "MISSING"
    }
  });
});

// SAVE VERSION
app.get("/save-version", async (req, res) => {
  let connection;

  try {
    const appName = req.query.appName || "IMS";
    const userName = req.query.userName || "Unknown";
    const userEmail = req.query.userEmail || "unknown@gmail.com";

    connection = await getConnection();

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS AppVersionHistory (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        AppName VARCHAR(100) NOT NULL,
        VersionNo INT NOT NULL,
        UpdatedBy VARCHAR(100),
        UpdatedEmail VARCHAR(150),
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [versionRows] = await connection.execute(
      `
      SELECT IFNULL(MAX(VersionNo), 0) + 1 AS NextVersion
      FROM AppVersionHistory
      WHERE AppName = ?
      `,
      [appName]
    );

    const nextVersion = versionRows[0].NextVersion;

    await connection.execute(
      `
      INSERT INTO AppVersionHistory
      (AppName, VersionNo, UpdatedBy, UpdatedEmail)
      VALUES (?, ?, ?, ?)
      `,
      [appName, nextVersion, userName, userEmail]
    );

    res.json({
      success: true,
      message: "Version saved successfully",
      appName,
      version: nextVersion,
      updatedBy: userName,
      updatedEmail: userEmail
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// ALL VERSIONS
app.get("/all-versions", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS AppVersionHistory (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        AppName VARCHAR(100) NOT NULL,
        VersionNo INT NOT NULL,
        UpdatedBy VARCHAR(100),
        UpdatedEmail VARCHAR(150),
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await connection.execute(`
      SELECT *
      FROM AppVersionHistory
      ORDER BY Id DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// LATEST VERSION
app.get("/latest-version", async (req, res) => {
  let connection;

  try {
    const appName = req.query.appName || "IMS";

    connection = await getConnection();

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS AppVersionHistory (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        AppName VARCHAR(100) NOT NULL,
        VersionNo INT NOT NULL,
        UpdatedBy VARCHAR(100),
        UpdatedEmail VARCHAR(150),
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("IMS Version API Running");
});
