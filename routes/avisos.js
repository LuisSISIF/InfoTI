const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/avisos - Listar avisos e notificações
router.get('/', async (req, res) => {
  try {
    const { status, tipo } = req.query;
    let query = 'SELECT * FROM avisosNotificacoes WHERE 1=1';
    const params = [];

    if (status && status !== 'Todos') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (tipo && tipo !== 'Todos') {
      query += ' AND tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY FIELD(prioridade, "critica", "alta", "media", "baixa"), dataCriacao DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao buscar avisos:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar avisos', error: error.message });
  }
});

// POST /api/avisos - Criar novo aviso / notificação
router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, tipo, prioridade, autor, dataPrevisao } = req.body;

    if (!titulo) {
      return res.status(400).json({ success: false, message: 'Título do aviso é obrigatório' });
    }

    const [result] = await pool.query(
      `INSERT INTO avisosNotificacoes (titulo, descricao, tipo, prioridade, autor, dataPrevisao, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ativo')`,
      [
        titulo.trim(),
        descricao || '',
        tipo || 'info',
        prioridade || 'media',
        autor || 'TI Suporte',
        dataPrevisao || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Aviso registrado com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao criar aviso:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar aviso', error: error.message });
  }
});

// PUT /api/avisos/:id - Atualizar ou resolver aviso
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, tipo, prioridade, status, dataPrevisao } = req.body;

    const [result] = await pool.query(
      `UPDATE avisosNotificacoes SET
        titulo = COALESCE(?, titulo),
        descricao = COALESCE(?, descricao),
        tipo = COALESCE(?, tipo),
        prioridade = COALESCE(?, prioridade),
        status = COALESCE(?, status),
        dataPrevisao = ?
       WHERE id = ?`,
      [titulo, descricao, tipo, prioridade, status, dataPrevisao || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Aviso não encontrado' });
    }

    res.json({ success: true, message: 'Aviso atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar aviso:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar aviso', error: error.message });
  }
});

// DELETE /api/avisos/:id - Excluir aviso
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM avisosNotificacoes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Aviso não encontrado' });
    }
    res.json({ success: true, message: 'Aviso excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir aviso:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir aviso', error: error.message });
  }
});

module.exports = router;
