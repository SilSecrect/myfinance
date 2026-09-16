/**
 * ============================================================================
 * myFinance - Controle Financeiro Pessoal
 * Vanilla JavaScript (ES6+) - 100% Puro, Sem Dependências
 * ============================================================================
 */

'use strict';

(function () {
  // ==========================================================================
  // CONFIGURAÇÃO & ESTADO GLOBAL
  // ==========================================================================
  const STORAGE_KEY = 'myfinance_db_v1';
  const SETTINGS_KEY = 'myfinance_settings_v1';

  // Categorias padrão com ícones e cores
  const DEFAULT_CATEGORIES = [
    { id: 'cat_alimentacao', name: 'Alimentação', icon: '🍔', color: '#F97316', type: 'expense' },
    { id: 'cat_mercado', name: 'Mercado', icon: '🛒', color: '#10B981', type: 'expense' },
    { id: 'cat_combustivel', name: 'Combustível', icon: '⛽', color: '#EF4444', type: 'expense' },
    { id: 'cat_transporte', name: 'Transporte', icon: '🚗', color: '#3B82F6', type: 'expense' },
    { id: 'cat_casa', name: 'Casa', icon: '🏠', color: '#8B5CF6', type: 'expense' },
    { id: 'cat_lazer', name: 'Lazer', icon: '🎉', color: '#EC4899', type: 'expense' },
    { id: 'cat_saude', name: 'Saúde', icon: '💊', color: '#06B6D4', type: 'expense' },
    { id: 'cat_educacao', name: 'Educação', icon: '📚', color: '#F59E0B', type: 'expense' },
    { id: 'cat_compras', name: 'Compras', icon: '🛍️', color: '#6366F1', type: 'expense' },
    { id: 'cat_assinaturas', name: 'Assinaturas', icon: '📱', color: '#14B8A6', type: 'expense' },
    { id: 'cat_contas', name: 'Contas', icon: '📄', color: '#64748B', type: 'expense' },
    { id: 'cat_viagem', name: 'Viagem', icon: '✈️', color: '#F43F5E', type: 'expense' },
    { id: 'cat_outros_gasto', name: 'Outros Gastos', icon: '💸', color: '#94A3B8', type: 'expense' },

    // Categorias de Receitas
    { id: 'cat_salario', name: 'Salário', icon: '💼', color: '#10B981', type: 'income' },
    { id: 'cat_freelance', name: 'Freelance', icon: '💻', color: '#3B82F6', type: 'income' },
    { id: 'cat_pix', name: 'Pix Recebido', icon: '⚡', color: '#8B5CF6', type: 'income' },
    { id: 'cat_reembolso', name: 'Reembolso', icon: '🔄', color: '#F59E0B', type: 'income' },
    { id: 'cat_investimentos', name: 'Rendimentos', icon: '📈', color: '#06B6D4', type: 'income' },
    { id: 'cat_outros_renda', name: 'Outras Entradas', icon: '💰', color: '#22C55E', type: 'income' }
  ];

  // 5 Cartões iniciais solicitados (com limites em R$ 0,00 para preenchimento real)
  const DEFAULT_CARDS = [
    {
      id: 'card_mercadopago',
      name: 'Mercado Pago',
      type: 'credito',
      limitTotal: 0,
      initialBalance: 0,
      color: '#009EE3',
      digits: '',
      active: true,
      blockOverlimit: false
    },
    {
      id: 'card_nubank',
      name: 'Nubank',
      type: 'credito',
      limitTotal: 0,
      initialBalance: 0,
      color: '#820AD1',
      digits: '',
      active: true,
      blockOverlimit: false
    },
    {
      id: 'card_caixa',
      name: 'Caixa',
      type: 'credito',
      limitTotal: 0,
      initialBalance: 0,
      color: '#005CA9',
      digits: '',
      active: true,
      blockOverlimit: false
    },
    {
      id: 'card_green',
      name: 'Green Benefícios',
      type: 'beneficio',
      limitTotal: 0,
      initialBalance: 0,
      color: '#10B981',
      digits: '',
      active: true,
      blockOverlimit: false
    },
    {
      id: 'card_c6',
      name: 'C6 Bank',
      type: 'credito',
      limitTotal: 0,
      initialBalance: 0,
      color: '#262626',
      digits: '',
      active: true,
      blockOverlimit: false
    }
  ];

  // Estado da Aplicação
  const state = {
    cards: [],
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    settings: {
      darkMode: false,
      blockOverlimitGlobal: false
    },
    // Controle do Mês Ativo (Ano e Mês: 0 a 11)
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    // Filtro ativo de transações
    txFilters: {
      search: '',
      period: 'all',
      cardId: 'all',
      categoryId: 'all',
      type: 'all'
    },
    // Estado temporário de modais
    currentTxType: 'expense',
    pendingDeleteAction: null
  };

  let deferredPrompt = null;

  // ==========================================================================
  // INICIALIZAÇÃO & CICLO DE VIDA
  // ==========================================================================
  function initApp() {
    loadData();
    applyTheme(state.settings.darkMode);
    setupEventListeners();
    setupPwa();
    setupCurrencyInputs();

    // Define a data atual como padrão no modal de transação
    const todayStr = getTodayISOString();
    const dateInput = document.getElementById('txInputDate');
    if (dateInput) dateInput.value = todayStr;

    // Atualiza o display do mês ativo e renderiza todas as telas
    updateMonthDisplay();
    refreshAllViews();

    console.log('✓ myFinance inicializado com sucesso.');
  }

  // ==========================================================================
  // PERSISTÊNCIA (LOCALSTORAGE)
  // ==========================================================================
  function loadData() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        state.cards = Array.isArray(parsed.cards) && parsed.cards.length > 0 ? parsed.cards : JSON.parse(JSON.stringify(DEFAULT_CARDS));
        state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        state.categories = Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_CATEGORIES;
      } else {
        // Primeira inicialização com cartões padrão zerados
        state.cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
        state.transactions = [];
        state.categories = DEFAULT_CATEGORIES;
        saveData();
      }

      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        state.settings = Object.assign(state.settings, JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error('Erro ao carregar dados do LocalStorage:', err);
      state.cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
      state.transactions = [];
    }
  }

  function saveData() {
    try {
      const payload = {
        cards: state.cards,
        transactions: state.transactions,
        categories: state.categories,
        version: '1.0'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (err) {
      console.error('Erro ao salvar dados no LocalStorage:', err);
      showToast('Erro ao salvar dados no navegador.', 'error');
    }
  }

  // ==========================================================================
  // FORMATAÇÃO E MÁSCARAS (BRL E DATAS)
  // ==========================================================================
  function formatBRL(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function parseBRL(value) {
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (!value) return 0;
    // Remove símbolos, pontos de milhar e substitui vírgula por ponto
    const cleaned = String(value)
      .replace(/[^\d,-]/g, '')
      .replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  function maskCurrency(input) {
    input.addEventListener('input', function (e) {
      let value = e.target.value.replace(/\D/g, '');
      if (!value) {
        e.target.value = 'R$ 0,00';
        return;
      }
      const floatVal = (parseInt(value, 10) / 100).toFixed(2);
      e.target.value = Number(floatVal).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    });

    input.addEventListener('focus', function (e) {
      if (!e.target.value || e.target.value === 'R$ 0,00') {
        e.target.value = '';
      }
    });

    input.addEventListener('blur', function (e) {
      if (!e.target.value) {
        e.target.value = 'R$ 0,00';
      }
    });
  }

  function setupCurrencyInputs() {
    const currencyInputs = [
      document.getElementById('txInputAmount'),
      document.getElementById('cardInputLimit'),
      document.getElementById('cardInputBalance')
    ];
    currencyInputs.forEach(input => {
      if (input) maskCurrency(input);
    });
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getTodayISOString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ==========================================================================
  // CONTROLE DO MÊS ATIVO & NAVEGAÇÃO TEMPORAL
  // ==========================================================================
  const MONTH_NAMES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  function updateMonthDisplay() {
    const monthNameEl = document.getElementById('currentMonthName');
    const monthPeriodEl = document.getElementById('currentMonthPeriod');
    if (!monthNameEl || !monthPeriodEl) return;

    const monthName = MONTH_NAMES[state.currentMonth];
    const year = state.currentYear;
    monthNameEl.textContent = `${monthName} ${year}`;

    // Calcula o último dia do mês ativo
    const lastDay = new Date(year, state.currentMonth + 1, 0).getDate();
    const monthFormatted = String(state.currentMonth + 1).padStart(2, '0');
    monthPeriodEl.textContent = `01/${monthFormatted} → ${String(lastDay).padStart(2, '0')}/${monthFormatted}`;
  }

  function changeMonth(delta) {
    let newMonth = state.currentMonth + delta;
    let newYear = state.currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    state.currentMonth = newMonth;
    state.currentYear = newYear;

    updateMonthDisplay();
    refreshAllViews();
  }

  function resetToCurrentMonth() {
    const now = new Date();
    state.currentMonth = now.getMonth();
    state.currentYear = now.getFullYear();
    updateMonthDisplay();
    refreshAllViews();
    showToast('Visualizando o mês atual');
  }

  // Retorna todas as transações do mês ativo
  function getTransactionsForActiveMonth() {
    const year = state.currentYear;
    const month = state.currentMonth;

    return state.transactions.filter(tx => {
      if (!tx.date) return false;
      const parts = tx.date.split('-');
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1;
      return txYear === year && txMonth === month;
    });
  }

  // ==========================================================================
  // CÁLCULOS FINANCEIROS E REATIVIDADE
  // ==========================================================================
  function calculateFinancials() {
    const monthTx = getTransactionsForActiveMonth();

    // 1. Total de Entradas do Mês
    const totalIncome = monthTx
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    // 2. Total de Gastos do Mês
    const totalExpense = monthTx
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    // 3. Economia do Mês
    const totalSavings = totalIncome - totalExpense;
    const savingsPct = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

    // 4. Detalhamento por Cartão no Mês
    // Mapeia os gastos do mês por cartão
    const cardSpentMap = {};
    const cardIncomeMap = {};

    monthTx.forEach(tx => {
      if (tx.type === 'expense') {
        cardSpentMap[tx.cardId] = (cardSpentMap[tx.cardId] || 0) + (Number(tx.amount) || 0);
      } else if (tx.type === 'income') {
        cardIncomeMap[tx.cardId] = (cardIncomeMap[tx.cardId] || 0) + (Number(tx.amount) || 0);
      }
    });

    // 5. Total de Limite e Disponibilidade consolidada
    let totalCreditLimit = 0;
    let totalCreditUsed = 0;
    let totalAvailable = 0;

    state.cards.forEach(card => {
      if (!card.active) return;

      const spentThisMonth = cardSpentMap[card.id] || 0;
      const incomeThisMonth = cardIncomeMap[card.id] || 0;

      if (card.type === 'credito' || card.type === 'beneficio') {
        const limit = Number(card.limitTotal) || 0;
        const available = Math.max(0, limit - spentThisMonth);
        totalCreditLimit += limit;
        totalCreditUsed += spentThisMonth;
        totalAvailable += available;
      } else {
        // Conta corrente / Débito: Saldo inicial + receitas - gastos
        const initBal = Number(card.initialBalance) || 0;
        const currentBal = initBal + incomeThisMonth - spentThisMonth;
        totalAvailable += currentBal;
      }
    });

    const creditUsagePct = totalCreditLimit > 0
      ? Math.min(100, Math.round((totalCreditUsed / totalCreditLimit) * 100))
      : 0;

    return {
      totalIncome,
      totalExpense,
      totalSavings,
      savingsPct,
      totalCreditLimit,
      totalCreditUsed,
      creditUsagePct,
      totalAvailable,
      cardSpentMap,
      cardIncomeMap,
      incomeCount: monthTx.filter(tx => tx.type === 'income').length,
      expenseCount: monthTx.filter(tx => tx.type === 'expense').length
    };
  }

  // ==========================================================================
  // RENDERIZAÇÃO: DASHBOARD
  // ==========================================================================
  function renderDashboard() {
    const fin = calculateFinancials();

    // Elementos do Dashboard
    const elAvailable = document.getElementById('metricTotalAvailable');
    const elIncome = document.getElementById('metricTotalIncome');
    const elExpense = document.getElementById('metricTotalExpense');
    const elSavings = document.getElementById('metricTotalSavings');
    const elSavingsPct = document.getElementById('metricSavingsPct');
    const elCreditUsageVal = document.getElementById('metricCreditUsageVal');
    const elCreditUsagePct = document.getElementById('metricCreditUsagePct');
    const elTotalCreditLimit = document.getElementById('metricTotalCreditLimit');
    const elIncomeCount = document.getElementById('metricIncomeCount');
    const elExpenseCount = document.getElementById('metricExpenseCount');

    if (elAvailable) elAvailable.textContent = formatBRL(fin.totalAvailable);
    if (elIncome) elIncome.textContent = formatBRL(fin.totalIncome);
    if (elExpense) elExpense.textContent = formatBRL(fin.totalExpense);
    if (elSavings) {
      elSavings.textContent = formatBRL(fin.totalSavings);
      elSavings.style.color = fin.totalSavings >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }
    if (elSavingsPct) {
      elSavingsPct.textContent = `${fin.savingsPct}% poupado`;
      elSavingsPct.className = `metric-badge ${fin.totalSavings >= 0 ? 'badge-success' : 'badge-danger'}`;
    }
    if (elCreditUsageVal) elCreditUsageVal.textContent = formatBRL(fin.totalCreditUsed);
    if (elCreditUsagePct) elCreditUsagePct.textContent = `${fin.creditUsagePct}%`;
    if (elTotalCreditLimit) elTotalCreditLimit.textContent = `de ${formatBRL(fin.totalCreditLimit)} limite total`;
    if (elIncomeCount) elIncomeCount.textContent = `${fin.incomeCount} lançamentos`;
    if (elExpenseCount) elExpenseCount.textContent = `${fin.expenseCount} lançamentos`;

    // Renderiza os Cards de Bancos no Slider do Dashboard
    renderDashboardCards(fin);

    // Renderiza Últimas Movimentações no Dashboard
    renderRecentTransactions();

    // Atualiza Gráfico de Evolução Diária no Dashboard
    renderDailyEvolutionChart();
  }

  function getProgressStatusClass(percent) {
    if (percent <= 50) return 'status-green';
    if (percent <= 75) return 'status-yellow';
    if (percent <= 90) return 'status-orange';
    return 'status-red';
  }

  function renderDashboardCards(fin) {
    const container = document.getElementById('dashboardCardsSlider');
    if (!container) return;

    if (state.cards.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💳</div>
          <h4>Nenhum cartão cadastrado</h4>
          <p>Adicione seus cartões para acompanhar limites e despesas.</p>
        </div>`;
      return;
    }

    container.innerHTML = state.cards.map(card => {
      const spent = fin.cardSpentMap[card.id] || 0;
      const isCreditOrBenefit = card.type === 'credito' || card.type === 'beneficio';
      const limit = Number(card.limitTotal) || 0;
      const available = Math.max(0, limit - spent);
      const usagePct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      const statusClass = getProgressStatusClass(usagePct);

      return `
        <div class="bank-card" style="--card-color: ${card.color || 'var(--color-primary)'}; opacity: ${card.active ? '1' : '0.6'}">
          <div class="bank-card-header">
            <div class="bank-card-brand">
              <span class="bank-card-color-dot"></span>
              <span class="bank-card-name">${escapeHTML(card.name)}</span>
              ${card.digits ? `<span style="font-size:0.75rem; color:var(--text-muted);">•••• ${card.digits}</span>` : ''}
            </div>
            <span class="bank-card-type-badge">${escapeHTML(card.type)}</span>
          </div>

          <div class="bank-card-numbers">
            <div class="bank-card-spent-info">
              <span class="bank-card-spent-label">Gasto no mês</span>
              <span class="bank-card-spent-val">${formatBRL(spent)}</span>
            </div>
            <div class="bank-card-avail-info">
              <span class="bank-card-avail-label">Disponível</span>
              <span class="bank-card-avail-val" style="color: ${available <= 0 && limit > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
                ${formatBRL(available)}
              </span>
            </div>
          </div>

          <div class="progress-container">
            <div class="progress-header">
              <span>Uso do limite</span>
              <span><strong>${usagePct}%</strong> (${formatBRL(limit)})</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar ${statusClass}" style="width: ${usagePct}%"></div>
            </div>
          </div>

          <div class="bank-card-footer">
            <span>${card.active ? '● Ativo' : '○ Inativo'}</span>
            <div class="bank-card-actions">
              <button class="btn-card-action" onclick="window.myFinanceApp.openEditCard('${card.id}')">Editar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRecentTransactions() {
    const container = document.getElementById('dashboardRecentTransactions');
    if (!container) return;

    const monthTx = getTransactionsForActiveMonth();
    // Ordena as transações mais recentes primeiro
    const sorted = [...monthTx].sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h4>Nenhuma movimentação neste mês</h4>
          <p>Clique em <strong>+ Novo Gasto</strong> ou <strong>+ Nova Entrada</strong> para registrar suas finanças.</p>
        </div>`;
      return;
    }

    container.innerHTML = recent.map(tx => renderTransactionItemHTML(tx)).join('');
  }

  function renderTransactionItemHTML(tx) {
    const card = state.cards.find(c => c.id === tx.cardId) || { name: 'Geral', color: '#64748B' };
    const category = state.categories.find(c => c.id === tx.categoryId || c.name === tx.category) || {
      name: tx.category || 'Geral',
      icon: tx.type === 'expense' ? '💸' : '💰',
      color: '#64748B'
    };

    const isExpense = tx.type === 'expense';
    const amountPrefix = isExpense ? '- ' : '+ ';
    const amountClass = isExpense ? 'expense' : 'income';

    return `
      <div class="transaction-card" data-tx-id="${tx.id}">
        <div class="transaction-left">
          <div class="tx-category-icon" style="background-color: ${category.color}15; color: ${category.color};">
            <span>${category.icon}</span>
          </div>
          <div class="tx-details">
            <span class="tx-description" title="${escapeHTML(tx.description)}">${escapeHTML(tx.description)}</span>
            <div class="tx-meta">
              <span class="tx-card-pill">
                <span class="tx-card-dot" style="background-color: ${card.color};"></span>
                ${escapeHTML(card.name)}
              </span>
              <span>•</span>
              <span>${formatDateBR(tx.date)}</span>
              ${tx.notes ? `<span>• <em>${escapeHTML(tx.notes)}</em></span>` : ''}
            </div>
          </div>
        </div>

        <div class="tx-right">
          <span class="tx-amount ${amountClass}">
            ${amountPrefix}${formatBRL(tx.amount)}
          </span>
          <div class="tx-actions-menu">
            <button class="btn-tx-icon" title="Editar" onclick="window.myFinanceApp.openEditTransaction('${tx.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-tx-icon delete-hover" title="Excluir" onclick="window.myFinanceApp.confirmDeleteTransaction('${tx.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // RENDERIZAÇÃO: MEUS CARTÕES (GERENCIAMENTO COMPLETO)
  // ==========================================================================
  function renderCardsManagement() {
    const container = document.getElementById('cardsManagementGrid');
    if (!container) return;

    const fin = calculateFinancials();

    container.innerHTML = state.cards.map(card => {
      const spent = fin.cardSpentMap[card.id] || 0;
      const limit = Number(card.limitTotal) || 0;
      const available = Math.max(0, limit - spent);
      const usagePct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      const statusClass = getProgressStatusClass(usagePct);

      return `
        <div class="bank-card" style="--card-color: ${card.color || 'var(--color-primary)'};">
          <div class="bank-card-header">
            <div class="bank-card-brand">
              <span class="bank-card-color-dot"></span>
              <strong style="font-size:1.1rem;">${escapeHTML(card.name)}</strong>
              ${card.digits ? `<span style="font-size:0.8rem; color:var(--text-muted);">•••• ${card.digits}</span>` : ''}
            </div>
            <span class="bank-card-type-badge">${escapeHTML(card.type)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 4px 0;">
            <div>
              <span style="font-size:0.75rem; color:var(--text-secondary);">Limite Total</span>
              <div style="font-size:1.05rem; font-weight:800;">${formatBRL(limit)}</div>
            </div>
            <div>
              <span style="font-size:0.75rem; color:var(--text-secondary);">Saldo Inicial</span>
              <div style="font-size:1.05rem; font-weight:800;">${formatBRL(card.initialBalance || 0)}</div>
            </div>
          </div>

          <div class="progress-container">
            <div class="progress-header">
              <span>Gasto no mês: <strong>${formatBRL(spent)}</strong></span>
              <span>Disponível: <strong style="color:var(--color-success)">${formatBRL(available)}</strong></span>
            </div>
            <div class="progress-track">
              <div class="progress-bar ${statusClass}" style="width: ${usagePct}%"></div>
            </div>
          </div>

          <div class="bank-card-footer" style="padding-top:14px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer;">
              <input type="checkbox" ${card.active ? 'checked' : ''} onchange="window.myFinanceApp.toggleCardActive('${card.id}')">
              <span>${card.active ? 'Ativo' : 'Inativo'}</span>
            </label>
            <div class="bank-card-actions">
              <button class="btn-card-action" onclick="window.myFinanceApp.openEditCard('${card.id}')">Editar</button>
              <button class="btn-card-action" style="color:var(--color-danger);" onclick="window.myFinanceApp.confirmDeleteCard('${card.id}')">Excluir</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // RENDERIZAÇÃO: HISTÓRICO & FILTROS DE MOVIMENTAÇÕES
  // ==========================================================================
  function renderTransactionsHistory() {
    const container = document.getElementById('fullTransactionsList');
    if (!container) return;

    // Popula os seletores de cartões e categorias no filtro
    populateFilterSelects();

    // Aplica os filtros atuais
    const filtered = filterTransactions();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h4>Nenhuma movimentação encontrada</h4>
          <p>Tente ajustar a busca ou os filtros para encontrar os lançamentos desejados.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(tx => renderTransactionItemHTML(tx)).join('');
  }

  function populateFilterSelects() {
    const selectCard = document.getElementById('filterSelectCard');
    const selectCat = document.getElementById('filterSelectCategory');

    if (selectCard && selectCard.options.length <= 1) {
      state.cards.forEach(card => {
        const opt = document.createElement('option');
        opt.value = card.id;
        opt.textContent = card.name;
        selectCard.appendChild(opt);
      });
    }

    if (selectCat && selectCat.options.length <= 1) {
      state.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `${cat.icon} ${cat.name}`;
        selectCat.appendChild(opt);
      });
    }
  }

  function filterTransactions() {
    const query = state.txFilters.search.toLowerCase().trim();
    const period = state.txFilters.period;
    const cardId = state.txFilters.cardId;
    const catId = state.txFilters.categoryId;
    const type = state.txFilters.type;

    const todayStr = getTodayISOString();
    const now = new Date();

    // Filtra inicialmente pelo mês ativo (a não ser que "period" seja all e queiramos o mês ativo como padrão)
    let list = state.transactions;

    if (period === 'month') {
      list = getTransactionsForActiveMonth();
    } else if (period === 'today') {
      list = list.filter(tx => tx.date === todayStr);
    } else if (period === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      list = list.filter(tx => {
        const d = new Date(tx.date + 'T00:00:00');
        return d >= oneWeekAgo && d <= now;
      });
    } else {
      // 'all' filtra dentro do ano e mês selecionados para respeitar o mês ativo
      list = getTransactionsForActiveMonth();
    }

    // Filtros adicionais
    return list.filter(tx => {
      // Busca
      if (query) {
        const descMatch = (tx.description || '').toLowerCase().includes(query);
        const noteMatch = (tx.notes || '').toLowerCase().includes(query);
        const catMatch = (tx.category || '').toLowerCase().includes(query);
        if (!descMatch && !noteMatch && !catMatch) return false;
      }
      // Cartão
      if (cardId !== 'all' && tx.cardId !== cardId) return false;
      // Categoria
      if (catId !== 'all' && tx.categoryId !== catId) return false;
      // Tipo
      if (type !== 'all' && tx.type !== type) return false;

      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
  }

  // ==========================================================================
  // RENDERIZAÇÃO: RELATÓRIOS DO MÊS & DESTAQUES
  // ==========================================================================
  function renderReports() {
    const monthTx = getTransactionsForActiveMonth();
    const fin = calculateFinancials();

    // Elementos de destaque
    const elMaxExpenseVal = document.getElementById('repMaxExpenseValue');
    const elMaxExpenseDesc = document.getElementById('repMaxExpenseDesc');
    const elPeakDayDate = document.getElementById('repPeakDayDate');
    const elPeakDayTotal = document.getElementById('repPeakDayTotal');
    const elDailyAverage = document.getElementById('repDailyAverage');
    const elDaysCount = document.getElementById('repDaysCount');
    const elSavingsRate = document.getElementById('repSavingsRate');
    const elSavingsRateDesc = document.getElementById('repSavingsRateDesc');

    // 1. Maior Gasto do Mês
    const expenses = monthTx.filter(tx => tx.type === 'expense');
    if (expenses.length > 0) {
      const maxExpense = expenses.reduce((max, tx) => (Number(tx.amount) > Number(max.amount) ? tx : max), expenses[0]);
      if (elMaxExpenseVal) elMaxExpenseVal.textContent = formatBRL(maxExpense.amount);
      if (elMaxExpenseDesc) elMaxExpenseDesc.textContent = `${maxExpense.description} (${formatDateBR(maxExpense.date)})`;
    } else {
      if (elMaxExpenseVal) elMaxExpenseVal.textContent = 'R$ 0,00';
      if (elMaxExpenseDesc) elMaxExpenseDesc.textContent = 'Nenhum gasto registrado';
    }

    // 2. Dia com Maior Gasto
    const dayTotals = {};
    expenses.forEach(tx => {
      dayTotals[tx.date] = (dayTotals[tx.date] || 0) + (Number(tx.amount) || 0);
    });
    let peakDay = null;
    let peakAmount = 0;
    Object.keys(dayTotals).forEach(date => {
      if (dayTotals[date] > peakAmount) {
        peakAmount = dayTotals[date];
        peakDay = date;
      }
    });
    if (peakDay) {
      if (elPeakDayDate) elPeakDayDate.textContent = formatDateBR(peakDay);
      if (elPeakDayTotal) elPeakDayTotal.textContent = `${formatBRL(peakAmount)} gastos no dia`;
    } else {
      if (elPeakDayDate) elPeakDayDate.textContent = '—';
      if (elPeakDayTotal) elPeakDayTotal.textContent = 'R$ 0,00';
    }

    // 3. Média Diária de Gastos
    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const avgDaily = fin.totalExpense / daysInMonth;
    if (elDailyAverage) elDailyAverage.textContent = formatBRL(avgDaily);
    if (elDaysCount) elDaysCount.textContent = `em ${daysInMonth} dias no mês`;

    // 4. Taxa de Poupança
    if (elSavingsRate) elSavingsRate.textContent = `${fin.savingsPct}%`;
    if (elSavingsRateDesc) {
      elSavingsRateDesc.textContent = fin.totalSavings >= 0 ? 'da renda recebida poupada' : 'gastos superaram a renda';
    }

    // Renderiza os Gráficos SVG
    renderCategoryDonutChart(expenses);
    renderCardsBarChart(fin.cardSpentMap);
    renderIncomeVsExpenseChart(fin.totalIncome, fin.totalExpense);
  }

  // ==========================================================================
  // GRÁFICOS EM SVG PURO (SEM BIBLIOTECAS EXTERNAS)
  // ==========================================================================

  /**
   * Gráfico 1: Evolução Diária Acumulada de Gastos (Dashboard)
   */
  function renderDailyEvolutionChart() {
    const svg = document.getElementById('svgDailyEvolution');
    const tooltip = document.getElementById('tooltipDaily');
    if (!svg) return;

    svg.innerHTML = '';
    const monthTx = getTransactionsForActiveMonth();
    const expenses = monthTx.filter(tx => tx.type === 'expense');

    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const dailyAccum = new Array(daysInMonth + 1).fill(0);

    // Mapeia gastos por dia (1 a daysInMonth)
    expenses.forEach(tx => {
      if (!tx.date) return;
      const day = parseInt(tx.date.split('-')[2], 10);
      if (day >= 1 && day <= daysInMonth) {
        dailyAccum[day] += Number(tx.amount) || 0;
      }
    });

    // Calcula acumulado progressivo
    let currentTotal = 0;
    const pointsData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      currentTotal += dailyAccum[d];
      pointsData.push({ day: d, val: currentTotal, daySpent: dailyAccum[d] });
    }

    const maxVal = Math.max(100, currentTotal * 1.15);
    const width = 600;
    const height = 240;
    const padding = { top: 20, right: 25, bottom: 35, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Linhas horizontais de grade (Grid Lines)
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + (chartH / gridSteps) * i;
      const val = maxVal - (maxVal / gridSteps) * i;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width - padding.right);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', 'var(--border-subtle)');
      line.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', padding.left - 8);
      text.setAttribute('y', y + 4);
      text.setAttribute('fill', 'var(--text-muted)');
      text.setAttribute('font-size', '10');
      text.setAttribute('text-anchor', 'end');
      text.textContent = 'R$ ' + Math.round(val);
      svg.appendChild(text);
    }

    // Coordenadas dos pontos
    const coords = pointsData.map(p => {
      const x = padding.left + (chartW / (daysInMonth - 1)) * (p.day - 1);
      const y = padding.top + chartH - (p.val / maxVal) * chartH;
      return { x, y, ...p };
    });

    // Cria caminho de área (Gradiente suave)
    let areaPathD = `M ${coords[0].x} ${padding.top + chartH}`;
    coords.forEach(pt => { areaPathD += ` L ${pt.x} ${pt.y}`; });
    areaPathD += ` L ${coords[coords.length - 1].x} ${padding.top + chartH} Z`;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2563EB" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0"/>
      </linearGradient>
    `;
    svg.appendChild(defs);

    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('d', areaPathD);
    areaPath.setAttribute('fill', 'url(#areaGrad)');
    svg.appendChild(areaPath);

    // Linha principal do gráfico
    let linePathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      linePathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('d', linePathD);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', 'var(--color-primary)');
    linePath.setAttribute('stroke-width', '3');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(linePath);

    // Pontos interativos e rótulos de data
    coords.forEach((pt, index) => {
      // Rótulos do eixo X (a cada 5 dias e último dia)
      if (pt.day === 1 || pt.day % 5 === 0 || pt.day === daysInMonth) {
        const xText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xText.setAttribute('x', pt.x);
        xText.setAttribute('y', height - 10);
        xText.setAttribute('fill', 'var(--text-muted)');
        xText.setAttribute('font-size', '10');
        xText.setAttribute('text-anchor', 'middle');
        xText.textContent = `${pt.day}`;
        svg.appendChild(xText);
      }

      // Pontos com hover/touch
      if (pt.daySpent > 0 || index === coords.length - 1) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x);
        circle.setAttribute('cy', pt.y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#FFFFFF');
        circle.setAttribute('stroke', 'var(--color-primary)');
        circle.setAttribute('stroke-width', '2.5');
        circle.style.cursor = 'pointer';

        // Interação com tooltip
        const showTip = () => {
          circle.setAttribute('r', '6');
          if (tooltip) {
            tooltip.innerHTML = `
              <strong>Dia ${pt.day}</strong><br>
              Gasto no dia: ${formatBRL(pt.daySpent)}<br>
              Total acumulado: ${formatBRL(pt.val)}
            `;
            tooltip.style.left = `${(pt.x / width) * 100}%`;
            tooltip.style.top = `${(pt.y / height) * 100}%`;
            tooltip.style.opacity = '1';
          }
        };

        const hideTip = () => {
          circle.setAttribute('r', '4');
          if (tooltip) tooltip.style.opacity = '0';
        };

        circle.addEventListener('mouseenter', showTip);
        circle.addEventListener('mouseleave', hideTip);
        circle.addEventListener('touchstart', showTip);
        svg.appendChild(circle);
      }
    });
  }

  /**
   * Gráfico 2: Gastos por Categoria (Donut Chart SVG)
   */
  function renderCategoryDonutChart(expenses) {
    const svg = document.getElementById('svgCategoryDonut');
    const legend = document.getElementById('legendCategoryList');
    const tooltip = document.getElementById('tooltipCategory');
    if (!svg || !legend) return;

    svg.innerHTML = '';
    legend.innerHTML = '';

    const catMap = {};
    let totalExpense = 0;

    expenses.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      totalExpense += amount;
      const cat = state.categories.find(c => c.id === tx.categoryId || c.name === tx.category) || {
        name: tx.category || 'Outros',
        color: '#64748B',
        icon: '💸'
      };

      if (!catMap[cat.name]) {
        catMap[cat.name] = { total: 0, color: cat.color, icon: cat.icon };
      }
      catMap[cat.name].total += amount;
    });

    if (totalExpense <= 0) {
      svg.innerHTML = `
        <text x="180" y="150" text-anchor="middle" fill="var(--text-muted)" font-size="14">
          Nenhum gasto no período
        </text>`;
      return;
    }

    const categoriesArray = Object.keys(catMap).map(name => ({
      name,
      total: catMap[name].total,
      color: catMap[name].color,
      icon: catMap[name].icon,
      pct: (catMap[name].total / totalExpense) * 100
    })).sort((a, b) => b.total - a.total);

    const cx = 180;
    const cy = 150;
    const radius = 95;
    const strokeWidth = 34;
    const circumference = 2 * Math.PI * radius;

    let accumulatedOffset = 0;

    categoriesArray.forEach(cat => {
      const strokeDash = (cat.pct / 100) * circumference;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', cat.color);
      circle.setAttribute('stroke-width', strokeWidth);
      circle.setAttribute('stroke-dasharray', `${strokeDash} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', -accumulatedOffset);
      circle.style.transition = 'stroke-width 0.2s ease, opacity 0.2s ease';
      circle.style.cursor = 'pointer';

      // Tooltip no SVG Donut
      circle.addEventListener('mouseenter', () => {
        circle.setAttribute('stroke-width', strokeWidth + 6);
        if (tooltip) {
          tooltip.innerHTML = `<strong>${cat.icon} ${cat.name}</strong><br>${formatBRL(cat.total)} (${cat.pct.toFixed(1)}%)`;
          tooltip.style.left = '50%';
          tooltip.style.top = '40%';
          tooltip.style.opacity = '1';
        }
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke-width', strokeWidth);
        if (tooltip) tooltip.style.opacity = '0';
      });

      svg.appendChild(circle);
      accumulatedOffset += strokeDash;

      // Adiciona à Legenda
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <span class="legend-dot" style="background-color: ${cat.color};"></span>
        <span>${cat.icon} ${cat.name}: <strong>${formatBRL(cat.total)}</strong> (${cat.pct.toFixed(0)}%)</span>
      `;
      legend.appendChild(item);
    });

    // Texto Central do Donut
    const textTotalLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textTotalLabel.setAttribute('x', cx);
    textTotalLabel.setAttribute('y', cy - 10);
    textTotalLabel.setAttribute('text-anchor', 'middle');
    textTotalLabel.setAttribute('fill', 'var(--text-secondary)');
    textTotalLabel.setAttribute('font-size', '11');
    textTotalLabel.setAttribute('font-weight', '600');
    textTotalLabel.textContent = 'TOTAL GASTO';
    svg.appendChild(textTotalLabel);

    const textTotalVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textTotalVal.setAttribute('x', cx);
    textTotalVal.setAttribute('y', cy + 16);
    textTotalVal.setAttribute('text-anchor', 'middle');
    textTotalVal.setAttribute('fill', 'var(--text-primary)');
    textTotalVal.setAttribute('font-size', '17');
    textTotalVal.setAttribute('font-weight', '800');
    textTotalVal.textContent = formatBRL(totalExpense);
    svg.appendChild(textTotalVal);
  }

  /**
   * Gráfico 3: Gastos por Cartão (Barras Horizontais SVG)
   */
  function renderCardsBarChart(cardSpentMap) {
    const svg = document.getElementById('svgCardsBar');
    const legend = document.getElementById('legendCardsList');
    if (!svg || !legend) return;

    svg.innerHTML = '';
    legend.innerHTML = '';

    const activeCards = state.cards.filter(c => c.active);
    if (activeCards.length === 0) return;

    let maxSpent = 1;
    activeCards.forEach(c => {
      const spent = cardSpentMap[c.id] || 0;
      if (spent > maxSpent) maxSpent = spent;
    });

    const width = 500;
    const rowHeight = 42;
    const height = Math.max(160, activeCards.length * rowHeight + 20);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const labelW = 120;
    const maxBarW = width - labelW - 100;

    activeCards.forEach((card, index) => {
      const spent = cardSpentMap[card.id] || 0;
      const y = index * rowHeight + 20;
      const barW = Math.max(4, (spent / maxSpent) * maxBarW);

      // Nome do cartão
      const textName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textName.setAttribute('x', labelW - 10);
      textName.setAttribute('y', y + 15);
      textName.setAttribute('text-anchor', 'end');
      textName.setAttribute('fill', 'var(--text-primary)');
      textName.setAttribute('font-size', '12');
      textName.setAttribute('font-weight', '600');
      textName.textContent = card.name;
      svg.appendChild(textName);

      // Fundo da barra
      const bgBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgBar.setAttribute('x', labelW);
      bgBar.setAttribute('y', y);
      bgBar.setAttribute('width', maxBarW);
      bgBar.setAttribute('height', 20);
      bgBar.setAttribute('rx', 10);
      bgBar.setAttribute('fill', 'var(--bg-subtle)');
      svg.appendChild(bgBar);

      // Barra colorida
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', labelW);
      bar.setAttribute('y', y);
      bar.setAttribute('width', barW);
      bar.setAttribute('height', 20);
      bar.setAttribute('rx', 10);
      bar.setAttribute('fill', card.color || 'var(--color-primary)');
      svg.appendChild(bar);

      // Valor formatado
      const textVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textVal.setAttribute('x', labelW + barW + 10);
      textVal.setAttribute('y', y + 15);
      textVal.setAttribute('fill', 'var(--text-primary)');
      textVal.setAttribute('font-size', '12');
      textVal.setAttribute('font-weight', '700');
      textVal.textContent = formatBRL(spent);
      svg.appendChild(textVal);

      // Legenda
      const leg = document.createElement('div');
      leg.className = 'legend-item';
      leg.innerHTML = `
        <span class="legend-dot" style="background-color: ${card.color};"></span>
        <span>${card.name}: <strong>${formatBRL(spent)}</strong></span>
      `;
      legend.appendChild(leg);
    });
  }

  /**
   * Gráfico 4: Entradas vs Gastos (Colunas Comparativas SVG)
   */
  function renderIncomeVsExpenseChart(income, expense) {
    const svg = document.getElementById('svgIncomeVsExpense');
    if (!svg) return;

    svg.innerHTML = '';
    const max = Math.max(100, Math.max(income, expense) * 1.25);
    const width = 400;
    const height = 240;
    const colW = 68;
    const baseLine = 190;
    const maxBarH = 140;

    const incomeH = (income / max) * maxBarH;
    const expenseH = (expense / max) * maxBarH;

    // Linha de base
    const base = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    base.setAttribute('x1', 40);
    base.setAttribute('y1', baseLine);
    base.setAttribute('x2', width - 40);
    base.setAttribute('y2', baseLine);
    base.setAttribute('stroke', 'var(--border-color)');
    base.setAttribute('stroke-width', '2');
    svg.appendChild(base);

    // Coluna 1: Entradas (Verde)
    const xIncome = 100;
    const yIncome = baseLine - incomeH;
    const barIncome = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    barIncome.setAttribute('x', xIncome);
    barIncome.setAttribute('y', yIncome);
    barIncome.setAttribute('width', colW);
    barIncome.setAttribute('height', Math.max(4, incomeH));
    barIncome.setAttribute('rx', 8);
    barIncome.setAttribute('fill', 'var(--color-success)');
    svg.appendChild(barIncome);

    const textIncVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textIncVal.setAttribute('x', xIncome + colW / 2);
    textIncVal.setAttribute('y', yIncome - 8);
    textIncVal.setAttribute('text-anchor', 'middle');
    textIncVal.setAttribute('fill', 'var(--color-success)');
    textIncVal.setAttribute('font-size', '13');
    textIncVal.setAttribute('font-weight', '800');
    textIncVal.textContent = formatBRL(income);
    svg.appendChild(textIncVal);

    const textIncLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textIncLabel.setAttribute('x', xIncome + colW / 2);
    textIncLabel.setAttribute('y', baseLine + 22);
    textIncLabel.setAttribute('text-anchor', 'middle');
    textIncLabel.setAttribute('fill', 'var(--text-primary)');
    textIncLabel.setAttribute('font-size', '12');
    textIncLabel.setAttribute('font-weight', '700');
    textIncLabel.textContent = 'Entradas';
    svg.appendChild(textIncLabel);

    // Coluna 2: Gastos (Vermelho)
    const xExpense = 230;
    const yExpense = baseLine - expenseH;
    const barExpense = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    barExpense.setAttribute('x', xExpense);
    barExpense.setAttribute('y', yExpense);
    barExpense.setAttribute('width', colW);
    barExpense.setAttribute('height', Math.max(4, expenseH));
    barExpense.setAttribute('rx', 8);
    barExpense.setAttribute('fill', 'var(--color-danger)');
    svg.appendChild(barExpense);

    const textExpVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textExpVal.setAttribute('x', xExpense + colW / 2);
    textExpVal.setAttribute('y', yExpense - 8);
    textExpVal.setAttribute('text-anchor', 'middle');
    textExpVal.setAttribute('fill', 'var(--color-danger)');
    textExpVal.setAttribute('font-size', '13');
    textExpVal.setAttribute('font-weight', '800');
    textExpVal.textContent = formatBRL(expense);
    svg.appendChild(textExpVal);

    const textExpLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textExpLabel.setAttribute('x', xExpense + colW / 2);
    textExpLabel.setAttribute('y', baseLine + 22);
    textExpLabel.setAttribute('text-anchor', 'middle');
    textExpLabel.setAttribute('fill', 'var(--text-primary)');
    textExpLabel.setAttribute('font-size', '12');
    textExpLabel.setAttribute('font-weight', '700');
    textExpLabel.textContent = 'Gastos';
    svg.appendChild(textExpLabel);
  }

  // ==========================================================================
  // ATUALIZAÇÃO GLOBAL DAS VIEWS (REATIVIDADE)
  // ==========================================================================
  function refreshAllViews() {
    renderDashboard();
    renderCardsManagement();
    renderTransactionsHistory();
    renderReports();
  }

  // ==========================================================================
  // GESTÃO DE TRANSAÇÕES (NOVO, EDITAR, EXCLUIR)
  // ==========================================================================
  function openTransactionModal(type = 'expense', editingId = null) {
    state.currentTxType = type;
    const modal = document.getElementById('modalTransaction');
    const modalTitle = document.getElementById('modalTransactionTitle');
    const tabExpense = document.getElementById('tabTypeExpense');
    const tabIncome = document.getElementById('tabTypeIncome');
    const amountInput = document.getElementById('txInputAmount');
    const descInput = document.getElementById('txInputDesc');
    const dateInput = document.getElementById('txInputDate');
    const notesInput = document.getElementById('txInputNotes');
    const hiddenId = document.getElementById('txEditingId');

    // Atualiza título e abas
    if (type === 'expense') {
      modalTitle.textContent = editingId ? 'Editar Gasto' : 'Novo Gasto';
      tabExpense.classList.add('active');
      tabIncome.classList.remove('active');
    } else {
      modalTitle.textContent = editingId ? 'Editar Entrada' : 'Nova Entrada';
      tabIncome.classList.add('active');
      tabExpense.classList.remove('active');
    }

    // Se estiver editando, preenche com os dados salvos
    if (editingId) {
      const tx = state.transactions.find(t => t.id === editingId);
      if (tx) {
        hiddenId.value = tx.id;
        amountInput.value = formatBRL(tx.amount);
        descInput.value = tx.description || '';
        dateInput.value = tx.date || getTodayISOString();
        notesInput.value = tx.notes || '';
        renderCardSelectorInModal(tx.cardId);
        renderCategorySelectorInModal(type, tx.categoryId || tx.category);
      }
    } else {
      hiddenId.value = '';
      amountInput.value = 'R$ 0,00';
      descInput.value = '';
      dateInput.value = getTodayISOString();
      notesInput.value = '';
      const firstActiveCard = state.cards.find(c => c.active);
      renderCardSelectorInModal(firstActiveCard ? firstActiveCard.id : null);
      renderCategorySelectorInModal(type);
    }

    openModal(modal);
    setTimeout(() => amountInput && amountInput.focus(), 200);
  }

  function renderCardSelectorInModal(selectedCardId) {
    const container = document.getElementById('txCardSelectorList');
    const hiddenInput = document.getElementById('txSelectedCardId');
    if (!container || !hiddenInput) return;

    const activeCards = state.cards.filter(c => c.active);
    if (activeCards.length === 0) {
      container.innerHTML = '<p style="font-size:0.8rem; color:var(--color-danger);">Nenhum cartão ativo cadastrado.</p>';
      return;
    }

    // Se nenhum estiver selecionado, seleciona o primeiro
    const currentSelected = selectedCardId || activeCards[0].id;
    hiddenInput.value = currentSelected;

    const fin = calculateFinancials();

    container.innerHTML = activeCards.map(card => {
      const isSelected = card.id === currentSelected;
      const spent = fin.cardSpentMap[card.id] || 0;
      const limit = Number(card.limitTotal) || 0;
      const avail = Math.max(0, limit - spent);

      return `
        <div class="card-select-pill ${isSelected ? 'selected' : ''}" data-card-id="${card.id}">
          <div class="pill-card-name">
            <span class="tx-card-dot" style="background-color: ${card.color};"></span>
            <span>${escapeHTML(card.name)}</span>
          </div>
          <span class="pill-card-avail">Disponível: ${formatBRL(avail)}</span>
        </div>
      `;
    }).join('');

    // Listener para troca de cartão
    container.querySelectorAll('.card-select-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.card-select-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        hiddenInput.value = pill.getAttribute('data-card-id');
      });
    });
  }

  function renderCategorySelectorInModal(type, selectedCategory = null) {
    const container = document.getElementById('txCategoryPicker');
    const hiddenInput = document.getElementById('txSelectedCategory');
    if (!container || !hiddenInput) return;

    const filtered = state.categories.filter(c => c.type === type);
    const currentSelected = selectedCategory || (filtered[0] ? filtered[0].id : '');
    hiddenInput.value = currentSelected;

    container.innerHTML = filtered.map(cat => {
      const isSelected = cat.id === currentSelected || cat.name === currentSelected;
      return `
        <div class="category-chip ${isSelected ? 'selected' : ''}" data-cat-id="${cat.id}">
          <span class="cat-emoji">${cat.icon}</span>
          <span class="cat-label">${escapeHTML(cat.name)}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.category-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        hiddenInput.value = chip.getAttribute('data-cat-id');
      });
    });
  }

  function saveTransaction() {
    const amountVal = parseBRL(document.getElementById('txInputAmount').value);
    const desc = document.getElementById('txInputDesc').value.trim();
    const cardId = document.getElementById('txSelectedCardId').value;
    const catId = document.getElementById('txSelectedCategory').value;
    const date = document.getElementById('txInputDate').value;
    const notes = document.getElementById('txInputNotes').value.trim();
    const editingId = document.getElementById('txEditingId').value;
    const type = state.currentTxType;

    // Validações
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Por favor, informe um valor maior que zero.', 'error');
      document.getElementById('txInputAmount').focus();
      return;
    }
    if (!desc) {
      showToast('Informe uma descrição para o lançamento.', 'error');
      document.getElementById('txInputDesc').focus();
      return;
    }
    if (!cardId) {
      showToast('Selecione um cartão ou conta para este lançamento.', 'error');
      return;
    }
    if (!date) {
      showToast('Informe uma data válida.', 'error');
      return;
    }

    // Validação de Bloqueio por Limite se ativado
    const card = state.cards.find(c => c.id === cardId);
    if (type === 'expense' && card && (card.blockOverlimit || state.settings.blockOverlimitGlobal)) {
      const fin = calculateFinancials();
      const currentSpent = fin.cardSpentMap[card.id] || 0;
      const limit = Number(card.limitTotal) || 0;
      const available = limit - currentSpent;

      // Desconta valor anterior se estiver editando
      let adjustment = 0;
      if (editingId) {
        const prevTx = state.transactions.find(t => t.id === editingId);
        if (prevTx && prevTx.cardId === cardId && prevTx.type === 'expense') {
          adjustment = Number(prevTx.amount) || 0;
        }
      }

      if (limit > 0 && (amountVal > available + adjustment)) {
        showToast(`Limite insuficiente no cartão ${card.name}!`, 'error');
        return;
      }
    }

    const categoryObj = state.categories.find(c => c.id === catId) || { name: 'Geral', icon: '💸' };

    if (editingId) {
      // Edição
      const index = state.transactions.findIndex(t => t.id === editingId);
      if (index !== -1) {
        state.transactions[index] = {
          ...state.transactions[index],
          type,
          amount: amountVal,
          description: desc,
          cardId,
          categoryId: catId,
          category: categoryObj.name,
          date,
          notes,
          updatedAt: Date.now()
        };
        showToast('✓ Lançamento atualizado com sucesso!', 'success');
      }
    } else {
      // Criação
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type,
        amount: amountVal,
        description: desc,
        cardId,
        categoryId: catId,
        category: categoryObj.name,
        date,
        notes,
        createdAt: Date.now()
      };
      state.transactions.push(newTx);
      showToast(type === 'expense' ? '✓ Gasto registrado com sucesso!' : '✓ Entrada registrada com sucesso!', 'success');
    }

    saveData();
    closeModal(document.getElementById('modalTransaction'));
    refreshAllViews();
  }

  function confirmDeleteTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    state.pendingDeleteAction = () => {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveData();
      refreshAllViews();
      showToast('✓ Lançamento removido com sucesso!', 'info');
    };

    const confirmModal = document.getElementById('modalConfirm');
    const msg = document.getElementById('confirmModalMessage');
    msg.textContent = `Tem certeza que deseja excluir o lançamento "${tx.description}" no valor de ${formatBRL(tx.amount)}?`;
    openModal(confirmModal);
  }

  // ==========================================================================
  // GESTÃO DE CARTÕES (NOVO, EDITAR, EXCLUIR)
  // ==========================================================================
  function openCardModal(editingCardId = null) {
    const modal = document.getElementById('modalCard');
    const title = document.getElementById('modalCardTitle');
    const nameInput = document.getElementById('cardInputName');
    const typeInput = document.getElementById('cardInputType');
    const limitInput = document.getElementById('cardInputLimit');
    const balanceInput = document.getElementById('cardInputBalance');
    const colorInput = document.getElementById('cardInputColor');
    const digitsInput = document.getElementById('cardInputDigits');
    const activeInput = document.getElementById('cardInputActive');
    const hiddenId = document.getElementById('cardEditingId');

    if (editingCardId) {
      const card = state.cards.find(c => c.id === editingCardId);
      if (card) {
        title.textContent = 'Editar Cartão';
        hiddenId.value = card.id;
        nameInput.value = card.name || '';
        typeInput.value = card.type || 'credito';
        limitInput.value = formatBRL(card.limitTotal || 0);
        balanceInput.value = formatBRL(card.initialBalance || 0);
        colorInput.value = card.color || '#820AD1';
        digitsInput.value = card.digits || '';
        activeInput.checked = !!card.active;
      }
    } else {
      title.textContent = 'Adicionar Novo Cartão';
      hiddenId.value = '';
      nameInput.value = '';
      typeInput.value = 'credito';
      limitInput.value = 'R$ 0,00';
      balanceInput.value = 'R$ 0,00';
      colorInput.value = '#2563EB';
      digitsInput.value = '';
      activeInput.checked = true;
    }

    openModal(modal);
    setTimeout(() => nameInput && nameInput.focus(), 200);
  }

  function saveCard() {
    const name = document.getElementById('cardInputName').value.trim();
    const type = document.getElementById('cardInputType').value;
    const limit = parseBRL(document.getElementById('cardInputLimit').value);
    const balance = parseBRL(document.getElementById('cardInputBalance').value);
    const color = document.getElementById('cardInputColor').value;
    const digits = document.getElementById('cardInputDigits').value.replace(/\D/g, '').slice(0, 4);
    const active = document.getElementById('cardInputActive').checked;
    const editingId = document.getElementById('cardEditingId').value;

    if (!name) {
      showToast('Por favor, informe o nome do cartão ou banco.', 'error');
      document.getElementById('cardInputName').focus();
      return;
    }

    if (editingId) {
      const idx = state.cards.findIndex(c => c.id === editingId);
      if (idx !== -1) {
        state.cards[idx] = {
          ...state.cards[idx],
          name,
          type,
          limitTotal: limit,
          initialBalance: balance,
          color,
          digits,
          active
        };
        showToast('✓ Cartão atualizado com sucesso!', 'success');
      }
    } else {
      const newCard = {
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name,
        type,
        limitTotal: limit,
        initialBalance: balance,
        color,
        digits,
        active,
        blockOverlimit: false
      };
      state.cards.push(newCard);
      showToast('✓ Cartão adicionado com sucesso!', 'success');
    }

    saveData();
    closeModal(document.getElementById('modalCard'));
    // Atualiza imediatamente seletores e telas
    populateFilterSelects();
    refreshAllViews();
  }

  function toggleCardActive(cardId) {
    const card = state.cards.find(c => c.id === cardId);
    if (card) {
      card.active = !card.active;
      saveData();
      refreshAllViews();
      showToast(`Cartão ${card.name} ${card.active ? 'ativado' : 'desativado'}.`);
    }
  }

  function confirmDeleteCard(cardId) {
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;

    state.pendingDeleteAction = () => {
      // Remove o cartão e opcionalmente limpa referência
      state.cards = state.cards.filter(c => c.id !== cardId);
      saveData();
      populateFilterSelects();
      refreshAllViews();
      showToast('✓ Cartão removido com sucesso!', 'info');
    };

    const confirmModal = document.getElementById('modalConfirm');
    const msg = document.getElementById('confirmModalMessage');
    msg.textContent = `Tem certeza que deseja excluir o cartão "${card.name}"? As movimentações vinculadas serão mantidas no histórico geral.`;
    openModal(confirmModal);
  }

  // ==========================================================================
  // CONFIGURAÇÃO INICIAL EM LOTE (LIMITES REAIS)
  // ==========================================================================
  function openInitialSetupModal() {
    const container = document.getElementById('batchCardLimitsContainer');
    const modal = document.getElementById('modalInitialSetup');
    if (!container || !modal) return;

    container.innerHTML = state.cards.map(card => {
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--bg-subtle); padding:12px 14px; border-radius:var(--radius-md);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tx-card-dot" style="background-color: ${card.color}; width:10px; height:10px;"></span>
            <strong>${escapeHTML(card.name)}</strong>
          </div>
          <div style="width: 140px;">
            <input type="text" class="form-input batch-limit-input" data-card-id="${card.id}" value="${formatBRL(card.limitTotal || 0)}" inputmode="numeric" style="padding:8px 10px; font-weight:700; text-align:right;">
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.batch-limit-input').forEach(input => maskCurrency(input));
    openModal(modal);
  }

  function saveBatchLimits() {
    const inputs = document.querySelectorAll('.batch-limit-input');
    inputs.forEach(input => {
      const cardId = input.getAttribute('data-card-id');
      const limitVal = parseBRL(input.value);
      const card = state.cards.find(c => c.id === cardId);
      if (card) {
        card.limitTotal = limitVal;
      }
    });

    saveData();
    closeModal(document.getElementById('modalInitialSetup'));
    refreshAllViews();
    showToast('✓ Limites atualizados com sucesso!', 'success');
  }

  // ==========================================================================
  // EXPORTAÇÃO E IMPORTAÇÃO DE BACKUP (JSON)
  // ==========================================================================
  function exportDataJSON() {
    try {
      const backupData = {
        appName: 'myFinance',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        cards: state.cards,
        transactions: state.transactions,
        categories: state.categories,
        settings: state.settings
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = getTodayISOString();
      a.href = url;
      a.download = `myfinance-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('✓ Dados exportados com sucesso!', 'success');
    } catch (err) {
      console.error('Falha na exportação:', err);
      showToast('Erro ao gerar arquivo de exportação.', 'error');
    }
  }

  function importDataJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.cards && !imported.transactions) {
          throw new Error('Formato de arquivo inválido.');
        }

        if (Array.isArray(imported.cards)) state.cards = imported.cards;
        if (Array.isArray(imported.transactions)) state.transactions = imported.transactions;
        if (Array.isArray(imported.categories)) state.categories = imported.categories;
        if (imported.settings) state.settings = Object.assign(state.settings, imported.settings);

        saveData();
        applyTheme(state.settings.darkMode);
        refreshAllViews();
        showToast('✓ Backup restaurado com sucesso!', 'success');
      } catch (err) {
        console.error('Falha ao importar backup:', err);
        showToast('Arquivo de backup inválido ou corrompido.', 'error');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function resetAllData() {
    state.pendingDeleteAction = () => {
      state.cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
      state.transactions = [];
      saveData();
      refreshAllViews();
      showToast('✓ Todos os dados foram redefinidos.', 'info');
    };

    const confirmModal = document.getElementById('modalConfirm');
    const msg = document.getElementById('confirmModalMessage');
    msg.textContent = 'Atenção! Esta ação apagará TODOS os lançamentos e retornará os cartões aos limites zerados. Deseja continuar?';
    openModal(confirmModal);
  }

  // ==========================================================================
  // TEMA (CLARO / ESCURO)
  // ==========================================================================
  function applyTheme(isDark) {
    const html = document.documentElement;
    const iconSun = document.getElementById('iconThemeSun');
    const iconMoon = document.getElementById('iconThemeMoon');
    const switchEl = document.getElementById('settingDarkMode');

    if (isDark) {
      html.setAttribute('data-theme', 'dark');
      if (iconSun) iconSun.style.display = 'block';
      if (iconMoon) iconMoon.style.display = 'none';
      if (switchEl) switchEl.checked = true;
    } else {
      html.setAttribute('data-theme', 'light');
      if (iconSun) iconSun.style.display = 'none';
      if (iconMoon) iconMoon.style.display = 'block';
      if (switchEl) switchEl.checked = false;
    }
  }

  function toggleTheme() {
    state.settings.darkMode = !state.settings.darkMode;
    applyTheme(state.settings.darkMode);
    saveData();
  }

  // ==========================================================================
  // NAVEGAÇÃO ENTRE TELAS (SPA)
  // ==========================================================================
  function switchView(targetViewId) {
    // Esconde todas as seções
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.remove('active-view');
    });

    // Mostra a seção desejada
    const activeView = document.getElementById(targetViewId);
    if (activeView) activeView.classList.add('active-view');

    // Atualiza links da sidebar e da bottom nav
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(link => {
      if (link.getAttribute('data-view') === targetViewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Rola suavemente ao topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================================
  // MODAL CONTROLS & UTILS
  // ==========================================================================
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastFadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // PWA (SERVICE WORKER & INSTALAÇÃO)
  // ==========================================================================
  function setupPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then((reg) => console.log('Service Worker registrado com sucesso:', reg.scope))
          .catch((err) => console.warn('Falha no registro do Service Worker:', err));
      });
    }

    const btnInstall = document.getElementById('btnPwaInstall');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (btnInstall) btnInstall.style.display = 'flex';
    });

    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('✓ Aplicativo instalado com sucesso!', 'success');
        }
        deferredPrompt = null;
        btnInstall.style.display = 'none';
      });
    }
  }

  // ==========================================================================
  // CONFIGURAÇÃO DOS EVENT LISTENERS
  // ==========================================================================
  function setupEventListeners() {
    // 1. Navegação SPA por clique nos links
    document.querySelectorAll('[data-view]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = trigger.getAttribute('data-view');
        switchView(targetView);
      });
    });

    // 2. Navegação do Mês
    const btnPrev = document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnNextMonth');
    const btnResetMonth = document.getElementById('btnResetMonth');

    if (btnPrev) btnPrev.addEventListener('click', () => changeMonth(-1));
    if (btnNext) btnNext.addEventListener('click', () => changeMonth(1));
    if (btnResetMonth) btnResetMonth.addEventListener('click', resetToCurrentMonth);

    // 3. Tema Claro/Escuro
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

    const switchTheme = document.getElementById('settingDarkMode');
    if (switchTheme) switchTheme.addEventListener('change', (e) => {
      state.settings.darkMode = e.target.checked;
      applyTheme(state.settings.darkMode);
      saveData();
    });

    const switchOverlimit = document.getElementById('settingBlockOverlimit');
    if (switchOverlimit) {
      switchOverlimit.checked = !!state.settings.blockOverlimitGlobal;
      switchOverlimit.addEventListener('change', (e) => {
        state.settings.blockOverlimitGlobal = e.target.checked;
        saveData();
        showToast(state.settings.blockOverlimitGlobal ? 'Bloqueio de estouro de limite ativado.' : 'Bloqueio desativado.');
      });
    }

    // 4. Botões para abrir modal de Transação
    const btnQuickExpense = document.getElementById('btnQuickNewExpense');
    const btnQuickIncome = document.getElementById('btnQuickNewIncome');
    const btnSidebarNew = document.getElementById('btnSidebarNewExpense');
    const btnFab = document.getElementById('btnFabAdd');
    const btnHistoryNew = document.getElementById('btnHistoryNewTx');

    if (btnQuickExpense) btnQuickExpense.addEventListener('click', () => openTransactionModal('expense'));
    if (btnQuickIncome) btnQuickIncome.addEventListener('click', () => openTransactionModal('income'));
    if (btnSidebarNew) btnSidebarNew.addEventListener('click', () => openTransactionModal('expense'));
    if (btnFab) btnFab.addEventListener('click', () => openTransactionModal('expense'));
    if (btnHistoryNew) btnHistoryNew.addEventListener('click', () => openTransactionModal('expense'));

    // Abas do Modal de Transação (Gasto vs Entrada)
    const tabExpense = document.getElementById('tabTypeExpense');
    const tabIncome = document.getElementById('tabTypeIncome');
    if (tabExpense) {
      tabExpense.addEventListener('click', () => {
        state.currentTxType = 'expense';
        tabExpense.classList.add('active');
        tabIncome.classList.remove('active');
        document.getElementById('modalTransactionTitle').textContent = 'Novo Gasto';
        renderCategorySelectorInModal('expense');
      });
    }
    if (tabIncome) {
      tabIncome.addEventListener('click', () => {
        state.currentTxType = 'income';
        tabIncome.classList.add('active');
        tabExpense.classList.remove('active');
        document.getElementById('modalTransactionTitle').textContent = 'Nova Entrada';
        renderCategorySelectorInModal('income');
      });
    }

    // Salvar Transação
    const btnSaveTx = document.getElementById('btnSaveTransaction');
    if (btnSaveTx) btnSaveTx.addEventListener('click', saveTransaction);

    // 5. Botão Novo Cartão
    const btnOpenCard = document.getElementById('btnOpenNewCardModal');
    if (btnOpenCard) btnOpenCard.addEventListener('click', () => openCardModal());
    const btnSaveCard = document.getElementById('btnSaveCard');
    if (btnSaveCard) btnSaveCard.addEventListener('click', saveCard);

    // 6. Configuração Inicial em Lote
    const btnOpenSetup = document.getElementById('btnOpenInitialSetupModal');
    if (btnOpenSetup) btnOpenSetup.addEventListener('click', openInitialSetupModal);
    const btnSaveBatch = document.getElementById('btnSaveBatchLimits');
    if (btnSaveBatch) btnSaveBatch.addEventListener('click', saveBatchLimits);

    // 7. Confirmação de Exclusão
    const btnConfirmDelete = document.getElementById('btnConfirmDeleteAction');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', () => {
        if (typeof state.pendingDeleteAction === 'function') {
          state.pendingDeleteAction();
          state.pendingDeleteAction = null;
        }
        closeModal(document.getElementById('modalConfirm'));
      });
    }

    // 8. Fechamento de Modais
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(document.getElementById(modalId));
      });
    });

    // Fechar ao clicar fora do modal
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(backdrop);
      });
    });

    // 9. Filtros e Busca do Histórico
    const searchInput = document.getElementById('inputSearchTransactions');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.txFilters.search = e.target.value;
        renderTransactionsHistory();
      });
    }

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.txFilters.period = chip.getAttribute('data-period');
        renderTransactionsHistory();
      });
    });

    const filterCard = document.getElementById('filterSelectCard');
    if (filterCard) {
      filterCard.addEventListener('change', (e) => {
        state.txFilters.cardId = e.target.value;
        renderTransactionsHistory();
      });
    }

    const filterCat = document.getElementById('filterSelectCategory');
    if (filterCat) {
      filterCat.addEventListener('change', (e) => {
        state.txFilters.categoryId = e.target.value;
        renderTransactionsHistory();
      });
    }

    const filterType = document.getElementById('filterSelectType');
    if (filterType) {
      filterType.addEventListener('change', (e) => {
        state.txFilters.type = e.target.value;
        renderTransactionsHistory();
      });
    }

    // 10. Backup & Restauração
    const btnExport = document.getElementById('btnExportData');
    if (btnExport) btnExport.addEventListener('click', exportDataJSON);

    const inputImport = document.getElementById('inputImportFile');
    if (inputImport) inputImport.addEventListener('change', importDataJSON);

    const btnResetAll = document.getElementById('btnResetAllData');
    if (btnResetAll) btnResetAll.addEventListener('click', resetAllData);
  }

  // ==========================================================================
  // EXPOSIÇÃO GLOBAL CONTROLADA PARA FUNÇÕES ONCLICK DO HTML
  // ==========================================================================
  window.myFinanceApp = {
    openEditCard: (id) => openCardModal(id),
    toggleCardActive: (id) => toggleCardActive(id),
    confirmDeleteCard: (id) => confirmDeleteCard(id),
    openEditTransaction: (id) => {
      const tx = state.transactions.find(t => t.id === id);
      if (tx) openTransactionModal(tx.type, id);
    },
    confirmDeleteTransaction: (id) => confirmDeleteTransaction(id)
  };

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
