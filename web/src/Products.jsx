import React, { useEffect, useState } from 'react'
import { apiFetch, fmtEGP } from './apiBase'
import { hasPermission } from './apiBase'

export default function Products(){
  const [items,setItems]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({name:'',sku:'',price:'',stock:'',notes:''})
  const [canManage,setCanManage]=useState(false)
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')

  useEffect(()=>{
    (async()=>{
      setCanManage(await hasPermission('manage_products'))
      await refresh()
    })()
  },[])

  async function refresh(){
    setLoading(true); setErr('')
    try{
      const r=await apiFetch('/products'); 
      if(!r.ok) throw new Error('فشل تحميل المنتجات')
      setItems(await r.json())
    }catch(e){ setErr(e.message||'خطأ') } finally{ setLoading(false) }
  }

  async function add(e){
    e.preventDefault()
    if(!canManage) return
    const body={...form, price:parseFloat(form.price||0), stock:parseInt(form.stock||0)}
    const r = await apiFetch('/products',{method:'POST', body:JSON.stringify(body)})
    if(!r.ok){ const t=await r.json().catch(()=>({})); alert(t.error||'فشل الإضافة'); return }
    setForm({name:'',sku:'',price:'',stock:'',notes:''}); refresh()
  }

  async function del(id){
    if(!canManage) return
    if(!confirm('حذف المنتج؟')) return
    const r = await apiFetch('/products/'+id,{method:'DELETE'})
    if(!r.ok){ const t=await r.json().catch(()=>({})); alert(t.error||'فشل الحذف'); return }
    setItems(v=>v.filter(x=>x.id!==id))
  }

  const filtered = items.filter(x=>{
    const s=(q||'').toLowerCase()
    return !s || [x.name,x.sku,String(x.price),String(x.stock)].join(' ').toLowerCase().includes(s)
  })

  return (
    <>
      <div className="card">
        <div className="grid">
          <input className="input" placeholder="بحث بالاسم/الكود" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        {canManage && (
          <form onSubmit={add} className="grid" style={{marginTop:12}}>
            <input className="input" placeholder="اسم المنتج*" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            <div className="grid grid-3">
              <input className="input" placeholder="SKU" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/>
              <input className="input" type="number" step="0.01" placeholder="السعر" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
              <input className="input" type="number" step="1" placeholder="المخزون" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/>
            </div>
            <textarea className="input" placeholder="ملاحظات" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            <div><button className="btn btn-green">إضافة</button></div>
          </form>
        )}
        {!canManage && <div className="muted" style={{marginTop:8}}>يمكنك عرض المنتجات فقط.</div>}
        {err && <div style={{color:'#fca5a5',marginTop:8}}>{err}</div>}
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3 className="h2">قائمة المنتجات</h3>
        <table className="table">
          <thead><tr><th>الاسم</th><th>SKU</th><th>السعر</th><th>المخزون</th><th>إجراء</th></tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.sku||'—'}</td><td>{fmtEGP(p.price||0)}</td><td>{p.stock||0}</td>
                <td>
                  {canManage ? (
                    <button className="btn btn-red" onClick={()=>del(p.id)}>حذف</button>
                  ) : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} className="muted">لا توجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
