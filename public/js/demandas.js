/**
 * InfoTI - Módulo de Gestão de Demandas & Tarefas de TI
 * Gerencia ocorrências diárias, tarefas matriz, regras de recorrência e ações rápidas
 */

const demandaEstado = {
  modo: 'execucoes', // 'execucoes' | 'tarefas'
  filtroData: 'hoje', // 'hoje' | 'semana' | 'mes' | 'todas' | 'custom'
  dataPersonalizada: '',
  filtroStatus: 'Todos',
  filtroPrioridade: 'Todas',
  filtroTarefaId: '',
  filtroBusca: '',
  execucoesCache: [],
  tarefasCache: []
};

/**
 * Função principal chamada ao navegar para a tela de Demandas ou ao sincronizar
 */
async function carregarDemandas() {
  await carregarDashboardDemandas();
  await carregarSelectTarefasFiltro();
  
  if (demandaEstado.modo === 'execucoes') {
    await carregarExecucoes();
  } else {
    await carregarTarefasMatriz();
  }
}

/**
 * Carrega indicadores do dashboard do dia e atualiza cards de KPI
 */
async function carregarDashboardDemandas() {
  try {
    // Determinar data de referência para o KPI (hoje por padrão)
    const hojeStr = new Date().toISOString().split('T')[0];
    const dataRef = demandaEstado.filtroData === 'custom' && demandaEstado.dataPersonalizada
      ? demandaEstado.dataPersonalizada
      : hojeStr;

    const res = await fetch(`/api/demandas/dashboard?data=${dataRef}`);
    const result = await res.json();

    if (result.success) {
      const d = result.data;

      // Atualizar números
      const totalEl = document.getElementById('kpi-demandas-total');
      const pendentesEl = document.getElementById('kpi-demandas-pendentes');
      const concluidasEl = document.getElementById('kpi-demandas-concluidas');
      const atrasadasEl = document.getElementById('kpi-demandas-atrasadas');
      const atrasadasSubEl = document.getElementById('kpi-demandas-atrasadas-sub');
      const pulseEl = document.getElementById('badge-pulse-atrasadas');
      const cardAtrasadas = document.getElementById('card-kpi-atrasadas');

      if (totalEl) totalEl.textContent = d.totalDia;
      if (pendentesEl) pendentesEl.textContent = d.pendentesDia;
      if (concluidasEl) concluidasEl.textContent = d.concluidasDia;
      
      // Atrasadas do dia ou geral
      const qtdAtrasadas = d.atrasadasDia > 0 ? d.atrasadasDia : d.totalAtrasadasGeral;
      if (atrasadasEl) atrasadasEl.textContent = qtdAtrasadas;

      if (atrasadasSubEl) {
        atrasadasSubEl.innerHTML = d.atrasadasDia > 0 
          ? `<i class="fa-solid fa-triangle-exclamation"></i> ${d.atrasadasDia} no dia de hoje`
          : (d.totalAtrasadasGeral > 0 ? `<i class="fa-solid fa-circle-exclamation"></i> ${d.totalAtrasadasGeral} no histórico geral` : '<i class="fa-solid fa-check"></i> Nenhuma atrasada!');
      }

      if (pulseEl) {
        if (qtdAtrasadas > 0) {
          pulseEl.classList.remove('hidden');
          if (cardAtrasadas) cardAtrasadas.classList.add('border-rose-500/50', 'bg-rose-950/10');
        } else {
          pulseEl.classList.add('hidden');
          if (cardAtrasadas) cardAtrasadas.classList.remove('border-rose-500/50', 'bg-rose-950/10');
        }
      }

      // Atualizar badge no menu lateral
      const badgeNav = document.getElementById('badge-demandas-atrasadas');
      if (badgeNav) {
        if (d.totalAtrasadasGeral > 0) {
          badgeNav.textContent = `${d.totalAtrasadasGeral} atrasada${d.totalAtrasadasGeral > 1 ? 's' : ''}`;
          badgeNav.className = 'ml-auto bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse';
          badgeNav.classList.remove('hidden');
        } else if (d.pendentesDia > 0) {
          badgeNav.textContent = `${d.pendentesDia}`;
          badgeNav.className = 'ml-auto bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30';
          badgeNav.classList.remove('hidden');
        } else {
          badgeNav.classList.add('hidden');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao compilar dashboard de demandas:', error);
  }
}

/**
 * Carrega a lista de tarefas matriz para popular o dropdown de filtro
 */
async function carregarSelectTarefasFiltro() {
  try {
    const res = await fetch('/api/demandas/tarefas');
    const result = await res.json();
    if (result.success) {
      demandaEstado.tarefasCache = result.data;
      const select = document.getElementById('filtro-demanda-tarefa-pai');
      if (!select) return;

      const valorAtual = select.value;
      select.innerHTML = '<option value="">Todas as Demandas Cadastradas</option>';
      result.data.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `#${t.id} - ${t.titulo} (${formatarTipoRecorrencia(t.tipo_recorrencia, t.intervalo, t.unidade_intervalo)})`;
        select.appendChild(opt);
      });
      select.value = valorAtual;

      // Atualizar badge da aba de tarefas matriz
      const badgeTabTarefas = document.getElementById('badge-tab-tarefas-count');
      if (badgeTabTarefas) badgeTabTarefas.textContent = result.data.length;
    }
  } catch (e) {
    console.error('Erro ao carregar lista de tarefas para filtro:', e);
  }
}

/**
 * Carrega e renderiza a tabela de Execuções de Demandas
 */
async function carregarExecucoes() {
  const tbody = document.getElementById('tabela-execucoes-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-8 text-gray-400">
        <i class="fa-solid fa-spinner fa-spin text-cyan-400 text-lg mr-2"></i> Consultando agenda e execuções no banco...
      </td>
    </tr>
  `;

  try {
    // Montar parâmetros de busca
    const params = new URLSearchParams();

    // Filtros de Data
    const hoje = new Date();
    const hojeFmt = hoje.toISOString().split('T')[0];

    if (demandaEstado.filtroData === 'hoje') {
      params.append('data', hojeFmt);
      atualizarLabelPeriodo('Execuções Agendadas (Hoje)');
    } else if (demandaEstado.filtroData === 'semana') {
      // Início da semana (domingo ou segunda) até fim da semana
      const primeiroDia = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
      const ultimoDia = new Date(hoje.setDate(hoje.getDate() - hoje.getDay() + 6));
      params.append('dataInicio', primeiroDia.toISOString().split('T')[0]);
      params.append('dataFim', ultimoDia.toISOString().split('T')[0]);
      atualizarLabelPeriodo('Execuções Agendadas (Esta Semana)');
    } else if (demandaEstado.filtroData === 'mes') {
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
      params.append('dataInicio', primeiroDiaMes);
      params.append('dataFim', ultimoDiaMes);
      atualizarLabelPeriodo('Execuções Agendadas (Este Mês)');
    } else if (demandaEstado.filtroData === 'custom' && demandaEstado.dataPersonalizada) {
      params.append('data', demandaEstado.dataPersonalizada);
      atualizarLabelPeriodo(`Execuções em: ${formatarDataSimples(demandaEstado.dataPersonalizada)}`);
    } else {
      atualizarLabelPeriodo('Todas as Execuções Agendadas');
    }

    if (demandaEstado.filtroStatus && demandaEstado.filtroStatus !== 'Todos') {
      params.append('status', demandaEstado.filtroStatus);
    }

    if (demandaEstado.filtroPrioridade && demandaEstado.filtroPrioridade !== 'Todas') {
      params.append('prioridade', demandaEstado.filtroPrioridade);
    }

    if (demandaEstado.filtroTarefaId) {
      params.append('tarefaId', demandaEstado.filtroTarefaId);
    }

    if (demandaEstado.filtroBusca) {
      params.append('search', demandaEstado.filtroBusca);
    }

    const res = await fetch(`/api/demandas/execucoes?${params.toString()}`);
    const result = await res.json();

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-rose-400">${result.message || 'Erro ao carregar execuções'}</td></tr>`;
      return;
    }

    const execucoes = result.data || [];
    demandaEstado.execucoesCache = execucoes;

    // Atualizar contadores
    const countEl = document.getElementById('contador-execucoes-visiveis');
    if (countEl) countEl.textContent = `${execucoes.length} registro(s)`;

    const badgeTab = document.getElementById('badge-tab-execucoes-count');
    if (badgeTab) badgeTab.textContent = execucoes.length;

    if (execucoes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10">
            <div class="max-w-sm mx-auto text-center space-y-2">
              <div class="w-12 h-12 rounded-xl bg-gray-800 text-gray-500 flex items-center justify-center mx-auto text-xl">
                <i class="fa-solid fa-calendar-xmark"></i>
              </div>
              <p class="text-sm font-semibold text-gray-300">Nenhuma demanda encontrada neste filtro</p>
              <p class="text-xs text-gray-500">Tente alterar o período de data selecionado ou adicione uma nova tarefa.</p>
              <button onclick="abrirModalNovaTarefa()" class="mt-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium inline-flex items-center gap-1.5">
                <i class="fa-solid fa-plus"></i> Cadastrar Demanda
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = execucoes.map(e => {
      // Badge de Status Atual (utilizando a regra requisitada: atrasada se pendente e data_prevista < NOW())
      let statusBadge = '';
      if (e.status_atual === 'atrasada') {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse shadow-sm shadow-rose-500/20" title="Demanda pendente que já ultrapassou o horário previsto!">
            <i class="fa-solid fa-clock-rotate-left"></i> Atrasada
          </span>
        `;
      } else if (e.status_atual === 'pendente') {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40" title="Aguardando atendimento">
            <i class="fa-regular fa-clock"></i> Pendente
          </span>
        `;
      } else if (e.status_atual === 'concluida') {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" title="Finalizada com êxito">
            <i class="fa-solid fa-check"></i> Concluída
          </span>
        `;
      } else {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-600/20 text-gray-400 border border-gray-600/40" title="Cancelada">
            <i class="fa-solid fa-ban"></i> Cancelada
          </span>
        `;
      }

      // Badge de Prioridade
      const prioBadge = formatarBadgePrioridade(e.prioridade);

      // Badge de Recorrência
      const recBadge = formatarBadgeRecorrencia(e.tipo_recorrencia);

      // Data Prevista Formatada
      const dataPrevistaFmt = formatarDataHora(e.data_prevista);

      // Data de Conclusão Formatada
      const dataConclusaoFmt = e.data_conclusao 
        ? `<span class="text-emerald-400 font-mono text-[11px] flex items-center gap-1"><i class="fa-solid fa-check-double text-[10px]"></i> ${formatarDataHora(e.data_conclusao)}</span>` 
        : '<span class="text-gray-500 text-xs">-</span>';

      // Observações Técnicas
      const observacaoTxt = e.observacao_execucao 
        ? `<span class="text-gray-300 text-xs line-clamp-1" title="${escaparHtml(e.observacao_execucao)}">${escaparHtml(e.observacao_execucao)}</span>`
        : '<span class="text-gray-500 text-xs italic">Sem observações</span>';

      // Botão Rápido de Concluir (1 clique)
      const botaoConcluirRapido = e.status_atual !== 'concluida'
        ? `
          <button onclick="concluirExecucaoRapido(${e.execucao_id})" class="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95" title="Concluir demanda em 1 clique">
            <i class="fa-solid fa-check"></i>
            <span>Concluir</span>
          </button>
        `
        : `
          <span class="text-[11px] text-emerald-400 font-mono flex items-center gap-1 px-2 py-1">
            <i class="fa-solid fa-circle-check"></i> OK
          </span>
        `;

      return `
        <tr class="hover:bg-white/[0.02] transition-colors ${e.status_atual === 'atrasada' ? 'bg-rose-950/10' : ''}">
          <td>${statusBadge}</td>
          
          <td>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-xs sm:text-sm hover:text-cyan-400 cursor-pointer" onclick="abrirModalEditarExecucao(${e.execucao_id})">
                  ${escaparHtml(e.tarefa_titulo)}
                </span>
                ${recBadge}
              </div>
              ${e.tarefa_descricao ? `<p class="text-[11px] text-gray-400 line-clamp-1">${escaparHtml(e.tarefa_descricao)}</p>` : ''}
            </div>
          </td>

          <td class="font-mono text-xs text-gray-200">
            <div class="flex items-center gap-1.5">
              <i class="fa-regular fa-clock text-gray-500 text-[10px]"></i>
              <span class="${e.status_atual === 'atrasada' ? 'text-rose-400 font-bold' : ''}">${dataPrevistaFmt}</span>
            </div>
          </td>

          <td>${prioBadge}</td>

          <td>${dataConclusaoFmt}</td>

          <td class="max-w-[200px]">${observacaoTxt}</td>

          <td class="text-right">
            <div class="flex items-center justify-end gap-1.5">
              ${botaoConcluirRapido}
              
              <button onclick="abrirModalEditarExecucao(${e.execucao_id})" class="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800 transition-colors" title="Editar Execução / Adicionar Observação">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>

              <button onclick="confirmarExcluirExecucao(${e.execucao_id})" class="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-gray-800 transition-colors" title="Excluir Ocorrência">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao renderizar execuções:', error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-rose-400">Falha ao se comunicar com o servidor.</td></tr>`;
  }
}

/**
 * Carrega e renderiza a tabela de Tarefas Matriz (Regras e Recorrências)
 */
async function carregarTarefasMatriz() {
  const tbody = document.getElementById('tabela-tarefas-matriz-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-8 text-gray-400">
        <i class="fa-solid fa-spinner fa-spin text-purple-400 text-lg mr-2"></i> Consultando tarefas matriz cadastradas...
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams();
    const filtroAtivo = document.getElementById('filtro-tarefa-ativo')?.value || 'Todos';
    const filtroPrioridade = demandaEstado.filtroPrioridade;
    const filtroBusca = demandaEstado.filtroBusca;

    if (filtroAtivo !== 'Todos') params.append('statusAtivo', filtroAtivo);
    if (filtroPrioridade && filtroPrioridade !== 'Todas') params.append('prioridade', filtroPrioridade);
    if (filtroBusca) params.append('search', filtroBusca);

    const res = await fetch(`/api/demandas/tarefas?${params.toString()}`);
    const result = await res.json();

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-rose-400">${result.message || 'Erro ao carregar tarefas'}</td></tr>`;
      return;
    }

    const tarefas = result.data || [];
    demandaEstado.tarefasCache = tarefas;

    const countEl = document.getElementById('contador-tarefas-visiveis');
    if (countEl) countEl.textContent = `${tarefas.length} registro(s)`;

    const badgeTab = document.getElementById('badge-tab-tarefas-count');
    if (badgeTab) badgeTab.textContent = tarefas.length;

    if (tarefas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-10">
            <div class="max-w-sm mx-auto text-center space-y-2">
              <div class="w-12 h-12 rounded-xl bg-gray-800 text-gray-500 flex items-center justify-center mx-auto text-xl">
                <i class="fa-solid fa-list-check"></i>
              </div>
              <p class="text-sm font-semibold text-gray-300">Nenhuma tarefa matriz cadastrada</p>
              <p class="text-xs text-gray-500">Crie regras e rotinas para gerar execuções automáticas.</p>
              <button onclick="abrirModalNovaTarefa()" class="mt-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium inline-flex items-center gap-1.5">
                <i class="fa-solid fa-plus"></i> Cadastrar Primeira Demanda
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tarefas.map(t => {
      const prioBadge = formatarBadgePrioridade(t.prioridade);
      const recBadge = formatarDescricaoRecorrenciaCompleta(t.tipo_recorrencia, t.intervalo, t.unidade_intervalo);
      const proximaFmt = t.proxima_execucao ? formatarDataHora(t.proxima_execucao) : '<span class="text-gray-500 text-xs italic">Não agendada</span>';

      const statusAtivoBadge = t.ativo
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ativa</span>'
        : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-700/30 text-gray-400 border border-gray-600/30"><span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Pausada</span>';

      const execResumo = `
        <div class="text-[11px] font-mono space-y-0.5">
          <span class="text-gray-300 font-bold">${t.total_execucoes || 0} total</span>
          <div class="flex items-center gap-1.5 text-[10px]">
            <span class="text-emerald-400">${t.execucoes_concluidas || 0} ok</span>
            <span class="text-rose-400">${t.execucoes_atrasadas || 0} atrasadas</span>
          </div>
        </div>
      `;

      return `
        <tr class="hover:bg-white/[0.02] transition-colors">
          <td class="font-mono text-xs text-gray-400 font-semibold">#${t.id}</td>

          <td>
            <div class="space-y-0.5">
              <span class="font-bold text-white text-xs sm:text-sm hover:text-cyan-400 cursor-pointer" onclick="abrirModalEditarTarefa(${t.id})">
                ${escaparHtml(t.titulo)}
              </span>
              ${t.descricao ? `<p class="text-[11px] text-gray-400 line-clamp-1">${escaparHtml(t.descricao)}</p>` : ''}
            </div>
          </td>

          <td>${recBadge}</td>

          <td class="font-mono text-xs text-gray-200">${proximaFmt}</td>

          <td>${prioBadge}</td>

          <td>${statusAtivoBadge}</td>

          <td>${execResumo}</td>

          <td class="text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="filtrarExecucoesPorTarefa(${t.id})" class="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800 transition-colors" title="Ver Execuções desta Tarefa">
                <i class="fa-solid fa-list-ul"></i>
              </button>

              <button onclick="abrirModalEditarTarefa(${t.id})" class="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800 transition-colors" title="Editar Regra Matriz">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>

              <button onclick="confirmarExcluirTarefa(${t.id})" class="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-gray-800 transition-colors" title="Excluir Tarefa Matriz e Ocorrências">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao renderizar tarefas matriz:', error);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-rose-400">Falha ao se comunicar com o servidor.</td></tr>`;
  }
}

/**
 * AÇÃO RÁPIDA: Conclui uma execução em 1 clique
 * Não precisa abrir modal nenhum e já agenda a próxima se for recorrente
 */
async function concluirExecucaoRapido(id) {
  try {
    const res = await fetch(`/api/demandas/execucoes/${id}/concluir`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Demanda concluída com sucesso!', 'success');
      // Recarregar dashboard e tabela
      await carregarDashboardDemandas();
      await carregarExecucoes();
    } else {
      showToast(result.message || 'Erro ao concluir demanda', 'error');
    }
  } catch (error) {
    console.error('Erro ao concluir execução rápido:', error);
    showToast('Erro de conexão ao concluir demanda', 'error');
  }
}

/**
 * Alterna entre os modos de visualização: 'execucoes' e 'tarefas'
 */
function alternarModoDemandas(modo) {
  demandaEstado.modo = modo;

  const btnExecucoes = document.getElementById('tab-modo-execucoes');
  const btnTarefas = document.getElementById('tab-modo-tarefas');
  const viewExecucoes = document.getElementById('view-demandas-execucoes');
  const viewTarefas = document.getElementById('view-demandas-tarefas');
  const toolbarDatas = document.getElementById('toolbar-datas-execucoes');
  const toolbarTarefas = document.getElementById('toolbar-tarefas-matriz');
  const containerStatus = document.getElementById('container-filtro-status');
  const containerPai = document.getElementById('container-filtro-tarefa-pai');

  if (modo === 'execucoes') {
    if (btnExecucoes) {
      btnExecucoes.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-500/20 border border-cyan-500/30 transition-all flex items-center gap-2';
    }
    if (btnTarefas) {
      btnTarefas.className = 'px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all flex items-center gap-2';
    }
    if (viewExecucoes) viewExecucoes.classList.remove('hidden');
    if (viewTarefas) viewTarefas.classList.add('hidden');
    if (toolbarDatas) toolbarDatas.classList.remove('hidden');
    if (toolbarTarefas) toolbarTarefas.classList.add('hidden');
    if (containerStatus) containerStatus.classList.remove('hidden');
    if (containerPai) containerPai.classList.remove('hidden');

    carregarExecucoes();
  } else {
    if (btnExecucoes) {
      btnExecucoes.className = 'px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all flex items-center gap-2';
    }
    if (btnTarefas) {
      btnTarefas.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-500/20 border border-purple-500/30 transition-all flex items-center gap-2';
    }
    if (viewExecucoes) viewExecucoes.classList.add('hidden');
    if (viewTarefas) viewTarefas.classList.remove('hidden');
    if (toolbarDatas) toolbarDatas.classList.add('hidden');
    if (toolbarTarefas) toolbarTarefas.classList.remove('hidden');
    if (containerStatus) containerStatus.classList.add('hidden');
    if (containerPai) containerPai.classList.add('hidden');

    carregarTarefasMatriz();
  }
}

/**
 * Altera filtro de período (Hoje, Esta Semana, Este Mês, Todas)
 */
function aplicarFiltroDataDemandas(tipo) {
  demandaEstado.filtroData = tipo;
  demandaEstado.dataPersonalizada = '';

  const inputCustom = document.getElementById('filtro-demanda-data-input');
  if (inputCustom) inputCustom.value = '';

  // Atualizar visual dos botões
  ['hoje', 'semana', 'mes', 'todas-datas'].forEach(id => {
    const btn = document.getElementById(`btn-filtro-${id}`);
    if (btn) {
      btn.className = 'px-2.5 py-1 text-xs rounded-md bg-gray-900 text-gray-400 hover:text-white border border-[#1F293D] font-medium transition-colors';
    }
  });

  const btnAtivo = document.getElementById(`btn-filtro-${tipo === 'todas' ? 'todas-datas' : tipo}`);
  if (btnAtivo) {
    btnAtivo.className = 'px-2.5 py-1 text-xs rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-medium transition-colors';
  }

  carregarDashboardDemandas();
  carregarExecucoes();
}

/**
 * Aplica data personalizada selecionada no input type="date"
 */
function aplicarDataPersonalizada(valor) {
  if (!valor) return;
  demandaEstado.filtroData = 'custom';
  demandaEstado.dataPersonalizada = valor;

  // Desativar botões rápidos
  ['hoje', 'semana', 'mes', 'todas-datas'].forEach(id => {
    const btn = document.getElementById(`btn-filtro-${id}`);
    if (btn) {
      btn.className = 'px-2.5 py-1 text-xs rounded-md bg-gray-900 text-gray-400 hover:text-white border border-[#1F293D] font-medium transition-colors';
    }
  });

  carregarDashboardDemandas();
  carregarExecucoes();
}

/**
 * Aplica filtros de Status, Prioridade, Demanda Matriz ou Busca
 */
function aplicarFiltrosDemandas() {
  const statusEl = document.getElementById('filtro-demanda-status');
  const prioEl = document.getElementById('filtro-demanda-prioridade');
  const paiEl = document.getElementById('filtro-demanda-tarefa-pai');
  const buscaEl = document.getElementById('filtro-demanda-busca');

  if (statusEl) demandaEstado.filtroStatus = statusEl.value;
  if (prioEl) demandaEstado.filtroPrioridade = prioEl.value;
  if (paiEl) demandaEstado.filtroTarefaId = paiEl.value;
  if (buscaEl) demandaEstado.filtroBusca = buscaEl.value.trim();

  if (demandaEstado.modo === 'execucoes') {
    carregarExecucoes();
  } else {
    carregarTarefasMatriz();
  }
}

/**
 * Filtra as execuções por uma tarefa específica e troca para o modo Execuções
 */
function filtrarExecucoesPorTarefa(tarefaId) {
  demandaEstado.filtroTarefaId = tarefaId;
  const selectPai = document.getElementById('filtro-demanda-tarefa-pai');
  if (selectPai) selectPai.value = tarefaId;

  // Aplicar Todas as Datas para ver o histórico e futuro dessa tarefa específica
  aplicarFiltroDataDemandas('todas');
  alternarModoDemandas('execucoes');
  showToast(`Filtrando execuções da Tarefa #${tarefaId}`, 'info');
}

/**
 * Abre o modal de cadastro de Nova Tarefa Matriz
 */
function abrirModalNovaTarefa() {
  const form = document.getElementById('form-tarefa');
  if (form) form.reset();

  document.getElementById('tarefa-id').value = '';
  document.getElementById('modal-tarefa-titulo').innerHTML = '<i class="fa-solid fa-list-check text-cyan-400"></i> Nova Tarefa / Demanda';
  document.getElementById('btn-salvar-tarefa').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Demanda';

  // Exibir bloco de observação inicial
  const obsBlock = document.getElementById('container-tarefa-obs-inicial');
  if (obsBlock) obsBlock.classList.remove('hidden');

  // Definir data e hora padrão para agora (arredondado para próxima hora)
  const agora = new Date();
  agora.setMinutes(0, 0, 0);
  agora.setHours(agora.getHours() + 1);
  const dataInicioInput = document.getElementById('tarefa-data-inicio');
  if (dataInicioInput) {
    dataInicioInput.value = toInputDateTimeLocal(agora);
  }

  // Resetar recorrência
  aoMudarTipoRecorrencia('unica');

  openModal('modal-tarefa');
}

/**
 * Abre o modal para editar uma Tarefa Matriz existente
 */
async function abrirModalEditarTarefa(id) {
  try {
    const res = await fetch(`/api/demandas/tarefas/${id}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      showToast(result.message || 'Erro ao carregar dados da tarefa', 'error');
      return;
    }

    const t = result.data;
    document.getElementById('tarefa-id').value = t.id;
    document.getElementById('tarefa-titulo').value = t.titulo || '';
    document.getElementById('tarefa-descricao').value = t.descricao || '';
    document.getElementById('tarefa-prioridade').value = t.prioridade || 'media';
    document.getElementById('tarefa-tipo-recorrencia').value = t.tipo_recorrencia || 'unica';
    document.getElementById('tarefa-intervalo').value = t.intervalo || 1;
    document.getElementById('tarefa-unidade-intervalo').value = t.unidade_intervalo || 'dias';
    document.getElementById('tarefa-ativo').checked = t.ativo ? true : false;

    if (t.data_inicio) {
      document.getElementById('tarefa-data-inicio').value = toInputDateTimeLocal(t.data_inicio);
    }

    // Esconder bloco de observação inicial na edição da matriz
    const obsBlock = document.getElementById('container-tarefa-obs-inicial');
    if (obsBlock) obsBlock.classList.add('hidden');

    aoMudarTipoRecorrencia(t.tipo_recorrencia || 'unica');

    document.getElementById('modal-tarefa-titulo').innerHTML = `<i class="fa-solid fa-pen-to-square text-purple-400"></i> Editar Demanda Matriz #${t.id}`;
    document.getElementById('btn-salvar-tarefa').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar Matriz';

    openModal('modal-tarefa');
  } catch (error) {
    console.error('Erro ao abrir modal de edição de tarefa:', error);
    showToast('Erro ao buscar dados da tarefa', 'error');
  }
}

/**
 * Salva (cria ou atualiza) uma Tarefa Matriz
 */
async function salvarTarefa(event) {
  event.preventDefault();

  const id = document.getElementById('tarefa-id').value;
  const titulo = document.getElementById('tarefa-titulo').value.trim();
  const descricao = document.getElementById('tarefa-descricao').value.trim();
  const prioridade = document.getElementById('tarefa-prioridade').value;
  const tipo_recorrencia = document.getElementById('tarefa-tipo-recorrencia').value;
  const intervalo = parseInt(document.getElementById('tarefa-intervalo').value || 1, 10);
  const unidade_intervalo = document.getElementById('tarefa-unidade-intervalo').value;
  const data_inicio = document.getElementById('tarefa-data-inicio').value;
  const ativo = document.getElementById('tarefa-ativo').checked;
  const observacao_inicial = document.getElementById('tarefa-obs-inicial')?.value.trim() || '';

  if (!titulo || !data_inicio) {
    showToast('Preencha os campos obrigatórios (Título e Data de Início)', 'error');
    return;
  }

  const payload = {
    titulo,
    descricao,
    prioridade,
    tipo_recorrencia,
    intervalo,
    unidade_intervalo,
    data_inicio,
    ativo,
    observacao_inicial
  };

  const btnSalvar = document.getElementById('btn-salvar-tarefa');
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gravando...';
  }

  try {
    const url = id ? `/api/demandas/tarefas/${id}` : '/api/demandas/tarefas';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Tarefa gravada com sucesso!', 'success');
      closeModal('modal-tarefa');
      await carregarDemandas();
    } else {
      showToast(result.message || 'Erro ao gravar tarefa', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar tarefa:', error);
    showToast('Erro de conexão ao gravar tarefa', 'error');
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Demanda';
    }
  }
}

/**
 * Abre o modal para editar uma Execução específica
 */
async function abrirModalEditarExecucao(id) {
  try {
    const res = await fetch(`/api/demandas/execucoes/${id}`);
    const result = await res.json();

    if (!result.success || !result.data) {
      showToast(result.message || 'Erro ao carregar dados da execução', 'error');
      return;
    }

    const e = result.data;
    document.getElementById('exec-id').value = e.id;
    document.getElementById('exec-info-tarefa').innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-cyan-300">#${e.tarefa_id} - ${escaparHtml(e.tarefa_titulo)}</span>
        ${formatarBadgeRecorrencia(e.tipo_recorrencia)}
      </div>
      ${e.tarefa_descricao ? `<p class="text-[11px] text-gray-400 mt-1">${escaparHtml(e.tarefa_descricao)}</p>` : ''}
    `;

    document.getElementById('exec-data-prevista').value = toInputDateTimeLocal(e.data_prevista);
    document.getElementById('exec-status').value = e.status;
    document.getElementById('exec-data-conclusao').value = e.data_conclusao ? toInputDateTimeLocal(e.data_conclusao) : '';
    document.getElementById('exec-observacao').value = e.observacao || '';

    openModal('modal-execucao');
  } catch (error) {
    console.error('Erro ao abrir modal de execução:', error);
    showToast('Erro ao buscar dados da execução', 'error');
  }
}

/**
 * Salva os dados atualizados da Execução
 */
async function salvarExecucao(event) {
  event.preventDefault();

  const id = document.getElementById('exec-id').value;
  const data_prevista = document.getElementById('exec-data-prevista').value;
  const status = document.getElementById('exec-status').value;
  const data_conclusao = document.getElementById('exec-data-conclusao').value || null;
  const observacao = document.getElementById('exec-observacao').value.trim();

  if (!id || !data_prevista) {
    showToast('Preencha os campos obrigatórios', 'error');
    return;
  }

  const payload = {
    data_prevista,
    status,
    data_conclusao,
    observacao
  };

  const btnSalvar = document.getElementById('btn-salvar-execucao');
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
  }

  try {
    const res = await fetch(`/api/demandas/execucoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Execução atualizada com sucesso!', 'success');
      closeModal('modal-execucao');
      await carregarDashboardDemandas();
      await carregarExecucoes();
    } else {
      showToast(result.message || 'Erro ao atualizar execução', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar execução:', error);
    showToast('Erro de conexão ao salvar execução', 'error');
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Execução';
    }
  }
}

/**
 * Confirma e exclui uma Execução específica
 */
function confirmarExcluirExecucao(id) {
  pedirConfirmacaoExclusao(
    `Deseja realmente excluir esta ocorrência de execução (#${id})? A tarefa matriz continuará existindo normalmente no sistema.`,
    async () => {
      try {
        const res = await fetch(`/api/demandas/execucoes/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          showToast(result.message || 'Execução excluída com sucesso!', 'success');
          await carregarDashboardDemandas();
          await carregarExecucoes();
        } else {
          showToast(result.message || 'Erro ao excluir execução', 'error');
        }
      } catch (e) {
        console.error('Erro ao excluir execução:', e);
        showToast('Erro ao excluir execução', 'error');
      }
    }
  );
}

/**
 * Confirma e exclui uma Tarefa Matriz e todas as suas execuções
 */
function confirmarExcluirTarefa(id) {
  pedirConfirmacaoExclusao(
    `Atenção: Ao excluir a Demanda Matriz #${id}, TODAS as suas execuções vinculadas (passadas e futuras) também serão excluídas definitivamente. Deseja prosseguir?`,
    async () => {
      try {
        const res = await fetch(`/api/demandas/tarefas/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          showToast(result.message || 'Tarefa matriz excluída com sucesso!', 'success');
          await carregarDemandas();
        } else {
          showToast(result.message || 'Erro ao excluir tarefa', 'error');
        }
      } catch (e) {
        console.error('Erro ao excluir tarefa matriz:', e);
        showToast('Erro ao excluir tarefa matriz', 'error');
      }
    }
  );
}

// Fallback universal para compatibilidade
function confirmAction(config) {
  if (typeof pedirConfirmacaoExclusao === 'function') {
    pedirConfirmacaoExclusao(config.message || 'Deseja confirmar a exclusão?', config.onConfirm);
  } else if (confirm(config.message || 'Deseja confirmar a exclusão?')) {
    if (typeof config.onConfirm === 'function') config.onConfirm();
  }
}

/**
 * Manipula mudança de tipo de recorrência no formulário de Tarefa
 */
function aoMudarTipoRecorrencia(tipo) {
  const customBlock = document.getElementById('container-intervalo-custom');
  if (customBlock) {
    if (tipo === 'intervalo') {
      customBlock.classList.remove('hidden');
    } else {
      customBlock.classList.add('hidden');
    }
  }
}

/**
 * Manipula mudança de status no modal de Execução (auto-preenche data de conclusão se 'concluida')
 */
function aoMudarStatusExecucao(status) {
  const dataConclusaoInput = document.getElementById('exec-data-conclusao');
  if (dataConclusaoInput) {
    if (status === 'concluida' && !dataConclusaoInput.value) {
      dataConclusaoInput.value = toInputDateTimeLocal(new Date());
    } else if (status === 'pendente') {
      dataConclusaoInput.value = '';
    }
  }
}

/**
 * Atualiza o rótulo do cabeçalho da tabela de execuções
 */
function atualizarLabelPeriodo(texto) {
  const label = document.getElementById('label-titulo-lista-execucoes');
  if (label) label.textContent = texto;
}

/**
 * Formatadores auxiliares
 */
function formatarBadgePrioridade(prioridade) {
  switch (prioridade) {
    case 'critica':
      return '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">Crítica</span>';
    case 'alta':
      return '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">Alta</span>';
    case 'media':
      return '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">Média</span>';
    case 'baixa':
      return '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40">Baixa</span>';
    default:
      return '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-600/20 text-gray-400">Normal</span>';
  }
}

function formatarBadgeRecorrencia(tipo) {
  switch (tipo) {
    case 'diaria':
      return '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/40">Diária</span>';
    case 'semanal':
      return '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/40 text-purple-400 border border-purple-800/40">Semanal</span>';
    case 'mensal':
      return '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-950/40 text-blue-400 border border-blue-800/40">Mensal</span>';
    case 'anual':
      return '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">Anual</span>';
    case 'intervalo':
      return '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/40 text-indigo-400 border border-indigo-800/40">Intervalo</span>';
    default:
      return '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400">Única</span>';
  }
}

function formatarTipoRecorrencia(tipo, intervalo, unidade) {
  if (tipo === 'intervalo') {
    return `A cada ${intervalo || 1} ${unidade || 'dias'}`;
  }
  const mapa = {
    unica: 'Única',
    diaria: 'Diária',
    semanal: 'Semanal',
    mensal: 'Mensal',
    anual: 'Anual'
  };
  return mapa[tipo] || tipo;
}

function formatarDescricaoRecorrenciaCompleta(tipo, intervalo, unidade) {
  const nome = formatarTipoRecorrencia(tipo, intervalo, unidade);
  return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-900 border border-[#1F293D] text-gray-300"><i class="fa-solid fa-repeat text-cyan-400 text-[10px]"></i> ${nome}</span>`;
}

function formatarDataHora(str) {
  if (!str) return '-';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch (e) {
    return str;
  }
}

function formatarDataSimples(str) {
  if (!str) return '';
  const partes = str.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return str;
}

function toInputDateTimeLocal(dateOrStr) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escaparHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
