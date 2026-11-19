const express = require('express');
const productRepo = require('../repositories/productRepository');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

async function showProduct(res, productId, options = {}) {
    const product = await productRepo.findById(productId);
    if (!product) {
        return res.status(404).render('error', { message: 'Product not found.' });
    }

    const reviews = await productRepo.findReviewsForProduct(productId);
    const avgRating = reviews.length
        ? (reviews.reduce((sum, review) => sum + Number(review.Rating), 0) / reviews.length).toFixed(1)
        : null;

    return res.render('product', { product, reviews, avgRating, ...options });
}

router.get('/:id', wrap(async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
        return res.status(404).render('error', { message: 'Product not found.' });
    }

    const productId = Number(req.params.id);
    return showProduct(res, productId, {
        reviewSubmitted: req.query.review === 'submitted'
    });
}));

router.post('/:id/reviews', requireLogin, wrap(async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
        return res.status(404).render('error', { message: 'Product not found.' });
    }
    if (req.user.role !== 'customer') {
        return res.status(403).render('error', { message: 'Only customer accounts can submit reviews.' });
    }

    const productId = Number(req.params.id);
    const rating = typeof req.body.rating === 'string' ? req.body.rating : '';
    const reviewText = typeof req.body.reviewText === 'string' ? req.body.reviewText.trim() : '';

    if (!/^[1-5]$/.test(rating) || Buffer.byteLength(reviewText, 'utf8') > 65535) {
        return showProduct(res, productId, {
            reviewError: 'Choose a rating from 1 to 5 and keep your review under 65 KB.',
            reviewInput: { rating, reviewText }
        });
    }

    const product = await productRepo.findById(productId);
    if (!product) {
        return res.status(404).render('error', { message: 'Product not found.' });
    }

    await productRepo.createReview({
        productId,
        userId: req.user.id,
        rating: Number(rating),
        reviewText
    });

    return res.redirect(303, `/products/${productId}?review=submitted#reviews`);
}));

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