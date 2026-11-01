/**
 * InfoTI - Módulo de Controle de Impressoras
 * CRUD de impressoras, cálculo de rateio e contagem mensal de páginas
 */

let impressorasCache = [];
let contagemLatestCache = {};
let timerBuscaImp = null;

/**
 * Carrega a lista de impressoras do backend
 */
async function carregarImpressoras() {
  const busca = document.getElementById('filtro-imp-busca')?.value || '';
  const depto = document.getElementById('filtro-imp-depto')?.value || 'Todos';
  const status = document.getElementById('filtro-imp-status')?.value || 'Todos';

  const tbody = document.getElementById('tabela-impressoras-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando impressoras cadastradas...
        </td>
      </tr>
    `;
  }

  try {
    const params = new URLSearchParams();
    if (busca) params.append('search', busca);
    if (depto && depto !== 'Todos') params.append('departamento', depto);
    if (status && status !== 'Todos') params.append('status', status);

    const res = await fetch(`/api/impressoras?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      impressorasCache = data.data;
      renderizarTabelaImpressoras(impressorasCache);
      atualizarFiltroDepartamentosImp(impressorasCache);
    } else {
      showToast('Erro ao carregar impressoras: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao buscar impressoras:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
}

/**
 * Renderiza os dados das impressoras na tabela
 */
function renderizarTabelaImpressoras(lista) {
  const tbody = document.getElementById('tabela-impressoras-body');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-8 text-gray-400">
          <i class="fa-solid fa-print text-2xl text-gray-600 mb-2 block"></i>
          Nenhuma impressora encontrada com os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(imp => {
    // Status badge
    let statusClass = 'badge-ativo';
    if (imp.status === 'Defeito') statusClass = 'badge-defeito';
    if (imp.status === 'Reserva') statusClass = 'badge-reserva';

    const valorUnitarioFormatado = parseFloat(imp.valorUn || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const rateioFormatado = (parseFloat(imp.porcentRateio || 0)).toFixed(2) + '%';

    return `
      <tr class="hover:bg-gray-800/40 transition-colors">
        <td class="font-mono text-xs text-gray-400">#${imp.id}</td>
        <td class="font-medium text-white">${escapeHtml(imp.departamento)}</td>
        <td class="text-gray-300">
          <span class="font-semibold text-white">${escapeHtml(imp.modelo)}</span>
        </td>
        <td>
          <div class="text-xs font-mono text-gray-400">
            ${imp.serialNumber ? `<span title="Serial Number"><i class="fa-solid fa-barcode text-[10px] text-gray-500 mr-1"></i>${escapeHtml(imp.serialNumber)}</span>` : '<span class="text-gray-600">-</span>'}
          </div>
          ${imp.ip ? `
            <div class="mt-0.5 ip-badge cursor-pointer" onclick="copiarTexto('${imp.ip}', 'IP')" title="Clique para copiar IP">
              <i class="fa-solid fa-network-wired text-[9px]"></i>
              ${escapeHtml(imp.ip)}
            </div>
          ` : ''}
        </td>
        <td class="font-mono text-xs text-emerald-400 font-semibold">${valorUnitarioFormatado}</td>
        <td class="text-xs text-gray-300">${escapeHtml(imp.centroDeCusto || '-')}</td>
        <td class="font-mono text-xs text-cyan-300 font-semibold">${rateioFormatado}</td>
        <td>
          <span class="badge-status ${statusClass}">
            <span class="h-1.5 w-1.5 rounded-full ${imp.status === 'Ativo' ? 'bg-emerald-400' : imp.status === 'Defeito' ? 'bg-rose-400' : 'bg-amber-400'}"></span>
            ${imp.status}
          </span>
        </td>
        <td class="text-xs text-gray-400 max-w-[180px] truncate" title="${escapeHtml(imp.observacao || '')}">
          ${escapeHtml(imp.observacao || '-')}
        </td>
        <td class="text-right">
          <div class="inline-flex items-center gap-1">
            <button onclick="editarImpressora(${imp.id})" title="Editar Impressora" class="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="excluirImpressora(${imp.id}, '${escapeHtml(imp.modelo)}')" title="Excluir Impressora" class="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Atualiza o dropdown de departamentos com base nas impressoras existentes
 */
function atualizarFiltroDepartamentosImp(lista) {
  const select = document.getElementById('filtro-imp-depto');
  if (!select) return;

  const atual = select.value;
  const deptos = Array.from(new Set(lista.map(i => i.departamento).filter(Boolean))).sort();

  select.innerHTML = '<option value="Todos">Todos os Departamentos</option>' +
    deptos.map(d => `<option value="${escapeHtml(d)}" ${d === atual ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

/**
 * Debounce para busca de impressoras
 */
function debounceFiltrarImpressoras() {
  clearTimeout(timerBuscaImp);
  timerBuscaImp = setTimeout(carregarImpressoras, 300);
}

/**
 * Abre o modal de cadastro de nova impressora
 */
function openModalImpressora() {
  document.getElementById('modal-impressora-titulo').innerHTML = '<i class="fa-solid fa-print text-blue-400"></i> Adicionar Nova Impressora';
  document.getElementById('form-impressora').reset();
  document.getElementById('imp-id').value = '';
  document.getElementById('imp-valorUn').value = '0.08';
  document.getElementById('imp-porcentRateio').value = '0.00';
  document.getElementById('imp-status').value = 'Ativo';
  openModal('modal-impressora');
}

/**
 * Carrega dados para edição de impressora
 */
function editarImpressora(id) {
  const imp = impressorasCache.find(i => i.id === id);
  if (!imp) return;

  document.getElementById('modal-impressora-titulo').innerHTML = `<i class="fa-solid fa-pen text-cyan-400"></i> Editar Impressora #${imp.id}`;
  document.getElementById('imp-id').value = imp.id;
  document.getElementById('imp-departamento').value = imp.departamento || '';
  document.getElementById('imp-modelo').value = imp.modelo || '';
  document.getElementById('imp-serial').value = imp.serialNumber || '';
  document.getElementById('imp-ip').value = imp.ip || '';
  document.getElementById('imp-valorUn').value = parseFloat(imp.valorUn || 0).toFixed(2);
  document.getElementById('imp-centroCusto').value = imp.centroDeCusto || '';
  document.getElementById('imp-porcentRateio').value = parseFloat(imp.porcentRateio || 0).toFixed(2);
  document.getElementById('imp-status').value = imp.status || 'Ativo';
  document.getElementById('imp-observacao').value = imp.observacao || '';

  openModal('modal-impressora');
}

/**
 * Salva (cria ou atualiza) a impressora
 */
async function salvarImpressora(event) {
  event.preventDefault();

  const id = document.getElementById('imp-id').value;
  const departamento = document.getElementById('imp-departamento').value.trim();
  const modelo = document.getElementById('imp-modelo').value.trim();
  const serialNumber = document.getElementById('imp-serial').value.trim();
  const ip = document.getElementById('imp-ip').value.trim();
  const valorUn = parseFloat(document.getElementById('imp-valorUn').value || 0);
  const centroDeCusto = document.getElementById('imp-centroCusto').value.trim();
  const porcentRateio = parseFloat(document.getElementById('imp-porcentRateio').value || 0);
  const status = document.getElementById('imp-status').value;
  const observacao = document.getElementById('imp-observacao').value.trim();

  // Validação estrita de porcentagem de rateio entre 0 e 100 com até 2 casas decimais
  if (isNaN(porcentRateio) || porcentRateio < 0 || porcentRateio > 100) {
    showToast('A porcentagem de rateio deve estar entre 0% e 100%', 'warning');
    return;
  }

  // Validação de custo unitário
  if (isNaN(valorUn) || valorUn < 0) {
    showToast('O valor unitário deve ser um número positivo', 'warning');
    return;
  }

  const payload = {
    departamento,
    modelo,
    serialNumber,
    ip,
    valorUn: valorUn.toFixed(2),
    centroDeCusto,
    porcentRateio: porcentRateio.toFixed(2),
    status,
    observacao
  };

  const btnSalvar = document.getElementById('btn-salvar-impressora');
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

  try {
    const url = id ? `/api/impressoras/${id}` : '/api/impressoras';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-impressora');
      carregarImpressoras();
      carregarDashboardGeral(); // Atualiza KPIs da home
    } else {
      showToast('Erro: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar impressora:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Impressora';
  }
}

/**
 * Exclui a impressora com confirmação
 */
function excluirImpressora(id, modelo) {
  pedirConfirmacaoExclusao(`Deseja realmente excluir a impressora "${modelo}" (ID #${id})? Esta ação não pode ser desfeita.`, async () => {
    try {
      const res = await fetch(`/api/impressoras/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        carregarImpressoras();
        carregarDashboardGeral();
      } else {
        showToast('Erro ao excluir: ' + data.message, 'error');
      }
    } catch (e) {
      showToast('Erro ao comunicar com o servidor', 'error');
    }
  });
}

/**
 * MODAL CONTAGEM MENSAL
 * Abre a contagem mensal listando todas as impressoras com campos Departamento, Contagem Anterior e Contagem Atual
 */
async function openModalContagemMensal() {
  const modal = document.getElementById('modal-contagem-mensal');
  const tbody = document.getElementById('tabela-contagem-mensal-body');
  const dataRef = document.getElementById('contagem-data-referencia');

  // Preencher data de hoje
  if (dataRef) {
    dataRef.value = new Date().toISOString().split('T')[0];
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-6 text-gray-500">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando contagens anteriores...
      </td>
    </tr>
  `;

  openModal('modal-contagem-mensal');

  try {
    // Buscar últimas contagens para preencher 'Contagem Anterior'
    const resLatest = await fetch('/api/contagem/latest');
    const latestData = await resLatest.json();
    contagemLatestCache = latestData.data || {};

    // Se a lista de impressoras estiver vazia, recarregar
    if (impressorasCache.length === 0) {
      const resImp = await fetch('/api/impressoras');
      const impData = await resImp.json();
      impressorasCache = impData.data || [];
    }

    renderizarLinhasContagemMensal();
  } catch (err) {
    console.error('Erro ao preparar contagem mensal:', err);
    showToast('Erro ao obter histórico de contagens', 'error');
  }
}

/**
 * Renderiza linhas da tabela de contagem mensal
 */
function renderizarLinhasContagemMensal() {
  const tbody = document.getElementById('tabela-contagem-mensal-body');
  if (!tbody) return;

  if (impressorasCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-gray-400">
          Nenhuma impressora cadastrada no momento. Adicione uma impressora primeiro.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = impressorasCache.map(imp => {
    // Obter contagem anterior do banco de dados (ou valor fictício demonstrativo inicial)
    const ultimaContagem = contagemLatestCache[imp.id]?.ultimaContagem;
    const ctAnterior = ultimaContagem !== undefined ? parseInt(ultimaContagem, 10) : (imp.id * 1250);
    // Sugestão inicial da contagem atual
    const ctAtualSugerida = ctAnterior + 420;
    const valorUn = parseFloat(imp.valorUn || 0);

    return `
      <tr class="hover:bg-gray-800/30" data-imp-id="${imp.id}" data-valor-un="${valorUn}">
        <td>
          <span class="font-semibold text-white text-xs">${escapeHtml(imp.departamento)}</span>
        </td>
        <td>
          <div class="text-xs text-gray-300 font-medium">${escapeHtml(imp.modelo)}</div>
          <div class="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
            ${imp.ip ? `<span class="ip-badge text-[10px] py-0 px-1.5"><i class="fa-solid fa-network-wired text-[8px]"></i> ${escapeHtml(imp.ip)}</span>` : '<span>Sem IP</span>'} 
            <span>• Custo: R$ ${valorUn.toFixed(2)}/fl</span>
          </div>
        </td>
        <td>
          <input type="number" class="tech-input text-xs font-mono py-1 px-2 ct-anterior" value="${ctAnterior}" oninput="recalcularContagemLinha(this)">
        </td>
        <td>
          <input type="number" class="tech-input text-xs font-mono py-1 px-2 border-cyan-500/50 bg-cyan-950/20 text-cyan-300 ct-atual" value="${ctAtualSugerida}" oninput="recalcularContagemLinha(this)">
        </td>
        <td class="text-center font-mono text-xs font-bold text-white ct-diferenca">
          ${ctAtualSugerida - ctAnterior}
        </td>
        <td class="text-right font-mono text-xs font-bold text-emerald-400 ct-custo-total">
          R$ ${((ctAtualSugerida - ctAnterior) * valorUn).toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  recalcularTotalGeralContagem();
}

/**
 * Recalcula a linha quando o usuário digita na Contagem Anterior ou Atual
 */
function recalcularContagemLinha(inputEl) {
  const row = inputEl.closest('tr');
  if (!row) return;

  const anterior = parseInt(row.querySelector('.ct-anterior').value || 0, 10);
  const atual = parseInt(row.querySelector('.ct-atual').value || 0, 10);
  const valorUn = parseFloat(row.dataset.valorUn || 0);

  const diferenca = Math.max(0, atual - anterior);
  const custo = diferenca * valorUn;

  row.querySelector('.ct-diferenca').textContent = diferenca;
  row.querySelector('.ct-custo-total').textContent = `R$ ${custo.toFixed(2)}`;

  recalcularTotalGeralContagem();
}

/**
 * Recalcula a soma total de todas as impressoras no modal de contagem
 */
function recalcularTotalGeralContagem() {
  const rows = document.querySelectorAll('#tabela-contagem-mensal-body tr');
  let soma = 0;

  rows.forEach(r => {
    const anterior = parseInt(r.querySelector('.ct-anterior')?.value || 0, 10);
    const atual = parseInt(r.querySelector('.ct-atual')?.value || 0, 10);
    const valorUn = parseFloat(r.dataset.valorUn || 0);
    const diff = Math.max(0, atual - anterior);
    soma += (diff * valorUn);
  });

  const totalEl = document.getElementById('contagem-total-geral');
  if (totalEl) {
    totalEl.textContent = soma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

/**
 * Salva a contagem de todas as impressoras no banco de dados
 */
async function salvarContagemMensal() {
  const rows = document.querySelectorAll('#tabela-contagem-mensal-body tr');
  const dataContagem = document.getElementById('contagem-data-referencia').value || new Date().toISOString().split('T')[0];

  const items = [];
  rows.forEach(r => {
    const idImpressora = parseInt(r.dataset.impId, 10);
    const ctFolhasAnterior = parseInt(r.querySelector('.ct-anterior')?.value || 0, 10);
    const ctFolhasAtual = parseInt(r.querySelector('.ct-atual')?.value || 0, 10);
    const valorUn = parseFloat(r.dataset.valorUn || 0);
    const ctImpressoes = Math.max(0, ctFolhasAtual - ctFolhasAnterior);
    const custoTotal = ctImpressoes * valorUn;

    if (idImpressora) {
      items.push({
        idImpressora,
        ctFolhasAnterior,
        ctFolhasAtual,
        ctImpressoes,
        custoTotal: custoTotal.toFixed(2),
        dataContagem
      });
    }
  });

  if (items.length === 0) {
    showToast('Nenhuma impressora disponível para registrar contagem', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/contagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, dataContagem })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-contagem-mensal');
    } else {
      showToast('Erro ao salvar contagem: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao registrar contagem:', error);
    showToast('Erro na conexão ao registrar contagem', 'error');
  }
}

/**
 * MODAL HISTÓRICO DE CONTAGENS
 */
async function openModalHistoricoContagem() {
  openModal('modal-historico-contagem');
  const tbody = document.getElementById('tabela-historico-contagem-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-gray-500">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Buscando histórico de contagens...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('/api/contagem?limit=50');
    const data = await res.json();

    if (data.success && tbody) {
      if (data.data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-6 text-gray-400">
              Nenhuma contagem registrada anteriormente.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.data.map(c => `
        <tr class="hover:bg-gray-800/40">
          <td class="font-mono text-xs text-cyan-400">${formatarDataBR(c.dataContagem)}</td>
          <td class="font-medium text-white text-xs">${escapeHtml(c.departamento || '-')}</td>
          <td class="text-xs text-gray-300">${escapeHtml(c.modelo || '-')}</td>
          <td class="font-mono text-xs text-gray-400">${c.ctFolhasAnterior}</td>
          <td class="font-mono text-xs text-white">${c.ctFolhasAtual}</td>
          <td class="font-mono text-xs font-bold text-cyan-300">${c.ctImpressoes}</td>
          <td class="font-mono text-xs font-bold text-emerald-400">${formatarMoeda(c.custoTotal)}</td>
          <td class="text-right">
            <button onclick="excluirRegistroContagem(${c.id})" title="Excluir Registro" class="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (e) {
    showToast('Erro ao buscar histórico', 'error');
  }
}

async function excluirRegistroContagem(id) {
  pedirConfirmacaoExclusao(`Excluir esta contagem histórica #${id}?`, async () => {
    try {
      const res = await fetch(`/api/contagem/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Registro de contagem excluído!', 'success');
        openModalHistoricoContagem();
        if (App.currentView === 'historico-contagens') {
          carregarHistoricoContagens();
        }
      }
    } catch (e) {
      showToast('Erro ao excluir', 'error');
    }
  });
}

/**
 * =========================================================================
 * MÓDULO DE HISTÓRICO DE CONTAGENS (PÁGINA DEDICADA & EXPORTAÇÃO EXCEL)
 * =========================================================================
 */

let historicoContagensCache = [];
let timerBuscaHist = null;

/**
 * Carrega a lista de meses disponíveis no banco para o dropdown
 */
async function preencherMesesDisponiveis() {
  const select = document.getElementById('filtro-hist-select-mes');
  if (!select) return;

  try {
    const res = await fetch('/api/contagem/meses-disponiveis');
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      const mesesNomes = [
        '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      select.innerHTML = '<option value="">-- Todos os Meses / Digite no campo ao lado --</option>' +
        data.data.map(m => `
          <option value="${m.mesAnoRef}">
            ${mesesNomes[m.mes]} / ${m.ano} (${m.totalRegistros} apurações)
          </option>
        `).join('');

      // Se o input de mês não estiver preenchido, define o mês mais recente disponível
      const inputMes = document.getElementById('filtro-hist-mesano');
      if (inputMes && !inputMes.value && data.data.length > 0) {
        inputMes.value = data.data[0].mesAnoRef;
        select.value = data.data[0].mesAnoRef;
      }
    } else {
      select.innerHTML = '<option value="">Nenhum histórico registrado ainda</option>';
    }
  } catch (err) {
    console.error('Erro ao preencher meses disponíveis:', err);
  }
}

/**
 * Seleciona o mês a partir do dropdown de atalho
 */
function selecionarMesDisponivel(mesAno) {
  const inputMes = document.getElementById('filtro-hist-mesano');
  if (inputMes) {
    inputMes.value = mesAno;
  }
  carregarHistoricoContagens();
}

/**
 * Debounce da busca textual no histórico
 */
function debounceFiltrarHistorico() {
  clearTimeout(timerBuscaHist);
  timerBuscaHist = setTimeout(carregarHistoricoContagens, 300);
}

/**
 * Carrega os registros de contagem do mês/ano pesquisado no banco
 */
async function carregarHistoricoContagens() {
  const inputMes = document.getElementById('filtro-hist-mesano');
  const busca = (document.getElementById('filtro-hist-busca')?.value || '').trim();
  const mesAno = inputMes ? inputMes.value : '';

  const tbody = document.getElementById('tabela-historico-pagina-body');
  const tfoot = document.getElementById('tabela-historico-pagina-foot');

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Consultando registros no banco de dados MySQL...
        </td>
      </tr>
    `;
  }
  if (tfoot) tfoot.classList.add('hidden');

  try {
    const params = new URLSearchParams();
    if (mesAno) params.append('dataRef', mesAno);
    if (busca) params.append('search', busca);
    params.append('limit', '500');

    const res = await fetch(`/api/contagem?${params.toString()}`);
    const result = await res.json();

    if (result.success) {
      historicoContagensCache = result.data;
      renderizarTabelaHistoricoPagina(historicoContagensCache, mesAno, result.resumo);
    } else {
      showToast('Erro ao buscar contagens: ' + result.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao carregar histórico de contagens:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
}

/**
 * Renderiza os dados do histórico de contagens na tabela e nos cards de resumo
 */
function renderizarTabelaHistoricoPagina(lista, mesAnoRef, resumo) {
  const tbody = document.getElementById('tabela-historico-pagina-body');
  const tfoot = document.getElementById('tabela-historico-pagina-foot');
  if (!tbody) return;

  // Atualizar cards de resumo
  const mesesNomes = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let periodoTexto = 'Todos os Registros';
  if (mesAnoRef && mesAnoRef.includes('-')) {
    const p = mesAnoRef.split('-');
    const mNum = parseInt(p[1], 10);
    periodoTexto = `${mesesNomes[mNum]} / ${p[0]}`;
  }

  document.getElementById('hist-card-periodo').textContent = periodoTexto;
  document.getElementById('hist-card-total-imp').textContent = lista.length;
  document.getElementById('hist-card-total-folhas').textContent = (resumo?.totalImpressoes || 0).toLocaleString('pt-BR');
  document.getElementById('hist-card-total-custo').textContent = formatarMoeda(resumo?.totalCusto || 0);

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-10 text-gray-400">
          <i class="fa-regular fa-calendar-xmark text-3xl text-gray-600 mb-2 block"></i>
          Nenhuma contagem de impressão encontrada para o período <strong>${periodoTexto}</strong>.
          <div class="mt-2 text-xs text-gray-500">
            Realize uma nova contagem ou selecione outro mês/ano no filtro acima.
          </div>
        </td>
      </tr>
    `;
    if (tfoot) tfoot.classList.add('hidden');
    return;
  }

  // Renderizar linhas
  tbody.innerHTML = lista.map(c => {
    const folhas = parseInt(c.ctImpressoes || 0, 10);
    const custo = parseFloat(c.custoTotal || 0);
    const valorUn = parseFloat(c.valorUn || 0);

    return `
      <tr class="hover:bg-gray-800/40 text-xs transition-colors">
        <td class="font-mono text-cyan-400 font-semibold">${formatarDataBR(c.dataContagem)}</td>
        <td class="font-medium text-white">${escapeHtml(c.departamento || '-')}</td>
        <td class="text-gray-200">
          <span class="font-semibold text-white">${escapeHtml(c.modelo || '-')}</span>
        </td>
        <td>
          <div class="text-[11px] font-mono text-gray-400">${escapeHtml(c.serialNumber || '-')}</div>
          ${c.ip ? `<span class="mt-0.5 ip-badge cursor-pointer" onclick="copiarTexto('${c.ip}', 'IP')" title="Clique para copiar IP"><i class="fa-solid fa-network-wired text-[9px]"></i> ${escapeHtml(c.ip)}</span>` : ''}
        </td>
        <td class="font-mono text-gray-300 font-medium">R$ ${valorUn.toFixed(2)}</td>
        <td class="font-mono text-gray-400 font-medium">${parseInt(c.ctFolhasAnterior || 0, 10).toLocaleString('pt-BR')}</td>
        <td class="font-mono text-white font-bold">${parseInt(c.ctFolhasAtual || 0, 10).toLocaleString('pt-BR')}</td>
        <td class="text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold text-xs bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
            +${folhas.toLocaleString('pt-BR')} fls
          </span>
        </td>
        <td class="text-right font-mono font-bold text-emerald-400 text-sm">
          ${formatarMoeda(custo)}
        </td>
        <td class="text-right">
          <button onclick="excluirRegistroContagem(${c.id})" title="Excluir Contagem" class="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Exibir rodapé com totais
  if (tfoot) {
    tfoot.classList.remove('hidden');
    document.getElementById('foot-total-folhas').textContent = `${(resumo?.totalImpressoes || 0).toLocaleString('pt-BR')} folhas`;
    document.getElementById('foot-total-custo').textContent = formatarMoeda(resumo?.totalCusto || 0);
  }
}

/**
 * Exporta os dados do histórico de contagem diretamente para uma planilha Excel (.xlsx)
 */
function exportarPlanilhaHistorico() {
  if (historicoContagensCache.length === 0) {
    showToast('Não há dados de contagem disponíveis para exportar no período selecionado.', 'warning');
    return;
  }

  if (typeof XLSX === 'undefined') {
    showToast('Biblioteca SheetJS ainda carregando. Aguarde um instante...', 'warning');
    return;
  }

  try {
    const inputMes = document.getElementById('filtro-hist-mesano');
    const mesAnoRef = inputMes?.value || new Date().toISOString().substring(0, 7);

    // Preparar dados no formato de matriz para o Excel
    const rowsExcel = [
      // Cabeçalho da Planilha
      [
        'ID Contagem',
        'Data da Contagem',
        'Departamento',
        'Modelo da Impressora',
        'Número de Série',
        'Endereço IP',
        'Centro de Custo',
        '% Rateio',
        'Valor Unitário (R$)',
        'Contagem Anterior (Folhas)',
        'Contagem Atual (Folhas)',
        'Total Folhas do Mês',
        'Custo Total de Impressão (R$)'
      ]
    ];

    let totalFolhas = 0;
    let totalCusto = 0;

    historicoContagensCache.forEach(c => {
      const folhas = parseInt(c.ctImpressoes || 0, 10);
      const custo = parseFloat(c.custoTotal || 0);
      const valorUn = parseFloat(c.valorUn || 0);
      const rateio = parseFloat(c.porcentRateio || 0);

      totalFolhas += folhas;
      totalCusto += custo;

      rowsExcel.push([
        c.id,
        formatarDataBR(c.dataContagem),
        c.departamento || '',
        c.modelo || '',
        c.serialNumber || '',
        c.ip || '',
        c.centroDeCusto || '',
        rateio.toFixed(2) + '%',
        valorUn.toFixed(2),
        parseInt(c.ctFolhasAnterior || 0, 10),
        parseInt(c.ctFolhasAtual || 0, 10),
        folhas,
        custo.toFixed(2)
      ]);
    });

    // Linha de Totais Gerais
    rowsExcel.push([
      'TOTAL CONSOLIDADO',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalFolhas,
      totalCusto.toFixed(2)
    ]);

    // Criar planilha e pasta de trabalho
    const ws = XLSX.utils.aoa_to_sheet(rowsExcel);

    // Ajustar largura visual das colunas
    ws['!cols'] = [
      { wch: 12 }, // ID
      { wch: 16 }, // Data
      { wch: 25 }, // Departamento
      { wch: 30 }, // Modelo
      { wch: 20 }, // Serial
      { wch: 16 }, // IP
      { wch: 16 }, // Centro Custo
      { wch: 12 }, // % Rateio
      { wch: 18 }, // Valor Unitário
      { wch: 26 }, // Ct Anterior
      { wch: 24 }, // Ct Atual
      { wch: 22 }, // Folhas
      { wch: 28 }  // Custo Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contagens');

    // Nome amigável do arquivo
    const nomeArquivo = `Relatorio_Contagem_Impressoras_${mesAnoRef.replace('-', '_')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);

    showToast(`Planilha "${nomeArquivo}" gerada e baixada com sucesso!`, 'success');
  } catch (error) {
    console.error('Erro ao exportar planilha:', error);
    showToast('Falha ao gerar planilha Excel: ' + error.message, 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
