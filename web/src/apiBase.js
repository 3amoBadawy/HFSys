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
