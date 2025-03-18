const mysql = require('mysql2');

    const pool = mysql.createPool({
      host: '145.223.19.24', // Or your database host
      user: 'trac',
      password: '7TT369S@@rthi#09',
      database: 'traccar',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    module.exports = pool.promise();
