import express from 'express';
import fs from 'fs';
import { nanoid } from 'nanoid';

const DB_PATH = './api/db.json';

function loadDB(){
  if(!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ invoices:[], products:[], customers:[], users:[], roles:[] },null,2));
  return JSON.parse(fs.readFileSync(DB_PATH,'utf8')||'{}');
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)); }

const router = express.Router();

// list
router.get('/products', (req,res)=>{
  try{
    const db = loadDB();
    res.json(db.products||[]);
  }catch(e){ res.status(500).json({error:'Server error'}); }
});

// create
router.post('/products', express.json(), (req,res)=>{
  try{
    const { name, sku, price, stock } = req.body||{};
    if(!name) return res.status(400).json({error:'name required'});
    const db = loadDB();
    const item = { id: nanoid(8), name, sku: sku||'', price: Number(price||0), stock: Number(stock||0), createdAt: new Date().toISOString() };
    db.products = db.products||[];
    db.products.push(item);
    saveDB(db);
    res.json(item);
  }catch(e){ res.status(500).json({error:'Server error'}); }
});

// update
router.put('/products/:id', express.json(), (req,res)=>{
  try{
    const db = loadDB();
    const i = (db.products||[]).findIndex(p=>p.id===req.params.id);
    if(i===-1) return res.status(404).json({error:'not found'});
    db.products[i] = { ...db.products[i], ...req.body };
    saveDB(db);
    res.json(db.products[i]);
  }catch(e){ res.status(500).json({error:'Server error'}); }
});

// delete
router.delete('/products/:id', (req,res)=>{
  try{
    const db = loadDB();
    const before = (db.products||[]).length;
    db.products = (db.products||[]).filter(p=>p.id!==req.params.id);
    saveDB(db);
    res.json({ok:true, removed: before - db.products.length});
  }catch(e){ res.status(500).json({error:'Server error'}); }
});

export default router;
