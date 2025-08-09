import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch, fmtEGP } from './apiBase'

export default function Products(){
  const [items,setItems]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({ name:'', sku:'', price:'', category:'', stock:'', imageData:'' })
  const [editId,setEditId]=useState(null)
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('')

  async function load(){ const r=await apiFetch('/products'+(q?`?q=${encodeURIComponent(q)}`:'')); if(r.ok) setItems(await r.json()) }
  useEffect(()=>{ load() },[])
  async function search(e){ e.preventDefault(); load() }
  function pickImg(e){ const f=e.target.files?.[0]; if(!f) return setForm(v=>({...v,imageData:''})); const r=new FileReader(); r.onload=ev=>setForm(v=>({...v,imageData:ev.target.result})); r.readAsDataURL(f) }

  async function save(e){
    e.preventDefault(); setErr(''); setMsg('')
    const payload={...form, price:parseFloat(form.price||0), stock:parseInt(form.stock||0,10)}
    const url = editId? '/products/'+editId : '/products'
    const method = editId? 'PUT':'POST'
    const r = await apiFetch(url,{method, body: JSON.stringify(payload)})
    const t = await r.json().catch(()=>({}))
    if(!r.ok){ setErr(t.error||'خطأ'); return }
    setMsg('تم الحفظ'); setEditId(null)
    setForm({ name:'', sku:'', price:'', category:'', stock:'', imageData:'' })
    load()
  }
  async function del(id){ if(!confirm('حذف المنتج؟')) return; const r=await apiFetch('/products/'+id,{method:'DELETE'}); if(r.ok) load() }
  function edit(p){ setEditId(p.id); setForm({ name:p.name, sku:p.sku, price:String(p.price||0), category:p.category||'', stock:String(p.stock||0), imageData:p.imageData||'' }) }

  const rows = useMemo(()=>items.map(p=>(
    <tr key={p.id}>
      <td>{p.sku}</td>
      <td style={{display:'flex',gap:8,alignItems:'center'}}>{p.imageData && <img src={p.imageData} alt="" style={{width:32,height:32,objectFit:'cover',borderRadius:6}}/>}{p.name}</td>
      <td>{p.category||'—'}</td>
      <td>{fmtEGP(p.price||0)}</td>
      <td>{p.stock??0}</td>
      <td>
        <div className="actions">
          <button className="btn" onClick={()=>edit(p)}>تعديل</button>
          <button className="btn btn-red" onClick={()=>del(p.id)}>حذف</button>
        </div>
      </td>
    </tr>
  )),[items])

  return (
    <div className="grid">
      <form onSubmit={save} className="card">
        <h3 className="h2">{editId?'تعديل منتج':'إضافة منتج'}</h3>
        <div className="grid grid-2">
          <label>الاسم*<input className="input" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} required/></label>
          <label>SKU<input className="input" value={form.sku} onChange={e=>setForm(v=>({...v,sku:e.target.value}))}/></label>
          <label>السعر<input className="input" type="number" step="0.01" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))}/></label>
          <label>الفئة<input className="input" value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}/></label>
          <label>المخزون<input className="input" type="number" value={form.stock} onChange={e=>setForm(v=>({...v,stock:e.target.value}))}/></label>
          <label>صورة<input className="input" type="file" accept="image/*" onChange={pickImg}/></label>
        </div>
        {err && <div style={{color:'#fca5a5',fontSize:13}}>{err}</div>}
        {msg && <div style={{color:'#86efac',fontSize:13}}>{msg}</div>}
        <div style={{marginTop:8}}>
          <button className="btn btn-green">{editId?'تحديث':'حفظ'}</button>
          {editId && <button type="button" className="btn" onClick={()=>{setEditId(null); setForm({ name:'', sku:'', price:'', category:'', stock:'', imageData:'' })}}>إلغاء</button>}
        </div>
      </form>

      <div className="card">
        <h3 className="h2">المنتجات</h3>
        <form onSubmit={search} style={{marginBottom:8}}>
          <input className="input" placeholder="ابحث بالاسم/الفئة/الـSKU" value={q} onChange={e=>setQ(e.target.value)}/>
          <button className="btn" style={{marginInlineStart:8}}>بحث</button>
        </form>
        <table className="table">
          <thead><tr><th>SKU</th><th>الاسم</th><th>الفئة</th><th>السعر</th><th>المخزون</th><th>إجراء</th></tr></thead>
          <tbody>{rows.length? rows : <tr><td colSpan={6} className="muted">لا توجد بيانات</td></tr>}</tbody>
        </table>
      </div>
    </div>
  )
}
