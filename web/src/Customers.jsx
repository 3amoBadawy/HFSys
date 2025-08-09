import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './apiBase'

export default function Customers(){
  const [list,setList]=useState([])
  const [q,setQ]=useState("")
  const [form,setForm]=useState({id:null,name:"",phone:"",address:"",notes:""})
  const filtered = useMemo(()=> list.filter(c=>{
    const s=(c.name+" "+(c.phone||"")+" "+(c.address||"")).toLowerCase()
    return s.includes(q.toLowerCase())
  }),[list,q])

  async function load(){ const r=await apiFetch('/customers'); setList(await r.json()) }
  useEffect(()=>{ load() },[])

  function edit(c){ setForm(c) }
  function reset(){ setForm({id:null,name:"",phone:"",address:"",notes:""}) }

  async function save(e){
    e.preventDefault()
    const payload = { name:form.name, phone:form.phone, address:form.address, notes:form.notes }
    const isEdit = !!form.id
    const url = isEdit ? '/customers/'+form.id : '/customers'
    const method = isEdit ? 'PUT' : 'POST'
    const r = await apiFetch(url,{ method, body: JSON.stringify(payload) })
    if(!r.ok){ alert('خطأ في الحفظ'); return }
    await load(); reset()
  }

  async function del(id){
    if(!confirm('حذف العميل؟')) return
    const r=await apiFetch('/customers/'+id,{ method:'DELETE' })
    if(r.ok) load()
  }

  return (
    <div style={{display:'grid', gap:12, maxWidth:900}}>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <input placeholder="بحث بالاسم/الهاتف/العنوان" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
      </div>

      <form onSubmit={save} style={{display:'grid', gap:8, gridTemplateColumns:'repeat(2, minmax(0,1fr))'}}>
        <input placeholder="اسم العميل *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
        <input placeholder="الهاتف" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>
        <input placeholder="العنوان" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8, gridColumn:'span 2'}}/>
        <textarea placeholder="ملاحظات" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} rows={3} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8, gridColumn:'span 2'}}/>
        <div style={{display:'flex', gap:8}}>
          <button style={{background:'#22c55e',color:'#052e16',border:0,borderRadius:8,padding:'10px 14px'}}>{form.id?'تعديل':'إضافة'}</button>
          {form.id && <button type="button" onClick={reset} style={{background:'#e2e8f0',border:0,borderRadius:8,padding:'10px 14px'}}>إلغاء التعديل</button>}
        </div>
      </form>

      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr>
            <th style={th}>الاسم</th><th style={th}>الهاتف</th><th style={th}>العنوان</th><th style={th}>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(c=>(
            <tr key={c.id}>
              <td style={td}>{c.name}</td>
              <td style={td}>{c.phone}</td>
              <td style={td}>{c.address}</td>
              <td style={td}>
                <button onClick={()=>edit(c)} style={{marginInlineEnd:8}}>تعديل</button>
                <button onClick={()=>del(c.id)} style={{background:'#ef4444',color:'#fff',border:0,borderRadius:6,padding:'6px 10px'}}>حذف</button>
              </td>
            </tr>
          ))}
          {!filtered.length && <tr><td style={td} colSpan={4}>لا يوجد عملاء</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

const th = {border:'1px solid #e2e8f0',padding:8,background:'#f8fafc',textAlign:'center'}
const td = {border:'1px solid #e2e8f0',padding:8,textAlign:'center'}
