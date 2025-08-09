import React, { useEffect, useState } from 'react'
import { apiFetch, fmtEGP } from './apiBase'

export default function Products(){
  const [items,setItems] = useState([])
  const [q,setQ] = useState('')
  const [form,setForm] = useState({ name:'', sku:'', price:'' })
  const [loading,setLoading] = useState(false)
  const [err,setErr] = useState('')

  async function load(){
    setErr('')
    try{
      const r = await apiFetch('/products')
      if(!r.ok) throw new Error('فشل تحميل المنتجات')
      setItems(await r.json())
    }catch(e){ setErr(e.message) }
  }

  useEffect(()=>{ load() },[])

  async function addProduct(e){
    e.preventDefault()
    setErr(''); setLoading(true)
    try{
      const body = {
        name: form.name?.trim(),
        sku: form.sku?.trim(),
        price: Number(form.price||0)
      }
      const r = await apiFetch('/products', { method:'POST', body: JSON.stringify(body) })
      if(!r.ok){ const t=await r.json().catch(()=>({})); throw new Error(t.error||'فشل الإضافة') }
      const p = await r.json()
      setItems(v=>[...v, p])
      setForm({ name:'', sku:'', price:'' })
    }catch(e){ setErr(e.message) } finally { setLoading(false) }
  }

  const filtered = items.filter(p=>{
    const s = q.trim().toLowerCase()
    if(!s) return true
    return (p.name||'').toLowerCase().includes(s) || (p.sku||'').toLowerCase().includes(s)
  })

  return (
    <div className="card">
      <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
        <h3 className="h2">المنتجات</h3>
        <input className="input" placeholder="بحث بالاسم/الكود" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:260}}/>
      </div>

      <form onSubmit={addProduct} className="grid" style={{marginTop:12}}>
        <div><label className="muted">اسم المنتج *</label>
          <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
        </div>
        <div className="grid grid-2">
          <div><label className="muted">الكود (SKU)</label>
            <input className="input" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})}/>
          </div>
          <div><label className="muted">السعر</label>
            <input className="input" type="number" step="0.01" value={form.price} onChange={e=>setForm({...form, price:e.target.value})}/>
          </div>
        </div>
        <div><button disabled={loading} className="btn btn-green">{loading?'جارٍ الحفظ...':'إضافة'}</button></div>
        {err && <div style={{color:'#fca5a5',marginTop:6}}>{err}</div>}
      </form>

      <div className="card" style={{marginTop:12}}>
        <table className="table">
          <thead><tr><th>الاسم</th><th>الكود</th><th>السعر</th><th>أُضيف في</th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku||'—'}</td>
                <td>{fmtEGP(p.price||0)}</td>
                <td>{new Date(p.createdAt).toLocaleDateString('en-CA')}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={4} className="muted">لا توجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
