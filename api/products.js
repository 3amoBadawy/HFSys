import express from 'express'
import fs from 'fs'
import { nanoid } from 'nanoid'

const DB_PATH = './db.json'

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices:[], products:[], customers:[], roles:[{name:'admin',permissions:['manage_users','view_users']}]
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

const router = express.Router()

router.get('/products', (req,res)=>{
  const db = loadDB()
  res.json(db.products || [])
})

router.post('/products', (req,res)=>{
  const db = loadDB()
  const body = req.body || {}
  const product = {
    id: nanoid(),
    name: String(body.name||'').trim(),
    sku: String(body.sku||'').trim(),
    price: Number(body.price||0),
    createdAt: new Date().toISOString()
  }
  if(!product.name){ return res.status(400).json({error:'الاسم مطلوب'}) }
  db.products = db.products || []
  db.products.push(product)
  saveDB(db)
  res.status(201).json(product)
})

router.delete('/products/:id', (req,res)=>{
  const db = loadDB()
  const before = (db.products||[]).length
  db.products = (db.products||[]).filter(p=>p.id!==req.params.id)
  const after = db.products.length
  saveDB(db)
  res.json({ ok: true, removed: before-after })
})

export default router
