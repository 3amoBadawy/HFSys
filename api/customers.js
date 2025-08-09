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
          'manage_invoices','add_invoice','view_reports','settings_access',
          'view_products','manage_products',
          'view_customers','manage_customers'
        ]},
        { name:'manager', permissions:[
          'view_users','manage_invoices','view_reports',
          'view_products','manage_products','view_customers','manage_customers'
        ]},
        { name:'staff', permissions:['add_invoice','view_users','view_customers'] }
      ],
      users:[{ id:'u-admin', name:'Admin', email:'admin@highfurniture.com', role:'admin', active:true }],
      lastSeq:0, lastProd:0, lastCust:0
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

function hasPerm(db, role, perm){
  if(role==='admin') return true
  const r = (db.roles||[]).find(x=>x.name===role)
  return !!(r && (r.permissions||[]).includes(perm))
}

const r = express.Router()

// DEBUG
r.use((req,res,next)=>{
  console.log(`[customers] ${req.method} ${req.path} q=${JSON.stringify(req.query)} body=${JSON.stringify(req.body||{})}`)
  next()
})

// GET /customers?q=
r.get('/customers', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!(hasPerm(db, role, 'view_customers') || hasPerm(db, role, 'manage_customers'))){
    console.warn(`[customers] forbidden role=${role} on list`)
    return res.status(403).json({ error:'Forbidden' })
  }
  const q = (req.query.q||'').toString().toLowerCase()
  let items = db.customers || []
  if(q){
    items = items.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      (c.phone||'').toLowerCase().includes(q) ||
      (c.address||'').toLowerCase().includes(q)
    )
  }
  console.log(`[customers] list -> ${items.length} items`)
  res.json(items)
})

// POST /customers
r.post('/customers', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_customers')){
    console.warn(`[customers] forbidden role=${role} on create`)
    return res.status(403).json({ error:'Forbidden' })
  }
  const { name, phone='', address='', notes='' } = req.body || {}
  if(!name) return res.status(400).json({ error:'name required' })

  db.lastCust = (db.lastCust||0) + 1
  const c = {
    id: nanoid(), code:'CUST-'+String(db.lastCust).padStart(5,'0'),
    name, phone, address, notes, active:true, createdAt:new Date().toISOString()
  }
  db.customers = db.customers || []
  db.customers.push(c); saveDB(db)
  console.log(`[customers] created ${c.id}`)
  res.status(201).json(c)
})

// PUT /customers/:id
r.put('/customers/:id', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_customers')){
    console.warn(`[customers] forbidden role=${role} on update`)
    return res.status(403).json({ error:'Forbidden' })
  }
  const c = (db.customers||[]).find(x=>x.id===req.params.id)
  if(!c) return res.status(404).json({ error:'Not found' })

  const { name, phone, address, notes, active } = req.body || {}
  if(name!==undefined) c.name = name
  if(phone!==undefined) c.phone = phone
  if(address!==undefined) c.address = address
  if(notes!==undefined) c.notes = notes
  if(active!==undefined) c.active = !!active
  saveDB(db)
  console.log(`[customers] updated ${c.id}`)
  res.json({ ok:true })
})

// DELETE /customers/:id
r.delete('/customers/:id', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_customers')){
    console.warn(`[customers] forbidden role=${role} on delete`)
    return res.status(403).json({ error:'Forbidden' })
  }
  const before = (db.customers||[]).length
  db.customers = (db.customers||[]).filter(x=>x.id!==req.params.id)
  saveDB(db)
  console.log(`[customers] deleted ${req.params.id} (before=${before} after=${db.customers.length})`)
  res.json({ ok:true })
})

export default r
