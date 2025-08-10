import { safeArray, logIfNotArray } from './util'
import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'
logIfNotArray("items", items);
logIfNotArray("users", users);
logIfNotArray("roles", roles);
logIfNotArray("invoices", invoices);
logIfNotArray("customers", customers);
logIfNotArray("products", products);

export default function AdminRoles(){
  const [allPerms,setAllPerms]=useState([])
  const [roles,setRoles]=useState([])
  const [q,setQ]=useState('')
  const [form,setForm]=useState({ name:'', permissions:[] })
  const [editName,setEditName]=useState(null)
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('')

  async function load(){
    setErr(''); setMsg('')
    const m = await apiFetch('/meta/permissions'); setAllPerms(await m.json())
    const r = await apiFetch('/roles')
    if(!r.ok){ const t=await r.json().catch(()=>({})); setErr(t.error||'فشل تحميل الأدوار'); return }
    setRoles(await r.json())
  }
  useEffect(()=>{ load() },[])

  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase()
    return !s? roles : roles.filter(r=> (r.name+' '+(r.permissions||[]).join(' ')).toLowerCase().includes(s))
  },[roles,q])

  function togglePerm(p){
    setForm(f=>({...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x=>x!==p) : [...f.permissions,p]}))
  }
  function startEdit(r){ setEditName(r.name); setForm({ name:r.name, permissions:[...(r.permissions||[])] }); window.scrollTo({top:0,behavior:'smooth'}) }
  function reset(){ setEditName(null); setForm({ name:'', permissions:[] }); setMsg(''); setErr('') }

  async function save(e){
    e.preventDefault(); setErr(''); setMsg('')
    if(!form.name.trim()) { setErr('اكتب اسم الدور'); return }
    let res
    if(editName){
      res = await apiFetch('/roles/'+encodeURIComponent(editName), { method:'PUT', body: JSON.stringify({ name:form.name.trim(), permissions: form.permissions }) })
    }else{
      res = await apiFetch('/roles', { method:'POST', body: JSON.stringify({ name:form.name.trim(), permissions: form.permissions }) })
    }
    if(!res.ok){ const t=await res.json().catch(()=>({})); setErr(t.error||'خطأ في الحفظ'); return }
    await load(); reset(); setMsg('تم الحفظ')
  }

  async function del(name){
    if(!confirm('حذف الدور؟')) return
    const r=await apiFetch('/roles/'+encodeURIComponent(name), { method:'DELETE' })
    if(!r.ok){ const t=await r.json().catch(()=>({})); alert(t.error||'تعذر الحذف'); return }
    load()
  }

  return (
    <div>
      <h3 className="h2">الأدوار والصلاحيات</h3>
      {msg && <div className="muted">{msg}</div>}
      {err && <div style={{color:'#fca5a5'}}>{err}</div>}

      <form onSubmit={save} className="grid" style={{marginTop:10}}>
        <input className="input" placeholder="اسم الدور" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <div style={{display:'grid', gap:8, gridTemplateColumns:'repeat(2, minmax(0,1fr))'}}>
          {safeArray(allPerms).map(p=>(
            <label key={p} style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={form.permissions.includes(p)} onChange={()=>togglePerm(p)} />
              <span className="badge">{p}</span>
            </label>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-green">{editName? 'تعديل الدور':'إضافة دور'}</button>
          {editName && <button type="button" className="btn" onClick={reset}>إلغاء</button>}
        </div>
      </form>

      <div style={{marginTop:16}}>
        <input className="input" placeholder="بحث عن دور/صلاحية" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <table className="table" style={{marginTop:12}}>
        <thead><tr><th>الدور</th><th>الصلاحيات</th><th>إجراء</th></tr></thead>
        <tbody>
          {filtered.length ? safeArray(filtered).map(r=>(
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{(r.permissions||[]).length ? r.permissions.join(', ') : '—'}</td>
              <td>
                <button className="btn" onClick={()=>startEdit(r)} style={{marginInlineEnd:8}}>تعديل</button>
                <button className="btn btn-red" onClick={()=>del(r.name)}>حذف</button>
              </td>
            </tr>
          )) : <tr><td colSpan={3} className="muted">لا توجد أدوار</td></tr>}
        </tbody>
      </table>
      <p className="muted" style={{marginTop:8}}>ملاحظة: لا يمكن حذف/إعادة تسمية دور admin، ولا حذف دور مستخدم عليه موظفين.</p>
    </div>
  )
}
