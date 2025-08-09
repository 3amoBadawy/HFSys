import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';

const DB_PATH = './db.json';

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices: [], products: [], customers: [],
      roles: [
        { name: 'admin', permissions: ['manage_users','view_users','manage_invoices','add_invoice','view_reports','settings_access'] },
        { name: 'manager', permissions: ['manage_invoices','view_reports','view_users'] },
        { name: 'staff', permissions: ['add_invoice'] }
      ],
      users: [
        { id: 'seed-admin', name: 'Admin', email: 'admin@highfurniture.com', role: 'admin', active: true }
      ],
      lastSeq: 0
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

const router = express.Router();

router.get('/products', (req, res) => {
  const db = loadDB();
  res.json(db.products || []);
});

router.post('/products', (req, res) => {
  const db = loadDB();
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'name required' });
  const product = {
    id: nanoid(),
    name: String(body.name).trim(),
    sku: (body.sku ?? '').toString().trim(),
    price: Number(body.price || 0),
    stock: Number(body.stock || 0),
    notes: (body.notes ?? '').toString(),
    imageData: body.imageData || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.products = db.products || [];
  db.products.push(product);
  saveDB(db);
  res.status(201).json(product);
});

router.patch('/products/:id', (req, res) => {
  const db = loadDB();
  const idx = (db.products || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const update = req.body || {};
  db.products[idx] = {
    ...db.products[idx],
    ...update,
    price: update.price !== undefined ? Number(update.price) : db.products[idx].price,
    stock: update.stock !== undefined ? Number(update.stock) : db.products[idx].stock,
    updatedAt: new Date().toISOString()
  };
  saveDB(db);
  res.json(db.products[idx]);
});

router.delete('/products/:id', (req, res) => {
  const db = loadDB();
  const before = (db.products || []).length;
  db.products = (db.products || []).filter(p => p.id !== req.params.id);
  if (db.products.length === before) return res.status(404).json({ error: 'Not found' });
  saveDB(db);
  res.json({ ok: true });
});

export default router;
