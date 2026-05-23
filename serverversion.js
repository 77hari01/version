const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const mysqlUrl = process.env.MYSQL_URL;

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    success: true,
    mysqlUrl: mysqlUrl ? "OK" : "MISSING"
  });
});

// SAVE VERSION
app.get("/save-version", async (req, res) => {

  let connection;

  try {

    const appName = req.query.appName || "IMS";
    const userName = req.query.userName || "Unknown";
    const userEmail = req.query.userEmail || "unknown@gmail.com";

    connection = await mysql.createConnection(mysqlUrl);

    // CREATE TABLE IF NOT EXISTS
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

    // GET NEXT VERSION
    const [rows] = await connection.execute(
      `
      SELECT IFNULL(MAX(VersionNo),0)+1 AS NextVersion
      FROM AppVersionHistory
      WHERE AppName = ?
      `,
      [appName]
    );

    const nextVersion = rows[0].NextVersion;

    // INSERT RECORD
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
      version: nextVersion
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

// GET ALL VERSIONS
app.get("/all-versions", async (req, res) => {

  let connection;

  try {

    connection = await mysql.createConnection(mysqlUrl);

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

// GET LATEST VERSION
app.get("/latest-version", async (req, res) => {

  let connection;

  try {

    const appName = req.query.appName || "IMS";

    connection = await mysql.createConnection(mysqlUrl);

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

// HOME PAGE
app.get("/", (req, res) => {

  res.send(`
    <h2>IMS Version API Running</h2>

    <p>
      <a href="/health">Health</a>
    </p>

    <p>
      <a href="/all-versions">All Versions</a>
    </p>
  `);

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});
