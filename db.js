const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_password", // change this
  database: "ktu_simple"
});

module.exports = pool;
