const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Creates a token for the user and save it in a cookie
function setToken(res, user) {
    const token = jwt.sign(
        {id: user.id, username: user.username, role: user.role },
        SECRET,
        { expiresIn: '8h'}
    );
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
}

// Reads the token on every request. Guests get req.user = null. 
function attachUser(req, res, next) {
    try {
        req.user = jwt.verify(req.cookies.token, SECRET);
    } catch {
        req.user = null;
    }
    res.locals.user = req.user; // lets every view use {{user}}
    next();
}

// Only let one account type in: requireRole('store') or requireRole('customer')
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) return res.redirect('/login');
        if (req.user.role !== role) {
            return res.status(403).render('error', { message: 'Your account cannot open this page.' });
        }
        next();
    };
}

module.exports = {setToken, attachUser, requireRole};