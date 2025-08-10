import { safeArray, logIfNotArray } from './util'
import React, { useEffect, useState } from 'react'
import AdminUsers from './AdminUsers'
import AdminRoles from './AdminRoles'
import { apiFetch } from './apiBase'
logIfNotArray("users", users);
logIfNotArray("roles", roles);
logIfNotArray("invoices", invoices);
logIfNotArray("customers", customers);
logIfNotArray("products", products);

export default function AdminDashboard(){
  const [tab,setTab]=useState('users')
  const [canManageUsers,setCanManageUsers]=useState(false)

  useEffect(()=>{
    (async()=>{
      try{
        // لو معندكش صلاحية manage_users السيرفر بيرجع 403
        const r = await apiFetch('/roles')
        setCanManageUsers(r.ok)
      }catch{ setCanManageUsers(false) }
    })()
  },[])

  return (
    <div className="card">
      <div className="tabs" style={{marginBottom:12}}>
        <button onClick={()=>setTab('users')} className={'tab '+(tab==='users'?'active':'')}>الموظفون</button>
        {canManageUsers && (
          <button onClick={()=>setTab('roles')} className={'tab '+(tab==='roles'?'active':'')}>الأدوار والصلاحيات</button>
        )}
      </div>
      {tab==='users' && <AdminUsers/>}
      {tab==='roles' && canManageUsers && <AdminRoles/>}
    </div>
  )
}
