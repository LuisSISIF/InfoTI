/**
 * InfoTI - Core App JS
 * Navegação SPA, controle de modais, toasts, relógio e status do sistema
 */

// Estado global da aplicação
const App = {
  currentView: 'inicio',
  dbConnected: false,
  deleteCallback: null,
  theme: localStorage.getItem('infoti-theme') || 'dark'
};

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  initSidebar();
  checkDatabaseStatus();
  setInterval(checkDatabaseStatus, 30000); // Polling a cada 30s
  
  // Carregar tela inicial
  navigateTo('inicio');
});

/**
 * Controle de Tema (Claro / Escuro)
 */
function initTheme() {
  const savedTheme = localStorage.getItem('infoti-theme') || 'dark';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  showToast(`Tema ${newTheme === 'light' ? 'Claro' : 'Escuro'} ativado!`, 'info');
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  if (isLight) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
  localStorage.setItem('infoti-theme', theme);

  // Atualizar ícone e texto do botão no header
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if (icon) {
    icon.className = isLight ? 'fa-solid fa-moon text-blue-500 text-xs' : 'fa-solid fa-sun text-amber-400 text-xs';
  }
  if (label) {
    label.textContent = isLight ? 'Tema Escuro' : 'Tema Claro';
  }
}

/**
 * Navegação entre telas do menu lateral
 */
function navigateTo(viewName) {
  App.currentView = viewName;

  // Atualizar botões do menu lateral
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-subitem').forEach(el => el.classList.remove('active'));

  // Esconder todas as seções
  ['inicio', 'demandas', 'impressoras', 'historico-contagens', 'computadores', 'licencas', 'ramais'].forEach(v => {
    const sec = document.getElementById(`section-${v}`);
    if (sec) sec.classList.add('hidden');
  });

  // Mostrar seção atual
  const activeSection = document.getElementById(`section-${viewName}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // 1. Gerenciar submenu de Computadores (Inventário de Licenças)
  const subnavMaquinas = document.getElementById('subnav-maquinas');
  const arrowMaquinas = document.getElementById('nav-arrow-computadores');

  if (viewName === 'computadores' || viewName === 'licencas') {
    if (subnavMaquinas) subnavMaquinas.classList.remove('hidden');
    if (arrowMaquinas) arrowMaquinas.classList.add('rotate-180');
  } else {
    if (subnavMaquinas) subnavMaquinas.classList.add('hidden');
    if (arrowMaquinas) arrowMaquinas.classList.remove('rotate-180');
  }

  // 2. Gerenciar submenu de Impressoras (Histórico de Contagens)
  const subnavImpressoras = document.getElementById('subnav-impressoras');
  const arrowImpressoras = document.getElementById('nav-arrow-impressoras');

  if (viewName === 'impressoras' || viewName === 'historico-contagens') {
    if (subnavImpressoras) subnavImpressoras.classList.remove('hidden');
    if (arrowImpressoras) arrowImpressoras.classList.add('rotate-180');
  } else {
    if (subnavImpressoras) subnavImpressoras.classList.add('hidden');
    if (arrowImpressoras) arrowImpressoras.classList.remove('rotate-180');
  }

  // Ativar item correspondente
  if (viewName === 'licencas') {
    const parentComp = document.getElementById('nav-computadores');
    if (parentComp) parentComp.classList.add('active');
    const subBtn = document.getElementById('nav-licencas-sub');
    if (subBtn) subBtn.classList.add('active');
  } else if (viewName === 'historico-contagens') {
    const parentImp = document.getElementById('nav-impressoras');
    if (parentImp) parentImp.classList.add('active');
    const subBtn = document.getElementById('nav-historico-sub');
    if (subBtn) subBtn.classList.add('active');
  } else {
    const navBtn = document.getElementById(`nav-${viewName}`);
    if (navBtn) navBtn.classList.add('active');
  }

  // Atualizar título e subtítulo no topo
  updateHeaderTitle(viewName);

  // Fechar sidebar em telas pequenas após o clique
  closeSidebar();

  // Carregar dados da view correspondente
  loadViewData(viewName);
}

/**
 * Atualiza o título e ícone do cabeçalho da página
 */
function updateHeaderTitle(viewName) {
  const titleEl = document.getElementById('page-title');
  const subEl = document.getElementById('page-subtitle');
  if (!titleEl || !subEl) return;

  switch (viewName) {
    case 'inicio':
      titleEl.innerHTML = '<i class="fa-solid fa-chart-line text-cyan-400"></i> Início & Notificações';
      subEl.textContent = 'Painel de controle geral e avisos do setor de TI';
      break;
    case 'demandas':
      titleEl.innerHTML = '<i class="fa-solid fa-list-check text-cyan-400"></i> Gestão de Demandas & Tarefas';
      subEl.textContent = 'Rotinas de TI, execuções do dia, prazos, recorrências e pendências';
      break;
    case 'impressoras':
      titleEl.innerHTML = '<i class="fa-solid fa-print text-blue-400"></i> Controle de Impressoras';
      subEl.textContent = 'Parque de impressão, IPs de rede, custos por folha e contagem mensal';
      break;
    case 'historico-contagens':
      titleEl.innerHTML = '<i class="fa-solid fa-clock-rotate-left text-blue-400"></i> Histórico de Contagens';
      subEl.textContent = 'Consulta de contagens mensais por mês e ano e exportação para Excel';
      break;
    case 'computadores':
      titleEl.innerHTML = '<i class="fa-solid fa-desktop text-emerald-400"></i> Controle de Máquinas';
      subEl.textContent = 'Estações de trabalho, monitoramento de backups e service tags';
      break;
    case 'licencas':
      titleEl.innerHTML = '<i class="fa-solid fa-id-card-clip text-purple-400"></i> Inventário de Licenças';
      subEl.textContent = 'Softwares corporativos, chaves de ativação e máquinas associadas';
      break;
    case 'ramais':
      titleEl.innerHTML = '<i class="fa-solid fa-phone-volume text-amber-400"></i> Ramais Telefônicos';
      subEl.textContent = 'Diretório e lista de discagem rápida dos setores';
      break;
  }
}

/**
 * Dispara o carregamento dos dados da view ativa
 */
function loadViewData(viewName) {
  switch (viewName) {
    case 'inicio':
      carregarDashboardGeral();
      carregarAvisos();
      break;
    case 'demandas':
      if (typeof carregarDemandas === 'function') carregarDemandas();
      break;
    case 'impressoras':
      carregarImpressoras();
      break;
    case 'historico-contagens':
      carregarHistoricoContagens();
      preencherMesesDisponiveis();
      break;
    case 'computadores':
      carregarComputadores();
      break;
    case 'licencas':
      carregarLicencas();
      break;
    case 'ramais':
      carregarRamais();
      break;
  }
}

/**
 * Botão Atualizar do Header
 */
function refreshCurrentView() {
  loadViewData(App.currentView);
  showToast('Dados atualizados com sucesso!', 'info');
}

/**
 * Botão Sincronizar Tudo do Rodapé da Sidebar
 */
function refreshAllData() {
  checkDatabaseStatus();
  loadViewData(App.currentView);
  showToast('Sincronização geral concluída!', 'success');
}

/**
 * Checagem de status de conexão com o banco MySQL
 */
async function checkDatabaseStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const isOk = data.database && data.database.success;
    App.dbConnected = isOk;

    const pingEl = document.getElementById('db-status-ping');
    const dotEl = document.getElementById('db-status-dot');
    const labelEl = document.getElementById('db-status-label');

    if (isOk) {
      if (pingEl) pingEl.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
      if (dotEl) dotEl.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
      if (labelEl) {
        labelEl.className = 'text-emerald-400 text-[10px] font-mono';
        labelEl.textContent = 'Online :3306';
      }
    } else {
      if (pingEl) pingEl.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75';
      if (dotEl) dotEl.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
      if (labelEl) {
        labelEl.className = 'text-rose-400 text-[10px] font-mono';
        labelEl.textContent = 'Erro Conexão';
      }
    }
  } catch (e) {
    App.dbConnected = false;
  }
}

/**
 * Sidebar para mobile
 */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('open-sidebar-btn');
  const closeBtn = document.getElementById('close-sidebar-btn');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    });
  }

  function close() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}

/**
 * Relógio digital em tempo real
 */
function initLiveClock() {
  function update() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${d}/${m}/${y} • ${h}:${min}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

/**
 * Controle de Modais
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

/**
 * Confirmação de exclusão universal
 */
function pedirConfirmacaoExclusao(mensagem, onConfirm) {
  const modal = document.getElementById('modal-confirm-delete');
  const msgEl = document.getElementById('confirm-delete-msg');
  const execBtn = document.getElementById('btn-confirm-delete-exec');

  if (msgEl) msgEl.textContent = mensagem;

  execBtn.onclick = async () => {
    closeModal('modal-confirm-delete');
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  };

  openModal('modal-confirm-delete');
}

/**
 * Sistema de Notificações Toast
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-msg';

  let icon = 'fa-solid fa-circle-info text-cyan-400';
  let border = 'border-cyan-500/30';

  if (type === 'success') {
    icon = 'fa-solid fa-circle-check text-emerald-400';
    border = 'border-emerald-500/30';
  } else if (type === 'error') {
    icon = 'fa-solid fa-triangle-exclamation text-rose-400';
    border = 'border-rose-500/30';
  } else if (type === 'warning') {
    icon = 'fa-solid fa-circle-exclamation text-amber-400';
    border = 'border-amber-500/30';
  }

  toast.classList.add(border);
  toast.innerHTML = `
    <i class="${icon} text-base shrink-0"></i>
    <span class="text-xs font-medium text-gray-200">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Helper para formatar moeda brasileira
 */
function formatarMoeda(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Helper para formatar data (YYYY-MM-DD -> DD/MM/YYYY)
 */
function formatarDataBR(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Helper para copiar texto para área de transferência
 */
function copiarTexto(texto, label = 'Texto') {
  navigator.clipboard.writeText(texto).then(() => {
    showToast(`${label} copiado para a área de transferência!`, 'success');
  }).catch(() => {
    showToast(`Não foi possível copiar ${label}`, 'error');
  });
}
