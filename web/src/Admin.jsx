import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'

export default function AdminUsers(){
  const [list,setList]=useState([])
  const [q,setQ]=useState('')
  const [page,setPage]=useState(1)
  const PAGE=10

  const [form,setForm]=useState({id:null,name:'',email:'',role:'staff',active:true})
  const [loading,setLoading]=useState(true)
  const [err,setErr]=useState('')
  const [msg,setMsg]=useState('')

  async function load(){
    setLoading(true); setErr(''); setMsg('')
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  useEffect(()=>{ if(page>totalPages) setPage(totalPages) }, [totalPages]) // صحّح الصفحة لو القائمة قلّت
  const slice = useMemo(()=> filtered.slice((page-1)*PAGE, page*PAGE), [filtered,page])

  function edit(u){ setForm(u); window.scrollTo({top:0,behavior:'smooth'}) }
  function resetForm(){ setForm({id:null,name:'',email:'',role:'staff',active:true}); setMsg('') }

  async function save(e){
    e.preventDefault()
    const payload={ name:form.name, email:form.email, role:form.role, active:form.active }
    const url = form.id? '/users/'+form.id : '/users'
    const method = form.id? 'PUT' : 'POST'
    const r = await apiFetch(url,{ method, body: JSON.stringify(payload) })
    if(!r.ok){ const t=await r.json().catch(()=>({})); alert(t.error||'خطأ في الحفظ'); return }
    await load(); resetForm()
  }

  async function toggleActive(u){
    const r = await apiFetch('/users/'+u.id, { method:'PUT', body: JSON.stringify({ active: !u.active }) })
    if(r.ok) load()
  }

  async function del(id){
    if(!confirm('حذف الموظف؟')) return
    const r = await apiFetch('/users/'+id,{ method:'DELETE' })
    if(r.ok) load()
  }

  async function resetPwd(id){
    const r = await apiFetch('/users/'+id+'/reset-password', { method:'POST' })
    if(!r.ok){ alert('تعذر إعادة التعيين'); return }
    const data = await r.json()
    navigator.clipboard?.writeText?.(data.password).catch(()=>{})
    setMsg(`تم إنشاء كلمة مرور جديدة (تم نسخها): ${data.password}`)
  }

  return (
    <div className="card">
      <h3 className="h2">لوحة الإدارة — الموظفون</h3>
      <input className="input" placeholder="بحث بالاسم/الإيميل/الدور" value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} />

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
          {form.id && <button type="button" className="btn" onClick={resetForm}>إلغاء التعديل</button>}
        </div>
      </form>

      {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
      {loading ? <p className="muted" style={{marginTop:12}}>جاري التحميل...</p> :
       err ? <p style={{color:'#fca5a5',marginTop:12}}>{err}</p> :
       (
        <>
          <table className="table" style={{marginTop:12}}>
            <thead><tr><th>الاسم</th><th>الإيميل</th><th>الدور</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody>
              {slice.length ? slice.map(u=>(
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role==='admin'?'أدمن':'موظف'}</td>
                  <td>
                    <button className={'btn '+(u.active?'':'btn-red')} onClick={()=>toggleActive(u)}>
                      {u.active? 'نشِط' : 'موقوف'}
                    </button>
                  </td>
                  <td style={{display:'flex',gap:8,justifyContent:'center'}}>
                    <button className="btn" onClick={()=>edit(u)}>تعديل</button>
                    <button className="btn" onClick={()=>resetPwd(u.id)}>إعادة كلمة المرور</button>
                    <button className="btn btn-red" onClick={()=>del(u.id)}>حذف</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">لا يوجد موظفون</td></tr>}
            </tbody>
          </table>

          <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:10}}>
            <button className="btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</button>
            <span className="muted">صفحة {page} / {totalPages}</span>
            <button className="btn" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>التالي</button>
          </div>
        </>
       )}
    </div>
  )
}
