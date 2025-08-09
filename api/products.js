import express from 'express'
import fs from 'fs'
import { nanoid } from 'nanoid'

const DB_PATH = './db.json'
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices:[], products:[], customers:[],
      roles:[
        { name:'admin', permissions:[
          'manage_users','view_users',
          'manage_invoices','view_reports','settings_access',
          'view_products','manage_products'
        ] }
      ],
      users:[
        { id:'seed-admin', name:'Admin', email:'admin@highfurniture.com', role:'admin', active:true }
      ],
      lastSeq:0
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)) }

const r = express.Router()

r.get('/products', (req,res)=>{
  const db = loadDB()
  res.json(db.products||[])
})

r.post('/products', (req,res)=>{
  const db = loadDB()
  const b = req.body||{}
  if(!b.name || !b.sku) return res.status(400).json({error:'name & sku required'})
  const exists = (db.products||[]).some(p=>p.sku === b.sku)
  if(exists) return res.status(409).json({error:'SKU already exists'})

  const p = {
    id: nanoid(),
    name: String(b.name).trim(),
    sku: String(b.sku).trim(),
    price: Number(b.price||0),
    stock: Number(b.stock||0),
    notes: b.notes||'',
    imageData: b.imageData||'',
    createdAt: new Date().toISOString()
  }
  db.products = db.products||[]
  db.products.push(p)
  saveDB(db)
  res.status(201).json(p)
})

r.put('/products/:id', (req,res)=>{
  const db = loadDB()
  const i = (db.products||[]).findIndex(p=>p.id===req.params.id)
  if(i===-1) return res.status(404).json({error:'Not found'})
  const b = req.body||{}
  if(b.sku){
    const dupe = db.products.some(p=>p.sku===b.sku && p.id!==req.params.id)
    if(dupe) return res.status(409).json({error:'SKU already exists'})
  }
  db.products[i] = { ...db.products[i], ...b }
  saveDB(db)
  res.json(db.products[i])
})

r.delete('/products/:id', (req,res)=>{
  const db = loadDB()
  const before = (db.products||[]).length
  db.products = (db.products||[]).filter(p=>p.id!==req.params.id)
  saveDB(db)
  res.json({ ok:true, removed: before - db.products.length })
})

export default r
