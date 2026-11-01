const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/impressoras - Listar todas as impressoras
router.get('/', async (req, res) => {
  try {
    const { status, departamento, search } = req.query;
    let query = 'SELECT * FROM impressoras WHERE 1=1';
    const params = [];

    if (status && status !== 'Todos') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (departamento && departamento !== 'Todos') {
      query += ' AND departamento = ?';
      params.push(departamento);
    }

    if (search) {
      query += ' AND (departamento LIKE ? OR modelo LIKE ? OR serialNumber LIKE ? OR ip LIKE ? OR centroDeCusto LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao listar impressoras:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar impressoras', error: error.message });
  }
});

// GET /api/impressoras/:id - Buscar uma impressora por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM impressoras WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar impressora', error: error.message });
  }
});

// POST /api/impressoras - Criar nova impressora
router.post('/', async (req, res) => {
  try {
    const {
      departamento,
      modelo,
      serialNumber,
      ip,
      valorUn,
      centroDeCusto,
      porcentRateio,
      observacao,
      status
    } = req.body;

    if (!departamento || !modelo) {
      return res.status(400).json({ success: false, message: 'Departamento e Modelo são obrigatórios' });
    }

    // Validação de porcentagem (0 a 100)
    let rateioNum = parseFloat(porcentRateio);
    if (isNaN(rateioNum)) rateioNum = 0.0;
    if (rateioNum < 0) rateioNum = 0;
    if (rateioNum > 100) rateioNum = 100;

    let valorUnNum = parseFloat(valorUn);
    if (isNaN(valorUnNum)) valorUnNum = 0.0;

    const [result] = await pool.query(
      `INSERT INTO impressoras 
      (departamento, modelo, serialNumber, ip, valorUn, centroDeCusto, porcentRateio, observacao, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        departamento || '',
        modelo || '',
        serialNumber || '',
        ip || '',
        valorUnNum.toFixed(2),
        centroDeCusto || '',
        rateioNum.toFixed(2),
        observacao || '',
        status || 'Ativo'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Impressora cadastrada com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao cadastrar impressora:', error);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar impressora', error: error.message });
  }
});

// PUT /api/impressoras/:id - Atualizar impressora existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      departamento,
      modelo,
      serialNumber,
      ip,
      valorUn,
      centroDeCusto,
      porcentRateio,
      observacao,
      status
    } = req.body;

    let rateioNum = parseFloat(porcentRateio);
    if (isNaN(rateioNum)) rateioNum = 0.0;
    if (rateioNum < 0) rateioNum = 0;
    if (rateioNum > 100) rateioNum = 100;

    let valorUnNum = parseFloat(valorUn);
    if (isNaN(valorUnNum)) valorUnNum = 0.0;

    const [result] = await pool.query(
      `UPDATE impressoras SET 
        departamento = ?,
        modelo = ?,
        serialNumber = ?,
        ip = ?,
        valorUn = ?,
        centroDeCusto = ?,
        porcentRateio = ?,
        observacao = ?,
        status = ?
      WHERE id = ?`,
      [
        departamento || '',
        modelo || '',
        serialNumber || '',
        ip || '',
        valorUnNum.toFixed(2),
        centroDeCusto || '',
        rateioNum.toFixed(2),
        observacao || '',
        status || 'Ativo',
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Impressora não encontrada para atualização' });
    }

    res.json({ success: true, message: 'Impressora atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar impressora:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar impressora', error: error.message });
  }
});

// DELETE /api/impressoras/:id - Excluir impressora
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se há registros na tabela de contagens dependentes
    const [counts] = await pool.query('SELECT count(*) as total FROM contagemiMpressao WHERE idImpressora = ?', [id]);
    if (counts[0].total > 0) {
      // Excluir registros dependentes de contagem para permitir remoção limpa
      await pool.query('DELETE FROM contagemiMpressao WHERE idImpressora = ?', [id]);
    }

    const [result] = await pool.query('DELETE FROM impressoras WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Impressora não encontrada' });
    }

    res.json({ success: true, message: 'Impressora excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir impressora:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir impressora', error: error.message });
  }
});

module.exports = router;
