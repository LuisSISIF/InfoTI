const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * Calcula a próxima data de execução com base no tipo de recorrência
 */
function calcularProximaData(dataBase, tipoRecorrencia, intervalo = 1, unidade = 'dias') {
  const d = new Date(dataBase);
  if (isNaN(d.getTime())) return null;

  switch (tipoRecorrencia) {
    case 'diaria':
      d.setDate(d.getDate() + 1);
      break;
    case 'semanal':
      d.setDate(d.getDate() + 7);
      break;
    case 'mensal':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'anual':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'intervalo':
      const qtd = parseInt(intervalo || 1, 10);
      if (unidade === 'dias') d.setDate(d.getDate() + qtd);
      else if (unidade === 'semanas') d.setDate(d.getDate() + (qtd * 7));
      else if (unidade === 'meses') d.setMonth(d.getMonth() + qtd);
      else if (unidade === 'anos') d.setFullYear(d.getFullYear() + qtd);
      break;
    default:
      return null;
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// GET /api/demandas/dashboard - KPIs e métricas do dia
router.get('/dashboard', async (req, res) => {
  try {
    const { data } = req.query;
    // Se não informada, usa a data atual (YYYY-MM-DD)
    const dataRef = data || new Date().toISOString().split('T')[0];

    // Consultar execuções do dia com o cálculo de status_atual
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN e.status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
        SUM(CASE 
          WHEN e.status = 'pendente' AND e.data_prevista < NOW() THEN 1 
          ELSE 0 
        END) as atrasadas,
        SUM(CASE 
          WHEN e.status = 'pendente' AND e.data_prevista >= NOW() THEN 1 
          ELSE 0 
        END) as pendentes
      FROM tarefas_execucoes e
      WHERE DATE(e.data_prevista) = ?
    `;

    const [rows] = await pool.query(query, [dataRef]);

    // Total de tarefas ativas registradas
    const [totalTarefas] = await pool.query('SELECT count(*) as total FROM tarefas WHERE ativo = 1');

    // Total de tarefas atrasadas no geral (histórico total acumulado)
    const [atrasadasGeral] = await pool.query(`
      SELECT count(*) as total 
      FROM tarefas_execucoes 
      WHERE status = 'pendente' AND data_prevista < NOW()
    `);

    res.json({
      success: true,
      data: {
        dataRef,
        totalDia: rows[0].total || 0,
        pendentesDia: parseInt(rows[0].pendentes || 0, 10),
        concluidasDia: parseInt(rows[0].concluidas || 0, 10),
        atrasadasDia: parseInt(rows[0].atrasadas || 0, 10),
        totalTarefasMatriz: totalTarefas[0].total || 0,
        totalAtrasadasGeral: atrasadasGeral[0].total || 0
      }
    });
  } catch (error) {
    console.error('Erro no dashboard de demandas:', error);
    res.status(500).json({ success: false, message: 'Erro ao compilar indicadores de demandas', error: error.message });
  }
});

// GET /api/demandas/execucoes - Listar execuções de tarefas com filtros
router.get('/execucoes', async (req, res) => {
  try {
    const { data, dataInicio, dataFim, status, prioridade, tarefaId, search, limit = 100 } = req.query;

    let query = `
      SELECT 
        e.id as execucao_id,
        e.tarefa_id,
        e.data_prevista,
        e.data_conclusao,
        e.responsavel_id,
        e.status as status_banco,
        e.observacao as observacao_execucao,
        e.criado_em as execucao_criada_em,
        CASE
          WHEN e.status = 'pendente' AND e.data_prevista < NOW()
          THEN 'atrasada'
          ELSE e.status
        END AS status_atual,
        t.titulo as tarefa_titulo,
        t.descricao as tarefa_descricao,
        t.prioridade,
        t.tipo_recorrencia,
        t.intervalo,
        t.unidade_intervalo,
        t.ativo as tarefa_ativa
      FROM tarefas_execucoes e
      INNER JOIN tarefas t ON e.tarefa_id = t.id
      WHERE 1=1
    `;
    const params = [];

    // Filtro por data exata (ex: hoje)
    if (data) {
      query += ' AND DATE(e.data_prevista) = ?';
      params.push(data);
    } else if (dataInicio && dataFim) {
      query += ' AND DATE(e.data_prevista) BETWEEN ? AND ?';
      params.push(dataInicio, dataFim);
    } else if (dataInicio) {
      query += ' AND DATE(e.data_prevista) >= ?';
      params.push(dataInicio);
    } else if (dataFim) {
      query += ' AND DATE(e.data_prevista) <= ?';
      params.push(dataFim);
    }

    // Filtro por tarefa_id específica
    if (tarefaId) {
      query += ' AND e.tarefa_id = ?';
      params.push(tarefaId);
    }

    // Filtro por prioridade
    if (prioridade && prioridade !== 'Todas') {
      query += ' AND t.prioridade = ?';
      params.push(prioridade);
    }

    // Busca textual
    if (search) {
      query += ' AND (t.titulo LIKE ? OR t.descricao LIKE ? OR e.observacao LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Filtro por status_atual
    if (status && status !== 'Todos') {
      if (status === 'atrasada') {
        query += " AND e.status = 'pendente' AND e.data_prevista < NOW()";
      } else if (status === 'pendente') {
        query += " AND e.status = 'pendente' AND e.data_prevista >= NOW()";
      } else {
        query += ' AND e.status = ?';
        params.push(status);
      }
    }

    query += ' ORDER BY e.data_prevista ASC, FIELD(t.prioridade, "critica", "alta", "media", "baixa") LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao listar execuções de demandas:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar execuções', error: error.message });
  }
});

// GET /api/demandas/tarefas - Listar tarefas matriz
router.get('/tarefas', async (req, res) => {
  try {
    const { statusAtivo, prioridade, search } = req.query;

    let query = `
      SELECT 
        t.*,
        COUNT(e.id) as total_execucoes,
        SUM(CASE WHEN e.status = 'concluida' THEN 1 ELSE 0 END) as execucoes_concluidas,
        SUM(CASE WHEN e.status = 'pendente' AND e.data_prevista < NOW() THEN 1 ELSE 0 END) as execucoes_atrasadas,
        SUM(CASE WHEN e.status = 'pendente' AND e.data_prevista >= NOW() THEN 1 ELSE 0 END) as execucoes_pendentes
      FROM tarefas t
      LEFT JOIN tarefas_execucoes e ON t.id = e.tarefa_id
      WHERE 1=1
    `;
    const params = [];

    if (statusAtivo !== undefined && statusAtivo !== 'Todos') {
      query += ' AND t.ativo = ?';
      params.push(statusAtivo === '1' || statusAtivo === 'true' ? 1 : 0);
    }

    if (prioridade && prioridade !== 'Todas') {
      query += ' AND t.prioridade = ?';
      params.push(prioridade);
    }

    if (search) {
      query += ' AND (t.titulo LIKE ? OR t.descricao LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ' GROUP BY t.id ORDER BY t.ativo DESC, FIELD(t.prioridade, "critica", "alta", "media", "baixa"), t.id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar tarefas', error: error.message });
  }
});

// GET /api/demandas/tarefas/:id - Obter detalhes de uma tarefa matriz
router.get('/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Erro ao obter tarefa:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter tarefa', error: error.message });
  }
});

// POST /api/demandas/tarefas - Criar nova tarefa e gerar a primeira execução
router.post('/tarefas', async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      tipo_recorrencia,
      intervalo,
      unidade_intervalo,
      data_inicio,
      prioridade,
      ativo,
      observacao_inicial
    } = req.body;

    if (!titulo || !data_inicio) {
      return res.status(400).json({ success: false, message: 'Título e Data de Início são obrigatórios' });
    }

    const recTipo = tipo_recorrencia || 'unica';
    const recIntervalo = parseInt(intervalo || 1, 10);
    const recUnidade = recTipo === 'intervalo' ? (unidade_intervalo || 'dias') : null;
    const isAtivo = ativo !== undefined ? (ativo ? 1 : 0) : 1;
    const prio = prioridade || 'media';

    // Formatar data_inicio (YYYY-MM-DD HH:mm:ss)
    const dataInicioFormatada = data_inicio.replace('T', ' ').slice(0, 19);

    // Próxima execução
    const proximaExecucao = recTipo !== 'unica' 
      ? calcularProximaData(dataInicioFormatada, recTipo, recIntervalo, recUnidade) 
      : null;

    // 1. Inserir Tarefa Matriz
    const [taskResult] = await pool.query(
      `INSERT INTO tarefas 
      (titulo, descricao, tipo_recorrencia, intervalo, unidade_intervalo, data_inicio, proxima_execucao, prioridade, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo.trim(),
        descricao || null,
        recTipo,
        recIntervalo,
        recUnidade,
        dataInicioFormatada,
        proximaExecucao,
        prio,
        isAtivo
      ]
    );

    const tarefaId = taskResult.insertId;

    // 2. Inserir a primeira execução correspondente
    const [execResult] = await pool.query(
      `INSERT INTO tarefas_execucoes 
      (tarefa_id, data_prevista, status, observacao)
      VALUES (?, ?, 'pendente', ?)`,
      [tarefaId, dataInicioFormatada, observacao_inicial || null]
    );

    res.status(201).json({
      success: true,
      message: 'Tarefa e execução agendada criadas com sucesso!',
      tarefaId,
      execucaoId: execResult.insertId
    });
  } catch (error) {
    console.error('Erro ao cadastrar tarefa:', error);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar tarefa', error: error.message });
  }
});

// PUT /api/demandas/tarefas/:id - Atualizar dados da tarefa matriz
router.put('/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      tipo_recorrencia,
      intervalo,
      unidade_intervalo,
      data_inicio,
      prioridade,
      ativo
    } = req.body;

    const [result] = await pool.query(
      `UPDATE tarefas SET
        titulo = COALESCE(?, titulo),
        descricao = ?,
        tipo_recorrencia = COALESCE(?, tipo_recorrencia),
        intervalo = COALESCE(?, intervalo),
        unidade_intervalo = ?,
        data_inicio = COALESCE(?, data_inicio),
        prioridade = COALESCE(?, prioridade),
        ativo = COALESCE(?, ativo)
      WHERE id = ?`,
      [
        titulo ? titulo.trim() : null,
        descricao !== undefined ? descricao : null,
        tipo_recorrencia,
        intervalo ? parseInt(intervalo, 10) : null,
        unidade_intervalo || null,
        data_inicio ? data_inicio.replace('T', ' ').slice(0, 19) : null,
        prioridade,
        ativo !== undefined ? (ativo ? 1 : 0) : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
    }

    res.json({ success: true, message: 'Tarefa atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar tarefa', error: error.message });
  }
});

// DELETE /api/demandas/tarefas/:id - Excluir tarefa e todas as suas execuções
router.delete('/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Excluir execuções vinculadas
    await pool.query('DELETE FROM tarefas_execucoes WHERE tarefa_id = ?', [id]);

    const [result] = await pool.query('DELETE FROM tarefas WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Tarefa não encontrada' });
    }

    res.json({ success: true, message: 'Tarefa e execuções excluídas com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir tarefa', error: error.message });
  }
});

// PUT /api/demandas/execucoes/:id/concluir - Ação Rápida: Concluir execução em 1 clique
router.put('/execucoes/:id/concluir', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Obter dados da execução atual e da tarefa pai
    const [execRows] = await pool.query(`
      SELECT e.*, t.tipo_recorrencia, t.intervalo, t.unidade_intervalo, t.ativo
      FROM tarefas_execucoes e
      INNER JOIN tarefas t ON e.tarefa_id = t.id
      WHERE e.id = ?
    `, [id]);

    if (execRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    const exec = execRows[0];

    // 2. Marcar como concluída
    await pool.query(
      `UPDATE tarefas_execucoes SET 
        status = 'concluida', 
        data_conclusao = ? 
      WHERE id = ?`,
      [now, id]
    );

    // 3. Se a tarefa matriz tiver recorrência e estiver ativa, gerar próxima execução automaticamente
    let proximaGerada = null;
    if (exec.tipo_recorrencia !== 'unica' && exec.ativo) {
      const proximaData = calcularProximaData(
        exec.data_prevista, 
        exec.tipo_recorrencia, 
        exec.intervalo, 
        exec.unidade_intervalo
      );

      if (proximaData) {
        // Atualizar proxima_execucao na tarefa matriz
        await pool.query('UPDATE tarefas SET proxima_execucao = ? WHERE id = ?', [proximaData, exec.tarefa_id]);

        // Inserir nova execução pendente se não existir ainda
        try {
          const [novaExec] = await pool.query(
            `INSERT IGNORE INTO tarefas_execucoes (tarefa_id, data_prevista, status) VALUES (?, ?, 'pendente')`,
            [exec.tarefa_id, proximaData]
          );
          if (novaExec.insertId) {
            proximaGerada = proximaData;
          }
        } catch (e) {
          console.warn('Execução futura já existente ou erro não crítico:', e.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Demanda concluída com sucesso!' + (proximaGerada ? ` Próxima execução agendada para ${proximaGerada}.` : ''),
      dataConclusao: now,
      proximaGerada
    });
  } catch (error) {
    console.error('Erro ao concluir execução:', error);
    res.status(500).json({ success: false, message: 'Erro ao concluir execução', error: error.message });
  }
});

// GET /api/demandas/execucoes/:id - Obter dados de uma execução específica
router.get('/execucoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        e.*,
        t.titulo as tarefa_titulo,
        t.descricao as tarefa_descricao,
        t.prioridade,
        t.tipo_recorrencia
      FROM tarefas_execucoes e
      INNER JOIN tarefas t ON e.tarefa_id = t.id
      WHERE e.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Erro ao obter execução:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter execução', error: error.message });
  }
});

// PUT /api/demandas/execucoes/:id - Atualizar dados específicos da execução
router.put('/execucoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_prevista, data_conclusao, status, observacao } = req.body;

    let dataPrevistaFmt = data_prevista ? data_prevista.replace('T', ' ').slice(0, 19) : null;
    let dataConclusaoFmt = data_conclusao ? data_conclusao.replace('T', ' ').slice(0, 19) : null;

    if (status === 'concluida' && !dataConclusaoFmt) {
      dataConclusaoFmt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else if (status === 'pendente') {
      dataConclusaoFmt = null;
    }

    const [result] = await pool.query(
      `UPDATE tarefas_execucoes SET
        data_prevista = COALESCE(?, data_prevista),
        data_conclusao = ?,
        status = COALESCE(?, status),
        observacao = ?
      WHERE id = ?`,
      [
        dataPrevistaFmt,
        dataConclusaoFmt,
        status,
        observacao !== undefined ? observacao : null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }

    res.json({ success: true, message: 'Execução atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar execução:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar execução', error: error.message });
  }
});

// DELETE /api/demandas/execucoes/:id - Excluir execução específica
router.delete('/execucoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM tarefas_execucoes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Execução não encontrada' });
    }
    res.json({ success: true, message: 'Execução excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir execução:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir execução', error: error.message });
  }
});

module.exports = router;
