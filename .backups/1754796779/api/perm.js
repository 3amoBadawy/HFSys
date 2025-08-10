import fs from 'fs'

const DB_PATH = './db.json'
function loadDB(){
  if(!fs.existsSync(DB_PATH)){
    fs.writeFileSync(DB_PATH, JSON.stringify({ invoices:[], products:[], customers:[], roles:[] }, null, 2))
  }
  return JSON.parse(fs.readFileSync(DB_PATH,'utf-8'))
}

export function roleHas(role, perm){
  const db = loadDB()
  const r = (db.roles||[]).find(x=>x.name===role)
  return !!(r && Array.isArray(r.permissions) && r.permissions.includes(perm))
}

export function ensurePerm(perm){
  return (req,res,next)=>{
    try{
      const role = req.user?.role
      if(role && roleHas(role, perm)) return next()
    }catch(_e){}
    return res.status(403).json({ error:'Forbidden: missing permission '+perm })
  }
}
