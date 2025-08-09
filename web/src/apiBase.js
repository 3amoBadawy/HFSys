export const API_BASE = import.meta.env.VITE_API_URL || '';
export function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('hf_token') || '';
  return fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    }
  });
}
export const fmtEGP = (n)=> new Intl.NumberFormat('ar-EG',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(+n||0)

export async function hasPermission(perm){
  try{
    const res = await apiFetch('/roles')
    if(!res.ok) return false
    const roles = await res.json()
    const me = JSON.parse(localStorage.getItem('hf_user')||'{}')
    const r = roles.find(x=>x.name===me?.role)
    return !!(r && r.permissions && r.permissions.includes(perm))
  }catch{ return false }
}
