const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// MySQL Connection Config
const dbConfig = {
  host: '145.223.19.24', // Database host
  port: 3306,            // MySQL port
  user: 'trac',
  password: '7TT369S@@rthi#09',
  database: 'traccar',
  connectTimeout: 60000  // 60 seconds timeout
};

// Route to count tables in the database
app.get('/api/tables-count', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute("SHOW TABLES FROM traccar");
    const tableCount = rows.length;
    res.json({ message: `There are ${tableCount} tables` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// ✅ New API to fetch all records from `tc_computed_data` ordered by `deviceid`
app.get('/api/computed-data', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Fetching all records from tc_computed_data ordered by deviceid
    const [rows] = await connection.execute("SELECT * FROM `tc_computed_data` ORDER BY `deviceid` ASC");
    
    res.json(rows); // Send data as JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});
app.get('/api/devices', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Fetching all records from tc_computed_data ordered by deviceid
    const [rows] = await connection.execute("SELECT name FROM `tc_devices` ORDER BY name ASC");
    
    res.json(rows); // Send data as JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/distance', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Extract query parameters
    const { deviceid, startDate, endDate } = req.query;
    
    if (!deviceid) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    let query = `
      SELECT SUM(daily_distance) AS total_distance 
      FROM tc_computed_data 
      WHERE deviceid = ? 
    `;

    const queryParams = [deviceid];

    if (startDate && endDate) {
      query += ` AND day BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND day = ?`;
      queryParams.push(startDate);
    }

    // Execute the query
    const [rows] = await connection.execute(query, queryParams);
    
    res.json({ deviceid, total_distance: rows[0].total_distance || 0 }); // Send results as JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/consumption', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Extract query parameters
    const { deviceid, startDate, endDate } = req.query;
    
    if (!deviceid) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    let query = `
      SELECT SUM(daily_running_consumption) AS total_consumption 
      FROM tc_computed_data 
      WHERE deviceid = ? 
    `;

    const queryParams = [deviceid];

    if (startDate && endDate) {
      query += ` AND day BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND day = ?`;
      queryParams.push(startDate);
    }

    // Execute the query
    const [rows] = await connection.execute(query, queryParams);
    
    res.json({ deviceid, total_consumption: rows[0].total_consumption || 0 }); // Send results as JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});


app.get('/api/fuel-average', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Extract query parameters
    const { deviceid, startDate, endDate } = req.query;
    
    if (!deviceid) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    let query = `
      SELECT 
        SUM(daily_distance) AS total_distance, 
        SUM(daily_running_consumption) AS total_consumption,
        SUM(engine_on_hours) AS total_engine_on_hours,
        SUM(system_on_hours) AS total_system_on_hours,
        SUM(engine_idle_time) AS total_engine_idle_time,
        SUM(system_off_hours) AS total_system_off_hours
      FROM tc_computed_data 
      WHERE deviceid = ?
    `;

    const queryParams = [deviceid];

    if (startDate && endDate) {
      query += ` AND day BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND day = ?`;
      queryParams.push(startDate);
    }

    // Execute the query
    const [rows] = await connection.execute(query, queryParams);
    
    const totalDistance = rows[0].total_distance || 0;
    const totalConsumption = rows[0].total_consumption || 0;
    const totalEngineOnHours = rows[0].total_engine_on_hours || 0;
    const totalSystemOnHours = rows[0].total_system_on_hours || 0;
    const totalEngineIdleTime = rows[0].total_engine_idle_time || 0;
    const totalSystemOffHours = rows[0].total_system_off_hours || 0;
    
    // Calculate fuel average (distance per unit of fuel)
    const fuelAverage = totalConsumption > 0 ? (totalDistance / totalConsumption).toFixed(2) : 0;

    res.json({ 
      deviceid, 
      total_distance: totalDistance, 
      total_consumption: totalConsumption, 
      fuel_average: fuelAverage,
      total_engine_on_hours: totalEngineOnHours,
      total_system_on_hours: totalSystemOnHours,
      total_engine_idle_time: totalEngineIdleTime,
      total_system_off_hours: totalSystemOffHours
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/average-metrics', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Extract query parameters
    const { deviceid, startDate, endDate } = req.query;
    
    if (!deviceid) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    let query = `
      SELECT 
        ROUND(AVG(CASE WHEN CAST(JSON_EXTRACT(attributes, '$.io88') AS DECIMAL(10,2)) > 200 
                  THEN CAST(JSON_EXTRACT(attributes, '$.io9') AS DECIMAL(10,2))/1000 ELSE NULL END), 2) AS avg_Ain,
        ROUND(AVG(CASE WHEN CAST(JSON_EXTRACT(attributes, '$.io88') AS DECIMAL(10,2)) > 200 
                  THEN CAST(JSON_EXTRACT(attributes, '$.io85') AS DECIMAL(10,2)) ELSE NULL END), 2) AS avg_Load,
        ROUND(AVG(CASE WHEN CAST(JSON_EXTRACT(attributes, '$.io88') AS DECIMAL(10,2)) > 200 
                  THEN CAST(JSON_EXTRACT(attributes, '$.io24') AS DECIMAL(10,2)) ELSE NULL END), 2) AS avg_Speed,
        ROUND(AVG(CASE WHEN CAST(JSON_EXTRACT(attributes, '$.io88') AS DECIMAL(10,2)) > 200 
                  THEN CAST(JSON_EXTRACT(attributes, '$.io88') AS DECIMAL(10,2)) ELSE NULL END), 2) AS avg_RPM
      FROM tc_positions
      WHERE deviceid = ?
    `;

    const queryParams = [deviceid];

    if (startDate && endDate) {
      query += ` AND DATE(CONVERT_TZ(devicetime, '+00:00', '+05:30')) BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND DATE(CONVERT_TZ(devicetime, '+00:00', '+05:30')) = ?`;
      queryParams.push(startDate);
    }

    // Execute the query
    const [rows] = await connection.execute(query, queryParams);
    
    if (rows.length === 0) {
      return res.json({ message: "No data found for the given period." });
    }

    const avgAin = rows[0].avg_Ain || 0;
    const avgLoad = rows[0].avg_Load || 0;
    const avgSpeed = rows[0].avg_Speed || 0;
    const avgRPM = rows[0].avg_RPM || 0;

    res.json({ 
      deviceid, 
      avg_Ain: avgAin,
      avg_Load: avgLoad,
      avg_Speed: avgSpeed,
      avg_RPM: avgRPM
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/current-positions', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT p.deviceid, d.name AS device_name, p.latitude, p.longitude, p.devicetime 
      FROM tc_positions p
      JOIN tc_devices d ON p.deviceid = d.id
      WHERE (p.deviceid, p.devicetime) IN (
        SELECT deviceid, MAX(devicetime) 
        FROM tc_positions 
        GROUP BY deviceid
      )
      ORDER BY p.deviceid ASC;
    `;

    const [rows] = await connection.execute(query);

    res.json(rows); // Send results as JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
