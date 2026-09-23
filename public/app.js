// ==========================================================================
// CEDEARs Fundamental Analysis Platform - Frontend Logic
// ==========================================================================

let allPredictions = [];
let filteredPredictions = [];
let selectedTicker = 'BMA';
let currentMode = 'REAL'; // 'REAL' | 'IDEAL'
let currencyMode = 'ARS'; // 'ARS' | 'USD'
let chartPriceScope = 'SELECTED'; // 'SELECTED' | 'TOP'

// Chart.js Instances
let chartPriceComparison = null;
let chartTimeline = null;
let chartScatter = null;

// DOM Elements
const systemStatusEl = document.getElementById('systemStatus');
const statusTextEl = document.getElementById('statusText');
const btnModeRealEl = document.getElementById('btnModeReal');
const btnModeIdealEl = document.getElementById('btnModeIdeal');
const activeModeBadgeEl = document.getElementById('activeModeBadge');

const filterSearchEl = document.getElementById('filterSearch');
const filterSectorEl = document.getElementById('filterSector');
const filterRecommendationEl = document.getElementById('filterRecommendation');
const filterHorizonEl = document.getElementById('filterHorizon');
const filterUpsideMinEl = document.getElementById('filterUpsideMin');
const upsideMinValueEl = document.getElementById('upsideMinValue');
const sliderLabelTextEl = document.getElementById('sliderLabelText');
const btnResetFiltersEl = document.getElementById('btnResetFilters');
const filterCountEl = document.getElementById('filterCount');
const selectFocusTickerEl = document.getElementById('selectFocusTicker');
const screenerTableBodyEl = document.getElementById('screenerTableBody');
const tableStatusCountEl = document.getElementById('tableStatusCount');

const btnCurrencyArsEl = document.getElementById('btnCurrencyArs');
const btnCurrencyUsdEl = document.getElementById('btnCurrencyUsd');
const btnScopeSelectedEl = document.getElementById('btnScopeSelected');
const btnScopeTopEl = document.getElementById('btnScopeTop');

// AI Modal Elements
const aiModalEl = document.getElementById('aiModal');
const btnOpenAiModalEl = document.getElementById('btnOpenAiModal');
const btnCloseAiModalEl = document.getElementById('btnCloseAiModal');
const btnCancelAiEl = document.getElementById('btnCancelAi');
const aiAnalysisFormEl = document.getElementById('aiAnalysisForm');
const aiTickerEl = document.getElementById('aiTicker');
const aiResultBoxEl = document.getElementById('aiResultBox');

// Helper para normalizar cadenas (sin acentos, minúsculas)
function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkSystemHealth();
  await loadBatchPredictions();
});

function setupEventListeners() {
  // Global Mode Toggle (Real vs Ideal)
  btnModeRealEl.addEventListener('click', () => setGlobalMode('REAL'));
  btnModeIdealEl.addEventListener('click', () => setGlobalMode('IDEAL'));

  // Filtros
  filterSearchEl.addEventListener('input', applyFilters);
  filterSectorEl.addEventListener('change', applyFilters);
  filterRecommendationEl.addEventListener('change', applyFilters);
  filterHorizonEl.addEventListener('change', () => updateTimelineChart());

  // Slider con default a -100%
  filterUpsideMinEl.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    upsideMinValueEl.textContent = val <= -100 ? 'Todos (-100%)' : `${val}%`;
    applyFilters();
  });

  btnResetFiltersEl.addEventListener('click', resetFilters);

  selectFocusTickerEl.addEventListener('change', (e) => {
    selectTicker(e.target.value);
  });

  // Toggles de Gráficos
  btnCurrencyArsEl.addEventListener('click', () => setCurrencyMode('ARS'));
  btnCurrencyUsdEl.addEventListener('click', () => setCurrencyMode('USD'));
  btnScopeSelectedEl.addEventListener('click', () => setPriceScope('SELECTED'));
  btnScopeTopEl.addEventListener('click', () => setPriceScope('TOP'));

  // Ordenamiento de tabla
  document.querySelectorAll('#screenerTable th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      sortTable(field);
    });
  });

  // Modal de IA (opcional)
  btnOpenAiModalEl.addEventListener('click', () => {
    aiTickerEl.value = selectedTicker;
    aiResultBoxEl.style.display = 'none';
    aiModalEl.classList.add('active');
  });

  btnCloseAiModalEl.addEventListener('click', () => aiModalEl.classList.remove('active'));
  btnCancelAiEl.addEventListener('click', () => aiModalEl.classList.remove('active'));
  aiAnalysisFormEl.addEventListener('submit', handleAiSubmit);
}

// ==========================================================================
// Global Mode Management (Real vs Ideal)
// ==========================================================================
function setGlobalMode(mode) {
  currentMode = mode;
  document.body.className = mode === 'REAL' ? 'mode-real-active' : 'mode-ideal-active';

  if (mode === 'REAL') {
    btnModeRealEl.classList.add('active');
    btnModeIdealEl.classList.remove('active');
    activeModeBadgeEl.textContent = 'Modo Activo: Real Sostenible (Con Riesgo)';
    activeModeBadgeEl.className = 'badge badge-emerald';
    sliderLabelTextEl.textContent = 'Upside Real Mínimo';
    document.getElementById('thTargetPrice').textContent = 'Target Real (ARS)';
    document.getElementById('thUpside').textContent = 'Upside Real (%)';
  } else {
    btnModeIdealEl.classList.add('active');
    btnModeRealEl.classList.remove('active');
    activeModeBadgeEl.textContent = 'Modo Activo: Ideal (100% Guidance)';
    activeModeBadgeEl.className = 'badge badge-purple';
    sliderLabelTextEl.textContent = 'Upside Ideal Mínimo';
    document.getElementById('thTargetPrice').textContent = 'Target Ideal (ARS)';
    document.getElementById('thUpside').textContent = 'Upside Ideal (%)';
  }

  updateKpis();
  applyFilters();
  selectTicker(selectedTicker);
}

function setCurrencyMode(mode) {
  currencyMode = mode;
  if (mode === 'ARS') {
    btnCurrencyArsEl.classList.add('active');
    btnCurrencyUsdEl.classList.remove('active');
  } else {
    btnCurrencyUsdEl.classList.add('active');
    btnCurrencyArsEl.classList.remove('active');
  }
  updatePriceComparisonChart();
}

function setPriceScope(scope) {
  chartPriceScope = scope;
  if (scope === 'SELECTED') {
    btnScopeSelectedEl.classList.add('active');
    btnScopeTopEl.classList.remove('active');
  } else {
    btnScopeTopEl.classList.add('active');
    btnScopeSelectedEl.classList.remove('active');
  }
  updatePriceComparisonChart();
}

// ==========================================================================
// API Calls & Data Loading
// ==========================================================================
async function checkSystemHealth() {
  const startTime = Date.now();
  try {
    const res = await fetch('/health');
    const data = await res.json();
    const latency = Date.now() - startTime;

    if (data.status === 'HEALTHY') {
      systemStatusEl.classList.add('online');
      statusTextEl.textContent = `Online • ${latency}ms`;
    }
  } catch (err) {
    statusTextEl.textContent = 'Servidor sin conexión';
  }
}

async function loadBatchPredictions() {
  try {
    statusTextEl.textContent = 'Cargando 50 CEDEARs...';
    const res = await fetch('/api/v1/predictions/batch?sortBy=real_upside&order=desc');
    const data = await res.json();

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Respuesta inválida del servidor');
    }

    allPredictions = data.data;
    filteredPredictions = [...allPredictions];

    populateTickerSelects();
    updateKpis();
    applyFilters();

    // Seleccionar por defecto la primera oportunidad (ej: BMA)
    if (allPredictions.length > 0) {
      selectTicker(allPredictions[0].ticker);
    }

    statusTextEl.textContent = `Online • 50 CEDEARs listos`;
  } catch (err) {
    console.error('Error cargando predicciones:', err);
    statusTextEl.textContent = 'Error al cargar datos';
  }
}

function populateTickerSelects() {
  selectFocusTickerEl.innerHTML = '';
  aiTickerEl.innerHTML = '';

  allPredictions.forEach(p => {
    const option = document.createElement('option');
    option.value = p.ticker;
    option.textContent = `${p.ticker} - ${p.companyName || p.underlyingTicker}`;
    selectFocusTickerEl.appendChild(option);

    const aiOption = document.createElement('option');
    aiOption.value = p.ticker;
    aiOption.textContent = `${p.ticker} - ${p.companyName || p.ticker}`;
    aiTickerEl.appendChild(aiOption);
  });
}

function updateKpis() {
  document.getElementById('kpiTotalCompanies').textContent = allPredictions.length;
  if (allPredictions.length === 0) return;

  const isReal = currentMode === 'REAL';

  // KPI Top Upside según el modo
  const sorted = [...allPredictions].sort((a, b) => {
    const upA = isReal ? a.realSustainableBaseCaseScenario.upsidePotentialPercentage : a.idealBestCaseScenario.upsidePotentialPercentage;
    const upB = isReal ? b.realSustainableBaseCaseScenario.upsidePotentialPercentage : b.idealBestCaseScenario.upsidePotentialPercentage;
    return upB - upA;
  });
  const top = sorted[0];
  const topUpside = isReal ? top.realSustainableBaseCaseScenario.upsidePotentialPercentage : top.idealBestCaseScenario.upsidePotentialPercentage;
  const topTarget = isReal ? top.realSustainableBaseCaseScenario.targetPriceCedearArs : top.idealBestCaseScenario.targetPriceCedearArs;

  const topTitleEl = document.getElementById('kpiTopTitle');
  const topUpsideEl = document.getElementById('kpiTopUpside');
  topTitleEl.textContent = isReal ? 'Mayor Potencial Real' : 'Mayor Potencial Ideal';
  topUpsideEl.textContent = `+${topUpside.toFixed(1)}%`;
  topUpsideEl.className = `kpi-value ${isReal ? 'text-emerald' : 'text-purple'}`;
  document.getElementById('kpiTopTicker').textContent = `${top.ticker} ($${topTarget.toLocaleString('es-AR')} ARS)`;

  // KPI Promedio de Mercado según el modo
  const avgUpside = allPredictions.reduce((acc, p) => {
    return acc + (isReal ? p.realSustainableBaseCaseScenario.upsidePotentialPercentage : p.idealBestCaseScenario.upsidePotentialPercentage);
  }, 0) / allPredictions.length;

  const avgTitleEl = document.getElementById('kpiAvgTitle');
  const avgUpsideEl = document.getElementById('kpiAvgUpside');
  const avgSubtextEl = document.getElementById('kpiAvgSubtext');

  avgTitleEl.textContent = isReal ? 'Upside Promedio Real' : 'Upside Promedio Ideal';
  avgUpsideEl.textContent = `${avgUpside >= 0 ? '+' : ''}${avgUpside.toFixed(1)}%`;
  avgUpsideEl.className = `kpi-value ${isReal ? (avgUpside >= 0 ? 'text-emerald' : 'text-red') : 'text-purple'}`;
  avgSubtextEl.textContent = isReal ? 'Escenario Sostenible con Riesgo' : 'Escenario 100% Guidance Óptimo';

  // Riesgo Promedio
  const avgRisk = allPredictions.reduce((acc, p) => acc + p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage, 0) / allPredictions.length;
  document.getElementById('kpiAvgRisk').textContent = `${avgRisk.toFixed(1)}%`;
}

// ==========================================================================
// Ticker Selection & Direct Financial Information Cards
// ==========================================================================
function selectTicker(ticker) {
  selectedTicker = ticker;
  selectFocusTickerEl.value = ticker;

  const pred = allPredictions.find(p => p.ticker === ticker);
  if (!pred) return;

  const real = pred.realSustainableBaseCaseScenario;
  const ideal = pred.idealBestCaseScenario;
  const isReal = currentMode === 'REAL';

  // Header del foco
  document.getElementById('focusTicker').textContent = pred.ticker;
  document.getElementById('focusName').textContent = pred.companyName || pred.ticker;
  document.getElementById('focusSector').textContent = `${pred.sector || 'General'} • NYSE/NASDAQ: ${pred.underlyingTicker} • Ratio BYMA: ${pred.cedearRatio.cedearShares}:${pred.cedearRatio.underlyingShares}`;

  // Badge de recomendación
  const recBadge = document.getElementById('focusRecommendation');
  recBadge.textContent = pred.recommendation.replace('_', ' ');
  recBadge.className = `badge ${getRecommendationBadgeClass(pred.recommendation)}`;

  // 1. TARJETAS DE INFORMACIÓN FINANCIERA DIRECTA
  document.getElementById('directPriceArs').textContent = `$${pred.currentPriceCedearArs.toLocaleString('es-AR')} ARS`;
  document.getElementById('directPriceUsd').textContent = `USD ${pred.currentPriceUnderlyingUsd.toFixed(2)}`;
  document.getElementById('directRatio').textContent = `${pred.cedearRatio.cedearShares}:${pred.cedearRatio.underlyingShares}`;
  document.getElementById('directCcl').textContent = `$${pred.impliedCclExchangeRate.toLocaleString('es-AR')} ARS`;
  document.getElementById('directUnderlying').textContent = `Ticker original: ${pred.underlyingTicker}`;

  // Adaptación de tarjetas destacadas según el modo activo
  const targetArs = isReal ? real.targetPriceCedearArs : ideal.targetPriceCedearArs;
  const targetUsd = isReal ? real.targetPriceUnderlyingUsd : ideal.targetPriceUnderlyingUsd;
  const upsidePct = isReal ? real.upsidePotentialPercentage : ideal.upsidePotentialPercentage;

  document.getElementById('directTargetLabel').textContent = isReal ? 'Precio Objetivo Real (ARS)' : 'Precio Objetivo Ideal (ARS)';
  const directTargetArsEl = document.getElementById('directTargetArs');
  directTargetArsEl.textContent = `$${targetArs.toLocaleString('es-AR')} ARS`;
  directTargetArsEl.className = `direct-value font-lg ${isReal ? 'text-emerald' : 'text-purple'}`;
  document.getElementById('directTargetUsd').textContent = `USD ${targetUsd.toFixed(2)}`;

  document.getElementById('directUpsideLabel').textContent = isReal ? 'Potencial de Suba Real' : 'Potencial Máximo Ideal';
  const directUpsideEl = document.getElementById('directUpside');
  directUpsideEl.textContent = `${upsidePct >= 0 ? '+' : ''}${upsidePct.toFixed(2)}%`;
  directUpsideEl.className = `direct-value font-lg ${isReal ? (upsidePct >= 0 ? 'text-emerald' : 'text-red') : 'text-purple'}`;
  document.getElementById('directUpsideSub').textContent = isReal ? 'Margen Sostenible Real' : 'Escenario 100% Guidance';

  // 2. DETALLES COMPARATIVOS: SECCIÓN REAL
  document.getElementById('realTargetCedear').textContent = `$${real.targetPriceCedearArs.toLocaleString('es-AR')}`;
  document.getElementById('realTargetUsd').textContent = `USD ${real.targetPriceUnderlyingUsd.toFixed(2)}`;
  const realUpsideDetailEl = document.getElementById('realUpsideDetail');
  realUpsideDetailEl.textContent = `${real.upsidePotentialPercentage >= 0 ? '+' : ''}${real.upsidePotentialPercentage.toFixed(2)}%`;
  realUpsideDetailEl.className = `metric-value font-lg ${real.upsidePotentialPercentage >= 0 ? 'text-emerald' : 'text-red'}`;
  document.getElementById('realRiskDiscount').textContent = `${real.appliedRiskDiscountPercentage.toFixed(2)}%`;
  document.getElementById('realWacc').textContent = `${(real.wacc * 100).toFixed(2)}%`;

  // 3. DETALLES COMPARATIVOS: SECCIÓN IDEAL
  document.getElementById('idealTargetCedear').textContent = `$${ideal.targetPriceCedearArs.toLocaleString('es-AR')}`;
  document.getElementById('idealTargetUsd').textContent = `USD ${ideal.targetPriceUnderlyingUsd.toFixed(2)}`;
  const idealUpsideDetailEl = document.getElementById('idealUpsideDetail');
  idealUpsideDetailEl.textContent = `${ideal.upsidePotentialPercentage >= 0 ? '+' : ''}${ideal.upsidePotentialPercentage.toFixed(2)}%`;
  idealUpsideDetailEl.className = `metric-value font-lg ${ideal.upsidePotentialPercentage >= 0 ? 'text-purple' : 'text-amber'}`;
  document.getElementById('idealGrowth').textContent = `${(ideal.projectedAnnualGrowthRate * 100).toFixed(2)}%`;
  document.getElementById('focusSpread').textContent = `${pred.spreadBetweenScenariosPercentage.toFixed(2)}%`;

  // Síntesis Narrativa
  document.getElementById('focusNarrative').textContent = pred.synthesisNarrative;
  document.getElementById('lineChartTickerBadge').textContent = pred.ticker;

  // Actualizar fila activa en la tabla
  document.querySelectorAll('#screenerTableBody tr').forEach(tr => {
    if (tr.dataset.ticker === ticker) {
      tr.classList.add('active-row');
    } else {
      tr.classList.remove('active-row');
    }
  });

  // Actualizar gráficos
  updatePriceComparisonChart();
  updateTimelineChart();
}

// ==========================================================================
// Filtering & Search (Insensible a mayúsculas/minúsculas y acentos)
// ==========================================================================
function applyFilters() {
  const rawSearch = filterSearchEl.value;
  const search = normalizeText(rawSearch);
  const sector = filterSectorEl.value;
  const recommendation = filterRecommendationEl.value;
  const minUpside = parseFloat(filterUpsideMinEl.value);
  const isReal = currentMode === 'REAL';

  filteredPredictions = allPredictions.filter(p => {
    // Búsqueda insensible a mayúsculas, minúsculas y acentos
    const tickerNorm = normalizeText(p.ticker);
    const nameNorm = normalizeText(p.companyName);
    const underlyingNorm = normalizeText(p.underlyingTicker);
    const sectorNorm = normalizeText(p.sector);

    const matchesSearch = !search ||
      tickerNorm.includes(search) ||
      nameNorm.includes(search) ||
      underlyingNorm.includes(search) ||
      sectorNorm.includes(search);

    // Sector
    const matchesSector = sector === 'ALL' || p.sector === sector;

    // Recomendación
    const matchesRec = recommendation === 'ALL' || p.recommendation === recommendation;

    // Upside mínimo según el modo activo
    const upside = isReal ? p.realSustainableBaseCaseScenario.upsidePotentialPercentage : p.idealBestCaseScenario.upsidePotentialPercentage;
    const matchesUpside = minUpside <= -100 ? true : (upside >= minUpside);

    return matchesSearch && matchesSector && matchesRec && matchesUpside;
  });

  filterCountEl.textContent = `Mostrando ${filteredPredictions.length} de ${allPredictions.length} CEDEARs`;
  tableStatusCountEl.textContent = `${filteredPredictions.length} de ${allPredictions.length} activos`;

  renderScreenerTable();
  updatePriceComparisonChart();
  updateScatterChart();
}

function resetFilters() {
  filterSearchEl.value = '';
  filterSectorEl.value = 'ALL';
  filterRecommendationEl.value = 'ALL';
  filterHorizonEl.value = '5';
  filterUpsideMinEl.value = -100;
  upsideMinValueEl.textContent = 'Todos (-100%)';
  applyFilters();
}

// ==========================================================================
// Screener Table Render
// ==========================================================================
function renderScreenerTable() {
  screenerTableBodyEl.innerHTML = '';

  if (filteredPredictions.length === 0) {
    screenerTableBodyEl.innerHTML = `
      <tr>
        <td colspan="12">
          <div class="empty-state">
            <span class="empty-state-icon">🔍</span>
            <h4>No se encontraron CEDEARs</h4>
            <p>Ningún activo coincide con la búsqueda o filtros seleccionados. Intenta restablecer los filtros para volver a ver los 50 CEDEARs.</p>
            <button class="btn btn-secondary btn-sm" onclick="resetFilters()">Restablecer Filtros</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const isReal = currentMode === 'REAL';

  filteredPredictions.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.ticker = p.ticker;
    if (p.ticker === selectedTicker) {
      tr.classList.add('active-row');
    }

    const realTarget = p.realSustainableBaseCaseScenario.targetPriceCedearArs;
    const idealTarget = p.idealBestCaseScenario.targetPriceCedearArs;
    const realUpside = p.realSustainableBaseCaseScenario.upsidePotentialPercentage;
    const idealUpside = p.idealBestCaseScenario.upsidePotentialPercentage;

    const displayTarget = isReal ? realTarget : idealTarget;
    const displayUpside = isReal ? realUpside : idealUpside;
    const upsideClass = isReal ? (displayUpside >= 0 ? 'text-emerald' : 'text-red') : 'text-purple';

    tr.innerHTML = `
      <td class="font-mono text-dim">${idx + 1}</td>
      <td><strong>${p.ticker}</strong></td>
      <td>${p.companyName || p.ticker}</td>
      <td><span class="subtext">${p.sector || 'General'}</span></td>
      <td class="font-mono">$${p.currentPriceCedearArs.toLocaleString('es-AR')}</td>
      <td class="font-mono text-dim">USD ${p.currentPriceUnderlyingUsd.toFixed(2)}</td>
      <td class="font-mono">${p.cedearRatio.cedearShares}:${p.cedearRatio.underlyingShares}</td>
      <td class="font-mono ${isReal ? 'text-emerald' : 'text-purple'}"><strong>$${displayTarget.toLocaleString('es-AR')}</strong></td>
      <td class="font-mono ${upsideClass}"><strong>${displayUpside >= 0 ? '+' : ''}${displayUpside.toFixed(1)}%</strong></td>
      <td class="font-mono text-amber">${p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage.toFixed(0)}%</td>
      <td><span class="badge ${getRecommendationBadgeClass(p.recommendation)}">${p.recommendation.replace('_', ' ')}</span></td>
      <td>
        <button class="btn btn-sm btn-outline btn-select" data-ticker="${p.ticker}">Ver</button>
      </td>
    `;

    tr.addEventListener('click', () => selectTicker(p.ticker));

    const btn = tr.querySelector('.btn-select');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectTicker(p.ticker);
      window.scrollTo({ top: document.querySelector('.ticker-focus-card').offsetTop - 80, behavior: 'smooth' });
    });

    screenerTableBodyEl.appendChild(tr);
  });
}

let sortState = { field: null, asc: false };
function sortTable(field) {
  if (sortState.field === field) {
    sortState.asc = !sortState.asc;
  } else {
    sortState.field = field;
    sortState.asc = true;
  }

  filteredPredictions.sort((a, b) => {
    let valA, valB;
    const isReal = currentMode === 'REAL';

    if (field === 'rank') {
      valA = allPredictions.indexOf(a);
      valB = allPredictions.indexOf(b);
    } else if (field === 'ticker') {
      valA = a.ticker;
      valB = b.ticker;
    } else if (field === 'companyName') {
      valA = a.companyName || a.ticker;
      valB = b.companyName || b.ticker;
    } else if (field === 'sector') {
      valA = a.sector || '';
      valB = b.sector || '';
    } else if (field === 'currentPriceCedearArs') {
      valA = a.currentPriceCedearArs;
      valB = b.currentPriceCedearArs;
    } else if (field === 'currentPriceUnderlyingUsd') {
      valA = a.currentPriceUnderlyingUsd;
      valB = b.currentPriceUnderlyingUsd;
    } else if (field === 'cedearRatio') {
      valA = a.cedearRatio.cedearShares;
      valB = b.cedearRatio.cedearShares;
    } else if (field === 'targetPrice') {
      valA = isReal ? a.realSustainableBaseCaseScenario.targetPriceCedearArs : a.idealBestCaseScenario.targetPriceCedearArs;
      valB = isReal ? b.realSustainableBaseCaseScenario.targetPriceCedearArs : b.idealBestCaseScenario.targetPriceCedearArs;
    } else if (field === 'upsidePercentage') {
      valA = isReal ? a.realSustainableBaseCaseScenario.upsidePotentialPercentage : a.idealBestCaseScenario.upsidePotentialPercentage;
      valB = isReal ? b.realSustainableBaseCaseScenario.upsidePotentialPercentage : b.idealBestCaseScenario.upsidePotentialPercentage;
    } else if (field === 'riskDiscountPercentage') {
      valA = a.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage;
      valB = b.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage;
    } else if (field === 'recommendation') {
      valA = a.recommendation;
      valB = b.recommendation;
    }

    if (typeof valA === 'string') {
      return sortState.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortState.asc ? valA - valB : valB - valA;
  });

  renderScreenerTable();
}

function getRecommendationBadgeClass(rec) {
  switch (rec) {
    case 'STRONG_BUY': return 'badge-strong-buy';
    case 'BUY': return 'badge-buy';
    case 'HOLD': return 'badge-hold';
    case 'SELL': return 'badge-sell';
    case 'STRONG_SELL': return 'badge-strong-sell';
    default: return 'badge-outline';
  }
}

// ==========================================================================
// Chart.js Visualizations
// ==========================================================================

// GRÁFICO 1: BARRAS COMPARATIVAS (PRECIOS ACTUALES VS TARGETS)
function updatePriceComparisonChart() {
  const ctx = document.getElementById('chartPriceComparison').getContext('2d');
  const isArs = currencyMode === 'ARS';
  const isReal = currentMode === 'REAL';

  // Determinar muestra según el scope
  let sample = [];
  if (chartPriceScope === 'SELECTED') {
    const current = allPredictions.find(p => p.ticker === selectedTicker);
    sample = current ? [current] : [];
    document.getElementById('priceChartTitle').textContent = `Comparativa de Precios: ${selectedTicker} (${isArs ? 'ARS' : 'USD'})`;
    document.getElementById('priceChartSubtext').textContent = 'Precio Actual vs. Precio Objetivo Real e Ideal';
  } else {
    sample = filteredPredictions.slice(0, 8);
    document.getElementById('priceChartTitle').textContent = `Comparativa Top 8 CEDEARs (${isArs ? 'ARS' : 'USD'})`;
    document.getElementById('priceChartSubtext').textContent = 'Evaluación simultánea de los activos filtrados';
  }

  const labels = sample.map(p => p.ticker);

  const dataCurrent = sample.map(p => isArs ? p.currentPriceCedearArs : p.currentPriceUnderlyingUsd);
  const dataReal = sample.map(p => isArs ? p.realSustainableBaseCaseScenario.targetPriceCedearArs : p.realSustainableBaseCaseScenario.targetPriceUnderlyingUsd);
  const dataIdeal = sample.map(p => isArs ? p.idealBestCaseScenario.targetPriceCedearArs : p.idealBestCaseScenario.targetPriceUnderlyingUsd);

  if (chartPriceComparison) {
    chartPriceComparison.destroy();
  }

  chartPriceComparison = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: isArs ? 'Precio Actual (ARS)' : 'Precio Actual (USD)',
          data: dataCurrent,
          backgroundColor: 'rgba(148, 163, 184, 0.7)',
          borderRadius: 4
        },
        {
          label: isArs ? 'Target Real Sostenible (ARS)' : 'Target Real (USD)',
          data: dataReal,
          backgroundColor: isReal ? 'rgba(16, 185, 129, 0.95)' : 'rgba(16, 185, 129, 0.45)',
          borderColor: isReal ? '#10b981' : 'transparent',
          borderWidth: isReal ? 2 : 0,
          borderRadius: 4
        },
        {
          label: isArs ? 'Target Ideal (ARS)' : 'Target Ideal (USD)',
          data: dataIdeal,
          backgroundColor: !isReal ? 'rgba(168, 85, 247, 0.95)' : 'rgba(168, 85, 247, 0.45)',
          borderColor: !isReal ? '#a855f7' : 'transparent',
          borderWidth: !isReal ? 2 : 0,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${isArs ? '$' : 'USD '}${ctx.raw.toLocaleString('es-AR')}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: 'bold' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            callback: (v) => `${isArs ? '$' : 'USD '}${v.toLocaleString('es-AR')}`
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

// GRÁFICO 2: LÍNEAS TEMPORALES DE PROYECCIÓN FCF (1 A 5 AÑOS)
function updateTimelineChart() {
  const ctx = document.getElementById('chartTimeline').getContext('2d');
  const pred = allPredictions.find(p => p.ticker === selectedTicker);
  if (!pred) return;

  const horizon = parseInt(filterHorizonEl.value, 10) || 5;
  const isReal = currentMode === 'REAL';

  const realTimeline = pred.realSustainableBaseCaseScenario.timeline.slice(0, horizon);
  const idealTimeline = pred.idealBestCaseScenario.timeline.slice(0, horizon);

  const labels = realTimeline.map(t => `Año ${t.year}`);
  const dataRealFcf = realTimeline.map(t => Math.round(t.projectedFreeCashFlow / 1_000_000));
  const dataIdealFcf = idealTimeline.map(t => Math.round(t.projectedFreeCashFlow / 1_000_000));

  document.getElementById('lineChartSubtext').textContent = `Trayectoria de ${horizon} año(s) para ${pred.ticker} (${pred.companyName || ''})`;

  if (chartTimeline) {
    chartTimeline.destroy();
  }

  chartTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'FCF Proyectado Real (Millones USD)',
          data: dataRealFcf,
          borderColor: '#10b981',
          backgroundColor: isReal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.03)',
          fill: true,
          tension: 0.35,
          borderWidth: isReal ? 3 : 1.5,
          pointBackgroundColor: '#10b981',
          pointRadius: isReal ? 5 : 3
        },
        {
          label: 'FCF Proyectado Ideal (Millones USD)',
          data: dataIdealFcf,
          borderColor: '#a855f7',
          backgroundColor: !isReal ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.03)',
          fill: true,
          tension: 0.35,
          borderWidth: !isReal ? 3 : 1.5,
          pointBackgroundColor: '#a855f7',
          pointRadius: !isReal ? 5 : 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: USD ${ctx.raw.toLocaleString('es-AR')}M`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#cbd5e1' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            callback: (v) => `USD ${v.toLocaleString('es-AR')}M`
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

// GRÁFICO 3: MATRIZ DE MERCADO (DISPERSIÓN RIESGO VS RETORNO)
function updateScatterChart() {
  const ctx = document.getElementById('chartScatter').getContext('2d');
  const isReal = currentMode === 'REAL';

  document.getElementById('scatterModeBadge').textContent = isReal ? 'Eje Y: Upside Real Sostenible (%)' : 'Eje Y: Upside Ideal Máximo (%)';

  const scatterData = filteredPredictions.map(p => {
    let color = '#3b82f6';
    if (p.recommendation === 'STRONG_BUY') color = '#10b981';
    else if (p.recommendation === 'BUY') color = '#60a5fa';
    else if (p.recommendation === 'HOLD') color = '#fbbf24';
    else color = '#ef4444';

    const upside = isReal ? p.realSustainableBaseCaseScenario.upsidePotentialPercentage : p.idealBestCaseScenario.upsidePotentialPercentage;

    return {
      x: p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage,
      y: upside,
      ticker: p.ticker,
      name: p.companyName || p.ticker,
      recommendation: p.recommendation,
      color
    };
  });

  if (chartScatter) {
    chartScatter.destroy();
  }

  chartScatter = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'CEDEARs',
        data: scatterData,
        pointBackgroundColor: scatterData.map(d => d.color),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 6,
        pointHoverRadius: 9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw;
              return `${d.ticker} (${d.name}) | ${isReal ? 'Upside Real' : 'Upside Ideal'}: ${d.y.toFixed(1)}% | Riesgo: ${d.x.toFixed(1)}% [${d.recommendation}]`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Descuento por Riesgo Cualitativo Aplicado (%)',
            color: '#94a3b8',
            font: { family: 'Inter', size: 12, weight: 'bold' }
          },
          ticks: {
            color: '#94a3b8',
            callback: (v) => `${v}%`
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          title: {
            display: true,
            text: isReal ? 'Potencial de Suba Real Sostenible (%)' : 'Potencial Máximo Ideal (%)',
            color: isReal ? '#34d399' : '#c084fc',
            font: { family: 'Inter', size: 12, weight: 'bold' }
          },
          ticks: {
            color: '#94a3b8',
            callback: (v) => `${v}%`
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const point = scatterData[index];
          if (point) {
            selectTicker(point.ticker);
            window.scrollTo({ top: document.querySelector('.ticker-focus-card').offsetTop - 80, behavior: 'smooth' });
          }
        }
      }
    }
  });
}

// ==========================================================================
// AI Analysis Form Handling (Opcional)
// ==========================================================================
async function handleAiSubmit(e) {
  e.preventDefault();

  const ticker = aiTickerEl.value;
  const quarter = document.getElementById('aiQuarter').value;
  const transcriptEarningsCall = document.getElementById('aiTranscript').value;
  const guidanceText = document.getElementById('aiGuidance').value;
  const submitBtn = document.getElementById('btnSubmitAi');

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Procesando con IA...';

  try {
    const res = await fetch(`/api/v1/analysis/qualitative/${ticker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quarter,
        transcriptEarningsCall,
        guidanceText
      })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Error en el análisis de IA');
    }

    const aiRes = data.data;
    document.getElementById('resSentiment').textContent = `${aiRes.sentimentClassification} (${aiRes.overallSentimentScore >= 0 ? '+' : ''}${aiRes.overallSentimentScore.toFixed(2)})`;
    document.getElementById('resGuidance').textContent = `${(aiRes.guidanceConfidence * 100).toFixed(0)}%`;
    document.getElementById('resDiscount').textContent = `${(aiRes.totalRiskDiscountFactor * 100).toFixed(1)}%`;
    document.getElementById('resModel').textContent = aiRes.modelUsed;
    document.getElementById('resSummary').textContent = aiRes.executiveSummary;
    aiResultBoxEl.style.display = 'block';

    // Recalcular predicción para este ticker
    const predRes = await fetch(`/api/v1/predictions/${ticker}`);
    const predData = await predRes.json();
    if (predData.success) {
      const idx = allPredictions.findIndex(p => p.ticker === ticker);
      if (idx !== -1) {
        allPredictions[idx] = predData.data;
      }
      applyFilters();
      selectTicker(ticker);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Ejecutar Análisis con IA';
  }
}
