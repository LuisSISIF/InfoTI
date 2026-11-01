const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/ramais - Listar ramais
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM ramais WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (departamento LIKE ? OR numeroRamal LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY departamento ASC, numeroRamal ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao buscar ramais:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar ramais', error: error.message });
  }
});

// GET /api/ramais/:id - Buscar ramal por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ramais WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ramal não encontrado' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar ramal', error: error.message });
  }
});

// POST /api/ramais - Cadastrar novo ramal
router.post('/', async (req, res) => {
  try {
    const { departamento, numeroRamal } = req.body;

    if (!departamento || !numeroRamal) {
      return res.status(400).json({ success: false, message: 'Departamento e Número do Ramal são obrigatórios' });
    }

    const [result] = await pool.query(
      'INSERT INTO ramais (departamento, numeroRamal) VALUES (?, ?)',
      [departamento.trim(), numeroRamal.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Ramal cadastrado com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao cadastrar ramal:', error);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar ramal', error: error.message });
  }
});

// PUT /api/ramais/:id - Atualizar ramal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { departamento, numeroRamal } = req.body;

    if (!departamento || !numeroRamal) {
      return res.status(400).json({ success: false, message: 'Departamento e Número do Ramal são obrigatórios' });
    }

    const [result] = await pool.query(
      'UPDATE ramais SET departamento = ?, numeroRamal = ? WHERE id = ?',
      [departamento.trim(), numeroRamal.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ramal não encontrado para atualização' });
    }

    res.json({ success: true, message: 'Ramal atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar ramal:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar ramal', error: error.message });
  }
});

// DELETE /api/ramais/:id - Excluir ramal
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM ramais WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ramal não encontrado' });
    }
    res.json({ success: true, message: 'Ramal excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir ramal:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir ramal', error: error.message });
  }
});

module.exports = router;
