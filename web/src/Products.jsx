import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'
import { safeArray } from './util'

export default function Products(){
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ name:'', sku:'', price:'', imageData:'' })
  const [editId, setEditId] = useState(null) // لو بنعدل

  async function load(){
    setLoading(true); setErr('')
    try{
      const r = await apiFetch('/products')
      if(!r.ok){ const t = await r.json().catch(()=>({})); throw new Error(t.error||('HTTP '+r.status)) }
      const data = await r.json().catch(()=>[])
      setRows(safeArray(data))
    }catch(e){ setErr('فشل تحميل المنتجات'); console.warn('[Products] load', e) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  async function save(e){
    e.preventDefault(); setMsg(''); setErr('')
    try{
      const payload = { 
        name: form.name?.trim(), 
        sku: form.sku?.trim(), 
        price: parseFloat(form.price||0), 
        imageData: form.imageData||'' 
      }
      if(!payload.name || !payload.sku){ setErr('الاسم و SKU مطلوبان'); return }
      const r = await apiFetch(editId? `/products/${editId}`:'/products', {
        method: editId? 'PUT':'POST',
        body: JSON.stringify(payload)
      })
      const t = await r.json().catch(()=>({}))
      if(!r.ok) throw new Error(t.error||('HTTP '+r.status))
      setMsg(editId? 'تم التحديث':'تمت الإضافة')
      setForm({ name:'', sku:'', price:'', imageData:'' })
      setEditId(null)
      load()
    }catch(e){ setErr(e.message||'فشل الحفظ') }
  }

  async function remove(id){
    if(!confirm('حذف المنتج؟')) return
    try{
      const r = await apiFetch(`/products/${id}`, { method:'DELETE' })
      if(!r.ok){ const t=await r.json().catch(()=>({})); throw new Error(t.error||('HTTP '+r.status)) }
      setRows(v=>v.filter(x=>x.id!==id))
    }catch(e){ alert(e.message||'فشل الحذف') }
  }

  function onPickImage(e){
    const f = e.target.files?.[0]
    if(!f) return setForm(s=>({...s, imageData:''}))
    const reader = new FileReader()
    reader.onload = ev => setForm(s=>({...s, imageData: ev.target.result }))
    reader.readAsDataURL(f)
  }

  function startEdit(p){
    setEditId(p.id)
    setForm({ name:p.name||'', sku:p.sku||'', price:String(p.price??''), imageData:p.imageData||'' })
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  const filtered = useMemo(()=>{
    const k = q.trim().toLowerCase()
    const base = safeArray(rows)
    if(!k) return base
    return base.filter(p => 
      String(p.name||'').toLowerCase().includes(k) ||
      String(p.sku||'').toLowerCase().includes(k)
    )
  }, [rows, q])

  return (
    <>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'space-between'}}>
          <h3 className="h2">المنتجات</h3>
          <input className="input" placeholder="بحث بالاسم/الـSKU" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:280}}/>
        </div>

        <form onSubmit={save} className="grid" style={{marginTop:12}}>
          <div className="grid grid-2">
            <label>الاسم<input className="input" value={form.name} onChange={e=>setForm(s=>({...s, name:e.target.value}))} required/></label>
            <label>SKU<input className="input" value={form.sku} onChange={e=>setForm(s=>({...s, sku:e.target.value}))} required/></label>
            <label>السعر<input className="input" type="number" step="0.01" value={form.price} onChange={e=>setForm(s=>({...s, price:e.target.value}))} required/></label>
            <label>صورة المنتج<input className="input" type="file" accept="image/*" onChange={onPickImage}/></label>
          </div>
          <div>
            <button className="btn btn-green">{editId? 'تحديث':'إضافة'}</button>
            {editId && <button type="button" className="btn" style={{marginInlineStart:8}} onClick={()=>{ setEditId(null); setForm({name:'',sku:'',price:'',imageData:''}) }}>إلغاء</button>}
          </div>
          {msg && <div style={{color:'#86efac'}}>{msg}</div>}
          {err && <div style={{color:'#fca5a5'}}>{err}</div>}
        </form>
      </div>

      <div className="card" style={{marginTop:12}}>
        <table className="table">
          <thead><tr><th>الإجراء</th><th>السعر</th><th>SKU</th><th>الاسم</th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id}>
                <td>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn" onClick={()=>startEdit(p)}>تعديل</button>
                    <button className="btn btn-red" onClick={()=>remove(p.id)}>حذف</button>
                  </div>
                </td>
                <td>{Number(p.price||0).toLocaleString('ar-EG')}</td>
                <td>{p.sku||'—'}</td>
                <td style={{display:'flex',alignItems:'center',gap:8}}>
                  {p.imageData ? <img src={p.imageData} alt="" style={{width:32,height:32,objectFit:'cover',borderRadius:6}}/> : null}
                  <span>{p.name||'—'}</span>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={4} className="muted">{loading? 'جار التحميل…':'لا يوجد منتجات'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
