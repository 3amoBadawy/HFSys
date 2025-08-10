import express from 'express'
import metaRouter from './meta.js'
import productsRouter from './products.js'
import cors from 'cors'
import fs from 'fs'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import customersRouter from './customers.js'

const PORT = process.env.PORT || 10000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const DB_PATH = './db.json'

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices: [],
      products: [],
      customers: [],
      roles: [
        { name:'admin', permissions:[
          'manage_users','view_users',
          'manage_invoices','add_invoice','view_reports',
          'settings_access','view_products','manage_products',
          'view_customers','manage_customers'
        ]},
        { name:'manager', permissions:[
          'view_users','manage_invoices','view_reports',
          'view_products','manage_products','view_customers','manage_customers'
        ]},
        { name:'staff', permissions:['add_invoice','view_users','view_customers'] }
      ],
      users: [
        { id:'seed-admin', name:'Admin', email:'admin@highfurniture.com', role:'admin', active:true }
      ],
      lastSeq: 0
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

const app = express()
app.use(cors())
app.use(express.json({ limit:'5mb' }))

// Root + health
app.get('/', (_req,res)=> res.type('text').send('HF API is live ✅'))
app.get('/health', (_req,res)=> res.json({ ok: true }))

// Demo login (email+password ثابتين)
const DEMO_USER = { role: 'admin',  email:'admin@highfurniture.com', password:'Admin@123', name:'Admin' }
app.post('/login', (req,res)=>{
  const { email, password } = req.body || {}
  if(email === DEMO_USER.email && password === DEMO_USER.password){
    const token = jwt.sign({ uid:'seed-admin', name: DEMO_USER.name, role:'admin' }, JWT_SECRET, { expiresIn:'7d' })
    return res.json({ token, user: { id:'seed-admin', name: DEMO_USER.name, email, role:'admin' } })
  }
  return res.status(401).json({ error:'Invalid credentials' })
})

// Auth middleware
function auth(req,res,next){
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer (.+)$/)
  if(!m) return res.status(401).json({ error:'Missing token' })
  try{ req.user = jwt.verify(m[1], JWT_SECRET); next() }
  catch{ return res.status(401).json({ error:'Invalid token' }) }
}

// Helper: check permission
function hasPerm(db, role, perm){
  if(role === 'admin') return true
  const r = (db.roles||[]).find(x=>x.name===role)
  return !!(r && (r.permissions||[]).includes(perm))
}

// Protected router
const router = express.Router()

// ROLES
router.get('/roles', (req,res)=>{
  const db = loadDB()
  res.json(db.roles || [])
})
router.post('/roles', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users')) return res.status(403).json({ error:'Forbidden' })
  const { name, permissions=[] } = req.body || {}
  if(!name) return res.status(400).json({ error:'name required' })
  if(name==='admin') return res.status(400).json({ error:'cannot modify admin role' })
  if((db.roles||[]).some(r=>r.name===name)) return res.status(400).json({ error:'role exists' })
  db.roles = db.roles || []; db.roles.push({ name, permissions })
  saveDB(db); res.status(201).json({ ok:true })
})
router.put('/roles/:name', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users')) return res.status(403).json({ error:'Forbidden' })
  const name = req.params.name
  if(name==='admin') return res.status(400).json({ error:'cannot modify admin role' })
  const r = (db.roles||[]).find(x=>x.name===name)
  if(!r) return res.status(404).json({ error:'Not found' })
  const { permissions } = req.body || {}
  if(Array.isArray(permissions)) r.permissions = permissions
  saveDB(db); res.json({ ok:true })
})
router.delete('/roles/:name', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users')) return res.status(403).json({ error:'Forbidden' })
  const name = req.params.name
  if(name==='admin') return res.status(400).json({ error:'cannot delete admin role' })
  // امنع حذف دور مستخدم عليه موظفين
  if((db.users||[]).some(u=>u.role===name)) return res.status(400).json({ error:'role in use' })
  db.roles = (db.roles||[]).filter(x=>x.name!==name)
  saveDB(db); res.json({ ok:true })
})

// USERS
router.get('/users', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users') && !hasPerm(db, role, 'view_users')) return res.status(403).json({ error:'Forbidden' })
  res.json(db.users || [])
})
router.post('/users', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users')) return res.status(403).json({ error:'Forbidden' })
  const { name, email, role: userRole='staff', active=true } = req.body || {}
  if(!name || !email) return res.status(400).json({ error:'name/email required' })
  const u = { id:nanoid(), name, email, role:userRole, active:!!active }
  db.users = db.users || []; db.users.push(u); saveDB(db)
  res.status(201).json(u)
})
router.put('/users/:id', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users')) return res.status(403).json({ error:'Forbidden' })
  const u = (db.users||[]).find(x=>x.id===req.params.id)
  if(!u) return res.status(404).json({ error:'Not found' })
  const { name, email, role: userRole, active } = req.body || {}
  if(name!==undefined) u.name = name
  if(email!==undefined) u.email = email
  if(userRole!==undefined) u.role = userRole
  if(active!==undefined) u.active = !!active
  saveDB(db); res.json({ ok:true })
})
router.delete('/users/:id', (req,res)=>{
  const db = loadDB()
  const role = req.user?.role || 'staff'
  if(!hasPerm(db, role, 'manage_users')) return res.status(403).json({ error:'Forbidden' })
  db.users = (db.users||[]).filter(x=>x.id!==req.params.id)
  saveDB(db); res.json({ ok:true })
})

// INVOICES
router.get('/invoices', (_req,res)=>{ const db=loadDB(); res.json(db.invoices||[]) })
router.post('/invoices', (req,res)=>{
  const db=loadDB()
  const body = req.body || {}
  db.lastSeq = (db.lastSeq||0)+1
  const code = 'INV-'+String(db.lastSeq).padStart(5,'0')
  const inv = { id:nanoid(), code, createdAt:new Date().toISOString(), ...body }
  db.invoices = db.invoices || []; db.invoices.push(inv); saveDB(db)
  res.status(201).json(inv)
})
router.get('/invoices/:id', (req,res)=>{
  const db=loadDB()
  const inv = (db.invoices||[]).find(i=>i.id===req.params.id)
  if(!inv) return res.status(404).json({ error:'Not found' })
  res.json(inv)
})

app.use('/', auth, router)
app.use('/', auth, productsRouter)
app.use('/', auth, customersRouter)

app.listen(PORT, ()=> console.log('API running on http://localhost:'+PORT))
app.use('/', auth, metaRouter);
