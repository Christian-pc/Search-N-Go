const express = require('express');
const productRepo = require('../repositories/productRepository');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
    const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 255) : '';
    const isLiveSearch = req.get('X-Requested-With') === 'XMLHttpRequest';
    const categoryId = typeof req.query.category === 'string' && /^[1-9]\d*$/.test(req.query.category)
        ? Number(req.query.category)
        : null;

    const allProducts = typeof productRepo.search === 'function'
        ? await productRepo.search({ term, categoryId })
        : await productRepo.findAll();
    const products = typeof productRepo.search === 'function'
        ? allProducts
        : allProducts.filter(product =>
            (!term || product.name.toLocaleLowerCase().startsWith(term.toLocaleLowerCase())) &&
            (categoryId === null || Number(product.categoryId) === categoryId)
        );

    if (isLiveSearch) return res.json({ products });

    const categories = await productRepo.findCategories();

    // Remember searches from logged-in users (req.user comes from attachUser)
    if (term && req.user && typeof productRepo.saveSearch === 'function') {
        await productRepo.saveSearch(req.user.id, term);
    }

    res.render(req.user ? 'profile' : 'home', {
        products,
        categories,
        term,
        categoryId
    });
}));

module.exports = router;