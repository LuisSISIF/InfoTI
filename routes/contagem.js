const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/contagem - Listar histórico de contagens de impressão com filtros por mês/ano e busca
router.get('/', async (req, res) => {
  try {
    const { idImpressora, mes, ano, dataRef, search, limit = 200 } = req.query;
    let query = `
      SELECT 
        c.*, 
        i.departamento, 
        i.modelo, 
        i.ip, 
        i.serialNumber, 
        i.valorUn, 
        i.centroDeCusto
      FROM contagemiMpressao c
      INNER JOIN impressoras i ON c.idImpressora = i.id
      WHERE 1=1
    `;
    const params = [];

    if (idImpressora) {
      query += ' AND c.idImpressora = ?';
      params.push(idImpressora);
    }

    // Filtrar por Mês e Ano (ex: mes=10, ano=2026 ou dataRef="2026-10")
    if (dataRef && dataRef.includes('-')) {
      const parts = dataRef.split('-');
      const anoVal = parseInt(parts[0], 10);
      const mesVal = parseInt(parts[1], 10);
      if (!isNaN(anoVal) && !isNaN(mesVal)) {
        query += ' AND YEAR(c.dataContagem) = ? AND MONTH(c.dataContagem) = ?';
        params.push(anoVal, mesVal);
      }
    } else {
      if (ano) {
        query += ' AND YEAR(c.dataContagem) = ?';
        params.push(parseInt(ano, 10));
      }
      if (mes) {
        query += ' AND MONTH(c.dataContagem) = ?';
        params.push(parseInt(mes, 10));
      }
    }

    if (search) {
      query += ' AND (i.departamento LIKE ? OR i.modelo LIKE ? OR i.ip LIKE ? OR i.serialNumber LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY c.dataContagem DESC, i.departamento ASC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);

    // Calcular resumo consolidado
    let totalImpressoes = 0;
    let totalCusto = 0;
    rows.forEach(r => {
      totalImpressoes += parseInt(r.ctImpressoes || 0, 10);
      totalCusto += parseFloat(r.custoTotal || 0);
    });

    res.json({
      success: true,
      data: rows,
      resumo: {
        totalRegistros: rows.length,
        totalImpressoes,
        totalCusto: totalCusto.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar contagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar contagens de impressão', error: error.message });
  }
});

// GET /api/contagem/meses-disponiveis - Obter lista de meses e anos com dados cadastrados
router.get('/meses-disponiveis', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT 
        YEAR(dataContagem) as ano, 
        MONTH(dataContagem) as mes,
        DATE_FORMAT(dataContagem, '%Y-%m') as mesAnoRef,
        COUNT(*) as totalRegistros
      FROM contagemiMpressao
      WHERE dataContagem IS NOT NULL
      GROUP BY YEAR(dataContagem), MONTH(dataContagem), DATE_FORMAT(dataContagem, '%Y-%m')
      ORDER BY ano DESC, mes DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao listar meses de contagem:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar meses disponíveis' });
  }
});

// GET /api/contagem/latest - Obter última contagem de cada impressora (para preencher 'Contagem Anterior')
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c1.idImpressora, c1.ctFolhasAtual, c1.dataContagem
      FROM contagemiMpressao c1
      INNER JOIN (
        SELECT idImpressora, MAX(id) as maxId
        FROM contagemiMpressao
        GROUP BY idImpressora
      ) c2 ON c1.id = c2.maxId
    `);

    // Transform into a lookup map: { [idImpressora]: ctFolhasAtual }
    const lookup = {};
    rows.forEach(r => {
      lookup[r.idImpressora] = {
        ultimaContagem: r.ctFolhasAtual,
        dataUltima: r.dataContagem
      };
    });

    res.json({ success: true, data: lookup });
  } catch (error) {
    console.error('Erro ao buscar últimas contagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar últimas contagens', error: error.message });
  }
});

// POST /api/contagem - Registrar contagem mensal (aceita um item ou array de itens)
router.post('/', async (req, res) => {
  try {
    const { items, dataContagem } = req.body;
    const dateToUse = dataContagem || new Date().toISOString().split('T')[0];

    const rawRecords = Array.isArray(items) ? items : (req.body ? [req.body] : []);
    if (rawRecords.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum registro de contagem enviado' });
    }

    // Primeiro passo: normalizar e calcular custo unitário de cada item
    const parsedRecords = [];
    for (const item of rawRecords) {
      const idImpressora = parseInt(item.idImpressora, 10);
      if (!idImpressora) continue;

      const ctAnterior = parseInt(item.ctFolhasAnterior || 0, 10);
      const ctAtual = parseInt(item.ctFolhasAtual || 0, 10);
      const ctImpressoes = Math.max(0, ctAtual - ctAnterior);

      let valorUn = parseFloat(item.valorUn);
      if (isNaN(valorUn) || valorUn <= 0) {
        const [imp] = await pool.query('SELECT valorUn FROM impressoras WHERE id = ?', [idImpressora]);
        valorUn = imp.length > 0 ? parseFloat(imp[0].valorUn || 0) : 0;
      }

      let custoTotal = parseFloat(item.custoTotal);
      if (isNaN(custoTotal) || custoTotal <= 0) {
        custoTotal = ctImpressoes * valorUn;
      }

      parsedRecords.push({
        idImpressora,
        ctAnterior,
        ctAtual,
        ctImpressoes,
        valorUn,
        custoTotal,
        porcentRateioInformado: item.porcentRateio !== undefined && item.porcentRateio !== null ? parseFloat(item.porcentRateio) : null,
        dataContagem: item.dataContagem || dateToUse
      });
    }

    if (parsedRecords.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma impressora válida identificada' });
    }

    // Calcular Custo Total Geral do lote/mês para apuração do % Rateio
    // Rateio: (valorUnitario * ctImpressoes) / custoTotalGeral * 100
    const custoTotalGeral = parsedRecords.reduce((acc, r) => acc + (r.custoTotal || 0), 0);

    const inserted = [];
    for (const r of parsedRecords) {
      let porcentRateio = 0.00;
      if (r.porcentRateioInformado !== null && !isNaN(r.porcentRateioInformado) && parsedRecords.length === 1) {
        porcentRateio = Math.min(100, Math.max(0, r.porcentRateioInformado));
      } else if (custoTotalGeral > 0) {
        porcentRateio = (r.custoTotal / custoTotalGeral) * 100;
      }

      const [result] = await pool.query(
        `INSERT INTO contagemiMpressao 
        (idImpressora, ctFolhasAnterior, ctFolhasAtual, ctImpressoes, custoTotal, porcentRateio, dataContagem) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          r.idImpressora,
          r.ctAnterior,
          r.ctAtual,
          r.ctImpressoes,
          r.custoTotal.toFixed(2),
          porcentRateio.toFixed(2),
          r.dataContagem
        ]
      );
      inserted.push(result.insertId);
    }

    res.status(201).json({
      success: true,
      message: `${inserted.length} contagem(ns) registrada(s) com sucesso!`,
      ids: inserted
    });
  } catch (error) {
    console.error('Erro ao salvar contagem mensal:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar contagem', error: error.message });
  }
});

// DELETE /api/contagem/:id - Excluir registro de contagem
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM contagemiMpressao WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Registro de contagem não encontrado' });
    }
    res.json({ success: true, message: 'Registro de contagem excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao excluir contagem', error: error.message });
  }
});

module.exports = router;
