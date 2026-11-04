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

/**
 * =========================================================================
 * MÓDULO DE IMPORTAÇÃO DE PLANILHA DE IMPRESSORAS
 * =========================================================================
 */

let linhasParaImportarImpressoras = [];
let arquivoPlanilhaAtualImpressoras = null;

/**
 * Abre o modal de importação de planilha de impressoras
 */
function openModalImportarPlanilhaImpressoras() {
  resetarArquivoPlanilhaImpressoras();
  const inputInicio = document.getElementById('import-imp-linha-inicio');
  const inputFim = document.getElementById('import-imp-linha-fim');
  if (inputInicio) inputInicio.value = '2';
  if (inputFim) inputFim.value = '';
  setupDragAndDropPlanilhaImpressoras();
  openModal('modal-importar-planilha-impressoras');
}

/**
 * Configura eventos de arrastar e soltar (Drag and Drop)
 */
function setupDragAndDropPlanilhaImpressoras() {
  const dropArea = document.getElementById('drop-area-planilha-imp');
  const inputArquivo = document.getElementById('input-arquivo-planilha-imp');
  if (!dropArea || dropArea.dataset.configured === 'true') return;

  dropArea.dataset.configured = 'true';

  dropArea.onclick = (e) => {
    if (e.target.closest('#upload-file-info-imp')) return;
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
      analisarArquivoPlanilhaImpressoras(files[0]);
    }
  }, false);
}

/**
 * Trata seleção de arquivo via input
 */
function processarArquivoSelecionadoImpressoras(event) {
  const file = event.target.files[0];
  if (file) {
    analisarArquivoPlanilhaImpressoras(file);
  }
}

/**
 * Reseta o estado do modal para novo arquivo
 */
function resetarArquivoPlanilhaImpressoras(event) {
  if (event) event.stopPropagation();

  arquivoPlanilhaAtualImpressoras = null;
  linhasParaImportarImpressoras = [];

  const inputArquivo = document.getElementById('input-arquivo-planilha-imp');
  if (inputArquivo) inputArquivo.value = '';

  const placeholder = document.getElementById('upload-placeholder-imp');
  const fileInfo = document.getElementById('upload-file-info-imp');
  const summaryCards = document.getElementById('import-summary-cards-imp');
  const previewContainer = document.getElementById('import-preview-container-imp');
  const btnExec = document.getElementById('btn-executar-importacao-imp');
  const progressArea = document.getElementById('import-progress-area-imp');

  if (placeholder) placeholder.classList.remove('hidden');
  if (fileInfo) fileInfo.classList.add('hidden');
  if (summaryCards) summaryCards.classList.add('hidden');
  if (previewContainer) previewContainer.classList.add('hidden');
  if (progressArea) progressArea.classList.add('hidden');
  if (btnExec) btnExec.disabled = true;
}

/**
 * Extrai Modelo, IP e Serial Number a partir do texto combinado da coluna EQUIPAMENTO.
 * Suporta qualquer ordem (Modelo-IP-Serial, Modelo-Serial-IP, IP-Modelo-Serial),
 * múltiplos delimitadores ( - , – , — , / , | , quebra de linha),
 * e prefixos opcionais (IP:, SN:, S/N:, Serial:, Modelo:).
 */
function extrairEquipamentoImp(rawEquip) {
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

function parseValorNumericoImp(val) {
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

function parseRateioImp(val) {
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

/**
 * Lê e analisa a planilha no cliente ou via API
 */
async function analisarArquivoPlanilhaImpressoras(file) {
  arquivoPlanilhaAtualImpressoras = file;

  // Atualizar badge do arquivo
  document.getElementById('upload-placeholder-imp').classList.add('hidden');
  const fileInfo = document.getElementById('upload-file-info-imp');
  fileInfo.classList.remove('hidden');
  document.getElementById('label-nome-arquivo-imp').textContent = file.name;
  document.getElementById('label-tamanho-arquivo-imp').textContent = `${(file.size / 1024).toFixed(1)} KB`;

  const startRow = parseInt(document.getElementById('import-imp-linha-inicio').value || '2', 10);
  const endRowVal = document.getElementById('import-imp-linha-fim').value;
  const endRow = endRowVal ? parseInt(endRowVal, 10) : null;

  // Tentar análise rápida no frontend com SheetJS
  if (typeof XLSX !== 'undefined') {
    try {
      const reader = new FileReader();
      reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        processarLinhasClientSideImpressoras(rawRows, startRow, endRow);
      };
      reader.readAsArrayBuffer(file);
      return;
    } catch (err) {
      console.warn('Falha na leitura local de impressoras com SheetJS, usando backend:', err);
    }
  }

  // Fallback: enviar para o backend analisar
  try {
    const formData = new FormData();
    formData.append('planilha', file);
    formData.append('startRow', startRow);
    if (endRow) formData.append('endRow', endRow);

    const res = await fetch('/api/impressoras/previa-planilha', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      linhasParaImportarImpressoras = data.preview;
      renderizarPreviaImportacaoImpressoras(data.preview, data.resumo);
    } else {
      showToast('Erro ao processar planilha: ' + data.message, 'error');
    }
  } catch (e) {
    showToast('Falha na comunicação ao analisar planilha de impressoras', 'error');
  }
}

/**
 * Processamento dos dados no frontend via SheetJS
 */
function processarLinhasClientSideImpressoras(rawRows, startRow, endRow) {
  if (rawRows.length < 2) {
    showToast('A planilha precisa ter um cabeçalho na linha 1 e dados a partir da linha 2.', 'warning');
    return;
  }

  const idxInicio = Math.max(1, startRow - 1);
  const idxFim = endRow ? Math.min(rawRows.length - 1, endRow - 1) : rawRows.length - 1;

  linhasParaImportarImpressoras = [];
  let impressorasValidas = 0;
  let comIp = 0;
  let comSerial = 0;
  let linhasVazias = 0;

  for (let r = idxInicio; r <= idxFim; r++) {
    const row = rawRows[r];

    // Colunas especificadas pelo usuário:
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
    const departamento = String(row[0] || '').trim();
    const rawEquipamento = String(row[1] || '').trim();
    const valorUn = parseValorNumericoImp(row[5]);
    const centroDeCusto = String(row[7] || '').trim();
    const porcentRateio = parseRateioImp(row[8]);
    const observacao = String(row[10] || '').trim();

    const { modelo, ip, serialNumber } = extrairEquipamentoImp(rawEquipamento);

    const isVazia = !departamento && !rawEquipamento && !centroDeCusto && !observacao;

    const item = {
      linhaExcel: r + 1,
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

    if (isVazia) {
      linhasVazias++;
    } else {
      impressorasValidas++;
      if (ip) comIp++;
      if (serialNumber) comSerial++;
    }

    linhasParaImportarImpressoras.push(item);
  }

  // Preenche input de linha final com a última linha se estiver vazio
  const inputFim = document.getElementById('import-imp-linha-fim');
  if (inputFim && !inputFim.value) {
    inputFim.value = idxFim + 1;
  }

  renderizarPreviaImportacaoImpressoras(linhasParaImportarImpressoras, {
    totalNaFaixa: linhasParaImportarImpressoras.length,
    impressorasValidas,
    comIp,
    comSerial,
    linhasVazias
  });
}

/**
 * Renderiza os indicadores e a tabela de prévia de impressoras
 */
function renderizarPreviaImportacaoImpressoras(previewRows, resumo) {
  const summaryCards = document.getElementById('import-summary-cards-imp');
  const previewContainer = document.getElementById('import-preview-container-imp');
  const tbody = document.getElementById('tabela-previa-impressoras-body');
  const btnExec = document.getElementById('btn-executar-importacao-imp');

  if (summaryCards) summaryCards.classList.remove('hidden');
  if (previewContainer) previewContainer.classList.remove('hidden');

  document.getElementById('prev-imp-total-linhas').textContent = resumo.totalNaFaixa;
  document.getElementById('prev-imp-total-validas').textContent = resumo.impressorasValidas;
  document.getElementById('prev-imp-total-ips').textContent = resumo.comIp;
  document.getElementById('prev-imp-total-seriais').textContent = resumo.comSerial;
  document.getElementById('prev-imp-total-vazias').textContent = resumo.linhasVazias;

  document.getElementById('label-preview-mostrando-imp').textContent = `Faixa de dados: ${previewRows.length} linhas analisadas`;

  if (btnExec) {
    btnExec.disabled = resumo.impressorasValidas === 0;
    btnExec.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Confirmar e Importar (${resumo.impressorasValidas} Impressoras)`;
  }

  if (tbody) {
    tbody.innerHTML = previewRows.map(row => {
      if (row.isVazia) {
        return `
          <tr class="opacity-40 bg-gray-900/30">
            <td class="font-mono text-xs text-gray-500">L${row.linhaExcel}</td>
            <td colspan="8" class="text-xs text-gray-500 italic">Linha em branco (será ignorada)</td>
            <td><span class="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">IGNORAR</span></td>
          </tr>
        `;
      }

      const valorFormatado = parseFloat(row.valorUn || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const rateioFormatado = (parseFloat(row.porcentRateio || 0)).toFixed(2) + '%';

      return `
        <tr class="hover:bg-gray-800/40 text-xs">
          <td class="font-mono text-gray-400 font-semibold">L${row.linhaExcel}</td>
          <td class="font-medium text-white">${escapeHtml(row.departamento || '-')}</td>
          <td>
            <div class="font-semibold text-cyan-300">${escapeHtml(row.modelo || '-')}</div>
            <div class="text-[10px] text-gray-500 truncate max-w-[170px]" title="Original na planilha: ${escapeHtml(row.equipamentoOriginal)}">
              Orig: ${escapeHtml(row.equipamentoOriginal || '-')}
            </div>
          </td>
          <td>
            ${row.ip ? `
              <span class="inline-flex items-center gap-1 font-mono text-[11px] text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/20">
                <i class="fa-solid fa-network-wired text-[9px]"></i>
                ${escapeHtml(row.ip)}
              </span>
            ` : '<span class="text-gray-600 italic">Sem IP</span>'}
          </td>
          <td>
            ${row.serialNumber ? `
              <span class="font-mono text-[11px] text-purple-300 font-medium">
                <i class="fa-solid fa-barcode text-[10px] mr-1 text-purple-400"></i>
                ${escapeHtml(row.serialNumber)}
              </span>
            ` : '<span class="text-gray-600 italic">Vazio</span>'}
          </td>
          <td class="font-mono text-emerald-400 font-semibold">${valorFormatado}</td>
          <td class="text-gray-300">${escapeHtml(row.centroDeCusto || '-')}</td>
          <td class="font-mono text-cyan-300 font-semibold">${rateioFormatado}</td>
          <td class="text-gray-400 max-w-[130px] truncate" title="${escapeHtml(row.observacao || '')}">
            ${escapeHtml(row.observacao || '-')}
          </td>
          <td>
            <span class="badge-status badge-ativo text-[10px]"><i class="fa-solid fa-check mr-1"></i>Importar</span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

/**
 * Envia as linhas de impressoras aprovadas para gravação no banco
 */
async function executarImportacaoPlanilhaImpressoras() {
  if (linhasParaImportarImpressoras.length === 0) {
    showToast('Nenhuma linha carregada para importar', 'warning');
    return;
  }

  const statusPadrao = document.getElementById('import-imp-status')?.value || 'Ativo';
  const btnExec = document.getElementById('btn-executar-importacao-imp');
  const progressArea = document.getElementById('import-progress-area-imp');
  const progressText = document.getElementById('import-progress-text-imp');

  btnExec.disabled = true;
  progressArea.classList.remove('hidden');
  progressText.textContent = `Gravando dados das impressoras no banco MySQL...`;

  try {
    const res = await fetch('/api/impressoras/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: linhasParaImportarImpressoras,
        statusPadrao
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-importar-planilha-impressoras');

      // Atualizar todas as telas afetadas
      carregarImpressoras();
      if (typeof carregarDashboardGeral === 'function') {
        carregarDashboardGeral();
      }
    } else {
      showToast('Erro na importação: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao executar importação de impressoras:', error);
    showToast('Erro na conexão com o servidor', 'error');
  } finally {
    btnExec.disabled = false;
    progressArea.classList.add('hidden');
  }
}
