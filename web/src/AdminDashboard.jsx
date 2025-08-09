import React, { useEffect, useState } from 'react'
import AdminUsers from './AdminUsers'
import AdminRoles from './AdminRoles'
import { apiFetch } from './apiBase'

export default function AdminDashboard(){
  const [tab,setTab]=useState('users')
  const [canManageUsers,setCanManageUsers]=useState(false)

  // اعرض تبويب "الأدوار" فقط لو معاك صلاحية manage_users (الـAPI هيرجع 403 لو مفيش)
  useEffect(()=>{
    (async()=>{
      try{
        const r = await apiFetch('/roles')
        setCanManageUsers(r.ok)
      }catch{
        setCanManageUsers(false)
      }
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
