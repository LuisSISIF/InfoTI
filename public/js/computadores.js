/**
 * InfoTI - Módulo de Controle de Máquinas (Computadores)
 * Dashboard KPI, filtros, listagem e CRUD completo
 */

let computadoresCache = [];
let timerBuscaComp = null;

/**
 * Carrega computadores e atualiza os indicadores do dashboard
 */
async function carregarComputadores() {
  await Promise.all([
    carregarDashboardComputadores(),
    listarComputadores()
  ]);
}

/**
 * Atualiza os cards superiores do dashboard de computadores
 */
async function carregarDashboardComputadores() {
  try {
    const res = await fetch('/api/computadores/stats');
    const data = await res.json();

    if (data.success) {
      const stats = data.data;

      const totalEl = document.getElementById('dash-comp-total');
      const backupOkEl = document.getElementById('dash-comp-backup-ok');
      const backupPctEl = document.getElementById('dash-comp-backup-pct');
      const backupBarEl = document.getElementById('dash-comp-backup-bar');
      const ativosEl = document.getElementById('dash-comp-ativos');
      const defeitoEl = document.getElementById('dash-comp-defeito');
      const reservaEl = document.getElementById('dash-comp-reserva');

      if (totalEl) totalEl.textContent = stats.total;
      if (backupOkEl) backupOkEl.textContent = stats.backupOk;
      if (backupPctEl) backupPctEl.textContent = `${stats.backupPorcentagem}%`;
      if (backupBarEl) backupBarEl.style.width = `${stats.backupPorcentagem}%`;
      if (ativosEl) ativosEl.textContent = stats.ativos;
      if (defeitoEl) defeitoEl.textContent = stats.defeito;
      if (reservaEl) reservaEl.textContent = stats.reserva;
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard de computadores:', error);
  }
}

/**
 * Carrega a tabela de computadores com filtros aplicados
 */
async function listarComputadores() {
  const busca = document.getElementById('filtro-comp-busca')?.value || '';
  const depto = document.getElementById('filtro-comp-depto')?.value || 'Todos';
  const backup = document.getElementById('filtro-comp-backup')?.value || 'Todos';
  const status = document.getElementById('filtro-comp-status')?.value || 'Todos';

  const tbody = document.getElementById('tabela-computadores-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando estações de trabalho...
        </td>
      </tr>
    `;
  }

  try {
    const params = new URLSearchParams();
    if (busca) params.append('search', busca);
    if (depto && depto !== 'Todos') params.append('departamento', depto);
    if (backup && backup !== 'Todos') params.append('backup', backup);
    if (status && status !== 'Todos') params.append('status', status);

    const res = await fetch(`/api/computadores?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      computadoresCache = data.data;
      renderizarTabelaComputadores(computadoresCache);
      atualizarFiltroDepartamentosComp(computadoresCache);
    } else {
      showToast('Erro ao listar computadores: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao buscar computadores:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
}

/**
 * Renderiza a lista de computadores na tabela
 */
function renderizarTabelaComputadores(lista) {
  const tbody = document.getElementById('tabela-computadores-body');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-8 text-gray-400">
          <i class="fa-solid fa-desktop text-2xl text-gray-600 mb-2 block"></i>
          Nenhum computador encontrado com os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(comp => {
    // Status Badge
    let statusBadge = 'badge-ativo';
    if (comp.status === 'Defeito') statusBadge = 'badge-defeito';
    if (comp.status === 'Reserva') statusBadge = 'badge-reserva';

    // Backup Badge
    const backupIsOk = comp.backup === 'SIM';
    const backupBadge = backupIsOk ? 'badge-backup-sim' : 'badge-backup-nao';

    return `
      <tr class="hover:bg-gray-800/40 transition-colors">
        <td class="font-mono text-xs text-gray-400">#${comp.id}</td>
        <td>
          <div class="font-bold text-white text-xs font-mono flex items-center gap-1.5">
            <i class="fa-solid fa-computer text-emerald-400"></i>
            ${escapeHtml(comp.nomeMaquina || 'Sem Nome')}
          </div>
          <div class="text-xs text-gray-300 mt-0.5">${escapeHtml(comp.colaborador || 'Não atribuído')}</div>
        </td>
        <td class="text-xs text-gray-300 font-medium">${escapeHtml(comp.departamento || '-')}</td>
        <td class="text-xs text-gray-200">${escapeHtml(comp.modelo || '-')}</td>
        <td>
          <div class="text-[11px] font-mono text-gray-400">
            ${comp.serialNumbner ? `<span title="Serial Number"><i class="fa-solid fa-barcode text-gray-500 mr-1"></i>${escapeHtml(comp.serialNumbner)}</span>` : ''}
          </div>
          ${comp.serviceTag ? `
            <div class="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40 cursor-pointer hover:bg-cyan-900/40" onclick="copiarTexto('${comp.serviceTag}', 'Service Tag')" title="Clique para copiar Service Tag">
              <i class="fa-solid fa-tag text-[9px]"></i>
              ${escapeHtml(comp.serviceTag)}
            </div>
          ` : '<span class="text-gray-600 text-xs">-</span>'}
        </td>
        <td>
          <span class="badge-status ${backupBadge}">
            <i class="fa-solid ${backupIsOk ? 'fa-check' : 'fa-xmark'} text-[10px]"></i>
            ${backupIsOk ? 'OK' : 'PENDENTE'}
          </span>
        </td>
        <td class="font-mono text-xs ${backupIsOk ? 'text-gray-300' : 'text-rose-400 font-semibold'}">
          ${formatarDataBR(comp.dataultimoBackup)}
        </td>
        <td>
          <span class="badge-status ${statusBadge}">
            <span class="h-1.5 w-1.5 rounded-full ${comp.status === 'Ativo' ? 'bg-emerald-400' : comp.status === 'Defeito' ? 'bg-rose-400' : 'bg-amber-400'}"></span>
            ${comp.status}
          </span>
        </td>
        <td class="text-xs text-gray-400 max-w-[160px] truncate" title="${escapeHtml(comp.observacao || '')}">
          ${escapeHtml(comp.observacao || '-')}
        </td>
        <td class="text-right">
          <div class="inline-flex items-center gap-1">
            <button onclick="editarComputador(${comp.id})" title="Editar Computador" class="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="excluirComputador(${comp.id}, '${escapeHtml(comp.nomeMaquina || comp.colaborador)}')" title="Excluir Computador" class="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Atualiza o dropdown de departamentos
 */
function atualizarFiltroDepartamentosComp(lista) {
  const select = document.getElementById('filtro-comp-depto');
  if (!select) return;

  const atual = select.value;
  const deptos = Array.from(new Set(lista.map(c => c.departamento).filter(Boolean))).sort();

  select.innerHTML = '<option value="Todos">Todos os Departamentos</option>' +
    deptos.map(d => `<option value="${escapeHtml(d)}" ${d === atual ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

/**
 * Debounce de pesquisa
 */
function debounceFiltrarComputadores() {
  clearTimeout(timerBuscaComp);
  timerBuscaComp = setTimeout(listarComputadores, 300);
}

/**
 * Modal Adicionar Computador
 */
function openModalComputador() {
  document.getElementById('modal-computador-titulo').innerHTML = '<i class="fa-solid fa-desktop text-emerald-400"></i> Adicionar Computador';
  document.getElementById('form-computador').reset();
  document.getElementById('comp-id').value = '';
  document.getElementById('comp-backup').value = 'SIM';
  document.getElementById('comp-dataBackup').value = new Date().toISOString().split('T')[0];
  document.getElementById('comp-status').value = 'Ativo';
  openModal('modal-computador');
}

/**
 * Carrega dados para edição de computador
 */
function editarComputador(id) {
  const comp = computadoresCache.find(c => c.id === id);
  if (!comp) return;

  document.getElementById('modal-computador-titulo').innerHTML = `<i class="fa-solid fa-pen text-cyan-400"></i> Editar Computador #${comp.id}`;
  document.getElementById('comp-id').value = comp.id;
  document.getElementById('comp-nomeMaquina').value = comp.nomeMaquina || '';
  document.getElementById('comp-colaborador').value = comp.colaborador || '';
  document.getElementById('comp-departamento').value = comp.departamento || '';
  document.getElementById('comp-modelo').value = comp.modelo || '';
  document.getElementById('comp-serial').value = comp.serialNumbner || '';
  document.getElementById('comp-serviceTag').value = comp.serviceTag || '';
  document.getElementById('comp-backup').value = comp.backup || 'SIM';
  document.getElementById('comp-dataBackup').value = comp.dataultimoBackup ? comp.dataultimoBackup.split('T')[0] : '';
  document.getElementById('comp-status').value = comp.status || 'Ativo';
  document.getElementById('comp-observacao').value = comp.observacao || '';

  openModal('modal-computador');
}

/**
 * Salva computador (POST ou PUT)
 */
async function salvarComputador(event) {
  event.preventDefault();

  const id = document.getElementById('comp-id').value;
  const nomeMaquina = document.getElementById('comp-nomeMaquina').value.trim();
  const colaborador = document.getElementById('comp-colaborador').value.trim();
  const departamento = document.getElementById('comp-departamento').value.trim();
  const modelo = document.getElementById('comp-modelo').value.trim();
  const serialNumbner = document.getElementById('comp-serial').value.trim();
  const serviceTag = document.getElementById('comp-serviceTag').value.trim();
  const backup = document.getElementById('comp-backup').value;
  const dataultimoBackup = document.getElementById('comp-dataBackup').value || null;
  const status = document.getElementById('comp-status').value;
  const observacao = document.getElementById('comp-observacao').value.trim();

  const payload = {
    nomeMaquina,
    colaborador,
    departamento,
    modelo,
    serialNumbner,
    serviceTag,
    backup,
    dataultimoBackup,
    status,
    observacao
  };

  const btnSalvar = document.getElementById('btn-salvar-computador');
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

  try {
    const url = id ? `/api/computadores/${id}` : '/api/computadores';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-computador');
      carregarComputadores();
      carregarDashboardGeral();
    } else {
      showToast('Erro: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar computador:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Computador';
  }
}

/**
 * Exclui computador com confirmação
 */
function excluirComputador(id, nomeOuUser) {
  pedirConfirmacaoExclusao(`Deseja realmente excluir a máquina "${nomeOuUser}" (ID #${id})? Certifique-se de que não haja licenças vinculadas a ela.`, async () => {
    try {
      const res = await fetch(`/api/computadores/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        carregarComputadores();
        carregarDashboardGeral();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) {
      showToast('Erro ao comunicar com o servidor', 'error');
    }
  });
}

/**
 * =========================================================================
 * MÓDULO DE IMPORTAÇÃO DE PLANILHA (LINHAS 2 A 122 COM VÍNCULO DE LICENÇAS)
 * =========================================================================
 */

let linhasParaImportar = [];
let arquivoPlanilhaAtual = null;

/**
 * Abre o modal de importação de planilha
 */
function openModalImportarPlanilha() {
  resetarArquivoPlanilha();
  document.getElementById('import-linha-inicio').value = '2';
  document.getElementById('import-linha-fim').value = '122';
  setupDragAndDropPlanilha();
  openModal('modal-importar-planilha');
}

/**
 * Configura eventos de arrastar e soltar (Drag and Drop)
 */
function setupDragAndDropPlanilha() {
  const dropArea = document.getElementById('drop-area-planilha');
  const inputArquivo = document.getElementById('input-arquivo-planilha');
  if (!dropArea || dropArea.dataset.configured === 'true') return;

  dropArea.dataset.configured = 'true';

  dropArea.onclick = (e) => {
    if (e.target.closest('#upload-file-info')) return;
    inputArquivo.click();
  };

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add('border-cyan-400', 'bg-cyan-950/20');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove('border-cyan-400', 'bg-cyan-950/20');
    }, false);
  });

  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      analisarArquivoPlanilha(files[0]);
    }
  }, false);
}

/**
 * Trata seleção de arquivo via input
 */
function processarArquivoSelecionado(event) {
  const file = event.target.files[0];
  if (file) {
    analisarArquivoPlanilha(file);
  }
}

/**
 * Reseta o estado do modal para novo arquivo
 */
function resetarArquivoPlanilha(event) {
  if (event) event.stopPropagation();

  arquivoPlanilhaAtual = null;
  linhasParaImportar = [];

  const inputArquivo = document.getElementById('input-arquivo-planilha');
  if (inputArquivo) inputArquivo.value = '';

  const placeholder = document.getElementById('upload-placeholder');
  const fileInfo = document.getElementById('upload-file-info');
  const summaryCards = document.getElementById('import-summary-cards');
  const previewContainer = document.getElementById('import-preview-container');
  const btnExec = document.getElementById('btn-executar-importacao');
  const progressArea = document.getElementById('import-progress-area');

  if (placeholder) placeholder.classList.remove('hidden');
  if (fileInfo) fileInfo.classList.add('hidden');
  if (summaryCards) summaryCards.classList.add('hidden');
  if (previewContainer) previewContainer.classList.add('hidden');
  if (progressArea) progressArea.classList.add('hidden');
  if (btnExec) btnExec.disabled = true;
}

/**
 * Lê e analisa a planilha no cliente ou via API
 */
async function analisarArquivoPlanilha(file) {
  arquivoPlanilhaAtual = file;

  // Atualizar badge do arquivo
  document.getElementById('upload-placeholder').classList.add('hidden');
  const fileInfo = document.getElementById('upload-file-info');
  fileInfo.classList.remove('hidden');
  document.getElementById('label-nome-arquivo').textContent = file.name;
  document.getElementById('label-tamanho-arquivo').textContent = `${(file.size / 1024).toFixed(1)} KB`;

  const startRow = parseInt(document.getElementById('import-linha-inicio').value || '2', 10);
  const endRow = parseInt(document.getElementById('import-linha-fim').value || '122', 10);

  // Tentar análise rápida no frontend se SheetJS estiver carregado
  if (typeof XLSX !== 'undefined') {
    try {
      const reader = new FileReader();
      reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        processarLinhasClientSide(rawRows, startRow, endRow);
      };
      reader.readAsArrayBuffer(file);
      return;
    } catch (err) {
      console.warn('Falha na leitura local com SheetJS, usando backend:', err);
    }
  }

  // Fallback: enviar para o backend analisar
  try {
    const formData = new FormData();
    formData.append('planilha', file);
    formData.append('startRow', startRow);
    formData.append('endRow', endRow);

    const res = await fetch('/api/computadores/previa-planilha', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      linhasParaImportar = data.preview;
      renderizarPreviaImportacao(data.preview, data.resumo);
    } else {
      showToast('Erro ao processar planilha: ' + data.message, 'error');
    }
  } catch (e) {
    showToast('Falha na comunicação ao analisar planilha', 'error');
  }
}

/**
 * Processamento dos dados no frontend via SheetJS
 */
function processarLinhasClientSide(rawRows, startRow, endRow) {
  if (rawRows.length < 2) {
    showToast('A planilha precisa ter um cabeçalho na linha 1 e dados a partir da linha 2.', 'warning');
    return;
  }

  const idxInicio = Math.max(1, startRow - 1);
  const idxFim = Math.min(rawRows.length - 1, endRow - 1);

  linhasParaImportar = [];
  let computadoresValidos = 0;
  let licencasParaVincular = 0;
  let linhasVazias = 0;

  for (let r = idxInicio; r <= idxFim; r++) {
    const row = rawRows[r];
    const item = {
      linhaExcel: r + 1,
      colaborador: String(row[0] || '').trim(),
      departamento: String(row[1] || '').trim(),
      modelo: String(row[2] || '').trim(),
      serialNumber: String(row[3] || '').trim(),
      serviceTag: String(row[4] || '').trim(),
      chaveAtivacao: String(row[5] || '').trim(),
      emailAtivacao: String(row[6] || '').trim(),
      observacao: String(row[7] || '').trim()
    };

    const histUso = String(row[9] || row[8] || '').trim();
    if (histUso) {
      item.observacao = item.observacao ? `${item.observacao} | Histórico: ${histUso}` : `Histórico: ${histUso}`;
    }

    item.isVazia = !item.colaborador && !item.modelo && !item.serialNumber && !item.serviceTag && !item.chaveAtivacao;
    item.temLicenca = !!item.chaveAtivacao;

    if (item.isVazia) {
      linhasVazias++;
    } else {
      computadoresValidos++;
      if (item.temLicenca) licencasParaVincular++;
    }

    linhasParaImportar.push(item);
  }

  renderizarPreviaImportacao(linhasParaImportar, {
    totalNaFaixa: linhasParaImportar.length,
    computadoresValidos,
    licencasParaVincular,
    linhasVazias
  });
}

/**
 * Renderiza os indicadores e a tabela de prévia
 */
function renderizarPreviaImportacao(previewRows, resumo) {
  const summaryCards = document.getElementById('import-summary-cards');
  const previewContainer = document.getElementById('import-preview-container');
  const tbody = document.getElementById('tabela-previa-importacao-body');
  const btnExec = document.getElementById('btn-executar-importacao');

  if (summaryCards) summaryCards.classList.remove('hidden');
  if (previewContainer) previewContainer.classList.remove('hidden');

  document.getElementById('prev-total-linhas').textContent = resumo.totalNaFaixa;
  document.getElementById('prev-total-comps').textContent = resumo.computadoresValidos;
  document.getElementById('prev-total-lics').textContent = resumo.licencasParaVincular;
  document.getElementById('prev-total-vazias').textContent = resumo.linhasVazias;

  document.getElementById('label-preview-mostrando').textContent = `Faixa de dados: ${previewRows.length} linhas analisadas`;

  if (btnExec) {
    btnExec.disabled = resumo.computadoresValidos === 0;
    btnExec.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Confirmar e Importar (${resumo.computadoresValidos} Computadores)`;
  }

  if (tbody) {
    tbody.innerHTML = previewRows.map(row => {
      if (row.isVazia) {
        return `
          <tr class="opacity-40 bg-gray-900/30">
            <td class="font-mono text-xs text-gray-500">L${row.linhaExcel}</td>
            <td colspan="7" class="text-xs text-gray-500 italic">Linha em branco (será ignorada)</td>
            <td><span class="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">IGNORAR</span></td>
          </tr>
        `;
      }

      const badgeAcao = row.temLicenca
        ? `<span class="badge-status badge-ativo text-[10px]"><i class="fa-solid fa-key mr-1"></i>PC + Licença</span>`
        : `<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]"><i class="fa-solid fa-desktop mr-1"></i>Apenas PC</span>`;

      return `
        <tr class="hover:bg-gray-800/40 text-xs">
          <td class="font-mono text-gray-400 font-semibold">L${row.linhaExcel}</td>
          <td class="font-medium text-white">${escapeHtml(row.colaborador || '-')}</td>
          <td class="text-gray-300">${escapeHtml(row.departamento || '-')}</td>
          <td class="text-gray-200">${escapeHtml(row.modelo || '-')}</td>
          <td class="font-mono text-[11px] text-gray-300">
            ${escapeHtml(row.serviceTag || row.serialNumber || '-')}
          </td>
          <td class="font-mono text-[11px] ${row.temLicenca ? 'text-purple-300 font-semibold' : 'text-gray-500'}">
            ${row.temLicenca ? mascararChave(row.chaveAtivacao) : '<span class="italic text-gray-600">Vazia</span>'}
          </td>
          <td class="text-gray-400 font-mono text-[11px]">${escapeHtml(row.emailAtivacao || '-')}</td>
          <td class="text-gray-400 max-w-[150px] truncate" title="${escapeHtml(row.observacao || '')}">
            ${escapeHtml(row.observacao || '-')}
          </td>
          <td>${badgeAcao}</td>
        </tr>
      `;
    }).join('');
  }
}

/**
 * Envia as linhas aprovadas para gravação no banco de dados
 */
async function executarImportacaoPlanilha() {
  if (linhasParaImportar.length === 0) {
    showToast('Nenhuma linha carregada para importar', 'warning');
    return;
  }

  const defaultLicenseType = document.getElementById('import-tipo-licenca').value;
  const btnExec = document.getElementById('btn-executar-importacao');
  const progressArea = document.getElementById('import-progress-area');
  const progressText = document.getElementById('import-progress-text');

  btnExec.disabled = true;
  progressArea.classList.remove('hidden');
  progressText.textContent = `Gravando dados das linhas no banco MySQL...`;

  try {
    const res = await fetch('/api/computadores/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: linhasParaImportar,
        defaultLicenseType
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-importar-planilha');
      
      // Atualizar todas as telas afetadas
      carregarComputadores();
      carregarLicencas();
      carregarDashboardGeral();
    } else {
      showToast('Erro na importação: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao executar importação:', error);
    showToast('Erro na conexão com o servidor', 'error');
  } finally {
    btnExec.disabled = false;
    progressArea.classList.add('hidden');
  }
}
