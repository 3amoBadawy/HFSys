import { safeArray, logIfNotArray } from './util'
import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'
logIfNotArray("items", items);
logIfNotArray("users", users);
logIfNotArray("roles", roles);
logIfNotArray("invoices", invoices);
logIfNotArray("customers", customers);
logIfNotArray("products", products);

export default function Customers(){
  const [list,setList]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({id:null,name:'',phone:'',address:'',notes:''})
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')

  async function load(){
    setLoading(true); setErr('')
    try{
      const r=await apiFetch('/customers')
      if(!r.ok) throw new Error('فشل تحميل العملاء')
      setList(await r.json())
    }catch(e){ setErr(e.message) }finally{ setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    return !s ? list : list.filter(c => (c.name+' '+(c.phone||'')+' '+(c.address||'')).toLowerCase().includes(s))
  },[list,q])

  function edit(c){ setForm(c) }
  function reset(){ setForm({id:null,name:'',phone:'',address:'',notes:''}) }

  async function save(e){
    e.preventDefault()
    const payload = { name:form.name, phone:form.phone, address:form.address, notes:form.notes }
    const url = form.id ? '/customers/'+form.id : '/customers'
    const method = form.id ? 'PUT' : 'POST'
    const r = await apiFetch(url, { method, body: JSON.stringify(payload) })
    if(!r.ok){ alert('خطأ في الحفظ'); return }
    await load(); reset()
  }

  async function del(id){
    if(!confirm('حذف العميل؟')) return
    const r = await apiFetch('/customers/'+id, { method:'DELETE' })
    if(r.ok) load()
  }

  return (
    <div className="card">
      <h3 className="h2">العملاء</h3>

      <input className="input" placeholder="بحث بالاسم/الهاتف/العنوان" value={q} onChange={e=>setQ(e.target.value)} />

      <form onSubmit={save} className="grid" style={{marginTop:10}}>
        <input className="input" placeholder="اسم العميل *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
        <div className="grid grid-2">
          <input className="input" placeholder="الهاتف" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
          <input className="input" placeholder="العنوان" value={form.address} onChange={e=>setForm({...form, address:e.target.value})}/>
        </div>
        <textarea className="textarea" placeholder="ملاحظات" rows={3} value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-green">{form.id ? 'تعديل' : 'إضافة'}</button>
          {form.id && <button type="button" className="btn" onClick={reset}>إلغاء التعديل</button>}
        </div>
      </form>

      {loading ? <p className="muted" style={{marginTop:12}}>جاري التحميل...</p> :
       err ? <p style={{color:'#fca5a5',marginTop:12}}>{err}</p> :
       (
        <table className="table" style={{marginTop:12}}>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>إجراء</th></tr></thead>
          <tbody>
            {filtered.length ? safeArray(filtered).map(c=>(
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.phone||'—'}</td><td>{c.address||'—'}</td>
                <td>
                  <button onClick={()=>edit(c)} className="btn" style={{marginInlineEnd:8}}>تعديل</button>
                  <button onClick={()=>del(c.id)} className="btn btn-red">حذف</button>
                </td>
              </tr>
            )) : <tr><td colSpan={4} className="muted">لا يوجد عملاء</td></tr>}
          </tbody>
        </table>
       )}
    </div>
  )
}
