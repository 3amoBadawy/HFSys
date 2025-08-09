import express from 'express'
import fs from 'fs'
import { nanoid } from 'nanoid'

const DB_PATH = './db.json'
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices: [],
      products: [],
      roles: [
        { name:'admin',   permissions:['manage_users','view_users','manage_invoices','add_invoice','view_reports','settings_access','view_products','manage_products'] },
        { name:'manager', permissions:['view_users','manage_invoices','view_reports','view_products','manage_products'] },
        { name:'staff',   permissions:['add_invoice','view_users'] }
      ],
      users: [
        { id:'u-admin', name:'Admin', email:'admin@highfurniture.com', role:'admin', active:true },
      ],
      lastSeq: 0,
      lastProd: 0
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }
function hasPerm(db, role, perm){
  if(role==='admin') return true
  const r = (db.roles||[]).find(x=>x.name===role)
  return !!(r && (r.permissions||[]).includes(perm))
}

const r = express.Router()

// GET /products?q=
r.get('/products', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  const can = hasPerm(db, role, 'view_products') || hasPerm(db, role, 'manage_products')
  if(!can) return res.status(403).json({ error:'Forbidden' })

  const q = (req.query.q||'').toString().toLowerCase()
  let items = db.products || []
  if(q){
    items = items.filter(p =>
      (p.name||'').toLowerCase().includes(q) ||
      (p.sku||'').toLowerCase().includes(q) ||
      (p.category||'').toLowerCase().includes(q)
    )
  }
  res.json(items)
})

// POST /products
r.post('/products', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  const can = hasPerm(db, role, 'manage_products')
  if(!can) return res.status(403).json({ error:'Forbidden' })

  const { name, sku, price=0, category='', stock=0, imageData='', active=true } = req.body || {}
  if(!name) return res.status(400).json({ error:'name required' })
  if(sku && (db.products||[]).some(p=>p.sku===sku)) return res.status(409).json({ error:'SKU exists' })

  db.lastProd = (db.lastProd||0) + 1
  const prod = {
    id: nanoid(),
    name,
    sku: sku || ('SKU-'+String(db.lastProd).padStart(5,'0')),
    price: Number(price)||0,
    category,
    stock: Number(stock)||0,
    imageData,
    active: !!active,
    createdAt: new Date().toISOString()
  }
  db.products = db.products || []
  db.products.push(prod)
  saveDB(db)
  res.status(201).json(prod)
})

// PUT /products/:id
r.put('/products/:id', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  const can = hasPerm(db, role, 'manage_products')
  if(!can) return res.status(403).json({ error:'Forbidden' })

  const p = (db.products||[]).find(x=>x.id===req.params.id)
  if(!p) return res.status(404).json({ error:'Not found' })

  const { name, sku, price, category, stock, imageData, active } = req.body || {}
  if(sku && (db.products||[]).find(x=>x.sku===sku && x.id!==p.id)) return res.status(409).json({ error:'SKU exists' })

  if(name!==undefined) p.name=name
  if(sku!==undefined) p.sku=sku
  if(price!==undefined) p.price=Number(price)||0
  if(category!==undefined) p.category=category
  if(stock!==undefined) p.stock=Number(stock)||0
  if(imageData!==undefined) p.imageData=imageData
  if(active!==undefined) p.active=!!active

  saveDB(db)
  res.json({ ok:true })
})

// DELETE /products/:id
r.delete('/products/:id', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  const can = hasPerm(db, role, 'manage_products')
  if(!can) return res.status(403).json({ error:'Forbidden' })

  db.products = (db.products||[]).filter(x=>x.id!==req.params.id)
  saveDB(db)
  res.json({ ok:true })
})

export default r
