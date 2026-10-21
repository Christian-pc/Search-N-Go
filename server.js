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
        eq: (a, b) => String(a) === String(b)
    }
}));

app.set('view engine', 'handlebars');
app.set(express.urlencoded({ extended: false }));

// Middleware
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(attachUser);

// Routes
app.get('/', (req, res) => res.render('home'));
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
