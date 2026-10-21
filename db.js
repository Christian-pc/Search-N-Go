const mysql = require('mysql2/promise');

// Connection pool: the app reuses these connections for every query
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME || 'SearchNGO',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;