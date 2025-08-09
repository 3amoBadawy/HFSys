import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'

export default function AdminUsers(){
  const [list,setList]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({id:null,name:'',email:'',role:'staff',active:true})
  const [loading,setLoading]=useState(true); const [err,setErr]=useState('')

  const load = async()=>{
    setLoading(true); setErr('')
    try{
      const r = await apiFetch('/users')
      if(!r.ok) throw new Error((await r.json()).error||'فشل تحميل الموظفين')
      setList(await r.json())
    }catch(e){ setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase()
    return !s? list : list.filter(u => (u.name+' '+u.email+' '+u.role).toLowerCase().includes(s))
  },[list,q])

  function edit(u){ setForm(u) }
  function reset(){ setForm({id:null,name:'',email:'',role:'staff',active:true}) }

  async function save(e){
    e.preventDefault()
    const payload={ name:form.name, email:form.email, role:form.role, active:form.active }
    const url = form.id? '/users/'+form.id : '/users'
    const method = form.id? 'PUT' : 'POST'
    const r = await apiFetch(url,{ method, body: JSON.stringify(payload) })
    if(!r.ok){ const t=await r.json().catch(()=>({})); alert(t.error||'خطأ في الحفظ'); return }
    await load(); reset()
  }

  async function del(id){
    if(!confirm('حذف الموظف؟')) return
    const r = await apiFetch('/users/'+id,{ method:'DELETE' })
    if(r.ok) load()
  }

  return (
    <div className="card">
      <h3 className="h2">لوحة الإدارة — الموظفون</h3>
      <input className="input" placeholder="بحث بالاسم/الإيميل/الدور" value={q} onChange={e=>setQ(e.target.value)} />
      <form onSubmit={save} className="grid" style={{marginTop:10}}>
        <div className="grid grid-2">
          <input className="input" placeholder="الاسم *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          <input className="input" placeholder="الإيميل *" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
        </div>
        <div className="grid grid-2">
          <select className="input" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
            <option value="staff">موظف</option>
            <option value="admin">أدمن</option>
          </select>
          <label style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})}/>
            <span>نشِط</span>
          </label>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-green">{form.id ? 'تعديل' : 'إضافة'}</button>
          {form.id && <button type="button" className="btn" onClick={reset}>إلغاء التعديل</button>}
        </div>
      </form>

      {loading ? <p className="muted" style={{marginTop:12}}>جاري التحميل...</p> :
       err ? <p style={{color:'#fca5a5',marginTop:12}}>{err}</p> :
       (
        <table className="table" style={{marginTop:12}}>
          <thead><tr><th>الاسم</th><th>الإيميل</th><th>الدور</th><th>الحالة</th><th>إجراء</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map(u=>(
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role==='admin'?'أدمن':'موظف'}</td>
                <td>{u.active? 'نشِط':'موقوف'}</td>
                <td>
                  <button className="btn" onClick={()=>edit(u)} style={{marginInlineEnd:8}}>تعديل</button>
                  <button className="btn btn-red" onClick={()=>del(u.id)}>حذف</button>
                </td>
              </tr>
            )) : <tr><td colSpan={5} className="muted">لا يوجد موظفون</td></tr>}
          </tbody>
        </table>
       )}
    </div>
  )
}
