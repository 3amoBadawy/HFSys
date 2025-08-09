import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const DB_PATH    = path.join(__dirname, 'db.json')   // ✅ مسار مطلق آمن على Render

const PORT       = process.env.PORT || 10000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices:[], lastSeq:0, customers:[], users:[] }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

// --- seed default admin if empty ---
function ensureUsers(db){
  if(!db.users || !db.users.length){
    db.users = [{
      id: nanoid(),
      name: 'Admin',
      email: 'admin@highfurniture.com',
      password: 'Admin@123',
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString()
    }]
    saveDB(db)
  }
}
// seed on boot
try { const _db = loadDB(); ensureUsers(_db) } catch(e){ console.error('seed error', e) }

app.get('/health', (_req,res)=> res.type('text').send('HF API is live ✅'))

// --- Auth ---
app.post('/login', (req,res)=>{
  const { email, password } = req.body || {}
  const db = loadDB(); ensureUsers(db)
  const u = (db.users||[]).find(x => String(x.email).toLowerCase() === String(email||'').toLowerCase())
  if(!u || !u.active) return res.status(401).json({ error:'Invalid credentials' })
  if(String(u.password) !== String(password)) return res.status(401).json({ error:'Invalid credentials' })
  const token = jwt.sign({ uid: u.id, name: u.name, role: u.role||'staff' }, JWT_SECRET, { expiresIn: '7d' })
  return res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role||'staff' } })
})

function auth(req,res,next){
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer (.+)$/)
  if(!m) return res.status(401).json({ error:'Missing token' })
  try{ req.user = jwt.verify(m[1], JWT_SECRET); next() }
  catch{ return res.status(401).json({ error:'Invalid token' }) }
}
function requireAdmin(req,res,next){
  if(req?.user?.role === 'admin') return next()
  return res.status(403).json({ error:'Forbidden' })
}

const router = express.Router()

// --- Invoices ---
router.get('/invoices', (req,res)=>{ const db = loadDB(); res.json(db.invoices||[]) })
router.post('/invoices', (req,res)=>{
  const db = loadDB(); const body = req.body || {}
  db.lastSeq = (db.lastSeq||0) + 1
  const code = 'INV-' + String(db.lastSeq).padStart(5,'0')
  const invoice = { id:nanoid(), code, createdAt:new Date().toISOString(), ...body }
  db.invoices = db.invoices || []
  db.invoices.push(invoice); saveDB(db)
  res.status(201).json(invoice)
})
router.get('/invoices/:id', (req,res)=>{
  const db = loadDB(); const inv = (db.invoices||[]).find(i=>i.id===req.params.id)
  if(!inv) return res.status(404).json({ error:'Not found' })
  res.json(inv)
})

// --- Customers (basic CRUD) ---
router.get('/customers', (req,res)=>{ const db = loadDB(); res.json(db.customers||[]) })
router.post('/customers', (req,res)=>{
  const db = loadDB(); const b = req.body||{}
  if(!b.name) return res.status(400).json({error:'name required'})
  const item = { id:nanoid(), name:b.name, phone:b.phone||'', address:b.address||'', notes:b.notes||'', createdAt:new Date().toISOString() }
  db.customers = db.customers || []; db.customers.push(item); saveDB(db); res.status(201).json(item)
})
router.put('/customers/:id', (req,res)=>{
  const db = loadDB(); const i = (db.customers||[]).findIndex(c=>c.id===req.params.id)
  if(i<0) return res.status(404).json({error:'Not found'})
  const b=req.body||{}; db.customers[i] = { ...db.customers[i], ...b }; saveDB(db); res.json(db.customers[i])
})
router.delete('/customers/:id', (req,res)=>{
  const db = loadDB(); const before=(db.customers||[]).length; db.customers = (db.customers||[]).filter(c=>c.id!==req.params.id)
  if(db.customers.length===before) return res.status(404).json({error:'Not found'})
  saveDB(db); res.json({ok:true})
})

// --- Users (Admins only) ---
router.get('/users', requireAdmin, (req,res)=>{ const db = loadDB(); ensureUsers(db); res.json(db.users) })
router.post('/users', requireAdmin, (req,res)=>{
  const db=loadDB(); ensureUsers(db)
  const b=req.body||{}; if(!b.name||!b.email) return res.status(400).json({error:'name & email required'})
  const item = { id:nanoid(), name:b.name, email:b.email, role:(b.role==='admin'?'admin':'staff'), active:b.active!==false, createdAt:new Date().toISOString(), password:b.password||'123456' }
  db.users.push(item); saveDB(db); res.status(201).json(item)
})
router.put('/users/:id', requireAdmin, (req,res)=>{
  const db=loadDB(); ensureUsers(db); const i=db.users.findIndex(u=>u.id===req.params.id)
  if(i<0) return res.status(404).json({error:'Not found'})
  const b=req.body||{}; db.users[i] = { ...db.users[i],
    name: b.name ?? db.users[i].name,
    email: b.email ?? db.users[i].email,
    role: b.role ? (b.role==='admin'?'admin':'staff') : db.users[i].role,
    active: typeof b.active==='boolean' ? b.active : db.users[i].active,
    password: b.password ?? db.users[i].password
  }; saveDB(db); res.json(db.users[i])
})
router.delete('/users/:id', requireAdmin, (req,res)=>{
  const db=loadDB(); ensureUsers(db); const before=db.users.length
  db.users = db.users.filter(u=>u.id!==req.params.id); if(db.users.length===before) return res.status(404).json({error:'Not found'})
  saveDB(db); res.json({ok:true})
})

app.use('/', auth, router)

app.listen(PORT, ()=> console.log('API running on http://localhost:'+PORT,' DB:',DB_PATH))
