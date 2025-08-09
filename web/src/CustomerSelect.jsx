import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'

export default function CustomerSelect({ value, onChange, placeholder="اختر عميل" }) {
  const [list,setList]=useState([])
  const [q,setQ]=useState(value?.name||'')
  const [open,setOpen]=useState(false)

  useEffect(()=>{ apiFetch('/customers').then(r=>r.json()).then(setList).catch(()=>{}) },[])
  useEffect(()=>{ if(value?.name) setQ(value.name) },[value])

  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase()
    if(!s) return list
    return list.filter(c => (c.name+' '+(c.phone||'')+' '+(c.address||'')).toLowerCase().includes(s))
  },[q,list])

  function choose(c){ onChange?.(c); setQ(c.name); setOpen(false) }

  return (
    <div className="ac-wrap">
      <input className="input" placeholder={placeholder}
        value={q} onChange={e=>{setQ(e.target.value); setOpen(true)}}
        onFocus={()=>setOpen(true)} />
      {open && (
        <div className="ac-list" onMouseDown={e=>e.preventDefault()}>
          {filtered.length ? filtered.map(c=>(
            <div key={c.id} className="ac-item" onClick={()=>choose(c)}>
              <strong>{c.name}</strong>{' '}
              {c.phone && <span className="badge">{c.phone}</span>}
              {c.address && <span className="muted" style={{marginInlineStart:8}}>{c.address}</span>}
            </div>
          )) : <div className="ac-item muted">لا نتائج</div>}
        </div>
      )}
    </div>
  )
}
