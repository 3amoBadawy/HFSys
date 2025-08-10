import express from 'express'
import fs from 'fs'
import { nanoid } from 'nanoid'

const DB_PATH = './db.json'
function loadDB(){ return JSON.parse(fs.readFileSync(DB_PATH,'utf8')) }
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)) }

export default function productsRouter(requirePerm){
  const r = express.Router()

  // عرض المنتجات
  r.get('/products', requirePerm('view_products'), (req,res)=>{
    const db = loadDB()
    res.json(db.products||[])
  })

  // إضافة
  r.post('/products', requirePerm('manage_products'), (req,res)=>{
    const db = loadDB()
    const p = req.body||{}
    if(!p.name) return res.status(400).json({error:'name required'})
    const item = {
      id: nanoid(8),
      name: String(p.name).trim(),
      sku: (p.sku||'').toString().trim(),
      price: Number(p.price||0),
      stock: parseInt(p.stock||0),
      notes: p.notes||'',
      createdAt: new Date().toISOString()
    }
    db.products = db.products||[]
    db.products.push(item)
    saveDB(db)
    res.json(item)
  })

  // تعديل
  r.put('/products/:id', requirePerm('manage_products'), (req,res)=>{
    const db = loadDB()
    const ix = (db.products||[]).findIndex(p=>p.id===req.params.id)
    if(ix===-1) return res.status(404).json({error:'not found'})
    const cur = db.products[ix]
    const body = req.body||{}
    db.products[ix] = {...cur,
      name: body.name ?? cur.name,
      sku: body.sku ?? cur.sku,
      price: body.price!=null? Number(body.price):cur.price,
      stock: body.stock!=null? parseInt(body.stock):cur.stock,
      notes: body.notes ?? cur.notes
    }
    saveDB(db)
    res.json(db.products[ix])
  })

  // حذف
  r.delete('/products/:id', requirePerm('manage_products'), (req,res)=>{
    const db = loadDB()
    const before = (db.products||[]).length
    db.products = (db.products||[]).filter(p=>p.id!==req.params.id)
    saveDB(db)
    res.json({ok:true, removed: before-(db.products||[]).length})
  })

  return r
}
