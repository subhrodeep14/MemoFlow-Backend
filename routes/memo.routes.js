// routes/memo.routes.js
const express = require('express');
const router = express.Router();
const { createMemo, getMemosByDate, getMemoById, searchMemos, updateMemo, deleteMemo } = require('../controllers/memo.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/search', searchMemos);
router.get('/', getMemosByDate);
router.post('/', createMemo);
router.get('/:id', getMemoById);
router.patch('/:id', updateMemo);
router.delete('/:id', deleteMemo);

module.exports = router;
