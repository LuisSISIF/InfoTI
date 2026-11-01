/**
 * InfoTI - Módulo de Inventário de Licenças
 * Gestão de chaves de produto, ativações e vinculação a computadores
 */

let licencasCache = [];
let timerBuscaLic = null;
let chavesReveladas = new Set(); // IDs das chaves com visualização ativa

/**
 * Carrega a lista de licenças e computadores vinculados
 */
async function carregarLicencas() {
  const busca = document.getElementById('filtro-lic-busca')?.value || '';
  const tipo = document.getElementById('filtro-lic-tipo')?.value || 'Todos';

  const tbody = document.getElementById('tabela-licencas-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando licenças de software...
        </td>
      </tr>
    `;
  }

  try {
    const params = new URLSearchParams();
    if (busca) params.append('search', busca);
    if (tipo && tipo !== 'Todos') params.append('tipo', tipo);

    const res = await fetch(`/api/licencas?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      licencasCache = data.data;
      renderizarTabelaLicencas(licencasCache);
      atualizarFiltroTiposLic(licencasCache);
    } else {
      showToast('Erro ao carregar licenças: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao buscar licenças:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
}

/**
 * Renderiza a lista de licenças na tabela
 */
function renderizarTabelaLicencas(lista) {
  const tbody = document.getElementById('tabela-licencas-body');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-gray-400">
          <i class="fa-solid fa-key text-2xl text-gray-600 mb-2 block"></i>
          Nenhuma licença encontrada.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(lic => {
    const isRevelada = chavesReveladas.has(lic.id);
    const chaveExibida = isRevelada 
      ? escapeHtml(lic.chaveAtivacao) 
      : mascararChave(lic.chaveAtivacao);

    // Ícone por tipo de software
    let iconSoftware = 'fa-solid fa-box-archive text-purple-400';
    const tipoLower = (lic.tipoLicenca || '').toLowerCase();
    if (tipoLower.includes('windows')) iconSoftware = 'fa-brands fa-windows text-blue-400';
    else if (tipoLower.includes('office') || tipoLower.includes('365') || tipoLower.includes('word')) iconSoftware = 'fa-brands fa-microsoft text-amber-400';
    else if (tipoLower.includes('antivirus') || tipoLower.includes('eset') || tipoLower.includes('kaspersky')) iconSoftware = 'fa-solid fa-shield-halved text-emerald-400';
    else if (tipoLower.includes('cad') || tipoLower.includes('autodesk')) iconSoftware = 'fa-solid fa-compass-drafting text-rose-400';

    return `
      <tr class="hover:bg-gray-800/40 transition-colors">
        <td class="font-mono text-xs text-gray-400">#${lic.id}</td>
        <td>
          <div class="flex items-center gap-2">
            <i class="${iconSoftware} text-base"></i>
            <span class="font-semibold text-white text-xs">${escapeHtml(lic.tipoLicenca)}</span>
          </div>
        </td>
        <td>
          <div class="inline-flex items-center gap-2 bg-gray-900 px-2.5 py-1 rounded border border-[#1F293D]">
            <span class="font-mono text-xs text-cyan-300 tracking-wider">${chaveExibida}</span>
            <button onclick="toggleRevelarChave(${lic.id})" title="${isRevelada ? 'Ocultar Chave' : 'Revelar Chave'}" class="text-gray-400 hover:text-white text-xs">
              <i class="fa-solid ${isRevelada ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
            <button onclick="copiarTexto('${escapeHtml(lic.chaveAtivacao)}', 'Chave de Ativação')" title="Copiar Chave" class="text-gray-400 hover:text-cyan-400 text-xs">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        </td>
        <td class="text-xs font-mono text-gray-300">
          ${lic.emailAtivacao ? `<span class="flex items-center gap-1.5"><i class="fa-regular fa-envelope text-gray-500 text-[10px]"></i>${escapeHtml(lic.emailAtivacao)}</span>` : '<span class="text-gray-600">-</span>'}
        </td>
        <td>
          <div class="text-xs">
            <span class="font-mono font-bold text-white bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
              <i class="fa-solid fa-desktop text-[10px] text-emerald-400 mr-1"></i>
              ${escapeHtml(lic.nomeMaquina || `PC #${lic.idComputador}`)}
            </span>
            ${lic.colaborador ? `<div class="text-[11px] text-gray-400 mt-1">${escapeHtml(lic.colaborador)} • ${escapeHtml(lic.departamento || '')}</div>` : ''}
          </div>
        </td>
        <td class="text-right">
          <div class="inline-flex items-center gap-1">
            <button onclick="editarLicenca(${lic.id})" title="Editar Licença" class="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="excluirLicenca(${lic.id}, '${escapeHtml(lic.tipoLicenca)}')" title="Excluir Licença" class="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Mascara chave de produto (ex: XXXXX-YYYYY-****-****)
 */
function mascararChave(chave) {
  if (!chave) return '';
  if (chave.length <= 8) return '••••••••';
  return chave.substring(0, 5) + '-•••••-•••••-' + chave.substring(chave.length - 4);
}

function toggleRevelarChave(id) {
  if (chavesReveladas.has(id)) {
    chavesReveladas.delete(id);
  } else {
    chavesReveladas.add(id);
  }
  renderizarTabelaLicencas(licencasCache);
}

/**
 * Atualiza o dropdown de filtro por software
 */
function atualizarFiltroTiposLic(lista) {
  const select = document.getElementById('filtro-lic-tipo');
  if (!select) return;

  const atual = select.value;
  const tipos = Array.from(new Set(lista.map(l => l.tipoLicenca).filter(Boolean))).sort();

  select.innerHTML = '<option value="Todos">Todos os Tipos de Software</option>' +
    tipos.map(t => `<option value="${escapeHtml(t)}" ${t === atual ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
}

function debounceFiltrarLicencas() {
  clearTimeout(timerBuscaLic);
  timerBuscaLic = setTimeout(carregarLicencas, 300);
}

/**
 * Carrega a lista de computadores cadastrados no select do modal de licenças
 */
async function carregarSelectComputadores(selecionadoId = null) {
  const select = document.getElementById('lic-idComputador');
  if (!select) return;

  select.innerHTML = '<option value="">Carregando computadores...</option>';

  try {
    const res = await fetch('/api/computadores');
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      select.innerHTML = '<option value="">-- Selecione uma máquina cadastrada --</option>' +
        data.data.map(c => `
          <option value="${c.id}" ${c.id == selecionadoId ? 'selected' : ''}>
            ${escapeHtml(c.nomeMaquina || `PC #${c.id}`)} - ${escapeHtml(c.colaborador || 'Sem usuário')} (${escapeHtml(c.departamento || 'Geral')})
          </option>
        `).join('');
    } else {
      select.innerHTML = '<option value="">Nenhum computador cadastrado. Cadastre um computador primeiro!</option>';
    }
  } catch (err) {
    select.innerHTML = '<option value="">Erro ao carregar lista de computadores</option>';
  }
}

/**
 * Modal Adicionar Licença
 */
async function openModalLicenca() {
  document.getElementById('modal-licenca-titulo').innerHTML = '<i class="fa-solid fa-key text-purple-400"></i> Adicionar Licença de Software';
  document.getElementById('form-licenca').reset();
  document.getElementById('lic-id').value = '';
  await carregarSelectComputadores();
  openModal('modal-licenca');
}

/**
 * Editar Licença
 */
async function editarLicenca(id) {
  const lic = licencasCache.find(l => l.id === id);
  if (!lic) return;

  document.getElementById('modal-licenca-titulo').innerHTML = `<i class="fa-solid fa-pen text-cyan-400"></i> Editar Licença #${lic.id}`;
  document.getElementById('lic-id').value = lic.id;
  document.getElementById('lic-tipo').value = lic.tipoLicenca || '';
  document.getElementById('lic-chave').value = lic.chaveAtivacao || '';
  document.getElementById('lic-email').value = lic.emailAtivacao || '';
  
  await carregarSelectComputadores(lic.idComputador);

  openModal('modal-licenca');
}

/**
 * Salvar Licença
 */
async function salvarLicenca(event) {
  event.preventDefault();

  const id = document.getElementById('lic-id').value;
  const tipoLicenca = document.getElementById('lic-tipo').value.trim();
  const chaveAtivacao = document.getElementById('lic-chave').value.trim();
  const emailAtivacao = document.getElementById('lic-email').value.trim();
  const idComputador = document.getElementById('lic-idComputador').value;

  if (!idComputador) {
    showToast('Selecione um computador para vincular à licença', 'warning');
    return;
  }

  const payload = {
    tipoLicenca,
    chaveAtivacao,
    emailAtivacao,
    idComputador: parseInt(idComputador, 10)
  };

  const btnSalvar = document.getElementById('btn-salvar-licenca');
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

  try {
    const url = id ? `/api/licencas/${id}` : '/api/licencas';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-licenca');
      carregarLicencas();
      carregarDashboardGeral();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar licença:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Licença';
  }
}

/**
 * Excluir Licença
 */
function excluirLicenca(id, tipo) {
  pedirConfirmacaoExclusao(`Deseja realmente excluir a licença "${tipo}" (ID #${id})?`, async () => {
    try {
      const res = await fetch(`/api/licencas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        carregarLicencas();
        carregarDashboardGeral();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) {
      showToast('Erro ao comunicar com o servidor', 'error');
    }
  });
}
