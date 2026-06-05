const WATCH_FIELDS = {
  contact:  ['first_name','last_name','email','phone','mobile','job_title','department','company_id','source','status'],
  company:  ['name','industry','website','phone','email','city','country','size','annual_revenue'],
  deal:     ['title','value','currency','stage','probability','expected_close','contact_id','company_id','description','lost_reason'],
  task:     ['title','description','status','priority','due_date','assigned_to','contact_id','company_id','deal_id'],
};

function diffEntities(entityType, oldRec, newRec) {
  const fields = WATCH_FIELDS[entityType] || [];
  const changes = {};
  for (const f of fields) {
    const o = oldRec[f] ?? null;
    const n = newRec[f] ?? null;
    if (String(o) !== String(n)) changes[f] = [o, n];
  }
  return Object.keys(changes).length ? changes : null;
}

async function logAudit(db, userId, action, entityType, entityId, entityName, changes, ip) {
  try {
    await db.run(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, entity_name, changes, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      userId ?? null,
      action,
      entityType,
      entityId,
      entityName ?? null,
      changes ? JSON.stringify(changes) : null,
      ip ?? null
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { logAudit, diffEntities };
