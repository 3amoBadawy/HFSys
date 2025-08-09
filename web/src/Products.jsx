import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'

export default function Products(){
  const [items,setItems]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({ name:'', sku:'', price:'', stock:'', notes:'', imageData:'' })
  const [editing,setEditing]=useState(null)
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('')

  useEffect(()=>{ reload() },[])
  async function reload(){
    setErr(''); setMsg('')
    try{
      const r=await apiFetch('/products'); if(!r.ok) throw new Error('load failed')
      setItems(await r.json())
    }catch(e){ setErr('فشل تحميل المنتجات') }
  }

  function pickImage(e){
    const f=e.target.files?.[0]; if(!f) return setForm(v=>({...v,imageData:''}))
    const r=new FileReader(); r.onload=ev=>setForm(v=>({...v,imageData:ev.target.result})); r.readAsDataURL(f)
  }

  async function save(e){
    e.preventDefault(); setErr(''); setMsg('')
    const body = { ...form, price: Number(form.price||0), stock: Number(form.stock||0) }
    try{
      let r
      if(editing){ r = await apiFetch('/products/'+editing.id, { method:'PUT', body: JSON.stringify(body) }) }
      else{ r = await apiFetch('/products', { method:'POST', body: JSON.stringify(body) }) }
      const t = await r.json().catch(()=>({}))
      if(!r.ok) throw new Error(t.error||'save failed')
      setForm({ name:'', sku:'', price:'', stock:'', notes:'', imageData:'' }); setEditing(null)
      setMsg('تم الحفظ')
      reload()
    }catch(e){ setErr(e.message) }
  }

  async function remove(id){
    if(!confirm('حذف المنتج؟')) return
    try{
      const r=await apiFetch('/products/'+id, { method:'DELETE' })
      if(!r.ok) throw new Error('delete failed'); reload()
    }catch(e){ setErr('فشل الحذف') }
  }

  const view = useMemo(()=> items.filter(p=>{
    const s=(q||'').toLowerCase()
    return !s || [p.name,p.sku,p.notes].filter(Boolean).some(x=>String(x).toLowerCase().includes(s))
  }), [items,q])

  return (
    <>
      <div className="card">
        <h3 className="h2">إضافة/تعديل منتج</h3>
        <form onSubmit={save} className="grid">
          <div className="grid grid-2">
            <label>اسم المنتج*<input className="input" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} required/></label>
            <label>SKU*<input className="input" value={form.sku} onChange={e=>setForm(v=>({...v,sku:e.target.value}))} required/></label>
            <label>السعر<input className="input" type="number" step="0.01" value={form.price} onChange={e=>setForm(v=>({...v,price:e.target.value}))}/></label>
            <label>المخزون<input className="input" type="number" step="1" value={form.stock} onChange={e=>setForm(v=>({...v,stock:e.target.value}))}/></label>
          </div>
          <label>ملاحظات<textarea className="input" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}/></label>
          <label>صورة المنتج<input className="input" type="file" accept="image/*" onChange={pickImage}/></label>
          <div><button className="btn btn-green">{editing?'تحديث':'إضافة'}</button>
            {editing && <button type="button" className="btn" onClick={()=>{setEditing(null);setForm({name:'',sku:'',price:'',stock:'',notes:'',imageData:''})}} style={{marginInlineStart:8}}>إلغاء</button>}
          </div>
          {msg && <div style={{color:'#86efac'}}>{msg}</div>}
          {err && <div style={{color:'#fca5a5'}}>{err}</div>}
        </form>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 className="h2">المنتجات</h3>
          <input className="input" placeholder="بحث بالاسم/sku/ملاحظات" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:260}}/>
        </div>
        <table className="table">
          <thead><tr><th>اسم</th><th>SKU</th><th>سعر</th><th>مخزون</th><th>إجراء</th></tr></thead>
          <tbody>
            {view.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.sku}</td><td>{Number(p.price||0).toLocaleString('en-EG')} ج.م</td><td>{p.stock??0}</td>
                <td>
                  <button className="btn" onClick={()=>{setEditing(p); setForm({ name:p.name, sku:p.sku, price:p.price, stock:p.stock, notes:p.notes||'', imageData:p.imageData||'' })}}>تعديل</button>
                  <button className="btn btn-red" onClick={()=>remove(p.id)} style={{marginInlineStart:8}}>حذف</button>
                </td>
              </tr>
            ))}
            {!view.length && <tr><td colSpan={5} className="muted">لا يوجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
