import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const DB_PATH    = path.join(__dirname, 'db.json')

const PORT       = process.env.PORT || 10000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const PERMISSIONS = [
  'manage_users',     // إنشاء/تعديل/حذف موظفين + رؤية القائمة
  'view_users',       // رؤية قائمة الموظفين فقط
  'manage_invoices',  // إنشاء/تعديل/حذف الفواتير
  'add_invoice',      // إنشاء فاتورة فقط
  'view_reports',     // رؤية التقارير
  'settings_access'   // إعدادات عامة
]

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({
      invoices: [],
      lastSeq: 0,
      customers: [],
      users: [],
      roles: []
    }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }

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
function ensureRoles(db){
  if(!db.roles || !db.roles.length){
    db.roles = [
      { name:'admin',   permissions:[...PERMISSIONS] },
      { name:'manager', permissions:['manage_invoices','view_reports','view_users'] },
      { name:'staff',   permissions:['add_invoice'] }
    ]
    saveDB(db)
  }
}

function getRole(db, roleName){
  return (db.roles||[]).find(r=>r.name===roleName)
}
function userHas(db, roleName, perm){
  const r = getRole(db, roleName)
  return !!(r && r.permissions && r.permissions.includes(perm))
}

try { const _db = loadDB(); ensureRoles(_db); ensureUsers(_db) } catch(e){ console.error('seed error', e) }

app.get('/health', (_req,res)=> res.type('text').send('HF API is live ✅'))

// ---- Auth ----
app.post('/login', (req,res)=>{
  const { email, password } = req.body || {}
  const db = loadDB(); ensureUsers(db); ensureRoles(db)
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

function requirePermission(perm){
  return (req,res,next)=>{
    const db = loadDB(); ensureRoles(db)
    const roleName = req?.user?.role || 'staff'
    if(!userHas(db, roleName, perm)) return res.status(403).json({ error:'Access denied' })
    next()
  }
}

const router = express.Router()

// ---- Invoices ----
router.get('/invoices', (req,res)=>{ const db = loadDB(); res.json(db.invoices||[]) })
router.post('/invoices', requirePermission('add_invoice'), (req,res)=>{
  const db = loadDB(); const body = req.body || {}
  db.lastSeq = (db.lastSeq||0) + 1
  const code = 'INV-' + String(db.lastSeq).padStart(5,'0')
  const invoice = { id:nanoid(), code, createdAt:new Date().toISOString(), ...body }
  db.invoices = db.invoices || []
  db.invoices.push(invoice); saveDB(db)
  res.status(201).json(invoice)
})
router.put('/invoices/:id', requirePermission('manage_invoices'), (req,res)=>{
  const db = loadDB(); const i = (db.invoices||[]).findIndex(x=>x.id===req.params.id)
  if(i<0) return res.status(404).json({error:'Not found'})
  db.invoices[i] = { ...db.invoices[i], ...(req.body||{}) }
  saveDB(db); res.json(db.invoices[i])
})
router.delete('/invoices/:id', requirePermission('manage_invoices'), (req,res)=>{
  const db = loadDB(); const before=(db.invoices||[]).length
  db.invoices = (db.invoices||[]).filter(x=>x.id!==req.params.id)
  if((db.invoices||[]).length===before) return res.status(404).json({error:'Not found'})
  saveDB(db); res.json({ok:true})
})

// ---- Customers ----
router.get('/customers', (req,res)=>{ const db = loadDB(); res.json(db.customers||[]) })
router.post('/customers', requirePermission('manage_invoices'), (req,res)=>{
  const db = loadDB(); const b = req.body||{}
  if(!b.name) return res.status(400).json({error:'name required'})
  const item = { id:nanoid(), name:b.name, phone:b.phone||'', address:b.address||'', notes:b.notes||'', createdAt:new Date().toISOString() }
  db.customers = db.customers || []; db.customers.push(item); saveDB(db); res.status(201).json(item)
})
router.put('/customers/:id', requirePermission('manage_invoices'), (req,res)=>{
  const db = loadDB(); const i = (db.customers||[]).findIndex(c=>c.id===req.params.id)
  if(i<0) return res.status(404).json({error:'Not found'})
  db.customers[i] = { ...db.customers[i], ...(req.body||{}) }; saveDB(db); res.json(db.customers[i])
})
router.delete('/customers/:id', requirePermission('manage_invoices'), (req,res)=>{
  const db = loadDB(); const before=(db.customers||[]).length; db.customers = (db.customers||[]).filter(c=>c.id!==req.params.id)
  if((db.customers||[]).length===before) return res.status(404).json({error:'Not found'})
  saveDB(db); res.json({ok:true})
})

// ---- Users (by permission) ----
router.get('/users', requirePermission('view_users'), (req,res)=>{
  const db = loadDB(); ensureUsers(db); res.json(db.users)
})
router.post('/users', requirePermission('manage_users'), (req,res)=>{
  const db=loadDB(); ensureUsers(db); ensureRoles(db)
  const b=req.body||{}
  if(!b.name||!b.email) return res.status(400).json({error:'name & email required'})
  if(!getRole(db, b.role || 'staff')) return res.status(400).json({error:'role not found'})
  const item = { id:nanoid(), name:String(b.name).trim(), email:String(b.email).trim().toLowerCase(),
    role: b.role||'staff', active: b.active!==false, password: b.password||'123456', createdAt:new Date().toISOString() }
  db.users.push(item); saveDB(db); res.status(201).json(item)
})
router.put('/users/:id', requirePermission('manage_users'), (req,res)=>{
  const db=loadDB(); ensureUsers(db); ensureRoles(db)
  const i=db.users.findIndex(u=>u.id===req.params.id); if(i<0) return res.status(404).json({error:'Not found'})
  const b=req.body||{}
  if(b.role && !getRole(db, b.role)) return res.status(400).json({error:'role not found'})
  db.users[i] = { ...db.users[i],
    name: b.name ?? db.users[i].name,
    email: b.email ? String(b.email).toLowerCase() : db.users[i].email,
    role: b.role ?? db.users[i].role,
    active: typeof b.active==='boolean' ? b.active : db.users[i].active,
    password: b.password ?? db.users[i].password
  }
  saveDB(db); res.json(db.users[i])
})
router.delete('/users/:id', requirePermission('manage_users'), (req,res)=>{
  const db=loadDB(); const before=db.users.length
  db.users = db.users.filter(u=>u.id!==req.params.id)
  if(db.users.length===before) return res.status(404).json({error:'Not found'})
  saveDB(db); res.json({ok:true})
})
router.post('/users/:id/reset-password', requirePermission('manage_users'), (req,res)=>{
  const db=loadDB(); const i=db.users.findIndex(u=>u.id===req.params.id)
  if(i<0) return res.status(404).json({error:'Not found'})
  const newPass = (req.body && req.body.password) || Math.random().toString(36).slice(-8)
  db.users[i].password = newPass; saveDB(db); res.json({ ok:true, password:newPass })
})

// ---- Roles CRUD + Permissions meta ----
router.get('/roles', requirePermission('manage_users'), (req,res)=>{
  const db = loadDB(); ensureRoles(db); res.json(db.roles)
})
router.post('/roles', requirePermission('manage_users'), (req,res)=>{
  const db = loadDB(); ensureRoles(db)
  const b = req.body||{}
  const name = String(b.name||'').trim()
  const perms = Array.isArray(b.permissions) ? b.permissions.filter(p=>PERMISSIONS.includes(p)) : []
  if(!name) return res.status(400).json({error:'name required'})
  if(getRole(db, name)) return res.status(400).json({error:'role exists'})
  db.roles.push({ name, permissions: perms }); saveDB(db); res.status(201).json({ name, permissions: perms })
})
router.put('/roles/:name', requirePermission('manage_users'), (req,res)=>{
  const db = loadDB(); ensureRoles(db)
  const i = db.roles.findIndex(r=>r.name===req.params.name)
  if(i<0) return res.status(404).json({error:'role not found'})
  const b = req.body||{}
  const perms = Array.isArray(b.permissions) ? b.permissions.filter(p=>PERMISSIONS.includes(p)) : db.roles[i].permissions
  const newName = b.name ? String(b.name).trim() : db.roles[i].name
  if(newName!==db.roles[i].name && getRole(db, newName)) return res.status(400).json({error:'role exists'})
  // منع كسر الأدمن الافتراضي
  if(db.roles[i].name==='admin' && newName!=='admin') return res.status(400).json({error:'cannot rename admin'})
  db.roles[i] = { name:newName, permissions: perms }
  // لو اتغير الاسم، حدث المستخدمين
  if(newName !== req.params.name){
    db.users = (db.users||[]).map(u => u.role===req.params.name ? {...u, role:newName} : u)
  }
  saveDB(db); res.json(db.roles[i])
})
router.delete('/roles/:name', requirePermission('manage_users'), (req,res)=>{
  const db = loadDB(); ensureRoles(db)
  const name = req.params.name
  if(name==='admin') return res.status(400).json({error:'cannot delete admin role'})
  if((db.users||[]).some(u=>u.role===name)) return res.status(400).json({error:'role in use'})
  const before = db.roles.length
  db.roles = db.roles.filter(r=>r.name!==name)
  if(db.roles.length===before) return res.status(404).json({error:'role not found'})
  saveDB(db); res.json({ok:true})
})
router.get('/meta/permissions', (req,res)=> res.json(PERMISSIONS))

app.use('/', auth, router)
app.listen(PORT, ()=> console.log('API running on http://localhost:'+PORT,' DB:',DB_PATH))
