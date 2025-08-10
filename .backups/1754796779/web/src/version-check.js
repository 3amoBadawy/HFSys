export async function ensureLatest(buildKey='HF_BUILD_ID'){
  try{
    const res = await fetch(`${location.pathname.replace(/\/[^/]*$/, '/') }version.json?ts=${Date.now()}`, { cache:'no-store' })
    if(!res.ok) return;
    const { build } = await res.json().catch(()=>({}))
    if(!build) return;
    const prev = localStorage.getItem(buildKey)
    if(prev && prev !== String(build)){
      // حافظ على التوكنات فقط
      const token = localStorage.getItem('hf_token')
      const user  = localStorage.getItem('hf_user')
      // امسح كل حاجة قديمة
      localStorage.clear()
      // رجّع التوكنات
      if(token) localStorage.setItem('hf_token', token)
      if(user)  localStorage.setItem('hf_user',  user)
      // اعمل ريفريش نظيف
      location.reload()
      return
    }
    if(!prev) localStorage.setItem(buildKey, String(build))
  }catch(_){}
}
