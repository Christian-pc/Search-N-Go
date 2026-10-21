// Login, register and logout pages
const router = require('express').Router();
const bcrypt = require('bcryptjs');
// const db = require('../db/database');
const { setToken } = require('../middleware/auth');

// Send logged-in users away from the login and register pages
function redirectIfLoggedIn(req, res, next) {
    if (req.user) return res.redirect(req.user.role === 'store' ? '/admin' : '/');
    next();
}

// Show login page
router.get('/login', redirectIfLoggedIn, (req, res) => {
    res.render('login');
});

// // Check the user name and password, then log the user in 
// router.post('/login', (req, res) => {
//     const username = (req.body.username || '').trim();
//     const password = req.body.password || '';

//     const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

//     if(!user || !bycrypt.compareSync(password, user.password_hash)) {
//         return res.status(400).render('login', {
//             error: 'Username or password is incorrect.',
//             username
//         });
//     }

//     setToken(res, user);
//     res.redirect(user.role === 'store' ? '/admin' : '/');
// });

// Show the register page
router.get('/register', redirectIfLoggedIn, (req, res) => {
    res.render('register');
})


// Log out by deleting the token cookie
router.post('/logout', (res, req) => {
    res.clearCookie('token');
    res.redirect('/');
});

module.exports = router;

