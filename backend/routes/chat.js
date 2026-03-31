const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');

router.use(authenticate);

// ── helper: verify user is member of conversation ───────────────────────────
async function assertMember(conversationId, userId, res) {
  const member = await db.get(
    `SELECT id FROM chat_members WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
    conversationId, userId
  );
  if (!member) {
    forbidden(res, 'No perteneces a esta conversación');
    return false;
  }
  return true;
}

// ── GET /api/chat/users — list users available to chat with ──────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await db.all(
      `SELECT id, name, email, avatar_url, last_login
       FROM users
       WHERE is_active = 1 AND id != ?
       ORDER BY name`,
      req.user.id
    );
    return success(res, users);
  } catch (err) { next(err); }
});

// ── GET /api/chat/conversations ───────────────────────────────────────────────
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const convs = await db.all(
      `SELECT
         c.id, c.type, c.name, c.avatar_url, c.created_at, c.updated_at,
         -- last message
         lm.id        AS last_msg_id,
         lm.content   AS last_msg_content,
         lm.sender_id AS last_msg_sender_id,
         lm.created_at AS last_msg_at,
         su.name      AS last_msg_sender_name,
         -- unread count
         (SELECT COUNT(*)
          FROM chat_messages m2
          WHERE m2.conversation_id = c.id
            AND m2.sender_id != ?
            AND m2.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM chat_message_reads r2
              WHERE r2.message_id = m2.id AND r2.user_id = ?
            )
         ) AS unread_count
       FROM chat_conversations c
       JOIN chat_members cm ON cm.conversation_id = c.id AND cm.user_id = ? AND cm.left_at IS NULL
       LEFT JOIN chat_messages lm ON lm.id = (
         SELECT id FROM chat_messages
         WHERE conversation_id = c.id AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       )
       LEFT JOIN users su ON su.id = lm.sender_id
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
      userId, userId, userId
    );

    // For direct chats, attach peer's user info
    for (const conv of convs) {
      if (conv.type === 'direct') {
        const peer = await db.get(
          `SELECT u.id, u.name, u.email, u.avatar_url, u.last_login
           FROM chat_members cm JOIN users u ON u.id = cm.user_id
           WHERE cm.conversation_id = ? AND cm.user_id != ? AND cm.left_at IS NULL
           LIMIT 1`,
          conv.id, userId
        );
        conv.peer = peer;
      } else {
        // group: member count
        const { member_count } = await db.get(
          `SELECT COUNT(*) AS member_count FROM chat_members
           WHERE conversation_id = ? AND left_at IS NULL`,
          conv.id
        );
        conv.member_count = member_count;
      }
    }

    return success(res, convs);
  } catch (err) { next(err); }
});

// ── POST /api/chat/conversations ──────────────────────────────────────────────
router.post('/conversations', async (req, res, next) => {
  try {
    const { type = 'direct', name, memberIds = [] } = req.body;
    const userId = req.user.id;

    if (!['direct', 'group'].includes(type)) {
      return badRequest(res, 'Tipo inválido');
    }
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return badRequest(res, 'Debes seleccionar al menos un participante');
    }

    // For direct: check if conversation already exists
    if (type === 'direct') {
      const peerId = memberIds[0];
      const existing = await db.get(
        `SELECT c.id FROM chat_conversations c
         JOIN chat_members a ON a.conversation_id = c.id AND a.user_id = ? AND a.left_at IS NULL
         JOIN chat_members b ON b.conversation_id = c.id AND b.user_id = ? AND b.left_at IS NULL
         WHERE c.type = 'direct'
         LIMIT 1`,
        userId, peerId
      );
      if (existing) {
        const conv = await db.get(`SELECT * FROM chat_conversations WHERE id = ?`, existing.id);
        return success(res, conv);
      }
    }

    if (type === 'group' && !name?.trim()) {
      return badRequest(res, 'El grupo necesita un nombre');
    }

    const { lastInsertRowid: convId } = await db.run(
      `INSERT INTO chat_conversations (type, name, created_by) VALUES (?, ?, ?)`,
      type, name?.trim() || null, userId
    );

    // Add creator + members
    const allMembers = [...new Set([userId, ...memberIds])];
    for (const mid of allMembers) {
      await db.run(
        `INSERT OR IGNORE INTO chat_members (conversation_id, user_id) VALUES (?, ?)`,
        convId, mid
      );
    }

    // System message for group creation
    if (type === 'group') {
      await db.run(
        `INSERT INTO chat_messages (conversation_id, sender_id, content, type) VALUES (?, ?, ?, 'system')`,
        convId, userId, `Grupo "${name}" creado`
      );
    }

    const conv = await db.get(`SELECT * FROM chat_conversations WHERE id = ?`, convId);
    return created(res, conv);
  } catch (err) { next(err); }
});

// ── GET /api/chat/conversations/:id/messages ──────────────────────────────────
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const convId = Number(req.params.id);
    const userId = req.user.id;
    const before = req.query.before;   // cursor: message id for pagination
    const limit  = Math.min(Number(req.query.limit) || 50, 100);

    if (!(await assertMember(convId, userId, res))) return;

    const rows = await db.all(
      `SELECT
         m.id, m.conversation_id, m.sender_id, m.content, m.type, m.created_at, m.deleted_at,
         u.name AS sender_name, u.avatar_url AS sender_avatar,
         -- read receipts: list of user_ids who read this message (JSON array)
         (SELECT json_group_array(json_object('user_id', r.user_id, 'read_at', r.read_at, 'name', ru.name))
          FROM chat_message_reads r
          JOIN users ru ON ru.id = r.user_id
          WHERE r.message_id = m.id
         ) AS reads_json
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
         ${before ? 'AND m.id < ?' : ''}
       ORDER BY m.id DESC
       LIMIT ?`,
      ...[convId, ...(before ? [before] : []), limit]
    );

    // Parse reads_json
    const messages = rows.reverse().map(m => ({
      ...m,
      reads: m.reads_json ? JSON.parse(m.reads_json) : [],
    }));

    return success(res, messages);
  } catch (err) { next(err); }
});

// ── POST /api/chat/conversations/:id/messages ─────────────────────────────────
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const convId = Number(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;

    if (!(await assertMember(convId, userId, res))) return;
    if (!content?.trim()) return badRequest(res, 'El mensaje no puede estar vacío');

    const { lastInsertRowid: msgId } = await db.run(
      `INSERT INTO chat_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`,
      convId, userId, content.trim()
    );

    // Auto-read by sender
    await db.run(
      `INSERT OR IGNORE INTO chat_message_reads (message_id, user_id) VALUES (?, ?)`,
      msgId, userId
    );

    // Touch conversation updated_at
    await db.run(`UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?`, convId);

    const msg = await db.get(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`, msgId
    );
    msg.reads = [{ user_id: userId, read_at: msg.created_at }];

    return created(res, msg);
  } catch (err) { next(err); }
});

// ── PUT /api/chat/conversations/:id/read ─────────────────────────────────────
router.put('/conversations/:id/read', async (req, res, next) => {
  try {
    const convId = Number(req.params.id);
    const userId = req.user.id;

    if (!(await assertMember(convId, userId, res))) return;

    // Mark all unread messages in this conversation as read
    const unread = await db.all(
      `SELECT m.id FROM chat_messages m
       WHERE m.conversation_id = ?
         AND m.sender_id != ?
         AND m.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM chat_message_reads r WHERE r.message_id = m.id AND r.user_id = ?
         )`,
      convId, userId, userId
    );

    for (const { id } of unread) {
      await db.run(
        `INSERT OR IGNORE INTO chat_message_reads (message_id, user_id) VALUES (?, ?)`,
        id, userId
      );
    }

    return success(res, { marked: unread.length });
  } catch (err) { next(err); }
});

// ── GET /api/chat/conversations/:id/members ───────────────────────────────────
router.get('/conversations/:id/members', async (req, res, next) => {
  try {
    const convId = Number(req.params.id);
    const userId = req.user.id;

    if (!(await assertMember(convId, userId, res))) return;

    const members = await db.all(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.last_login, cm.joined_at, cm.left_at
       FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = ?
       ORDER BY cm.joined_at`,
      convId
    );
    return success(res, members);
  } catch (err) { next(err); }
});

// ── POST /api/chat/conversations/:id/members ──────────────────────────────────
router.post('/conversations/:id/members', async (req, res, next) => {
  try {
    const convId = Number(req.params.id);
    const userId = req.user.id;
    const { userIds = [] } = req.body;

    const conv = await db.get(`SELECT * FROM chat_conversations WHERE id = ?`, convId);
    if (!conv) return notFound(res, 'Conversación no encontrada');
    if (conv.type !== 'group') return badRequest(res, 'Solo se pueden agregar miembros a grupos');
    if (!(await assertMember(convId, userId, res))) return;

    for (const mid of userIds) {
      await db.run(
        `INSERT OR IGNORE INTO chat_members (conversation_id, user_id) VALUES (?, ?)`,
        convId, mid
      );
      // Re-activate if they previously left
      await db.run(
        `UPDATE chat_members SET left_at = NULL, joined_at = datetime('now')
         WHERE conversation_id = ? AND user_id = ? AND left_at IS NOT NULL`,
        convId, mid
      );
    }

    const added = await db.all(
      `SELECT u.id, u.name FROM users u WHERE u.id IN (${userIds.map(() => '?').join(',')})`,
      ...userIds
    );

    // System message
    if (added.length > 0) {
      const names = added.map(u => u.name).join(', ');
      await db.run(
        `INSERT INTO chat_messages (conversation_id, sender_id, content, type) VALUES (?, ?, ?, 'system')`,
        convId, userId, `${names} ${added.length === 1 ? 'fue agregado' : 'fueron agregados'} al grupo`
      );
    }

    return success(res, { added: added.length });
  } catch (err) { next(err); }
});

// ── DELETE /api/chat/conversations/:id/members/:userId ────────────────────────
router.delete('/conversations/:id/members/:userId', async (req, res, next) => {
  try {
    const convId    = Number(req.params.id);
    const userId    = req.user.id;
    const targetId  = Number(req.params.userId);

    if (!(await assertMember(convId, userId, res))) return;
    if (userId !== targetId) {
      // Only creator can remove others
      const conv = await db.get(`SELECT created_by FROM chat_conversations WHERE id = ?`, convId);
      if (conv.created_by !== userId) {
        return forbidden(res, 'Solo el creador puede eliminar miembros');
      }
    }

    await db.run(
      `UPDATE chat_members SET left_at = datetime('now') WHERE conversation_id = ? AND user_id = ?`,
      convId, targetId
    );
    return success(res, { removed: true });
  } catch (err) { next(err); }
});

module.exports = router;
