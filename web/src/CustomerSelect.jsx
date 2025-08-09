import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'

export default function CustomerSelect({ value, onChange }) {
  const [list,setList]=useState([])
  const [q,setQ]=useState('')
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    apiFetch('/customers').then(r=>r.json()).then(setList).catch(()=>{})
  },[])

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    if(!qq) return list
    return list.filter(c=>{
      const s = (c.name+' '+(c.phone||'')+' '+(c.address||'')).toLowerCase()
      return s.includes(qq)
    })
  },[list,q])

  function choose(c){
    onChange(c)
    setQ(c.name)
    setOpen(false)
  }

  useEffect(()=>{
    if(value?.name) setQ(value.name)
  },[value])

  return (
    <div className="ac-wrap">
      <input className="input" placeholder="اختر عميل بالاسم/الهاتف"
             value={q} onChange={e=>{setQ(e.target.value); setOpen(true)}}
             onFocus={()=>setOpen(true)} />
      {open && (
        <div className="ac-list" onMouseDown={e=>e.preventDefault()}>
          {filtered.length ? filtered.map(c=>(
            <div key={c.id} className="ac-item" onClick={()=>choose(c)}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                <div><strong>{c.name}</strong>{' '} {c.phone && <span className="badge">{c.phone}</span>}</div>
                {c.address && <span className="muted">{c.address}</span>}
              </div>
            </div>
          )) : <div className="ac-item muted">لا نتائج</div>}
        </div>
      )}
    </div>
  )
}
