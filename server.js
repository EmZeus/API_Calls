const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

const pool = mysql.createPool({
  host: '145.223.19.24',
  user: 'root@localhost', // Replace with your MySQL username
  password: 'S@@rthi#097TT369', // Replace with your MySQL password
  database: 'traccar', // Replace with your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get('/api/data', (req, res) => {

  pool.query('SELECT * FROM tc_devices', (err, results) => { // Replace with your table name
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});