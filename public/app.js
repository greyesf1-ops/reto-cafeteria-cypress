const state = { products: [], cart: [], lastOrder: null };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `Q ${Number(value).toFixed(2)}`;

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'No se pudo completar la operación.');
  return body;
}

function showMessage(text, success = false) {
  const message = $('#global-message');
  message.textContent = text;
  message.className = `message${success ? ' success' : ''}`;
  message.hidden = false;
}

function renderProducts() {
  $('#product-count').textContent = `${state.products.length} opciones disponibles`;
  $('#products').innerHTML = state.products.map((product) => `<article class="product" data-cy="product-${product.id}"><div><div class="product-top"><span class="product-icon">${product.category === 'Café' ? '☕' : product.category === 'Postre' ? '🍰' : '🥐'}</span><span class="price">${money(product.price)}</span></div><h3>${product.name}</h3><p>${product.description}</p><small class="stock ${product.stock < 3 ? 'low' : ''}">${product.stock} disponibles</small></div><button class="add-button" data-add="${product.id}" ${product.stock < 1 ? 'disabled' : ''}>Agregar al pedido</button></article>`).join('');
  document.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.add)));
}

function addToCart(productId) {
  const existing = state.cart.find((item) => item.productId === productId);
  const product = state.products.find((item) => item.id === productId);
  if (existing) existing.quantity += 1;
  else state.cart.push({ productId, quantity: 1, name: product.name, unitPrice: product.price });
  renderCart();
}

function changeQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  const product = state.products.find((entry) => entry.id === productId);
  if (!item) return;
  item.quantity = Math.min(product.stock, item.quantity + delta);
  if (item.quantity < 1) state.cart = state.cart.filter((entry) => entry.productId !== productId);
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  $('#cart-count').textContent = count;
  $('#cart-total').textContent = money(total);
  $('#cart-items').innerHTML = state.cart.length ? state.cart.map((item) => `<div class="cart-row" data-cy="cart-item-${item.productId}"><div><h3>${item.name}</h3><small>${money(item.unitPrice)} c/u</small></div><div class="quantity"><button aria-label="Disminuir ${item.name}" data-minus="${item.productId}">−</button><span>${item.quantity}</span><button aria-label="Aumentar ${item.name}" data-plus="${item.productId}">+</button></div></div>`).join('') : '<div class="empty-cart"><span>✦</span><p>Tu pedido está vacío</p><small>Agrega algo rico para comenzar.</small></div>';
  document.querySelectorAll('[data-minus]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.minus, -1)));
  document.querySelectorAll('[data-plus]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.plus, 1)));
}

async function confirmOrder() {
  if (!state.cart.length) { showMessage('Tu pedido está vacío. Agrega al menos un producto para continuar.'); return; }
  const button = $('#confirm-order');
  button.disabled = true;
  try {
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify({ items: state.cart.map(({ productId, quantity }) => ({ productId, quantity })) }) });
    state.lastOrder = order;
    $('#order-id').textContent = order.id;
    $('#order-total').textContent = money(order.total);
    $('#success-panel').hidden = false;
    showMessage('Pedido guardado correctamente.', true);
    state.cart = [];
    renderCart();
    state.products = await api('/api/products');
    renderProducts();
    $('#success-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showMessage(error.message);
  } finally { button.disabled = false; }
}

async function load() { state.products = await api('/api/products'); renderProducts(); renderCart(); }
$('#confirm-order').addEventListener('click', confirmOrder);
$('#new-order').addEventListener('click', () => { $('#success-panel').hidden = true; $('#global-message').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); });
load().catch((error) => showMessage(error.message));
