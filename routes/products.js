const express = require('express');
const productRepo = require('../repositories/productRepository');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
    const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 255) : '';
    const categoryId = typeof req.query.category === 'string' && /^[1-9]\d*$/.test(req.query.category)
        ? Number(req.query.category)
        : null;

    const [products, categories] = await Promise.all([
        productRepo.search({ term, categoryId }),
        productRepo.findCategories()
    ]);

    // Remember searches from logged-in users (req.user comes from attachUser)
    if (term && req.user) await productRepo.saveSearch(req.user.id, term);

    res.render('products', { products, categories, term, categoryId });
}));

module.exports = router;