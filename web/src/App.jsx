import React, { useEffect, useState } from 'react'
import { apiFetch, fmtEGP } from './apiBase'
import Customers from './Customers'
import CustomerSelect from './CustomerSelect'
import AdminUsers from './Admin'
import './ui.css'

function Login({ onSuccess }) {
  const [email, setEmail] = useState('admin@highfurniture.com')
  const [password, setPassword] = useState('Admin@123')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  async function submit(e){
    e.preventDefault(); setErr(''); setLoading(true)
    try{
      const res = await apiFetch('/login', { method:'POST', body: JSON.stringify({ email, password }) })
      if(!res.ok){ const t = await res.json().catch(()=>({error:'خطأ'})); throw new Error(t.error||'فشل تسجيل الدخول') }
      const data = await res.json()
      localStorage.setItem('hf_token', data.token)
      localStorage.setItem('hf_user', JSON.stringify(data.user))
      onSuccess()
    }catch(e){ setErr(e.message) } finally { setLoading(false) }
  }
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'var(--bg)'}}>
      <form onSubmit={submit} className="card" style={{minWidth:360}}>
        <h2 className="h1" style={{textAlign:'center'}}>تسجيل الدخول</h2>
        <label>البريد الإلكتروني <input className="input" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label style={{display:'block',marginTop:10}}>كلمة المرور <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        {err && <div style={{color:'#fca5a5',fontSize:13,marginTop:8}}>{err}</div>}
        <button disabled={loading} className="btn btn-green" style={{width:'100%',marginTop:12}}>
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}

export default function App(){
  const [authed, setAuthed] = useState(!!localStorage.getItem('hf_token'))
  const [tab, setTab] = useState('sales')
  const [user, setUser] = useState(()=>{ try{return JSON.parse(localStorage.getItem('hf_user')||'null')}catch{return null}})
  const isAdmin = user?.role === 'admin'

  const [invoices, setInvoices] = useState([])
  const [cust, setCust] = useState(null)
  const [amount, setAmount] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [address, setAddress] = useState('')
  const [imageData, setImageData] = useState('')

  useEffect(()=>{
    if(!authed) return
    apiFetch('/invoices').then(r=>r.json()).then(setInvoices).catch(()=>{})
    setUser(()=>{ try{return JSON.parse(localStorage.getItem('hf_user')||'null')}catch{return null}})
  }, [authed])

  function logout(){ localStorage.removeItem('hf_token'); localStorage.removeItem('hf_user'); setAuthed(false); setUser(null) }

  async function saveInvoice(e){
    e.preventDefault()
    if(!cust){ alert('من فضلك اختر عميل'); return }
    const payload = { customerId:cust.id, customer:cust.name, amount:parseFloat(amount||0), branchCode, deliveryDate, address, imageData }
    const res = await apiFetch('/invoices', { method:'POST', body: JSON.stringify(payload) })
    if(!res.ok){ const t=await res.json().catch(()=>({})); alert(t.error||'فشل الحفظ'); return }
    const data = await res.json()
    setInvoices(v=>[...v, data]); setCust(null); setAmount(''); setBranchCode(''); setDeliveryDate(''); setAddress(''); setImageData('')
  }
  function onPickImage(e){ const f=e.target.files?.[0]; if(!f) return setImageData(''); const r=new FileReader(); r.onload=ev=>setImageData(ev.target.result); r.readAsDataURL(f) }

  if(!authed) return <Login onSuccess={()=>setAuthed(true)} />

  return (
    <div className="container">
      <div className="header">
        <div className="tabs">
          <button onClick={()=>setTab('sales')} className={'tab '+(tab==='sales'?'active':'')}>المبيعات</button>
          <button onClick={()=>setTab('customers')} className={'tab '+(tab==='customers'?'active':'')}>العملاء</button>
          {isAdmin && <button onClick={()=>setTab('admin')} className={'tab '+(tab==='admin'?'active':'')}>الإدارة</button>}
        </div>
        <button onClick={logout} className="btn btn-red">تسجيل الخروج</button>
      </div>

      {tab==='sales' && (
        <>
          <div className="card">
            <h3 className="h2">إضافة عملية بيع</h3>
            <form onSubmit={saveInvoice} className="grid">
              <div><label className="muted">العميل</label><CustomerSelect value={cust} onChange={setCust}/></div>
              <div className="grid grid-2">
                <div><label className="muted">المبلغ</label><input className="input" type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></div>
                <div><label className="muted">رقم الفاتورة (الفرع)</label><input className="input" value={branchCode} onChange={e=>setBranchCode(e.target.value)} /></div>
                <div><label className="muted">تاريخ التسليم</label><input className="input" type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} /></div>
                <div><label className="muted">عنوان التسليم</label><input className="input" value={address} onChange={e=>setAddress(e.target.value)} /></div>
              </div>
              <div><label className="muted">صورة الفاتورة</label><input className="input" type="file" accept="image/*" onChange={onPickImage} /></div>
              <div><button className="btn btn-green">حفظ</button></div>
            </form>
          </div>

          <div className="card" style={{marginTop:12}}>
            <h3 className="h2">آخر الفواتير</h3>
            <table className="table"><thead><tr><th>الكود</th><th>العميل</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
              <tbody>
                {invoices.map(inv=>(
                  <tr key={inv.id}><td>{inv.code}</td><td>{inv.customer||'—'}</td><td>{fmtEGP(inv.amount)}</td><td>{new Date(inv.createdAt).toLocaleDateString('en-CA')}</td></tr>
                ))}
                {!invoices.length && <tr><td colSpan={4} className="muted">لا توجد فواتير بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab==='customers' && <div className="card"><h3 className="h2">العملاء</h3><Customers/></div>}

      {tab==='admin' && isAdmin && <AdminUsers/>}
    </div>
  )
}
