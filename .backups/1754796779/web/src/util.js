/** يرجّع Array آمنة حتى لو القيمة null أو object */
export function safeArray(x) {
  if (Array.isArray(x)) return x;
  // أحيانًا APIs بترجع {data:[...]} — جرّب نطلعها
  if (x && typeof x === 'object' && Array.isArray(x.data)) return x.data;
  return [];
}
/** لوج لو القيمة مش Array (يساعد في تتبع الأخطاء) */
export function logIfNotArray(name, val) {
  if (!Array.isArray(val)) {
    // ما نرميش Error: بس نحذّر ونبيّن النوع/العينة
    console.warn(`[HFSafe] ${name} is not an array:`, 
      val === null ? 'null' : typeof val, 
      val
    );
  }
}
