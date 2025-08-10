import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';

const DB_PATH = './db.json';
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices:[], products:[], customers:[], roles:[], users:[], lastSeq:0 }, null, 2));
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH,'utf-8')||'{}');
  if(!Array.isArray(db.products)) db.products = [];
  return db;
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)); }

const router = express.Router();

router.get('/products', (_req,res)=>{
  const db = loadDB();
  res.json(db.products || []);
});

router.post('/products', express.json(), (req,res)=>{
  const { name, sku='', price=0 } = req.body || {};
  if(!name) return res.status(400).json({error:'name required'});
  const db = loadDB();
  const item = { id: nanoid(8), name, sku, price: Number(price)||0, createdAt: Date.now() };
  db.products.push(item); saveDB(db);
  res.status(201).json(item);
});

router.put('/products/:id', express.json(), (req,res)=>{
  const { id } = req.params;
  const db = loadDB();
  const i = db.products.findIndex(p=>p.id===id);
  if(i<0) return res.status(404).json({error:'not found'});
  db.products[i] = { ...db.products[i], ...req.body, id };
  saveDB(db);
  res.json(db.products[i]);
});

router.delete('/products/:id', (req,res)=>{
  const { id } = req.params;
  const db = loadDB();
  const before = db.products.length;
  db.products = db.products.filter(p=>p.id!==id);
  if(db.products.length===before) return res.status(404).json({error:'not found'});
  saveDB(db);
  res.json({ok:true});
});

export default router;
