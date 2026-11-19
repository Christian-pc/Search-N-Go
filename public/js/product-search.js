


function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function makeProductCard(product) {
    const card = makeElement('article', 'product-card');
    const imageContainer = makeElement('div', 'product-image');

    if (product.imageUrl) {
        const image = document.createElement('img');
        image.src = product.imageUrl;
        image.alt = product.name;
        image.loading = 'lazy';
        imageContainer.append(image);
    } else {
        const placeholder = makeElement('div', 'image-placeholder');
        placeholder.append(
            makeElement('i', 'bi bi-image'),
            makeElement('span', '', 'No Image Available')
        );
        imageContainer.append(placeholder);
    }

    const details = makeElement('div', 'product-details');
    const title = makeElement('h3', 'product-name');
    const titleLink = makeElement('a', '', product.name || '');
    titleLink.href = `/products/${encodeURIComponent(product.id)}`;
    title.append(titleLink);
    details.append(
        title,
        makeElement('p', 'product-brand', product.brand || ''),
        makeElement('p', 'product-code', `Product Code: ${product.code || ''}`)
    );

    if (product.description) {
        details.append(makeElement('p', 'product-description', product.description));
    }


    const footer = makeElement('div', 'product-footer');
    const price = Number(product.price);
    footer.append(makeElement(
        'div',
        'product-price',
        Number.isFinite(price) ? `$${price.toFixed(2)}` : ''
    ));

    const quantity = Number(product.quantity) || 0;
    const stockText = quantity === 0
        ? 'Out of stock'
        : quantity < 5
            ? `Only ${quantity} left`
            : `In stock (${quantity})`;
    footer.append(makeElement('span', 'stock-status', stockText));
    details.append(footer);

      
    const reviewsLink = makeElement('a', 'review-link', 'Reviews');
    reviewsLink.href = `/products/${encodeURIComponent(product.id)}#reviews`;
    details.append(reviewsLink);

    card.append(imageContainer, details);
    return card;
}

function showEmptyMessage(container, term) {
    const empty = makeElement('div', 'empty-products');
    empty.append(makeElement('h3', '', 'No products found'));
    empty.append(makeElement(
        'p',
        '',
        term ? `We couldn't find any products matching "${term}". Try another search.` :
            'There are currently no products available.'
    ));
    container.replaceChildren(empty);
}

document.querySelectorAll('[data-live-search]').forEach(form => {
    const input = form.elements.q;
    const category = form.elements.category;
    const section = form.nextElementSibling;
    const resultList = section.querySelector('[data-product-list]');
    const count = section.querySelector('[data-product-count]');
    let activeRequest;

    async function updateResults() {
        if (activeRequest) activeRequest.abort();
        activeRequest = new AbortController();

        const params = new URLSearchParams(new FormData(form));
        try {
            const response = await fetch(`${form.action}?${params}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                signal: activeRequest.signal
            });
            if (!response.ok) throw new Error(`Search failed (${response.status}).`);

            const { products } = await response.json();
            count.textContent = `${products.length} products`;

            if (!products.length) {
                showEmptyMessage(resultList, input.value.trim());
                return;
            }

            const grid = makeElement('div', 'product-grid');
            products.forEach(product => grid.append(makeProductCard(product)));
            resultList.replaceChildren(grid);
        } catch (error) {
            if (error.name === 'AbortError') return;
            resultList.replaceChildren(makeElement(
                'p',
                'empty-products',
                'Search is temporarily unavailable. Please try again.'
            ));
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        updateResults();
    });
    input.addEventListener('input', updateResults);
    category.addEventListener('change', updateResults);
});
