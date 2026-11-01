const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/licencas - Listar licenças com dados do computador associado
router.get('/', async (req, res) => {
  try {
    const { tipo, search } = req.query;
    let query = `
      SELECT 
        l.id,
        l.chaveAtivacao,
        l.emailAtivacao,
        l.idComputador,
        l.tipoLicenca,
        c.nomeMaquina,
        c.colaborador,
        c.departamento,
        c.status as statusComputador
      FROM inventarioLicencas l
      LEFT JOIN computadores c ON l.idComputador = c.id
      WHERE 1=1
    `;
    const params = [];

    if (tipo && tipo !== 'Todos') {
      query += ' AND l.tipoLicenca LIKE ?';
      params.push(`%${tipo}%`);
    }

    if (search) {
      query += ' AND (l.chaveAtivacao LIKE ? OR l.emailAtivacao LIKE ? OR l.tipoLicenca LIKE ? OR c.nomeMaquina LIKE ? OR c.colaborador LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY l.id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao buscar licenças:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar licenças', error: error.message });
  }
});

// GET /api/licencas/:id - Buscar licença específica
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, c.nomeMaquina, c.colaborador 
      FROM inventarioLicencas l
      LEFT JOIN computadores c ON l.idComputador = c.id
      WHERE l.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Licença não encontrada' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar licença', error: error.message });
  }
});

// POST /api/licencas - Cadastrar nova licença
router.post('/', async (req, res) => {
  try {
    const { chaveAtivacao, emailAtivacao, idComputador, tipoLicenca } = req.body;

    if (!chaveAtivacao || !tipoLicenca) {
      return res.status(400).json({ success: false, message: 'Chave de Ativação e Tipo de Licença são obrigatórios' });
    }

    const compId = parseInt(idComputador, 10);
    if (isNaN(compId) || compId <= 0) {
      return res.status(400).json({ success: false, message: 'Selecione um computador válido para vincular à licença' });
    }

    // Verificar se computador existe
    const [compExists] = await pool.query('SELECT id FROM computadores WHERE id = ?', [compId]);
    if (compExists.length === 0) {
      return res.status(400).json({ success: false, message: 'O computador selecionado não existe' });
    }

    const [result] = await pool.query(
      `INSERT INTO inventarioLicencas (chaveAtivacao, emailAtivacao, idComputador, tipoLicenca)
      VALUES (?, ?, ?, ?)`,
      [chaveAtivacao.trim(), (emailAtivacao || '').trim(), compId, tipoLicenca.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Licença cadastrada com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao cadastrar licença:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Esta chave de ativação já está cadastrada no sistema' });
    }
    res.status(500).json({ success: false, message: 'Erro ao cadastrar licença', error: error.message });
  }
});

// PUT /api/licencas/:id - Atualizar licença
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { chaveAtivacao, emailAtivacao, idComputador, tipoLicenca } = req.body;

    const compId = parseInt(idComputador, 10);
    if (isNaN(compId) || compId <= 0) {
      return res.status(400).json({ success: false, message: 'Selecione um computador válido' });
    }

    const [result] = await pool.query(
      `UPDATE inventarioLicencas SET
        chaveAtivacao = ?,
        emailAtivacao = ?,
        idComputador = ?,
        tipoLicenca = ?
      WHERE id = ?`,
      [chaveAtivacao.trim(), (emailAtivacao || '').trim(), compId, tipoLicenca.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Licença não encontrada para atualização' });
    }

    res.json({ success: true, message: 'Licença atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar licença:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Esta chave de ativação já pertence a outro registro' });
    }
    res.status(500).json({ success: false, message: 'Erro ao atualizar licença', error: error.message });
  }
});

// DELETE /api/licencas/:id - Excluir licença
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM inventarioLicencas WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Licença não encontrada' });
    }
    res.json({ success: true, message: 'Licença excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir licença:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir licença', error: error.message });
  }
});

module.exports = router;
