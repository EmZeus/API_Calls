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

    // Updated column names in SELECT
    let query = `
      SELECT 
        SUM(daily_distance) AS total_distance, 
        SUM(daily_running_consumption) AS total_consumption,
        SUM(engine_running_hours) AS total_engine_running_hours,
        SUM(system_running_hours) AS total_system_running_hours,
        SUM(engine_idle_running_time) AS total_engine_idle_running_time,
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

    // If no rows, return zeroed data
    if (!rows.length) {
      return res.json({
        deviceid,
        total_distance: 0,
        total_consumption: 0,
        fuel_average: 0,
        total_engine_running_hours: 0,
        total_system_running_hours: 0,
        total_engine_idle_running_time: 0,
        total_system_off_hours: 0
      });
    }

    // Extract row data
    const totalDistance = rows[0].total_distance || 0;
    const totalConsumption = rows[0].total_consumption || 0;
    const totalEngineRunningHours = rows[0].total_engine_running_hours || 0;
    const totalSystemRunningHours = rows[0].total_system_running_hours || 0;
    const totalEngineIdleRunningTime = rows[0].total_engine_idle_running_time || 0;
    const totalSystemOffHours = rows[0].total_system_off_hours || 0;

    // Calculate fuel average (distance per unit of fuel)
    const fuelAverage = totalConsumption > 0 
      ? (totalDistance / totalConsumption).toFixed(2) 
      : 0;

    res.json({ 
      deviceid, 
      total_distance: totalDistance, 
      total_consumption: totalConsumption, 
      fuel_average: fuelAverage,
      total_engine_running_hours: totalEngineRunningHours,
      total_system_running_hours: totalSystemRunningHours,
      total_engine_idle_running_time: totalEngineIdleRunningTime,
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

app.get('/api/weekly-fuel-average', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Extract query parameters
    const { deviceid, startDate, endDate } = req.query;

    if (!deviceid) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    // Base query grouping by week (YEARWEEK).
    // Using YEARWEEK(day, 1) to treat Monday as the first day of the week.
    // If your MySQL version is older or you prefer Sunday-based weeks, omit the ", 1".
    let query = `
      SELECT 
        YEARWEEK(day, 1) AS yearweek,
        MIN(day) AS week_start,
        MAX(day) AS week_end,
        SUM(daily_distance) AS total_distance,
        SUM(daily_running_consumption) AS total_consumption,
        /* 
           If total_consumption is > 0, compute the ratio;
           else 0 to avoid division by zero.
        */
        CASE 
          WHEN SUM(daily_running_consumption) > 0 
          THEN ROUND(SUM(daily_distance) / SUM(daily_running_consumption), 2)
          ELSE 0
        END AS fuel_average
      FROM tc_computed_data
      WHERE deviceid = ?
    `;

    const queryParams = [deviceid];

    // Optionally filter by startDate / endDate
    if (startDate && endDate) {
      query += ` AND day BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND day >= ?`;
      queryParams.push(startDate);
    } else if (endDate) {
      query += ` AND day <= ?`;
      queryParams.push(endDate);
    }

    // Group by the weekly partition
    query += `
      GROUP BY YEARWEEK(day, 1)
      ORDER BY week_start ASC
    `;

    // Execute the query
    const [rows] = await connection.execute(query, queryParams);

    // If no data found, return an empty array or a custom message
    if (!rows.length) {
      return res.json([]);
    }

    res.json(rows); // Return the grouped data as JSON

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
