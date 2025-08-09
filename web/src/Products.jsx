import React, { useEffect, useState } from 'react'
import { apiFetch } from './apiBase'

export default function Products(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ name:'', sku:'', price:'', stock:'', notes:'', imageData:'' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function load(){
    setErr('')
    try{
      const r = await apiFetch('/products')
      if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error || 'load failed')
      const data = await r.json()
      setItems(data)
    }catch(e){ setErr(e.message || 'خطأ في تحميل المنتجات') }
  }
  useEffect(()=>{ load() }, [])

  function onPickImage(e){
    const f = e.target.files?.[0]; if(!f) return setForm(v=>({...v, imageData:''}))
    const r = new FileReader(); r.onload = ev => setForm(v=>({...v, imageData: ev.target.result})); r.readAsDataURL(f)
  }

  async function addProduct(e){
    e.preventDefault()
    setLoading(true); setErr('')
    try{
      if(!form.name) throw new Error('الاسم مطلوب')
      const payload = {
        name: form.name, sku: form.sku,
        price: form.price ? Number(form.price) : 0,
        stock: form.stock ? Number(form.stock) : 0,
        notes: form.notes, imageData: form.imageData
      }
      const r = await apiFetch('/products', { method:'POST', body: JSON.stringify(payload) })
      if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error || 'فشل الإضافة')
      const p = await r.json()
      setItems(v=>[p, ...v])
      setForm({ name:'', sku:'', price:'', stock:'', notes:'', imageData:'' })
    }catch(e){ setErr(e.message || 'فشل الإضافة') }
    finally{ setLoading(false) }
  }

  async function remove(id){
    if(!confirm('حذف المنتج؟')) return
    const r = await apiFetch('/products/'+id, { method:'DELETE' })
    if(r.ok) setItems(v=>v.filter(x=>x.id!==id))
  }

  const filtered = items.filter(x=>{
    if(!q) return true
    const t = (q||'').toLowerCase()
    return (x.name||'').toLowerCase().includes(t) || (x.sku||'').toLowerCase().includes(t)
  })

  return (
    <>
      <div className="card">
        <h3 className="h2">إضافة منتج</h3>
        <form className="grid" onSubmit={addProduct}>
          <div><label className="muted">الاسم *</label><input className="input" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} required/></div>
          <div className="grid grid-2">
            <div><label className="muted">SKU</label><input className="input" value={form.sku} onChange={e=>setForm(v=>({...v,sku:e.target.value}))}/></div>
            <div><label className="muted">السعر</label><input className="input" type="number" step="0.01" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))}/></div>
            <div><label className="muted">المخزون</label><input className="input" type="number" step="1" value={form.stock} onChange={e=>setForm(v=>({...v,stock:e.target.value}))}/></div>
          </div>
          <div><label className="muted">ملاحظات</label><textarea className="input" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}/></div>
          <div><label className="muted">صورة المنتج</label><input className="input" type="file" accept="image/*" onChange={onPickImage}/></div>
          {err && <div style={{color:'#fca5a5'}}>{err}</div>}
          <div><button className="btn btn-green" disabled={loading}>{loading?'جاري الحفظ...':'حفظ'}</button></div>
        </form>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="flex" style={{justifyContent:'space-between',alignItems:'center'}}>
          <h3 className="h2">المنتجات</h3>
          <input className="input" style={{maxWidth:240}} placeholder="بحث بالاسم/الـSKU" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <table className="table">
          <thead><tr><th>الاسم</th><th>SKU</th><th>السعر</th><th>المخزون</th><th>إجراء</th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku || '—'}</td>
                <td>{Number(p.price||0).toLocaleString('en-EG',{style:'currency',currency:'EGP'})}</td>
                <td>{p.stock ?? 0}</td>
                <td><button className="btn btn-red" onClick={()=>remove(p.id)}>حذف</button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} className="muted">لا توجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
