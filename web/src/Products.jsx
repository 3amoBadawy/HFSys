import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch, fmtEGP } from './apiBase'

export default function Products(){
  const [items,setItems]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({ name:'', sku:'', price:'', category:'', stock:'', imageData:'', active:true })
  const [editing,setEditing]=useState(null)
  const [err,setErr]=useState(''); const [ok,setOk]=useState('')

  useEffect(()=>{ load() },[])
  async function load(){
    setErr(''); setOk('')
    const r = await apiFetch('/products')
    if(!r.ok){ setErr('فشل تحميل المنتجات'); return }
    setItems(await r.json())
  }

  function onPick(e){
    const f=e.target.files?.[0]; if(!f){ setForm(s=>({...s,imageData:''})); return }
    const rd=new FileReader(); rd.onload=ev=> setForm(s=>({...s,imageData:ev.target.result}))
    rd.readAsDataURL(f)
  }
  function reset(){ setForm({ name:'', sku:'', price:'', category:'', stock:'', imageData:'', active:true }); setEditing(null) }

  async function submit(e){
    e.preventDefault(); setErr(''); setOk('')
    const payload = {
      name: form.name, sku: form.sku,
      price: parseFloat(form.price||0), category: form.category,
      stock: parseInt(form.stock||0), imageData: form.imageData,
      active: !!form.active
    }
    const url = editing ? '/products/'+editing.id : '/products'
    const method = editing ? 'PUT' : 'POST'
    const r = await apiFetch(url, { method, body: JSON.stringify(payload) })
    const t = await r.json().catch(()=>({}))
    if(!r.ok){ setErr(t.error||'فشل الحفظ'); return }
    setOk('تم الحفظ'); reset(); load()
  }

  async function remove(id){
    if(!confirm('حذف المنتج؟')) return
    const r = await apiFetch('/products/'+id, { method:'DELETE' })
    if(!r.ok){ alert('فشل الحذف'); return }
    load()
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if(!s) return items
    return items.filter(p=>
      (p.name||'').toLowerCase().includes(s) ||
      (p.sku||'').toLowerCase().includes(s) ||
      (p.category||'').toLowerCase().includes(s)
    )
  }, [items,q])

  return (
    <div className="grid" style={{gap:12}}>
      <form onSubmit={submit} className="card">
        <h3 className="h2">{editing ? 'تعديل منتج' : 'إضافة منتج'}</h3>
        <div className="grid grid-2">
          <label>الاسم<input className="input" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} required/></label>
          <label>الكود (SKU)<input className="input" value={form.sku} onChange={e=>setForm(s=>({...s,sku:e.target.value}))} required disabled={!!editing}/></label>
          <label>السعر<input className="input" type="number" step="0.01" value={form.price} onChange={e=>setForm(s=>({...s,price:e.target.value}))}/></label>
          <label>المخزون<input className="input" type="number" value={form.stock} onChange={e=>setForm(s=>({...s,stock:e.target.value}))}/></label>
          <label>التصنيف<input className="input" value={form.category} onChange={e=>setForm(s=>({...s,category:e.target.value}))}/></label>
          <label>نشط؟
            <input type="checkbox" checked={!!form.active} onChange={e=>setForm(s=>({...s,active:e.target.checked}))} style={{marginInlineStart:8}}/>
          </label>
        </div>
        <label style={{marginTop:8}}>صورة المنتج<input className="input" type="file" accept="image/*" onChange={onPick}/></label>
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
          <button className="btn btn-green">{editing?'تحديث':'حفظ'}</button>
          {editing && <button type="button" className="btn" onClick={reset}>إلغاء</button>}
          <input placeholder="بحث بالاسم/الكود/التصنيف" className="input" style={{marginInlineStart:'auto'}} value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        {err && <div style={{color:'#ef4444',marginTop:6}}>{err}</div>}
        {ok && <div style={{color:'#22c55e',marginTop:6}}>{ok}</div>}
      </form>

      <div className="card">
        <h3 className="h2">المنتجات</h3>
        <table className="table">
          <thead><tr><th>الصورة</th><th>الاسم</th><th>الكود</th><th>السعر</th><th>المخزون</th><th>التصنيف</th><th>الحالة</th><th>إجراء</th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id}>
                <td>{p.imageData ? <img src={p.imageData} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:6}}/> : '—'}</td>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{fmtEGP(p.price||0)}</td>
                <td>{p.stock||0}</td>
                <td>{p.category||'—'}</td>
                <td>{p.active?'نشط':'موقوف'}</td>
                <td style={{display:'flex',gap:6,justifyContent:'center'}}>
                  <button className="btn" onClick={()=>{ setEditing(p); setForm({
                    name:p.name, sku:p.sku, price:p.price, category:p.category, stock:p.stock,
                    imageData:p.imageData, active:p.active
                  })}}>تعديل</button>
                  <button className="btn btn-red" onClick={()=>remove(p.id)}>حذف</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={8} className="muted">لا توجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
