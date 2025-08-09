import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';

const DB_PATH = './db.json';

function loadDB(){
  if (!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices: [], customers: [], products: [],
      roles: [
        { name: 'admin', permissions: ['manage_users','view_users','manage_invoices','add_invoice','view_reports','settings_access','manage_products','view_products'] },
        { name: 'manager', permissions: ['manage_invoices','view_reports','view_users','view_products'] },
        { name: 'staff', permissions: ['add_invoice','view_products'] }
      ],
      users: [{ id:'seed-admin', name:'Admin', email:'admin@highfurniture.com', role:'admin', active:true }],
      lastSeq: 0
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

const router = express.Router();

// GET /products
router.get('/products', (req, res) => {
  const db = loadDB();
  res.json(db.products || []);
});

// POST /products  { name, sku, price }
router.post('/products', (req, res) => {
  const db = loadDB();
  const { name = '', sku = '', price = 0 } = req.body || {};
  if (!name.trim()) return res.status(400).json({ error: 'name required' });
  const product = {
    id: nanoid(),
    name: name.trim(),
    sku: (sku || '').trim(),
    price: Number(price) || 0,
    createdAt: new Date().toISOString(),
  };
  db.products = db.products || [];
  db.products.push(product);
  saveDB(db);
  res.status(201).json(product);
});

export default router;
