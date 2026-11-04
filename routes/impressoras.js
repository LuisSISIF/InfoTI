const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../config/database');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

/**
 * Extrai Modelo, IP e Serial Number a partir do texto combinado da coluna EQUIPAMENTO.
 * Suporta qualquer ordem (Modelo-IP-Serial, Modelo-Serial-IP, IP-Modelo-Serial),
 * múltiplos delimitadores ( - , – , — , / , | , quebra de linha),
 * e prefixos opcionais (IP:, SN:, S/N:, Serial:, Modelo:).
 */
function extrairEquipamento(rawEquip) {
  if (!rawEquip) return { modelo: '', ip: '', serialNumber: '' };

  let text = String(rawEquip).trim();
  if (!text) return { modelo: '', ip: '', serialNumber: '' };

  // 1. Encontrar o endereço IP (IPv4 padrão)
  let ip = '';
  const ipRegex = /\b((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/;
  const ipMatch = text.match(ipRegex);

  let resto = text;
  if (ipMatch) {
    ip = ipMatch[1];
    // Substitui o IP e possíveis prefixos (ex: 'IP:', 'IP -', 'IP: ') por um marcador neutro ' || '
    resto = text.replace(new RegExp('(?:\\bIP\\s*[:=-]?\\s*)?' + ip.replace(/\\./g, '\\.') + '(?:\\s*[:=-]?\\s*)?', 'i'), ' || ');
  }

  // 2. Dividir o resto em partes usando delimitadores comuns: '||', ' - ', ' – ', ' — ', ' / ', '|', quebra de linha
  let partes = resto
    .split(/(?:\s*\|\|\s*|\s+[-–—/|]\s+|\r?\n|\t|;\s*)/)
    .map(p => p.trim())
    .map(p => p.replace(/^[-–—/:|_,\s]+|[-–—/:|_,\s]+$/g, '').trim())
    .filter(Boolean);

  let modelo = '';
  let serialNumber = '';

  // Identificar se alguma parte tem prefixo explícito de Serial (ex: 'S/N:', 'Serial:', 'SN:')
  const serialPrefixRegex = /^(?:S\/?N|SERIAL|N\/?S|SERIE|TAG)\s*[:=-]?\s*(.*)$/i;
  // Identificar se alguma parte tem prefixo explícito de Modelo (ex: 'MOD:', 'MODELO:')
  const modeloPrefixRegex = /^(?:MOD(?:ELO)?)\s*[:=-]?\s*(.*)$/i;

  const partesNaoIdentificadas = [];

  for (const parte of partes) {
    const sMatch = parte.match(serialPrefixRegex);
    const mMatch = parte.match(modeloPrefixRegex);

    if (sMatch && !serialNumber) {
      serialNumber = sMatch[1].trim();
    } else if (mMatch && !modelo) {
      modelo = mMatch[1].trim();
    } else {
      partesNaoIdentificadas.push(parte);
    }
  }

  if (partesNaoIdentificadas.length === 1) {
    if (!modelo) {
      modelo = partesNaoIdentificadas[0];
    } else if (!serialNumber) {
      serialNumber = partesNaoIdentificadas[0];
    }
  } else if (partesNaoIdentificadas.length >= 2) {
    const p1 = partesNaoIdentificadas[0];
    const p2 = partesNaoIdentificadas[1];

    // Checar marcas comuns de impressora no p1 ou p2
    const marcasRegex = /\b(brother|canon|hp|epson|kyocera|samsung|zebra|ricoh|lexmark|xerox|dcp|mfc|ecotank|laserjet|deskjet|ecosys|pagewide|laser)\b/i;
    const p1TemMarca = marcasRegex.test(p1);
    const p2TemMarca = marcasRegex.test(p2);

    // Checar se p2 ou p1 parece ser serial (geralmente sem espaço, alfanumérico)
    const p2PareceSerial = /^[A-Z0-9]{5,}$/i.test(p2);
    const p1PareceSerial = /^[A-Z0-9]{5,}$/i.test(p1);

    if (!modelo && !serialNumber) {
      if (p1TemMarca && !p2TemMarca) {
        modelo = p1;
        serialNumber = p2;
      } else if (!p1TemMarca && p2TemMarca) {
        modelo = p2;
        serialNumber = p1;
      } else if (p2PareceSerial && !p1PareceSerial) {
        modelo = p1;
        serialNumber = p2;
      } else if (p1PareceSerial && !p2PareceSerial) {
        modelo = p2;
        serialNumber = p1;
      } else {
        modelo = p1;
        serialNumber = p2;
      }
    } else if (!modelo) {
      modelo = partesNaoIdentificadas.join(' - ');
    } else if (!serialNumber) {
      serialNumber = partesNaoIdentificadas.join(' - ');
    }
  }

  return {
    modelo: modelo.trim(),
    ip: ip.trim(),
    serialNumber: serialNumber.trim()
  };
}

function parseValorNumerico(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function parseRateio(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'string') {
    const clean = val.replace('%', '').trim().replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  if (typeof val === 'number') {
    if (val > 0 && val <= 1) return Number((val * 100).toFixed(2));
    return val;
  }
  return 0;
}

function extrairDadosLinhaImpressora(rawRow) {
  let departamento = '';
  let rawEquipamento = '';
  let valorUn = 0;
  let centroDeCusto = '';
  let porcentRateio = 0;
  let observacao = '';

  if (Array.isArray(rawRow)) {
    // Mapeamento das colunas da planilha:
    // A (0) - DEPARTAMENTO
    // B (1) - EQUIPAMENTO (modelo - ip - serial)
    // C (2) - Nº Anterior (IGNORAR)
    // D (3) - Nº Final (IGNORAR)
    // E (4) - TOTAL (IGNORAR)
    // F (5) - VALOR UN.
    // G (6) - VALOR TOTAL (IGNORAR)
    // H (7) - CENTRO DE CUSTO
    // I (8) - % RATEIO
    // J (9) - (IGNORAR)
    // K (10) - OBSERVAÇÕES
    departamento = String(rawRow[0] || '').trim();
    rawEquipamento = String(rawRow[1] || '').trim();
    valorUn = parseValorNumerico(rawRow[5]);
    centroDeCusto = String(rawRow[7] || '').trim();
    porcentRateio = parseRateio(rawRow[8]);
    observacao = String(rawRow[10] || '').trim();
  } else if (typeof rawRow === 'object' && rawRow !== null) {
    for (const key of Object.keys(rawRow)) {
      const val = rawRow[key];
      const strVal = String(val || '').trim();
      const normKey = key.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      if (normKey.includes('depto') || normKey.includes('departamento') || normKey.includes('setor')) {
        departamento = departamento || strVal;
      } else if (normKey.includes('equipamento') || normKey.includes('impressora') || normKey.includes('modelo')) {
        rawEquipamento = rawEquipamento || strVal;
      } else if (normKey.includes('valorun') || normKey.includes('custoun') || normKey === 'vlrun' || normKey === 'valor') {
        valorUn = valorUn || parseValorNumerico(val);
      } else if (normKey.includes('centrocusto') || normKey.includes('ccusto') || normKey === 'cc') {
        centroDeCusto = centroDeCusto || strVal;
      } else if (normKey.includes('rateio') || normKey.includes('porcentrateio')) {
        porcentRateio = porcentRateio || parseRateio(val);
      } else if (normKey.includes('observacao') || normKey.includes('observacoes') || normKey === 'obs') {
        observacao = observacao || strVal;
      }
    }
  }

  const { modelo, ip, serialNumber } = extrairEquipamento(rawEquipamento);

  const isVazia = !departamento && !rawEquipamento && !centroDeCusto && !observacao;

  return {
    departamento,
    equipamentoOriginal: rawEquipamento,
    modelo,
    ip,
    serialNumber,
    valorUn,
    centroDeCusto,
    porcentRateio,
    observacao,
    isVazia
  };
}

async function processarEInserirImpressoras(linhasFormatadas, statusPadrao = 'Ativo') {
  let impressorasInseridas = 0;
  let linhasVazias = 0;
  const detalhes = [];

  for (let i = 0; i < linhasFormatadas.length; i++) {
    const item = linhasFormatadas[i];
    const linhaNumero = item.linhaExcel || (i + 2);

    if (item.isVazia || (!item.departamento && !item.modelo && !item.ip && !item.serialNumber)) {
      linhasVazias++;
      continue;
    }

    let rateioNum = parseFloat(item.porcentRateio);
    if (isNaN(rateioNum)) rateioNum = 0.0;
    if (rateioNum < 0) rateioNum = 0;
    if (rateioNum > 100) rateioNum = 100;

    let valorUnNum = parseFloat(item.valorUn);
    if (isNaN(valorUnNum)) valorUnNum = 0.0;

    const modeloFinal = item.modelo || item.equipamentoOriginal || 'Impressora';
    const statusFinal = item.status || statusPadrao || 'Ativo';

    const [result] = await pool.query(
      `INSERT INTO impressoras 
      (departamento, modelo, serialNumber, ip, valorUn, centroDeCusto, porcentRateio, observacao, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.departamento || '',
        modeloFinal,
        item.serialNumber || '',
        item.ip || '',
        valorUnNum.toFixed(2),
        item.centroDeCusto || '',
        rateioNum.toFixed(2),
        item.observacao || '',
        statusFinal
      ]
    );

    impressorasInseridas++;
    detalhes.push({
      linha: linhaNumero,
      id: result.insertId,
      departamento: item.departamento,
      modelo: modeloFinal,
      ip: item.ip,
      serialNumber: item.serialNumber
    });
  }

  return {
    impressorasInseridas,
    linhasVazias,
    totalProcessadas: linhasFormatadas.length,
    detalhes
  };
}

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

// POST /api/impressoras/previa-planilha - Ler arquivo e retornar prévia estruturada
router.post('/previa-planilha', upload.single('planilha'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const startRow = parseInt(req.body.startRow || '2', 10);
    const endRow = req.body.endRow ? parseInt(req.body.endRow, 10) : null;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'A planilha precisa ter um cabeçalho na linha 1 e dados a partir da linha 2.'
      });
    }

    const headers = rawData[0];
    const previewRows = [];

    const idxInicio = Math.max(1, startRow - 1);
    const idxFim = endRow ? Math.min(rawData.length - 1, endRow - 1) : rawData.length - 1;

    for (let r = idxInicio; r <= idxFim; r++) {
      const row = rawData[r];
      const dadosExtraidos = extrairDadosLinhaImpressora(row);
      dadosExtraidos.linhaExcel = r + 1;
      previewRows.push(dadosExtraidos);
    }

    const validas = previewRows.filter(p => !p.isVazia);

    res.json({
      success: true,
      nomeArquivo: req.file.originalname,
      totalLinhasPlanilha: rawData.length,
      faixaLinhas: { inicio: startRow, fim: idxFim + 1 },
      headers,
      preview: previewRows,
      resumo: {
        totalNaFaixa: previewRows.length,
        impressorasValidas: validas.length,
        comIp: validas.filter(p => !!p.ip).length,
        comSerial: validas.filter(p => !!p.serialNumber).length,
        linhasVazias: previewRows.filter(p => p.isVazia).length
      }
    });
  } catch (error) {
    console.error('Erro ao ler prévia da planilha de impressoras:', error);
    res.status(500).json({ success: false, message: 'Erro ao analisar a planilha: ' + error.message });
  }
});

// POST /api/impressoras/importar - Importar lista estruturada de linhas
router.post('/importar', async (req, res) => {
  try {
    const { rows, statusPadrao } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma linha fornecida para importação.' });
    }

    const resultado = await processarEInserirImpressoras(rows, statusPadrao);

    res.status(201).json({
      success: true,
      message: `Importação realizada com sucesso! ${resultado.impressorasInseridas} impressoras cadastradas no banco de dados.`,
      data: resultado
    });
  } catch (error) {
    console.error('Erro na importação de impressoras:', error);
    res.status(500).json({ success: false, message: 'Erro ao importar dados para o banco: ' + error.message });
  }
});

// POST /api/impressoras/importar-arquivo - Importar diretamente via arquivo
router.post('/importar-arquivo', upload.single('planilha'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const startRow = parseInt(req.body.startRow || '2', 10);
    const endRow = req.body.endRow ? parseInt(req.body.endRow, 10) : null;
    const statusPadrao = req.body.statusPadrao || 'Ativo';

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      return res.status(400).json({ success: false, message: 'A planilha não possui dados suficientes.' });
    }

    const idxInicio = Math.max(1, startRow - 1);
    const idxFim = endRow ? Math.min(rawData.length - 1, endRow - 1) : rawData.length - 1;
    const rowsToProcess = [];

    for (let r = idxInicio; r <= idxFim; r++) {
      const row = rawData[r];
      const dados = extrairDadosLinhaImpressora(row);
      dados.linhaExcel = r + 1;
      rowsToProcess.push(dados);
    }

    const resultado = await processarEInserirImpressoras(rowsToProcess, statusPadrao);

    res.status(201).json({
      success: true,
      message: `Planilha importada com sucesso! ${resultado.impressorasInseridas} impressoras cadastradas.`,
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao importar arquivo de planilha de impressoras:', error);
    res.status(500).json({ success: false, message: 'Erro ao importar planilha: ' + error.message });
  }
});

module.exports = router;
