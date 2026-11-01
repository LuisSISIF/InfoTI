/**
 * InfoTI - Módulo de Ramais
 * Lista de ramais cadastrados, busca instantânea e CRUD (Adicionar / Editar / Excluir)
 */

let ramaisCache = [];

/**
 * Carrega lista de ramais do backend
 */
async function carregarRamais() {
  const tbody = document.getElementById('tabela-ramais-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Carregando lista de ramais...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('/api/ramais');
    const data = await res.json();

    if (data.success) {
      ramaisCache = data.data;
      filtrarRamais();
    } else {
      showToast('Erro ao carregar ramais: ' + data.message, 'error');
    }
  } catch (error) {
    console.error('Falha ao buscar ramais:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
}

/**
 * Filtra a lista de ramais em tempo real conforme o usuário digita
 */
function filtrarRamais() {
  const busca = (document.getElementById('filtro-ramal-busca')?.value || '').toLowerCase().trim();
  const tbody = document.getElementById('tabela-ramais-body');
  if (!tbody) return;

  const listaFiltrada = ramaisCache.filter(r => {
    if (!busca) return true;
    return (r.departamento && r.departamento.toLowerCase().includes(busca)) ||
           (r.numeroRamal && r.numeroRamal.toLowerCase().includes(busca));
  });

  if (listaFiltrada.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-gray-400">
          <i class="fa-solid fa-phone-slash text-2xl text-gray-600 mb-2 block"></i>
          Nenhum ramal encontrado com o termo pesquisado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = listaFiltrada.map(r => `
    <tr class="hover:bg-gray-800/40 transition-colors">
      <td class="font-mono text-xs text-gray-500">#${r.id}</td>
      <td>
        <span class="font-semibold text-white text-sm flex items-center gap-2">
          <i class="fa-solid fa-building text-xs text-amber-400"></i>
          ${escapeHtml(r.departamento)}
        </span>
      </td>
      <td>
        <div class="inline-flex items-center gap-2">
          <span class="font-mono font-extrabold text-base text-amber-400 tracking-wider bg-amber-950/30 px-3 py-1 rounded-md border border-amber-800/40">
            ${escapeHtml(r.numeroRamal)}
          </span>
          <button onclick="copiarTexto('${escapeHtml(r.numeroRamal)}', 'Ramal')" title="Copiar número do ramal" class="p-1.5 text-gray-400 hover:text-amber-400">
            <i class="fa-regular fa-copy text-xs"></i>
          </button>
        </div>
      </td>
      <td class="text-right">
        <div class="inline-flex items-center gap-1">
          <!-- 1 botão para editar -->
          <button onclick="editarRamal(${r.id})" title="Editar Ramal" class="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors">
            <i class="fa-solid fa-pen-to-square text-xs"></i>
          </button>
          <!-- 1 botão para excluir -->
          <button onclick="excluirRamal(${r.id}, '${escapeHtml(r.departamento)}', '${escapeHtml(r.numeroRamal)}')" title="Excluir Ramal" class="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Abre modal para adicionar novo ramal
 */
function openModalRamal() {
  document.getElementById('modal-ramal-titulo').innerHTML = '<i class="fa-solid fa-phone text-amber-400"></i> Adicionar Ramal';
  document.getElementById('form-ramal').reset();
  document.getElementById('ramal-id').value = '';
  openModal('modal-ramal');
}

/**
 * Abre o mesmo modal carregando os dados do ramal escolhido para edição
 */
function editarRamal(id) {
  const ramal = ramaisCache.find(r => r.id === id);
  if (!ramal) return;

  document.getElementById('modal-ramal-titulo').innerHTML = `<i class="fa-solid fa-pen text-cyan-400"></i> Editar Ramal #${ramal.id}`;
  document.getElementById('ramal-id').value = ramal.id;
  document.getElementById('ramal-departamento').value = ramal.departamento || '';
  document.getElementById('ramal-numero').value = ramal.numeroRamal || '';

  openModal('modal-ramal');
}

/**
 * Salva o ramal (POST ou PUT)
 */
async function salvarRamal(event) {
  event.preventDefault();

  const id = document.getElementById('ramal-id').value;
  const departamento = document.getElementById('ramal-departamento').value.trim();
  const numeroRamal = document.getElementById('ramal-numero').value.trim();

  if (!departamento || !numeroRamal) {
    showToast('Preencha o departamento e o número do ramal', 'warning');
    return;
  }

  const payload = { departamento, numeroRamal };

  const btnSalvar = document.getElementById('btn-salvar-ramal');
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

  try {
    const url = id ? `/api/ramais/${id}` : '/api/ramais';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-ramal');
      carregarRamais();
      carregarDashboardGeral();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar ramal:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Ramal';
  }
}

/**
 * Exclui o ramal com confirmação
 */
function excluirRamal(id, depto, numero) {
  pedirConfirmacaoExclusao(`Deseja realmente excluir o ramal ${numero} do setor "${depto}"?`, async () => {
    try {
      const res = await fetch(`/api/ramais/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        carregarRamais();
        carregarDashboardGeral();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) {
      showToast('Erro ao comunicar com o servidor', 'error');
    }
  });
}
