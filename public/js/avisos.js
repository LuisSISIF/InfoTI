/**
 * InfoTI - Módulo de Avisos e Notificações (Tela Início)
 * Apresentação de urgências imediatas, avisos futuros, manutenções e dashboard geral
 */

let avisosCache = [];

/**
 * Carrega indicadores consolidados do dashboard da tela Início
 */
async function carregarDashboardGeral() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const data = await res.json();

    if (data.success) {
      const stats = data.data;

      // Computadores
      const compTotalEl = document.getElementById('kpi-computadores-total');
      const compAtivosEl = document.getElementById('kpi-computadores-ativos');
      const compBackupEl = document.getElementById('kpi-computadores-backup');

      if (compTotalEl) compTotalEl.textContent = stats.computadores.total;
      if (compAtivosEl) compAtivosEl.textContent = `${stats.computadores.ativos} ativos`;
      const backupPct = stats.computadores.total > 0 
        ? Math.round((stats.computadores.backupOk / stats.computadores.total) * 100) 
        : 0;
      if (compBackupEl) compBackupEl.textContent = `${backupPct}%`;

      // Impressoras
      const impTotalEl = document.getElementById('kpi-impressoras-total');
      const impAtivasEl = document.getElementById('kpi-impressoras-ativas');
      const impDefeitoEl = document.getElementById('kpi-impressoras-defeito');

      if (impTotalEl) impTotalEl.textContent = stats.impressoras.total;
      if (impAtivasEl) impAtivasEl.textContent = `${stats.impressoras.ativas} em rede`;
      if (impDefeitoEl) impDefeitoEl.textContent = `${stats.impressoras.defeito} em defeito`;

      // Ramais
      const ramTotalEl = document.getElementById('kpi-ramais-total');
      if (ramTotalEl) ramTotalEl.textContent = stats.ramais.total;

      // Licenças
      const licTotalEl = document.getElementById('kpi-licencas-total');
      if (licTotalEl) licTotalEl.textContent = stats.licencas.total;

      // Alertas Críticos no menu
      const badgeNav = document.getElementById('badge-urgencias-nav');
      if (badgeNav) {
        if (stats.alertasCriticos > 0) {
          badgeNav.textContent = stats.alertasCriticos;
          badgeNav.classList.remove('hidden');
        } else {
          badgeNav.classList.add('hidden');
        }
      }

      // Alertas de Demandas Atrasadas / Pendentes no menu
      const badgeDemandas = document.getElementById('badge-demandas-atrasadas');
      if (badgeDemandas && stats.demandas) {
        if (stats.demandas.atrasadas > 0) {
          badgeDemandas.textContent = `${stats.demandas.atrasadas} atrasada${stats.demandas.atrasadas > 1 ? 's' : ''}`;
          badgeDemandas.className = 'ml-auto bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse';
          badgeDemandas.classList.remove('hidden');
        } else if (stats.demandas.pendentes > 0) {
          badgeDemandas.textContent = `${stats.demandas.pendentes}`;
          badgeDemandas.className = 'ml-auto bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30';
          badgeDemandas.classList.remove('hidden');
        } else {
          badgeDemandas.classList.add('hidden');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao compilar KPIs do dashboard geral:', error);
  }
}

/**
 * Carrega a lista de avisos e notificações
 */
async function carregarAvisos() {
  const listaUrgencias = document.getElementById('lista-urgencias');
  const listaFuturos = document.getElementById('lista-futuros');

  try {
    const res = await fetch('/api/avisos');
    const data = await res.json();

    if (data.success) {
      avisosCache = data.data;

      // Filtrar urgências (prioridade alta/crítica ou tipo urgente)
      const urgencias = avisosCache.filter(a => 
        a.status === 'ativo' && (a.prioridade === 'critica' || a.prioridade === 'alta' || a.tipo === 'urgente')
      );

      // Filtrar futuros / informativos / manutenções
      const futuros = avisosCache.filter(a => 
        a.status === 'ativo' && !(a.prioridade === 'critica' || a.prioridade === 'alta' || a.tipo === 'urgente')
      );

      // Atualizar contadores
      const countUrg = document.getElementById('badge-urgencias-count');
      const countFut = document.getElementById('badge-futuros-count');
      if (countUrg) countUrg.textContent = `${urgencias.length} ativas`;
      if (countFut) countFut.textContent = `${futuros.length} agendados`;

      renderizarListaUrgencias(urgencias);
      renderizarListaFuturos(futuros);
    }
  } catch (error) {
    console.error('Falha ao carregar avisos:', error);
    if (listaUrgencias) listaUrgencias.innerHTML = '<div class="text-xs text-rose-400 text-center py-4">Erro ao carregar alertas</div>';
    if (listaFuturos) listaFuturos.innerHTML = '<div class="text-xs text-rose-400 text-center py-4">Erro ao carregar avisos</div>';
  }
}

/**
 * Renderiza cards de Urgências Imediatas
 */
function renderizarListaUrgencias(lista) {
  const container = document.getElementById('lista-urgencias');
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="tech-card p-6 text-center border-emerald-500/20">
        <i class="fa-solid fa-circle-check text-emerald-400 text-2xl mb-2 block"></i>
        <p class="text-sm font-semibold text-white">Nenhuma urgência ativa no momento!</p>
        <p class="text-xs text-gray-500 mt-1">Todos os equipamentos e chamados prioritários estão normais.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = lista.map(a => {
    const isCritica = a.prioridade === 'critica';
    const borderGlow = isCritica ? 'border-rose-500/40 glow-rose' : 'border-amber-500/30';
    const tagBg = isCritica ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

    return `
      <div class="tech-card p-4 border ${borderGlow} relative overflow-hidden transition-all">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg ${isCritica ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'} flex items-center justify-center shrink-0 mt-0.5">
              <i class="fa-solid ${isCritica ? 'fa-fire' : 'fa-triangle-exclamation'} text-base"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="font-bold text-white text-sm">${escapeHtml(a.titulo)}</h4>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${tagBg} uppercase font-bold">
                  ${escapeHtml(a.prioridade)}
                </span>
              </div>
              <p class="text-xs text-gray-300 mt-1.5 leading-relaxed">${escapeHtml(a.descricao || '')}</p>
              
              <div class="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                <span class="flex items-center gap-1">
                  <i class="fa-regular fa-user text-gray-500"></i> ${escapeHtml(a.autor || 'TI Suporte')}
                </span>
                ${a.dataPrevisao ? `
                  <span class="flex items-center gap-1 font-mono text-amber-300">
                    <i class="fa-regular fa-calendar-check"></i> Prazo: ${formatarDataBR(a.dataPrevisao)}
                  </span>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 shrink-0">
            <button onclick="resolverAviso(${a.id})" title="Marcar como Concluído / Resolvido" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-colors">
              <i class="fa-solid fa-check text-xs"></i>
            </button>
            <button onclick="excluirAviso(${a.id})" title="Excluir Aviso" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renderiza cards de Avisos Futuros e Manutenções Programadas
 */
function renderizarListaFuturos(lista) {
  const container = document.getElementById('lista-futuros');
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="tech-card p-6 text-center border-[#1F293D]">
        <i class="fa-regular fa-calendar text-gray-600 text-2xl mb-2 block"></i>
        <p class="text-sm font-semibold text-gray-300">Nenhum aviso ou manutenção programada.</p>
        <p class="text-xs text-gray-500 mt-1">Clique em "Novo Comunicado" para agendar uma janela técnica.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = lista.map(a => {
    let icon = 'fa-solid fa-wrench text-cyan-400';
    let iconBg = 'bg-cyan-500/10';

    if (a.tipo === 'alerta') {
      icon = 'fa-solid fa-bell text-amber-400';
      iconBg = 'bg-amber-500/10';
    } else if (a.tipo === 'info') {
      icon = 'fa-solid fa-circle-info text-blue-400';
      iconBg = 'bg-blue-500/10';
    }

    return `
      <div class="tech-card p-4 border border-[#1F293D] hover:border-cyan-500/30 transition-all">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5">
              <i class="${icon} text-base"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="font-bold text-white text-sm">${escapeHtml(a.titulo)}</h4>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 uppercase">
                  ${escapeHtml(a.tipo)}
                </span>
              </div>
              <p class="text-xs text-gray-300 mt-1.5 leading-relaxed">${escapeHtml(a.descricao || '')}</p>
              
              <div class="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                <span class="flex items-center gap-1">
                  <i class="fa-regular fa-user text-gray-500"></i> ${escapeHtml(a.autor || 'TI Suporte')}
                </span>
                ${a.dataPrevisao ? `
                  <span class="flex items-center gap-1 font-mono text-cyan-300 font-semibold bg-gray-900 px-2 py-0.5 rounded border border-[#1F293D]">
                    <i class="fa-regular fa-clock"></i> Data Prevista: ${formatarDataBR(a.dataPrevisao)}
                  </span>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 shrink-0">
            <button onclick="resolverAviso(${a.id})" title="Marcar como Concluído" class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-colors">
              <i class="fa-solid fa-check text-xs"></i>
            </button>
            <button onclick="excluirAviso(${a.id})" title="Excluir Aviso" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Abre o modal para cadastrar novo aviso
 */
function openModalNovoAviso() {
  document.getElementById('form-aviso').reset();
  document.getElementById('aviso-dataPrevisao').value = new Date().toISOString().split('T')[0];
  openModal('modal-aviso');
}

/**
 * Salva novo comunicado / aviso
 */
async function salvarAviso(event) {
  event.preventDefault();

  const titulo = document.getElementById('aviso-titulo').value.trim();
  const descricao = document.getElementById('aviso-descricao').value.trim();
  const tipo = document.getElementById('aviso-tipo').value;
  const prioridade = document.getElementById('aviso-prioridade').value;
  const autor = document.getElementById('aviso-autor').value.trim();
  const dataPrevisao = document.getElementById('aviso-dataPrevisao').value || null;

  const payload = {
    titulo,
    descricao,
    tipo,
    prioridade,
    autor,
    dataPrevisao
  };

  try {
    const res = await fetch('/api/avisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeModal('modal-aviso');
      carregarAvisos();
      carregarDashboardGeral();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar aviso:', error);
    showToast('Falha na comunicação com o servidor', 'error');
  }
}

/**
 * Marca aviso como resolvido
 */
async function resolverAviso(id) {
  try {
    const res = await fetch(`/api/avisos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolvido' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Aviso concluído e arquivado com sucesso!', 'success');
      carregarAvisos();
      carregarDashboardGeral();
    }
  } catch (e) {
    showToast('Erro ao resolver aviso', 'error');
  }
}

/**
 * Exclui aviso
 */
function excluirAviso(id) {
  pedirConfirmacaoExclusao(`Deseja realmente excluir este comunicado #${id}?`, async () => {
    try {
      const res = await fetch(`/api/avisos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        carregarAvisos();
        carregarDashboardGeral();
      }
    } catch (e) {
      showToast('Erro ao excluir aviso', 'error');
    }
  });
}
