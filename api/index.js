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
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices: [], lastSeq: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'));
}
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

app.get('/health', (req,res)=> res.json({ ok: true }));

const DEMO_USER = { email: 'admin@highfurniture.com', password: 'Admin@123', name: 'Admin' };
app.post('/login', (req,res)=>{
  const { email, password } = req.body || {};
  if(email === DEMO_USER.email && password === DEMO_USER.password){
    const token = jwt.sign({ uid:'admin', name: DEMO_USER.name }, JWT_SECRET, { expiresIn:'7d' });
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
app.use('/', auth, router);

app.listen(PORT, ()=> console.log('API running on http://localhost:' + PORT));
