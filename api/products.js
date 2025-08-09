import express from 'express'
import { ensurePerm } from './perm.js'
import fs from 'fs'
import { nanoid } from 'nanoid'

const DB_PATH = './db.json'
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices:[], customers:[], products:[],
      roles:[{ name:'admin', permissions:[
        'manage_users','view_users','manage_invoices','view_reports',
        'settings_access','view_products','manage_products'
      ]}]
    }, null, 2))
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH,'utf-8')||'{}')
  db.products ||= []
  db.roles ||= [{name:'admin', permissions:[]}]

  // seed perms for admin if missing
  const admin = db.roles.find(r=>r.name==='admin')
  if(admin){
    for(const p of ['view_products','manage_products']){
      if(!admin.permissions.includes(p)) admin.permissions.push(p)
    }
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
  return db
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

const router = express.Router()

router.get('/products', ensurePerm('view_products'), (req,res)=>{
  const db = loadDB()
  res.json(db.products)
})

router.post('/products', ensurePerm('manage_products'), (req,res)=>{
  const db = loadDB()
  const b = req.body||{}
  if(!b.name || !b.sku) return res.status(400).json({error:'الاسم و الكود (SKU) مطلوبان'})
  const exists = db.products.find(p=>p.sku===b.sku)
  if(exists) return res.status(409).json({error:'هذا الكود موجود بالفعل'})
  const prod = {
    id: nanoid(),
    name: String(b.name).trim(),
    sku: String(b.sku).trim(),
    price: Number(b.price||0),
    category: String(b.category||''),
    stock: Number(b.stock||0),
    imageData: b.imageData||'',
    active: b.active!==false,
    createdAt: new Date().toISOString()
  }
  db.products.push(prod); saveDB(db)
  res.status(201).json(prod)
})

router.put('/products/:id', ensurePerm('manage_products'), (req,res)=>{
  const db = loadDB()
  const i = db.products.findIndex(p=>p.id===req.params.id)
  if(i<0) return res.status(404).json({error:'غير موجود'})
  const cur = db.products[i]
  const b = req.body||{}
  // منع تكرار SKU عند التعديل
  if(b.sku && db.products.some(p=>p.sku===b.sku && p.id!==cur.id)){
    return res.status(409).json({error:'كود SKU مستخدم بالفعل'})
  }
  db.products[i] = { ...cur,
    name: b.name ?? cur.name,
    sku: b.sku ?? cur.sku,
    price: b.price!==undefined ? Number(b.price) : cur.price,
    category: b.category ?? cur.category,
    stock: b.stock!==undefined ? Number(b.stock) : cur.stock,
    imageData: b.imageData!==undefined ? b.imageData : cur.imageData,
    active: b.active!==undefined ? !!b.active : cur.active,
  }
  saveDB(db)
  res.json(db.products[i])
})

router.delete('/products/:id', ensurePerm('manage_products'), (req,res)=>{
  const db = loadDB()
  const before = db.products.length
  db.products = db.products.filter(p=>p.id!==req.params.id)
  if(db.products.length===before) return res.status(404).json({error:'غير موجود'})
  saveDB(db)
  res.json({ok:true})
})

export default router
