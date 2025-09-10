// db.js
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432, // default PostgreSQL port
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "root",
});

module.exports = pool;
