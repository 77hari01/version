const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const dbUrl = process.env.MYSQL_URL;

app.get("/health", (req, res) => {
  res.json({
    success: true,
    mysqlUrl: dbUrl ? "OK" : "MISSING"
  });
});

async function getConnection() {
  if (!dbUrl) {
    throw new Error("MYSQL_URL is missing in Railway Variables");
  }

  return await mysql.createConnection(dbUrl);
}

app.get("/save-version", async (req, res) => {
  let connection;

  try {
    const appName = req.query.appName || "IMS Incident System";
    const userName = req.query.userName || "Unknown";
    const userEmail = req.query.userEmail || "unknown@email.com";

    connection = await getConnection();

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
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/all-versions", async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const [rows] = await connection.execute(
      `SELECT * FROM AppVersionHistory ORDER BY Id DESC`
    );

    res.json(rows);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/latest-version", async (req, res) => {
  let connection;

  try {
    const appName = req.query.appName || "IMS Incident System";

    connection = await getConnection();

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
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.get("/", (req, res) => {
  res.send("IMS Version API Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});
