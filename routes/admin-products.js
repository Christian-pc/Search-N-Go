const express = require('express');
const productRepo = require('../repositories/productRepository');

const router = express.Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

const messages = { created: 'Product added.', updated: 'Product updated.', deleted: 'Product deleted.' };
const notFound = res => res.status(404).render('error', { message: 'Product not found.' });

router.param('id', (req, res, next, value) => {
    if (!/^\d+$/.test(value)) return notFound(res);
    next();
});

function readForm(body) {
    const text = field => typeof body[field] === 'string' ? body[field].trim() : '';
    const product = {
        code: text('code'),
        name: text('name'),
        brand: text('brand'),
        description: text('description'),
        price: text('price'),
        imageUrl: text('imageUrl'),
        categoryId: text('categoryId'),
        quantity: text('quantity')
    };

    if (!product.code || product.code.length > 50) {
        return { product, error: 'Enter a product code of 1 to 50 characters.' };
    }
    if (!product.name || product.name.length > 150) {
        return { product, error: 'Enter a product name of 1 to 150 characters.' };
    }
    if (!product.brand || product.brand.length > 100) {
        return { product, error: 'Enter a brand name of 1 to 100 characters.' };
    }
    if (Buffer.byteLength(product.description, 'utf8') > 65535) {
        return { product, error: 'The description is too long.' };
    }
    if (product.price === '' || !/^\d+(?:\.\d{1,2})?$/.test(product.price) ||
        Number(product.price) > 99999999.99) {
        return { product, error: 'Enter a valid price with no more than two decimal places.' };
    }
    if (product.imageUrl.length > 255) {
        return { product, error: 'The image URL must be 255 characters or fewer.' };
    }
    if (!/^[1-9]\d*$/.test(product.categoryId)) {
        return { product, error: 'Select a valid category.' };
    }
    if (!/^\d+$/.test(product.quantity) || !Number.isSafeInteger(Number(product.quantity)) ||
        Number(product.quantity) > 2147483647) {
        return { product, error: 'Enter a valid non-negative stock quantity.' };
    }

    product.price = Number(product.price);
    product.categoryId = Number(product.categoryId);
    product.quantity = Number(product.quantity);
    return { product };
}

function friendlyError(err) {
    if (err.code === 'ER_DUP_ENTRY') return 'A product with that code already exists.';
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return 'Select a valid category.';
    return null;
}


// display the admin product form usually when an admin wants to add or edit a product. 
async function showForm(res, status, { product, error, formTitle, action }) {
    const categories = await productRepo.findCategories();
    res.status(status).render('admin-product-form', { product, categories, error, formTitle, action });
}


// defines the admin product management page. it retrieves all products from the database and dislays them in handlebars template.
router.get('/', wrap(async (req, res) => {
    const products = await productRepo.findAll();
    const success = req.query.success;
    res.render('admin-products', {
        products,
        message: typeof success === 'string' && Object.hasOwn(messages, success) ? messages[success] : null
    });
}));

router.get('/new', wrap((req, res) =>
    showForm(res, 200, { product: { quantity: 0 }, formTitle: 'Add product', action: '/admin/products' })
));

router.post('/', wrap(async (req, res) => {
    const { product, error } = readForm(req.body);
    const page = { product, formTitle: 'Add product', action: '/admin/products' };
    if (error) return showForm(res, 400, { ...page, error });

    try {
        await productRepo.create(product);
    } catch (err) {
        const message = friendlyError(err);
        if (message) return showForm(res, 400, { ...page, error: message });
        throw err;
    }
    res.redirect('/admin/products?success=created');
}));






router.get('/:id/edit', wrap(async (req, res) => {
    const product = await productRepo.findById(Number(req.params.id));
    if (!product) return notFound(res);
    return showForm(res, 200, { product, formTitle: 'Edit product', action: `/admin/products/${product.id}/edit` });
}));

router.post('/:id/edit', wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await productRepo.findById(id))) return notFound(res);

    const { product, error } = readForm(req.body);
    product.id = id;
    const page = { product, formTitle: 'Edit product', action: `/admin/products/${id}/edit` };
    if (error) return showForm(res, 400, { ...page, error });

    try {
        await productRepo.update(id, product);
    } catch (err) {
        const message = friendlyError(err);
        if (message) return showForm(res, 400, { ...page, error: message });
        throw err;
    }
    res.redirect('/admin/products?success=updated');
}));

router.post('/:id/delete', wrap(async (req, res) => {
    const deleted = await productRepo.remove(Number(req.params.id));
    if (!deleted) return notFound(res);
    res.redirect('/admin/products?success=deleted');
}));

module.exports = router;