const pool = require('../db');

const PRODUCT_COLUMNS = `
    p.ProductId AS id, p.ProductCode AS code, p.ProductName AS name, p.BrandName AS brand,
    p.Description AS description, p.Price AS price, p.ImageUrl AS imageUrl,
    p.CategoryId AS categoryId, COALESCE(i.QuantityAvailable, 0) AS quantity`;

async function findAll() {
    const [rows] = await pool.execute(
        `SELECT ${PRODUCT_COLUMNS}, c.CategoryName AS category
         FROM Products p
         JOIN Categories c ON c.CategoryId = p.CategoryId
         LEFT JOIN Inventory i ON i.ProductId = p.ProductId
         ORDER BY p.ProductId DESC`
    );
    return rows;
}

async function findById(id) {
    const [rows] = await pool.execute(
        `SELECT ${PRODUCT_COLUMNS}
         FROM Products p
         LEFT JOIN Inventory i ON i.ProductId = p.ProductId
         WHERE p.ProductId = ?`,
        [id]
    );
    return rows[0];
}

async function findCategories() {
    const [rows] = await pool.execute(
        'SELECT CategoryId AS id, CategoryName AS name FROM Categories ORDER BY CategoryName'
    );
    return rows;
}

// Products and Inventory are separate tables, so write both or neither
async function inTransaction(work) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// Returns the new product id. Database errors (like ER_DUP_ENTRY) are passed up to the caller.

async function create(p) {
    return inTransaction(async conn => {
        const [result] = await conn.execute(
            `INSERT INTO Products
            (ProductCode, ProductName, BrandName, Description,
             Price, ImageUrl, CategoryId)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                p.code,
                p.name,
                p.brand,
                p.description || null,
                Number(p.price),
                p.imageUrl || null,
                Number(p.categoryId)
            ]
        );

        await conn.execute(
            'INSERT INTO Inventory (ProductId, QuantityAvailable) VALUES (?, ?)',
            [result.insertId, Number(p.quantity)]
        );

        return result.insertId;
    });
}


async function update(id, p) {
    return inTransaction(async conn => {
        await conn.execute(
            `UPDATE Products
             SET ProductCode = ?, ProductName = ?, BrandName = ?, Description = ?,
                 Price = ?, ImageUrl = ?, CategoryId = ?
             WHERE ProductId = ?`,
            [p.code, p.name, p.brand, p.description || null,
             Number(p.price), p.imageUrl || null, Number(p.categoryId), id]
        );
        await conn.execute(
            `INSERT INTO Inventory (ProductId, QuantityAvailable) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE QuantityAvailable = ?`,
            [id, Number(p.quantity), Number(p.quantity)]
        );
    });
}

// Returns true if a row was deleted
async function remove(id) {
    const [result] = await pool.execute('DELETE FROM Products WHERE ProductId = ?', [id]);
    return result.affectedRows > 0;
}
async function createCategory(name) {
    const [result] = await pool.execute('INSERT INTO Categories (CategoryName) VALUES (?)', [name]);
    return result.insertId;
}

module.exports = { findAll, findById, findCategories, createCategory, create, update, remove };


