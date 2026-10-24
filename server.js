import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const dataFile = path.join(__dirname, 'data', 'orders.json');

const seedProducts = [
  { id: 'espresso', name: 'Espresso de la casa', description: 'Café corto, intenso y recién molido.', price: 18, stock: 12, category: 'Café' },
  { id: 'capuccino', name: 'Capuchino canela', description: 'Espresso, leche vaporizada y canela.', price: 32, stock: 8, category: 'Café' },
  { id: 'croissant', name: 'Croissant de mantequilla', description: 'Horneado cada mañana, crujiente por fuera.', price: 24, stock: 10, category: 'Panadería' },
  { id: 'cheesecake', name: 'Cheesecake de frutos rojos', description: 'Porción cremosa con coulis de temporada.', price: 42, stock: 5, category: 'Postre' }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function readData() {
  try { return JSON.parse(await fs.readFile(dataFile, 'utf8')); }
  catch { return { orders: [], products: seedProducts }; }
}

async function writeData(data) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

function money(value) { return Number(value.toFixed(2)); }

app.get('/api/products', async (_req, res) => {
  const data = await readData();
  res.json(data.products || seedProducts);
});

app.post('/api/orders', async (req, res) => {
  if (req.header('x-simulate-api-error') === 'true') {
    return res.status(503).json({ message: 'El servicio de pedidos está temporalmente no disponible.' });
  }
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'Agrega al menos un producto antes de confirmar.' });
  const data = await readData();
  const normalized = [];
  for (const item of items) {
    const product = data.products.find((candidate) => candidate.id === item.productId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'El pedido contiene una cantidad inválida.' });
    }
    if (quantity > product.stock) {
      return res.status(409).json({ message: `No hay existencias suficientes de ${product.name}.` });
    }
    normalized.push({ productId: product.id, name: product.name, quantity, unitPrice: product.price, subtotal: money(product.price * quantity) });
  }
  const total = money(normalized.reduce((sum, item) => sum + item.subtotal, 0));
  normalized.forEach((item) => { data.products.find((product) => product.id === item.productId).stock -= item.quantity; });
  const order = { id: `CAF-${String(Date.now()).slice(-8)}`, createdAt: new Date().toISOString(), items: normalized, total, status: 'Confirmado' };
  data.orders.push(order);
  await writeData(data);
  res.status(201).json(order);
});

app.post('/api/test/reset', async (_req, res) => {
  if (process.env.NODE_ENV !== 'test' && process.env.TEST_MODE !== '1') return res.status(404).end();
  await writeData({ products: seedProducts, orders: [] });
  res.json({ ok: true });
});

app.get('/api/orders/:id', async (req, res) => {
  const data = await readData();
  const order = data.orders.find((candidate) => candidate.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado.' });
  res.json(order);
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(port, async () => {
  const data = await readData();
  if (!data.products?.length) await writeData({ products: seedProducts, orders: data.orders || [] });
  console.log(`Café Brújula escuchando en http://localhost:${port}`);
});
