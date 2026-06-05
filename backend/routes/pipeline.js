const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { db } = require('../db/database');
const { success, created, error, notFound } = require('../utils/response');

router.get('/', authenticate, async (req, res) => {
  const stages = await db.all('SELECT * FROM pipeline_stages ORDER BY sort_order ASC');
  return success(res, stages);
});

router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('value').trim().notEmpty().matches(/^[a-z0-9_]+$/).withMessage('Solo letras, números y _'),
  body('probability').isInt({ min: 0, max: 100 }),
  body('color').optional().trim(),
  body('dot_color').optional().trim(),
  validate,
], async (req, res) => {
  try {
    const { name, value, probability, color, dot_color } = req.body;
    const dup = await db.get('SELECT id FROM pipeline_stages WHERE value = ?', value);
    if (dup) return error(res, 'Ya existe una etapa con ese valor', 409);
    const max = await db.get('SELECT MAX(sort_order) as m FROM pipeline_stages');
    const result = await db.run(
      'INSERT INTO pipeline_stages (name, value, probability, color, dot_color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      name, value, probability,
      color || 'bg-gray-100 text-gray-800',
      dot_color || 'bg-gray-400',
      (max.m || 0) + 1
    );
    const stage = await db.get('SELECT * FROM pipeline_stages WHERE id = ?', result.lastInsertRowid);
    return created(res, stage);
  } catch (err) { return error(res, 'Error creando etapa'); }
});

router.put('/:id', authenticate, requireAdmin, [
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('probability').isInt({ min: 0, max: 100 }),
  validate,
], async (req, res) => {
  try {
    const stage = await db.get('SELECT * FROM pipeline_stages WHERE id = ?', req.params.id);
    if (!stage) return notFound(res, 'Stage not found');
    const { name, probability, color, dot_color, sort_order, is_active } = req.body;
    await db.run(
      'UPDATE pipeline_stages SET name=?, probability=?, color=?, dot_color=?, sort_order=?, is_active=? WHERE id=?',
      name, probability,
      color || stage.color, dot_color || stage.dot_color,
      sort_order ?? stage.sort_order,
      is_active !== undefined ? (is_active ? 1 : 0) : stage.is_active,
      req.params.id
    );
    const updated = await db.get('SELECT * FROM pipeline_stages WHERE id = ?', req.params.id);
    return success(res, updated, 'Stage updated');
  } catch (err) { return error(res, 'Error actualizando etapa'); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const stage = await db.get('SELECT * FROM pipeline_stages WHERE id = ?', req.params.id);
    if (!stage) return notFound(res, 'Stage not found');
    if (stage.is_default) return error(res, 'No se pueden eliminar etapas predeterminadas', 400);
    const inUse = await db.get('SELECT id FROM deals WHERE stage = ? AND is_deleted = 0', stage.value);
    if (inUse) return error(res, 'Etapa en uso por negocios activos', 400);
    await db.run('DELETE FROM pipeline_stages WHERE id = ?', req.params.id);
    return success(res, null, 'Etapa eliminada');
  } catch (err) { return error(res, 'Error eliminando etapa'); }
});

module.exports = router;
