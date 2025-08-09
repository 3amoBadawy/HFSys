import React, { useEffect, useState } from 'react'
import { apiFetch } from './apiBase'

function Login({ onSuccess }) {
  const [email, setEmail] = useState('admin@highfurniture.com')
  const [password, setPassword] = useState('Admin@123')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e){
    e.preventDefault()
    setErr(''); setLoading(true)
    try{
      const res = await apiFetch('/login', {
        method:'POST',
        body: JSON.stringify({ email, password })
      })
      if(!res.ok){ const t = await res.json().catch(()=>({error:'خطأ'})); throw new Error(t.error||'فشل تسجيل الدخول') }
      const data = await res.json()
      localStorage.setItem('hf_token', data.token)
      localStorage.setItem('hf_user', JSON.stringify(data.user))
      onSuccess()
    }catch(e){ setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#0f172a'}}>
      <form onSubmit={submit} style={{background:'rgba(17,24,39,.95)', padding:20, borderRadius:12, minWidth:320, color:'#e5e7eb', border:'1px solid #1f2937'}}>
        <h2 style={{marginTop:0, textAlign:'center'}}>تسجيل الدخول</h2>
        <label>البريد الإلكتروني<input value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%',padding:10,marginTop:6,borderRadius:8,border:'1px solid #334155',background:'#0b1220',color:'#e5e7eb'}}/></label>
        <label style={{display:'block',marginTop:10}}>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',padding:10,marginTop:6,borderRadius:8,border:'1px solid #334155',background:'#0b1220',color:'#e5e7eb'}}/></label>
        {err && <div style={{color:'#fca5a5',fontSize:13,marginTop:8}}>{err}</div>}
        <button disabled={loading} style={{width:'100%',marginTop:14,padding:10,border:0,borderRadius:10,background:'#22c55e',color:'#052e16',fontWeight:700,cursor:'pointer'}}>
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}

export default function App(){
  const [authed, setAuthed] = useState(!!localStorage.getItem('hf_token'))
  const [invoices, setInvoices] = useState([])
  const [customer, setCustomer] = useState('')
  const [amount, setAmount] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [address, setAddress] = useState('')
  const [imageData, setImageData] = useState('')

  useEffect(()=>{
    if(!authed) return
    apiFetch('/invoices').then(r=>r.json()).then(setInvoices).catch(()=>{})
  }, [authed])

  function logout(){ localStorage.removeItem('hf_token'); localStorage.removeItem('hf_user'); setAuthed(false) }

  async function saveInvoice(e){
    e.preventDefault()
    const payload = { customer, amount: parseFloat(amount||0), branchCode, deliveryDate, address, imageData }
    const res = await apiFetch('/invoices', { method:'POST', body: JSON.stringify(payload) })
    if(!res.ok){ alert('فشل الحفظ'); return }
    const data = await res.json()
    setInvoices(v=>[...v, data])
    setCustomer(''); setAmount(''); setBranchCode(''); setDeliveryDate(''); setAddress(''); setImageData('')
    alert('تم حفظ الفاتورة: ' + data.code)
  }

  function onPickImage(e){
    const f = e.target.files?.[0]
    if(!f) return setImageData('')
    const reader = new FileReader()
    reader.onload = ev => setImageData(ev.target.result)
    reader.readAsDataURL(f)
  }

  if(!authed) return <Login onSuccess={()=>setAuthed(true)} />

  return (
    <div style={{padding:16, fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>لوحة المبيعات</h2>
        <button onClick={logout} style={{background:'#ef4444',border:0,color:'#fff',borderRadius:8,padding:'8px 12px'}}>تسجيل الخروج</button>
      </div>

      <form onSubmit={saveInvoice} style={{display:'grid', gap:8, maxWidth:420}}>
        <label>اسم العميل<input value={customer} onChange={e=>setCustomer(e.target.value)} required/></label>
        <label>المبلغ<input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
        <label>رقم الفاتورة (الفرع)<input value={branchCode} onChange={e=>setBranchCode(e.target.value)} /></label>
        <label>تاريخ التسليم<input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} /></label>
        <label>عنوان التسليم<input value={address} onChange={e=>setAddress(e.target.value)} /></label>
        <label>صورة الفاتورة<input type="file" accept="image/*" onChange={onPickImage} /></label>
        <button>حفظ</button>
      </form>

      <h3 style={{marginTop:24}}>آخر الفواتير</h3>
      <ul>
        {invoices.map(inv => (
          <li key={inv.id}>
            {inv.code} — {inv.customer} — {inv.amount} ج.م — {new Date(inv.createdAt).toLocaleDateString('en-CA')}
          </li>
        ))}
      </ul>
      <p style={{opacity:.7}}>متصل بالـ API على Render.</p>
    </div>
  )
}
