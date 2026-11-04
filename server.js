const express = require('express');
const helmet = require('helmet');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const { attachUser } = require('./middleware/auth');

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
// temp data:
// replace this with a db.query() on the Products + Inventory tables.
const tempData = [
    { ProductId: 1, ProductCode: 'MLK-001', ProductName: 'Whole Milk 2L', BrandName: 'Dairyland', Price: 4.99, QuantityAvailable: 24 },
    { ProductId: 2, ProductCode: 'BRD-014', ProductName: 'Whole Wheat Bread', BrandName: 'Sunrise Bakery', Price: 3.49, QuantityAvailable: 3 },
    { ProductId: 3, ProductCode: 'EGG-112', ProductName: 'Large Eggs (12)', BrandName: 'Prairie Farms', Price: 5.29, QuantityAvailable: 0 },
    { ProductId: 4, ProductCode: 'CHS-220', ProductName: 'Old Cheddar Cheese', BrandName: 'Dairyland', Price: 7.99, QuantityAvailable: 12 }
];

const tempReviews = [
    { ProductId: 1, FirstName: 'Sam', Rating: 5, ReviewText: 'Always fresh and a good price.', ReviewDate: '2026-10-02' },
    { ProductId: 1, FirstName: 'Priya', Rating: 4, ReviewText: 'Good milk, wish it came in bigger sizes.', ReviewDate: '2026-10-15' },
    { ProductId: 2, FirstName: 'Alex', Rating: 3, ReviewText: 'Tasty but it runs out fast.', ReviewDate: '2026-10-20' }
];

app.get('/', (req, res) => {
    const q = (req.query.q || '').trim();
    const products = q
        ? tempData.filter(p =>
            p.ProductName.toLowerCase().includes(q.toLowerCase()) ||
            p.ProductCode.toLowerCase() === q.toLowerCase())
        : [];
    res.render('home', { q, searched: q !== '', products });
});

app.get('/product/:id', (req, res) => {
    const product = tempData.find(p => p.ProductId === Number(req.params.id));
    if (!product) {
        return res.status(404).render('error', { message: 'Product not found.' });
    }
    const reviews = tempReviews.filter(r => r.ProductId === product.ProductId);
    const avgRating = reviews.length
        ? (reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length).toFixed(1)
        : null;
    res.render('product', { product, reviews, avgRating });
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
