import { safeArray, logIfNotArray } from './util'
import React, { useState } from 'react'
import AdminUsers from './Admin'
import AdminRoles from './AdminRoles'
import './ui.css'
logIfNotArray("users", users);
logIfNotArray("roles", roles);
logIfNotArray("invoices", invoices);
logIfNotArray("customers", customers);
logIfNotArray("products", products);

export default function AdminDashboard(){
  const [tab,setTab]=useState('users')
  return (
    <div className="card">
      <div className="tabs" style={{marginBottom:12}}>
        <button onClick={()=>setTab('users')} className={'tab '+(tab==='users'?'active':'')}>الموظفون</button>
        <button onClick={()=>setTab('roles')} className={'tab '+(tab==='roles'?'active':'')}>الأدوار والصلاحيات</button>
      </div>
      {tab==='users' && <AdminUsers/>}
      {tab==='roles' && <AdminRoles/>}
    </div>
  )
}
