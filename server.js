const fs = require('fs');
const path = require('path');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
    process.loadEnvFile(envFile);
}

const express = require('express');
const helmet = require('helmet');
const { engine } = require('express-handlebars');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('./db');
const { attachUser, setToken, requireRole } = require('./middleware/auth');
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

// Middleware
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(attachUser);

// Routes
app.get('/', (req, res) => res.render('home'));
app.get('/login', (req, res) => res.render('login'));

app.get('/admin/login', (req, res) => res.redirect('/login'));

app.get('/admin/register', (req, res) => {
    if (!process.env.ADMIN_SIGNUP_KEY) {
        return res.status(503).render('error', { message: 'Admin registration is not configured.' });
    }
    return res.render('admin-register');
});
app.get('/register', (req, res) => res.render('register'));




















// Authenticate users and admins through the same form, then route by stored account role.
app.post(['/login', '/admin/login'], async (req, res) => {
    
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return res.status(400).render('login', {
            error: 'Enter a valid email and password.',
            email: typeof email === 'string' ? email.trim() : ''
        });
    }

    
    const [users] = await pool.execute(
        'SELECT UserId AS id, FirstName AS firstName, PasswordHash AS passwordHash, Role AS role FROM Users WHERE Email = ? LIMIT 1',
        [email.trim()]
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).render('login', {
            error: 'Invalid email or password.',
            email: email.trim()
        });
    }

    
    setToken(res, user);
    return res.redirect(user.role === 'admin' ? '/admin' : '/');
});

app.post('/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    return res.redirect('/');
});



// Create public signups as customer accounts; never accept a role from the submitted form.
app.post('/register', async (req, res) => {
    
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    if (
        typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length > 50 ||
        typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length > 50 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 100 ||
        typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 ||
        typeof confirmPassword !== 'string' || password !== confirmPassword
    ) {
        return res.status(400).render('register', {
            error: 'Enter valid details and make sure the passwords match.',
            firstName: typeof firstName === 'string' ? firstName : '',
            lastName: typeof lastName === 'string' ? lastName : '',
            email: typeof email === 'string' ? email : ''
        });
    }


    // Hash the password and explicitly create a customer with a parameterized query.
    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    try {
        [result] = await pool.execute(
            'INSERT INTO Users (FirstName, LastName, Email, PasswordHash, Role) VALUES (?, ?, ?, ?, ?)',
            [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash, 'customer']
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).render('register', {
                error: 'An account with that email already exists.',
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim()
            });
        }
        throw error;
    }

    
    setToken(res, {
        id: result.insertId,
        firstName: firstName.trim(),
        role: 'customer'
    });
    return res.redirect('/');
});



  // Register an admin only after validating the private invite key and form fields.
  
app.post('/admin/register', async (req, res) => {
  
    const inviteKey = process.env.ADMIN_SIGNUP_KEY;
    if (!inviteKey) {
        return res.status(503).render('error', { message: 'Admin registration is not configured.' });
    }

  
    const { firstName, lastName, email, password, confirmPassword, signupKey } = req.body;
    if (
        typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length > 50 ||
        typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length > 50 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 100 ||
        typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 ||
        typeof confirmPassword !== 'string' || password !== confirmPassword ||
        typeof signupKey !== 'string'
    ) {
        return res.status(400).render('admin-register', {
            error: 'Enter valid details and make sure the passwords match.',
            firstName,
            lastName,
            email
        });
    }

    // Reject incorrect invite keys before creating an account.
    const submittedKey = Buffer.from(signupKey);
    const configuredKey = Buffer.from(inviteKey);
    if (submittedKey.length !== configuredKey.length || !crypto.timingSafeEqual(submittedKey, configuredKey)) {
        return res.status(403).render('admin-register', {
            error: 'The admin invite key is invalid.',
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim()
        });
    }

    // Hash passwords and assign the admin role server-side using a parameterized query.
    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    try {
        [result] = await pool.execute(
            'INSERT INTO Users (FirstName, LastName, Email, PasswordHash, Role) VALUES (?, ?, ?, ?, ?)',
            [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash, 'admin']
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).render('admin-register', {
                error: 'An account with that email already exists.',
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim()
            });
        }
        throw error;
    }

    // Sign the new admin in and redirect to the role-protected dashboard.
    setToken(res, {
        id: result.insertId,
        firstName: firstName.trim(),
        role: 'admin'
    });
    return res.redirect('/admin');
});



app.get('/admin', requireRole('admin'), (req, res) => res.render('admin-dashboard'));






















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
