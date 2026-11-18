require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const db = require('./db');
const { attachUser, setToken, requireRole } = require('./middleware/auth');

const app = express();

app.engine( 'handlebars', engine({
    extname: '.handlebars',
    defaultLayout: 'main',
    helpers: {
        formatPrice: price => `$${Number(price).toFixed(2)}`,
        stockText: qty => (qty === 0 ? 'Out of stock' : qty < 5 ? `Only ${qty} left` : `In stock (${qty})`),
        eq: (a, b) => String(a) === String(b),
        stars: n => '★'.repeat(n) + '☆'.repeat(5 - n)
    }
}));

app.set('view engine', 'handlebars');
app.set(express.urlencoded({ extended: false }));

// Middleware
app.use(helmet());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(attachUser);

// Routes
// app.get('/', (req, res) => res.render('home'));

// ***************************************************************************************************************************************************************
// Shared query: a product with its category and stock
const PRODUCT_SELECT = `
    SELECT p.ProductId, p.ProductCode, p.ProductName, p.BrandName, p.Description,
           p.Price, p.ImageUrl, c.CategoryName,
           COALESCE(i.QuantityAvailable, 0) AS QuantityAvailable
    FROM Products p
    JOIN Categories c ON c.CategoryId = p.CategoryId
    LEFT JOIN Inventory i ON i.ProductId = p.ProductId`;

// Home page and search
app.get('/', async (req, res) => {
    const q = (req.query.q || '').trim();
    let products = [];
    if (q) {
        [products] = await db.query(
            `${PRODUCT_SELECT}
             WHERE p.ProductName LIKE ? OR p.ProductCode = ?
             ORDER BY p.ProductName`,
            [`%${q}%`, q]
        );
    }
    res.render('home', { q, searched: q !== '', products });
});

// Product details
app.get('/product/:id', async (req, res) => {
    const [rows] = await db.query(`${PRODUCT_SELECT} WHERE p.ProductId = ?`, [req.params.id]);
    if (rows.length === 0) {
        return res.status(404).render('error', { message: 'Product not found.' });
    }
    const product = rows[0];

    const [reviews] = await db.query(
        `SELECT r.Rating, r.ReviewText, u.FirstName,
                DATE_FORMAT(r.ReviewDate, '%Y-%m-%d') AS ReviewDate
         FROM ProductReviews r
         JOIN Users u ON u.UserId = r.UserId
         WHERE r.ProductId = ?
         ORDER BY r.ReviewDate DESC`,
        [product.ProductId]
    );
    const avgRating = reviews.length
        ? (reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length).toFixed(1)
        : null;

    res.render('product', { product, reviews, avgRating });
});

// Store dashboard (store accounts only)
app.get('/admin', requireRole('store'), async (req, res) => {
    const [products] = await db.query(`${PRODUCT_SELECT} ORDER BY p.ProductName`);
    res.render('admin', { products });
});

// ***************************************************************************************************************************************************************

app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.use(require('./routes/auth'));

// Page not found
app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found.'});
});

// Server error
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
