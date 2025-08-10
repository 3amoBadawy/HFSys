const BASE_URL =
  (typeof window !== 'undefined' && window.__HF_API__) ||
  import.meta.env?.VITE_API_BASE ||
  'https://hfsys.onrender.com';

export function fmtEGP(n){ try{ return new Intl.NumberFormat('ar-EG',{style:'currency',currency:'EGP'}).format(+n||0) }catch{ return `${+n||0} ج.م` } }

/** fetch مع توكن + JSON + معالجة 401 */
export async function apiFetch(path, opts = {}) {
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('hf_token') : null;
  const headers = new Headers(opts.headers || {});
  if (!headers.has('Content-Type') && !(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });

  // لو التوكن بايظ/منتهي
  if (res.status === 401) {
    try { localStorage.removeItem('hf_token'); localStorage.removeItem('hf_user'); } catch {}
    // رجّع Promise فيها التفاصيل بدل ما نكسر الواجهة
    const msg = await res.text().catch(()=> '');
    throw new Error(msg || 'Unauthorized (401)');
  }
  return res;
}

/** helpers جاهزة لو حبيت */
export const api = {
  get:  (p) => apiFetch(p),
  post: (p, data) => apiFetch(p, { method:'POST', body: JSON.stringify(data) }),
  put:  (p, data) => apiFetch(p, { method:'PUT',  body: JSON.stringify(data) }),
  del:  (p) => apiFetch(p, { method:'DELETE' }),
};
