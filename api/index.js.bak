import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const DB_PATH = './db.json';
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices: [], lastSeq: 0, customers: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'));
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

app.get('/health', (req,res)=> res.json({ ok: true }));

const DEMO_USER = { email: 'admin.com', password: 'Admin', name: 'Admin', role: 'admin' };
app.post('/login', (req,res)=>{
  const { email, password } = req.body || {};
  if(email === DEMO_USER.email && password === DEMO_USER.password){
    const token = jwt.sign({ uid:'admin', name: DEMO_USER.name, role: DEMO_USER.role }, JWT_SECRET, { expiresIn:'7d' });
    return res.json({ token, user: { name: DEMO_USER.name, email: DEMO_USER.email } });
  }
  return res.status(401).json({ error:'Invalid credentials' });
});

function auth(req,res,next){
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if(!m) return res.status(401).json({ error:'Missing token' });
  try{ req.user = jwt.verify(m[1], JWT_SECRET); next(); }
  catch{ return res.status(401).json({ error:'Invalid token' }); }
}

const router = express.Router();

// -------- Customers CRUD --------
router.get("/customers", (req,res)=>{ const db=loadDB(); res.json(db.customers||[]); });

router.post("/customers", (req,res)=>{
  const db=loadDB();
  db.customers = db.customers || [];
  const b = req.body||{};
  if(!b.name || !String(b.name).trim()) return res.status(400).json({error:"Name required"});
  const item = {
    id: nanoid(),
    name: String(b.name).trim(),
    phone: b.phone||"",
    address: b.address||"",
    notes: b.notes||"",
    createdAt: new Date().toISOString()
  };
  db.customers.push(item); saveDB(db);
  res.status(201).json(item);
});

router.put("/customers/:id", (req,res)=>{
  const db=loadDB(); db.customers=db.customers||[];
  const i = db.customers.findIndex(c=>c.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const b=req.body||{};
  db.customers[i] = { ...db.customers[i], ...b, id: db.customers[i].id };
  saveDB(db); res.json(db.customers[i]);
});

router.delete("/customers/:id", (req,res)=>{
  const db=loadDB(); db.customers=db.customers||[];
  const before = db.customers.length;
  db.customers = db.customers.filter(c=>c.id!==req.params.id);
  if(db.customers.length===before) return res.status(404).json({error:"Not found"});
  saveDB(db); res.json({ok:true});
});

router.get('/invoices', (req,res)=>{ const db = loadDB(); res.json(db.invoices); });
router.post('/invoices', (req,res)=>{
  const db = loadDB(); const body = req.body || {};
  db.lastSeq = (db.lastSeq||0) + 1;
  const code = 'INV-' + String(db.lastSeq).padStart(5,'0');
  const invoice = { id: nanoid(), code, createdAt: new Date().toISOString(), ...body };
  db.invoices.push(invoice); saveDB(db);
  res.status(201).json(invoice);
});
router.get('/invoices/:id', (req,res)=>{
  const db = loadDB(); const inv = db.invoices.find(i=>i.id===req.params.id);
  if(!inv) return res.status(404).json({ error:'Not found' });
  res.json(inv);
});
app.get("/", (req,res)=> res.send("HF API is live ✅"));
app.get("/",(req,res)=>res.send("HF API is live ✅"));
app.use('/', auth, router);

app.listen(PORT, ()=> console.log('API running on http://localhost:' + PORT));

// --- admin guard ---
function requireAdmin(req,res,next){
  if(req?.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// تأكد من وجود users في قاعدة البيانات
function ensureUsers(db){
  if(!db.users) db.users = [
    { id: nanoid(), name:'Admin', email:'admin@highfurniture.com', role:'admin', active:true, createdAt:new Date().toISOString() }
  ];
}

// --- Users CRUD (Admins only) ---
router.get('/users', requireAdmin, (req,res)=>{
  const db = loadDB(); ensureUsers(db); res.json(db.users);
});

router.post('/users', requireAdmin, (req,res)=>{
  const db = loadDB(); ensureUsers(db);
  const b = req.body||{};
  if(!b.name || !b.email) return res.status(400).json({error:'name & email required'});
  const item = { id:nanoid(), name:String(b.name).trim(), email:String(b.email).trim(),
    role: b.role==='admin' ? 'admin' : 'staff', active: b.active!==false, createdAt:new Date().toISOString() };
  db.users.push(item); saveDB(db);
  res.status(201).json(item);
});

router.put('/users/:id', requireAdmin, (req,res)=>{
  const db=loadDB(); ensureUsers(db);
  const i = db.users.findIndex(u=>u.id===req.params.id);
  if(i<0) return res.status(404).json({error:'Not found'});
  const b=req.body||{};
  db.users[i] = { ...db.users[i],
    name: b.name ?? db.users[i].name,
    email: b.email ?? db.users[i].email,
    role: b.role ? (b.role==='admin'?'admin':'staff') : db.users[i].role,
    active: typeof b.active==='boolean' ? b.active : db.users[i].active
  };
  saveDB(db); res.json(db.users[i]);
});

router.delete('/users/:id', requireAdmin, (req,res)=>{
  const db=loadDB(); ensureUsers(db);
  const before = db.users.length;
  db.users = db.users.filter(u=>u.id!==req.params.id);
  if(db.users.length===before) return res.status(404).json({error:'Not found'});
  saveDB(db); res.json({ok:true});
});
