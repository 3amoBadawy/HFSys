import express from 'express'
import customersRouter from './customers.js'
import productsRouter from './products.js'
import cors from 'cors'
import fs from 'fs'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'

const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const DB_PATH = './db.json'

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    const seed = {
      invoices: [],
      lastSeq: 0,
      users: [
        { id:'admin', name:'Admin', email:'admin@highfurniture.com', password:'Admin@123', role:'admin', active:true }
      ],
      roles: [
        { name:'admin',   permissions:['manage_users','view_users','manage_invoices','add_invoice','view_reports','settings_access','view_customers','manage_customers'] },
        { name:'manager', permissions:['view_users','manage_invoices','view_reports'] },
        { name:'staff',   permissions:['add_invoice'] }
      ],
      perms: ['manage_users','view_users','manage_invoices','add_invoice','view_reports','settings_access','view_customers','manage_customers']
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

const app = express()
app.use(cors())
app.use(express.json({ limit:'10mb' }))

// health + root
app.get('/health', (_req,res)=> res.json({ ok:true }))
app.get('/', (_req,res)=> res.type('text').send('HF API is live ✅'))

// ---- Auth helpers
function sign(user){ return jwt.sign({ uid:user.id, name:user.name, role:user.role }, JWT_SECRET, { expiresIn:'7d' }) }
function auth(req,res,next){
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer (.+)$/)
  if(!m) return res.status(401).json({ error:'Missing token' })
  try{ req.user = jwt.verify(m[1], JWT_SECRET); next() }
  catch{ return res.status(401).json({ error:'Invalid token' }) }
}
function hasPerm(db, role, perm){
  const r = db.roles.find(x=>x.name===role)
  return !!(r && r.permissions && r.permissions.includes(perm))
}
function requirePerm(perm){
  return (req,res,next)=>{
    const db = loadDB()
    const ok = hasPerm(db, req.user?.role, perm) || req.user?.role==='admin'
    if(!ok) return res.status(403).json({ error:'Forbidden' })
    next()
  }
}

// ---- Auth
app.post('/login', (req,res)=>{
  const { email, password } = req.body || {}
  const db = loadDB()
  const u = (db.users||[]).find(x=>x.email===email && x.password===password && x.active!==false)
  if(!u) return res.status(401).json({ error:'Invalid credentials' })
  return res.json({ token: sign(u), user: { id:u.id, name:u.name, email:u.email, role:u.role } })
})

// ---- Meta
app.get('/meta/permissions', auth, (req,res)=>{
  const db = loadDB()
  res.json(db.perms || [])
})

// ---- Roles CRUD (protected: manage_users)
app.get('/roles', auth, (req,res)=>{
  const db = loadDB()
  // يسمح لأي مستخدم يشوف الأدوار لو عنده view_users أو manage_users
  const can = hasPerm(db, req.user.role, 'view_users') || hasPerm(db, req.user.role, 'manage_users') || req.user.role==='admin'
  if(!can) return res.status(403).json({ error:'Forbidden' })
  res.json(db.roles||[])
})

app.post('/roles', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  const { name, permissions=[] } = req.body || {}
  if(!name || name==='admin') return res.status(400).json({ error:'Invalid role name' })
  if((db.roles||[]).some(r=>r.name===name)) return res.status(409).json({ error:'Role exists' })
  db.roles.push({ name, permissions })
  saveDB(db)
  res.status(201).json({ ok:true })
})

app.put('/roles/:name', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  const old = req.params.name
  const { name, permissions=[] } = req.body || {}
  if(old==='admin' || name==='admin') return res.status(400).json({ error:'Cannot rename admin' })
  const r = (db.roles||[]).find(x=>x.name===old)
  if(!r) return res.status(404).json({ error:'Not found' })
  // منع التصادم
  if(name && name!==old && db.roles.find(x=>x.name===name)) return res.status(409).json({ error:'Role exists' })
  if(name) r.name = name
  r.permissions = permissions
  saveDB(db)
  res.json({ ok:true })
})

app.delete('/roles/:name', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  const name = req.params.name
  if(name==='admin') return res.status(400).json({ error:'Cannot delete admin role' })
  if((db.users||[]).some(u=>u.role===name)) return res.status(400).json({ error:'Role in use by users' })
  db.roles = (db.roles||[]).filter(r=>r.name!==name)
  saveDB(db)
  res.json({ ok:true })
})

// ---- Users (list/create/update/delete) (manage_users)
app.get('/users', auth, (req,res)=>{
  const db = loadDB()
  const can = hasPerm(db, req.user.role, 'view_users') || hasPerm(db, req.user.role, 'manage_users') || req.user.role==='admin'
  if(!can) return res.status(403).json({ error:'Forbidden' })
  res.json((db.users||[]).map(u=>({ id:u.id, name:u.name, email:u.email, role:u.role, active:u.active!==false })))
})

app.post('/users', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  const { name, email, role='staff', password='123456', active=true } = req.body || {}
  if(!name || !email) return res.status(400).json({ error:'name & email required' })
  if((db.users||[]).some(u=>u.email===email)) return res.status(409).json({ error:'Email exists' })
  const u = { id:nanoid(), name, email, role, password, active }
  db.users.push(u); saveDB(db)
  res.status(201).json({ id:u.id })
})

app.put('/users/:id', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  const u = (db.users||[]).find(x=>x.id===req.params.id)
  if(!u) return res.status(404).json({ error:'Not found' })
  const { name, email, role, active } = req.body || {}
  if(email && db.users.find(x=>x.email===email && x.id!==u.id)) return res.status(409).json({ error:'Email exists' })
  if(name!==undefined) u.name=name
  if(email!==undefined) u.email=email
  if(role!==undefined) u.role=role
  if(active!==undefined) u.active=!!active
  saveDB(db)
  res.json({ ok:true })
})

app.post('/users/:id/reset_password', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  const u = (db.users||[]).find(x=>x.id===req.params.id)
  if(!u) return res.status(404).json({ error:'Not found' })
  const { password='123456' } = req.body||{}
  u.password = password
  saveDB(db)
  res.json({ ok:true })
})

app.delete('/users/:id', auth, requirePerm('manage_users'), (req,res)=>{
  const db = loadDB()
  if(req.params.id==='admin') return res.status(400).json({ error:'Cannot delete default admin' })
  db.users = (db.users||[]).filter(u=>u.id!==req.params.id)
  saveDB(db)
  res.json({ ok:true })
})

// ---- Invoices (list public for authed; create requires add_invoice or manage_invoices)
app.get('/invoices', auth, (_req,res)=>{
  const db = loadDB()
  res.json(db.invoices||[])
})
app.post('/invoices', auth, (req,res)=>{
  const db = loadDB()
  const allowed = hasPerm(db, req.user.role, 'add_invoice') || hasPerm(db, req.user.role, 'manage_invoices') || req.user.role==='admin'
  if(!allowed) return res.status(403).json({ error:'Forbidden' })
  db.lastSeq = (db.lastSeq||0) + 1
  const code = 'INV-' + String(db.lastSeq).padStart(5,'0')
  const body = req.body || {}
  const inv = { id:nanoid(), code, createdAt:new Date().toISOString(), ...body }
  db.invoices.push(inv); saveDB(db)
  res.status(201).json(inv)
})

app.listen(PORT, ()=> console.log('API running on http://localhost:'+PORT))
