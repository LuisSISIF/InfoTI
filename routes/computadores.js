const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../config/database');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// GET /api/computadores/stats - Estatísticas para o Dashboard
router.get('/stats', async (req, res) => {
  try {
    const [totalRows] = await pool.query('SELECT count(*) as total FROM computadores');
    const [backupRows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN backup = 'SIM' THEN 1 ELSE 0 END) as backupOk,
        SUM(CASE WHEN backup = 'NAO' OR backup IS NULL THEN 1 ELSE 0 END) as backupNao
      FROM computadores
    `);
    const [statusRows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'Ativo' THEN 1 ELSE 0 END) as ativos,
        SUM(CASE WHEN status = 'Defeito' THEN 1 ELSE 0 END) as defeito,
        SUM(CASE WHEN status = 'Reserva' THEN 1 ELSE 0 END) as reserva
      FROM computadores
    `);

    const total = totalRows[0].total || 0;
    const backupOk = parseInt(backupRows[0].backupOk || 0, 10);
    const backupNao = parseInt(backupRows[0].backupNao || 0, 10);
    const ativos = parseInt(statusRows[0].ativos || 0, 10);
    const defeito = parseInt(statusRows[0].defeito || 0, 10);
    const reserva = parseInt(statusRows[0].reserva || 0, 10);

    const backupPorcentagem = total > 0 ? Math.round((backupOk / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        total,
        backupOk,
        backupNao,
        backupPorcentagem,
        ativos,
        defeito,
        reserva
      }
    });
  } catch (error) {
    console.error('Erro ao calcular estatísticas de computadores:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas', error: error.message });
  }
});

// GET /api/computadores - Listar computadores
router.get('/', async (req, res) => {
  try {
    const { status, backup, departamento, search } = req.query;
    let query = 'SELECT * FROM computadores WHERE 1=1';
    const params = [];

    if (status && status !== 'Todos') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (backup && backup !== 'Todos') {
      query += ' AND backup = ?';
      params.push(backup);
    }

    if (departamento && departamento !== 'Todos') {
      query += ' AND departamento = ?';
      params.push(departamento);
    }

    if (search) {
      query += ' AND (colaborador LIKE ? OR departamento LIKE ? OR modelo LIKE ? OR serialNumbner LIKE ? OR serviceTag LIKE ? OR nomeMaquina LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    query += ' ORDER BY id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erro ao listar computadores:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar computadores', error: error.message });
  }
});

// GET /api/computadores/:id - Buscar computador por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM computadores WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Computador não encontrado' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar computador', error: error.message });
  }
});

// POST /api/computadores - Criar novo computador
router.post('/', async (req, res) => {
  try {
    const {
      colaborador,
      departamento,
      modelo,
      serialNumbner,
      serviceTag,
      observacao,
      backup,
      dataultimoBackup,
      nomeMaquina,
      status
    } = req.body;

    if (!nomeMaquina && !colaborador) {
      return res.status(400).json({ success: false, message: 'Nome da Máquina ou Colaborador é obrigatório' });
    }

    const [result] = await pool.query(
      `INSERT INTO computadores 
      (colaborador, departamento, modelo, serialNumbner, serviceTag, observacao, backup, dataultimoBackup, nomeMaquina, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        colaborador || '',
        departamento || '',
        modelo || '',
        serialNumbner || '',
        serviceTag || '',
        observacao || '',
        backup === 'SIM' ? 'SIM' : 'NAO',
        dataultimoBackup || null,
        nomeMaquina || '',
        status || 'Ativo'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Computador cadastrado com sucesso!',
      id: result.insertId
    });
  } catch (error) {
    console.error('Erro ao cadastrar computador:', error);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar computador', error: error.message });
  }
});

// PUT /api/computadores/:id - Atualizar computador
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      colaborador,
      departamento,
      modelo,
      serialNumbner,
      serviceTag,
      observacao,
      backup,
      dataultimoBackup,
      nomeMaquina,
      status
    } = req.body;

    const [result] = await pool.query(
      `UPDATE computadores SET 
        colaborador = ?,
        departamento = ?,
        modelo = ?,
        serialNumbner = ?,
        serviceTag = ?,
        observacao = ?,
        backup = ?,
        dataultimoBackup = ?,
        nomeMaquina = ?,
        status = ?
      WHERE id = ?`,
      [
        colaborador || '',
        departamento || '',
        modelo || '',
        serialNumbner || '',
        serviceTag || '',
        observacao || '',
        backup === 'SIM' ? 'SIM' : 'NAO',
        dataultimoBackup || null,
        nomeMaquina || '',
        status || 'Ativo',
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Computador não encontrado para atualização' });
    }

    res.json({ success: true, message: 'Computador atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar computador:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar computador', error: error.message });
  }
});

// DELETE /api/computadores/:id - Excluir computador
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se há licenças vinculadas a este computador
    const [lics] = await pool.query('SELECT count(*) as total FROM inventarioLicencas WHERE idComputador = ?', [id]);
    if (lics[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir: existem ${lics[0].total} licença(s) vinculada(s) a esta máquina. Desvincule ou remova as licenças primeiro.`
      });
    }

    const [result] = await pool.query('DELETE FROM computadores WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Computador não encontrado' });
    }

    res.json({ success: true, message: 'Computador excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir computador:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir computador', error: error.message });
  }
});

// Helper para normalizar e extrair campos de uma linha da planilha
function extrairDadosLinhaPlanilha(rawRow) {
  let colaborador = '';
  let departamento = '';
  let modelo = '';
  let serialNumber = '';
  let serviceTag = '';
  let chaveAtivacao = '';
  let emailAtivacao = '';
  let observacao = '';
  let historicoUso = '';

  if (Array.isArray(rawRow)) {
    // Linha como array posicional (ex: [Colaborador, Departamento, Modelo, Serial, Tag, Chave, Email, Obs, ..., Histórico])
    colaborador = rawRow[0] || '';
    departamento = rawRow[1] || '';
    modelo = rawRow[2] || '';
    serialNumber = rawRow[3] || '';
    serviceTag = rawRow[4] || '';
    chaveAtivacao = rawRow[5] || '';
    emailAtivacao = rawRow[6] || '';
    observacao = rawRow[7] || '';
    historicoUso = rawRow[9] || rawRow[8] || '';
  } else if (typeof rawRow === 'object' && rawRow !== null) {
    // Objeto indexado por nome de coluna
    for (const key of Object.keys(rawRow)) {
      const val = String(rawRow[key] || '').trim();
      const normKey = key.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      if (normKey.includes('colaborador') || normKey.includes('usuario') || normKey === 'nome') {
        colaborador = colaborador || val;
      } else if (normKey.includes('departamento') || normKey.includes('depto') || normKey.includes('setor')) {
        departamento = departamento || val;
      } else if (normKey.includes('modelo')) {
        modelo = modelo || val;
      } else if (normKey.includes('serial') || normKey.includes('serie')) {
        serialNumber = serialNumber || val;
      } else if (normKey.includes('tag') || normKey.includes('servicetag')) {
        serviceTag = serviceTag || val;
      } else if (normKey.includes('chave') || normKey.includes('key') || normKey.includes('ativacao')) {
        chaveAtivacao = chaveAtivacao || val;
      } else if (normKey.includes('email') || normKey.includes('mail')) {
        emailAtivacao = emailAtivacao || val;
      } else if (normKey.includes('observacao') || normKey.includes('obs')) {
        observacao = observacao || val;
      } else if (normKey.includes('historico') || normKey.includes('uso')) {
        historicoUso = historicoUso || val;
      }
    }
  }

  let obsFinal = String(observacao || '').trim();
  const histStr = String(historicoUso || '').trim();
  if (histStr) {
    obsFinal = obsFinal ? `${obsFinal} | Histórico: ${histStr}` : `Histórico: ${histStr}`;
  }

  return {
    colaborador: String(colaborador || '').trim(),
    departamento: String(departamento || '').trim(),
    modelo: String(modelo || '').trim(),
    serialNumber: String(serialNumber || '').trim(),
    serviceTag: String(serviceTag || '').trim(),
    chaveAtivacao: String(chaveAtivacao || '').trim(),
    emailAtivacao: String(emailAtivacao || '').trim(),
    observacao: obsFinal
  };
}

// Determinar tipo de licença inteligente
function inferirTipoLicenca(chave, email, obs) {
  const chaveUpper = (chave || '').toUpperCase();
  const texto = `${chave} ${email} ${obs}`.toLowerCase();

  if (texto.includes('office') || texto.includes('m365') || texto.includes('365') || texto.includes('word') || texto.includes('excel')) {
    return 'Microsoft 365 / Office';
  }
  if (texto.includes('windows') || chaveUpper.includes('WIN') || chaveUpper.split('-').length === 5) {
    return 'Windows 11 / 10 Pro';
  }
  if (texto.includes('antivirus') || texto.includes('eset') || texto.includes('kaspersky') || texto.includes('defender')) {
    return 'Antivírus Endpoint';
  }
  if (texto.includes('cad') || texto.includes('autodesk')) {
    return 'Autodesk AutoCAD';
  }
  return 'Licença de Software Corporativo';
}

// Função central de inserção no banco
async function processarEInserirLinhas(linhasFormatadas, defaultLicenseType = '') {
  let computadoresInseridos = 0;
  let licencasInseridas = 0;
  let linhasVazias = 0;
  const detalhes = [];

  for (let i = 0; i < linhasFormatadas.length; i++) {
    const item = linhasFormatadas[i];
    const linhaNumero = item.linhaExcel || (i + 2);

    // Verificar se linha é totalmente vazia
    if (!item.colaborador && !item.modelo && !item.serialNumber && !item.serviceTag && !item.chaveAtivacao) {
      linhasVazias++;
      continue;
    }

    // Gerar Hostname / Nome da Máquina limpo
    let nomeMaquina = '';
    if (item.serviceTag) {
      nomeMaquina = `DESK-${item.serviceTag.toUpperCase().replace(/\s+/g, '')}`;
    } else if (item.serialNumber) {
      nomeMaquina = `DESK-${item.serialNumber.toUpperCase().replace(/\s+/g, '')}`;
    } else if (item.colaborador) {
      const primeiroNome = item.colaborador.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      nomeMaquina = `DESK-${primeiroNome}-${linhaNumero}`;
    } else {
      nomeMaquina = `DESK-MAQ-${linhaNumero}`;
    }
    nomeMaquina = nomeMaquina.substring(0, 45);

    // Inserir Computador
    const [compResult] = await pool.query(
      `INSERT INTO computadores 
      (colaborador, departamento, modelo, serialNumbner, serviceTag, observacao, backup, dataultimoBackup, nomeMaquina, status)
      VALUES (?, ?, ?, ?, ?, ?, 'NAO', NULL, ?, 'Ativo')`,
      [
        item.colaborador || '',
        item.departamento || '',
        item.modelo || '',
        item.serialNumber || '',
        item.serviceTag || '',
        item.observacao || '',
        nomeMaquina
      ]
    );

    const idComputadorInserido = compResult.insertId;
    computadoresInseridos++;

    // Verificar se a célula Chave de Ativação tem informação
    let licencaCriada = null;
    const chave = (item.chaveAtivacao || '').trim();
    if (chave !== '') {
      const tipo = defaultLicenseType || inferirTipoLicenca(chave, item.emailAtivacao, item.observacao);
      const email = (item.emailAtivacao || '').trim();

      const [licResult] = await pool.query(
        `INSERT INTO inventarioLicencas (chaveAtivacao, emailAtivacao, idComputador, tipoLicenca)
        VALUES (?, ?, ?, ?)`,
        [chave, email, idComputadorInserido, tipo]
      );

      licencasInseridas++;
      licencaCriada = {
        id: licResult.insertId,
        tipo,
        chave
      };
    }

    detalhes.push({
      linha: linhaNumero,
      computadorId: idComputadorInserido,
      nomeMaquina,
      colaborador: item.colaborador,
      licencaCriada
    });
  }

  return {
    computadoresInseridos,
    licencasInseridas,
    linhasVazias,
    totalProcessadas: linhasFormatadas.length,
    detalhes
  };
}

// POST /api/computadores/previa-planilha - Ler arquivo e retornar prévia das linhas 2 a 122 sem salvar ainda
router.post('/previa-planilha', upload.single('planilha'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const startRow = parseInt(req.body.startRow || '2', 10);
    const endRow = parseInt(req.body.endRow || '122', 10);

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Ler como array 2D para respeitar as linhas exatas 2 até 122
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      return res.status(400).json({ success: false, message: 'A planilha precisa ter um cabeçalho na linha 1 e dados a partir da linha 2.' });
    }

    const headers = rawData[0];
    const previewRows = [];

    // Linha 2 do Excel é índice 1 do array; Linha 122 do Excel é índice 121
    const idxInicio = Math.max(1, startRow - 1);
    const idxFim = Math.min(rawData.length - 1, endRow - 1);

    for (let r = idxInicio; r <= idxFim; r++) {
      const row = rawData[r];
      const dadosExtraidos = extrairDadosLinhaPlanilha(row);
      dadosExtraidos.linhaExcel = r + 1; // número real da linha no Excel
      dadosExtraidos.temLicenca = !!dadosExtraidos.chaveAtivacao;
      dadosExtraidos.isVazia = !dadosExtraidos.colaborador && !dadosExtraidos.modelo && !dadosExtraidos.serialNumber && !dadosExtraidos.serviceTag && !dadosExtraidos.chaveAtivacao;
      
      previewRows.push(dadosExtraidos);
    }

    res.json({
      success: true,
      nomeArquivo: req.file.originalname,
      totalLinhasPlanilha: rawData.length,
      faixaLinhas: { inicio: startRow, fim: Math.min(endRow, rawData.length) },
      headers,
      preview: previewRows,
      resumo: {
        totalNaFaixa: previewRows.length,
        computadoresValidos: previewRows.filter(p => !p.isVazia).length,
        licencasParaVincular: previewRows.filter(p => !p.isVazia && p.temLicenca).length,
        linhasVazias: previewRows.filter(p => p.isVazia).length
      }
    });
  } catch (error) {
    console.error('Erro ao ler prévia da planilha:', error);
    res.status(500).json({ success: false, message: 'Erro ao analisar a planilha: ' + error.message });
  }
});

// POST /api/computadores/importar - Importar lista estruturada de linhas
router.post('/importar', async (req, res) => {
  try {
    const { rows, defaultLicenseType } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma linha fornecida para importação.' });
    }

    const resultado = await processarEInserirLinhas(rows, defaultLicenseType);

    res.status(201).json({
      success: true,
      message: `Importação realizada com sucesso! ${resultado.computadoresInseridos} computadores cadastrados e ${resultado.licencasInseridas} licenças vinculadas.`,
      data: resultado
    });
  } catch (error) {
    console.error('Erro na importação de computadores:', error);
    res.status(500).json({ success: false, message: 'Erro ao importar dados para o banco: ' + error.message });
  }
});

// POST /api/computadores/importar-arquivo - Importar diretamente via upload de arquivo
router.post('/importar-arquivo', upload.single('planilha'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const startRow = parseInt(req.body.startRow || '2', 10);
    const endRow = parseInt(req.body.endRow || '122', 10);
    const defaultLicenseType = req.body.defaultLicenseType || '';

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      return res.status(400).json({ success: false, message: 'A planilha não possui dados suficientes a partir da linha 2.' });
    }

    const idxInicio = Math.max(1, startRow - 1);
    const idxFim = Math.min(rawData.length - 1, endRow - 1);
    const rowsToProcess = [];

    for (let r = idxInicio; r <= idxFim; r++) {
      const row = rawData[r];
      const dados = extrairDadosLinhaPlanilha(row);
      dados.linhaExcel = r + 1;
      rowsToProcess.push(dados);
    }

    const resultado = await processarEInserirLinhas(rowsToProcess, defaultLicenseType);

    res.status(201).json({
      success: true,
      message: `Planilha importada com sucesso! ${resultado.computadoresInseridos} computadores e ${resultado.licencasInseridas} licenças foram inseridos no banco.`,
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao importar arquivo de planilha:', error);
    res.status(500).json({ success: false, message: 'Erro ao importar planilha: ' + error.message });
  }
});

module.exports = router;
