const pool = require('../db');

async function findByEmail(email) {
    const [rows] = await pool.execute(
        `SELECT UserId AS id, FirstName AS firstName, PasswordHash AS passwordHash, Role AS role
         FROM Users WHERE Email = ? LIMIT 1`,
        [email]
    );
    return rows[0];
}

// Returns the new user id. Throws ER_DUP_ENTRY if the email already exists.
async function create({ firstName, lastName, email, passwordHash, role }) {
    const [result] = await pool.execute(
        'INSERT INTO Users (FirstName, LastName, Email, PasswordHash, Role) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, passwordHash, role]
    );
    return result.insertId;
}

module.exports = { findByEmail, create };