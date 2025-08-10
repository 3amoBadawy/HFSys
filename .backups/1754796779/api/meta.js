import express from 'express';
import fs from 'fs';

const router = express.Router();
const DB_PATH = './db.json';

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users:[], roles:[], invoices:[], products:[], customers:[] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}');
}

/**
 * GET /meta/permissions
 * يتوقع وجود req.user من الـauth middleware
 * يرجّع صلاحيات الدور الحالي
 */
router.get('/meta/permissions', (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Missing token' });

    const db = loadDB();
    const roleName = req.user.role || 'staff';
    const role = (db.roles || []).find(r => r.name === roleName);

    return res.json({
      role: roleName,
      permissions: Array.isArray(role?.permissions) ? role.permissions : []
    });
  } catch (e) {
    console.error('[meta/permissions] error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
