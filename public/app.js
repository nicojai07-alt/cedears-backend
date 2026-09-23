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

const searchPredictiveContainerEl = document.getElementById('searchPredictiveContainer');
const filterSearchEl = document.getElementById('filterSearch');
const btnClearSearchEl = document.getElementById('btnClearSearch');
const searchSuggestionsDropdownEl = document.getElementById('searchSuggestionsDropdown');

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

// Catalog Modal Elements
const catalogModalEl = document.getElementById('catalogModal');
const btnQuickCatalogEl = document.getElementById('btnQuickCatalog');
const btnCloseCatalogModalEl = document.getElementById('btnCloseCatalogModal');
const btnCloseCatalogBtnEl = document.getElementById('btnCloseCatalogBtn');
const catalogSearchInputEl = document.getElementById('catalogSearchInput');
const catalogGridEl = document.getElementById('catalogGrid');

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

function formatUsdAmount(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'N/A';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}USD ${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  return `${sign}USD ${Math.round(abs / 1_000_000).toLocaleString('es-AR')}M`;
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

  // Buscador Predictivo Inteligente
  filterSearchEl.addEventListener('input', handlePredictiveSearchInput);
  filterSearchEl.addEventListener('focus', () => {
    if (filterSearchEl.value.trim().length > 0) {
      handlePredictiveSearchInput();
    }
  });
  btnClearSearchEl.addEventListener('click', () => {
    filterSearchEl.value = '';
    btnClearSearchEl.style.display = 'none';
    searchSuggestionsDropdownEl.style.display = 'none';
    applyFilters();
  });

  // Cerrar sugerencias al hacer clic afuera
  document.addEventListener('click', (e) => {
    if (searchPredictiveContainerEl && !searchPredictiveContainerEl.contains(e.target)) {
      searchSuggestionsDropdownEl.style.display = 'none';
    }
  });

  // Filtros
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

  // Modal Catálogo de los 50 CEDEARs
  if (btnQuickCatalogEl) {
    btnQuickCatalogEl.addEventListener('click', openCatalogModal);
  }
  if (btnCloseCatalogModalEl) {
    btnCloseCatalogModalEl.addEventListener('click', closeCatalogModal);
  }
  if (btnCloseCatalogBtnEl) {
    btnCloseCatalogBtnEl.addEventListener('click', closeCatalogModal);
  }
  if (catalogModalEl) {
    catalogModalEl.addEventListener('click', (e) => {
      if (e.target === catalogModalEl) closeCatalogModal();
    });
  }
  if (catalogSearchInputEl) {
    catalogSearchInputEl.addEventListener('input', handleCatalogSearch);
  }

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

  // 4. TRANSPARENCIA TOTAL: FUNDAMENTOS FINANCIEROS (INPUTS DEL ALGORITMO)
  const fundNameEl = document.getElementById('fundTickerName');
  if (fundNameEl) fundNameEl.textContent = `${pred.ticker} (${pred.companyName || pred.underlyingTicker})`;

  const inputs = pred.financialInputs;
  if (inputs) {
    const revEl = document.getElementById('fundRevenue');
    if (revEl) revEl.textContent = formatUsdAmount(inputs.revenueUsd);

    const ebitdaEl = document.getElementById('fundEbitda');
    if (ebitdaEl) ebitdaEl.textContent = formatUsdAmount(inputs.ebitdaUsd);

    const fcfEl = document.getElementById('fundFcf');
    if (fcfEl) fcfEl.textContent = formatUsdAmount(inputs.freeCashFlowUsd);

    const netDebtEl = document.getElementById('fundNetDebt');
    if (netDebtEl) netDebtEl.textContent = formatUsdAmount(inputs.netDebtUsd);

    const marginEl = document.getElementById('fundOperatingMargin');
    if (marginEl) marginEl.textContent = `${(inputs.operatingMargin * 100).toFixed(2)}%`;

    const perEl = document.getElementById('fundPer');
    if (perEl) perEl.textContent = inputs.perCurrent ? `${inputs.perCurrent.toFixed(1)}x` : 'N/A';

    const indEl = document.getElementById('fundIndustryCountry');
    if (indEl) indEl.textContent = `${inputs.industry || pred.sector} • ${inputs.country || 'USA'}`;
  }

  const waccCompEl = document.getElementById('fundWaccComparison');
  if (waccCompEl) {
    waccCompEl.textContent = `${(ideal.wacc * 100).toFixed(2)}% ➔ ${(real.wacc * 100).toFixed(2)}%`;
  }

  // Actualizar fila activa en la tabla
  document.querySelectorAll('#screenerTableBody tr').forEach(tr => {
    if (tr.dataset.ticker === ticker) {
      tr.classList.add('active-row');
    } else {
      tr.classList.remove('active-row');
    }
  });

  // Actualizar gráficos (los 3 gráficos en tiempo real)
  updatePriceComparisonChart();
  updateTimelineChart();
  updateScatterChart();
}

// ==========================================================================
// Predictive Search & Autocomplete
// ==========================================================================
function handlePredictiveSearchInput() {
  const query = filterSearchEl.value.trim();
  btnClearSearchEl.style.display = query ? 'block' : 'none';

  if (!query) {
    searchSuggestionsDropdownEl.style.display = 'none';
    searchSuggestionsDropdownEl.innerHTML = '';
    applyFilters();
    return;
  }

  const normQuery = normalizeText(query);
  const matches = allPredictions.filter(p => {
    return normalizeText(p.ticker).includes(normQuery) ||
           normalizeText(p.companyName).includes(normQuery) ||
           normalizeText(p.underlyingTicker).includes(normQuery);
  }).slice(0, 8); // Top 8 coincidencias instantáneas

  renderSearchSuggestions(matches, query);
  applyFilters();
}

function renderSearchSuggestions(matches, query) {
  searchSuggestionsDropdownEl.innerHTML = '';

  if (matches.length === 0) {
    searchSuggestionsDropdownEl.innerHTML = `<div class="autocomplete-empty">Sin resultados para "${query}"</div>`;
    searchSuggestionsDropdownEl.style.display = 'block';
    return;
  }

  const isArs = currencyMode === 'ARS';

  matches.forEach(p => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    const priceText = isArs
      ? `$${p.currentPriceCedearArs.toLocaleString('es-AR')} ARS`
      : `USD ${p.currentPriceUnderlyingUsd.toFixed(2)}`;

    item.innerHTML = `
      <div class="autocomplete-item-left">
        <span class="autocomplete-ticker">${p.ticker}</span>
        <span class="autocomplete-name">${p.companyName || p.underlyingTicker}</span>
      </div>
      <div class="autocomplete-item-right">
        <span class="badge ${getRecommendationBadgeClass(p.recommendation)}">${p.recommendation.replace('_', ' ')}</span>
        <span class="autocomplete-price">${priceText}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      searchSuggestionsDropdownEl.style.display = 'none';
      selectTicker(p.ticker);
      const focusCard = document.querySelector('.ticker-focus-card');
      if (focusCard) {
        window.scrollTo({ top: focusCard.offsetTop - 70, behavior: 'smooth' });
      }
    });

    searchSuggestionsDropdownEl.appendChild(item);
  });

  searchSuggestionsDropdownEl.style.display = 'block';
}

// ==========================================================================
// Catalog Modal (50 CEDEARs BYMA)
// ==========================================================================
function openCatalogModal() {
  if (catalogSearchInputEl) catalogSearchInputEl.value = '';
  renderCatalogGrid(allPredictions);
  if (catalogModalEl) catalogModalEl.classList.add('active');
}

function closeCatalogModal() {
  if (catalogModalEl) catalogModalEl.classList.remove('active');
}

function handleCatalogSearch() {
  const query = normalizeText(catalogSearchInputEl.value);
  const filtered = allPredictions.filter(p => {
    return !query ||
           normalizeText(p.ticker).includes(query) ||
           normalizeText(p.companyName).includes(query) ||
           normalizeText(p.underlyingTicker).includes(query) ||
           normalizeText(p.sector).includes(query);
  });
  renderCatalogGrid(filtered);
}

function renderCatalogGrid(items) {
  if (!catalogGridEl) return;
  catalogGridEl.innerHTML = '';

  const sorted = [...items].sort((a, b) => a.ticker.localeCompare(b.ticker));

  if (sorted.length === 0) {
    catalogGridEl.innerHTML = '<div class="autocomplete-empty" style="grid-column: 1 / -1; padding: 2rem;">No se encontraron CEDEARs en el catálogo</div>';
    return;
  }

  sorted.forEach(p => {
    const card = document.createElement('div');
    card.className = 'catalog-card-item';
    card.innerHTML = `
      <div class="catalog-card-header">
        <span class="catalog-card-ticker">${p.ticker}</span>
        <span class="catalog-card-underlying">${p.underlyingTicker}</span>
      </div>
      <div class="catalog-card-name" title="${p.companyName}">${p.companyName || p.underlyingTicker}</div>
      <div class="catalog-card-footer">
        <span class="catalog-card-ratio">Ratio ${p.cedearRatio.cedearShares}:${p.cedearRatio.underlyingShares}</span>
        <span class="badge ${getRecommendationBadgeClass(p.recommendation)}">${p.recommendation.replace('_', ' ')}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      closeCatalogModal();
      selectTicker(p.ticker);
      const focusCard = document.querySelector('.ticker-focus-card');
      if (focusCard) {
        window.scrollTo({ top: focusCard.offsetTop - 70, behavior: 'smooth' });
      }
    });

    catalogGridEl.appendChild(card);
  });
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
    document.getElementById('priceChartSubtext').textContent = 'Precio Actual vs. Precio Objetivo Real e Ideal (Etiquetas directas)';
  } else {
    sample = filteredPredictions.slice(0, 8);
    document.getElementById('priceChartTitle').textContent = `Comparativa Top 8 CEDEARs (${isArs ? 'ARS' : 'USD'})`;
    document.getElementById('priceChartSubtext').textContent = 'Evaluación simultánea de los activos filtrados con valores directos';
  }

  const labels = sample.map(p => p.ticker);

  const dataCurrent = sample.map(p => isArs ? Math.round(p.currentPriceCedearArs) : Number(p.currentPriceUnderlyingUsd.toFixed(2)));
  const dataReal = sample.map(p => isArs ? Math.round(p.realSustainableBaseCaseScenario.targetPriceCedearArs) : Number(p.realSustainableBaseCaseScenario.targetPriceUnderlyingUsd.toFixed(2)));
  const dataIdeal = sample.map(p => isArs ? Math.round(p.idealBestCaseScenario.targetPriceCedearArs) : Number(p.idealBestCaseScenario.targetPriceUnderlyingUsd.toFixed(2)));

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
    plugins: [{
      id: 'barValueLabels',
      afterDatasetsDraw(chart) {
        const { ctx: c } = chart;
        c.save();
        c.font = 'bold 10px Inter, -apple-system, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'bottom';
        chart.data.datasets.forEach((dataset, datasetIdx) => {
          const meta = chart.getDatasetMeta(datasetIdx);
          if (meta.hidden) return;
          meta.data.forEach((bar, index) => {
            const val = dataset.data[index];
            if (val === undefined || val === null || isNaN(val)) return;
            const text = isArs
              ? `$${Math.round(val).toLocaleString('es-AR')}`
              : `USD ${Number(val).toFixed(2)}`;
            c.fillStyle = datasetIdx === 0 ? '#cbd5e1' : (datasetIdx === 1 ? '#34d399' : '#c084fc');
            c.fillText(text, bar.x, bar.y - 5);
          });
        });
        c.restore();
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 28, right: 18, bottom: 8, left: 12 }
      },
      plugins: {
        legend: {
          labels: {
            padding: 16,
            boxWidth: 12,
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.raw);
              return `${ctx.dataset.label}: ${isArs ? '$' : 'USD '}${isArs ? Math.round(val).toLocaleString('es-AR') : val.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: 'bold' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          grace: '18%',
          ticks: {
            color: '#94a3b8',
            callback: (v) => `${isArs ? '$' : 'USD '}${isArs ? Math.round(v).toLocaleString('es-AR') : Number(v).toFixed(1)}`
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

  const isReal = currentMode === 'REAL';

  // Asegurar siempre los 5 puntos completos de la proyección (Año 1 a Año 5)
  const realTimeline = (pred.realSustainableBaseCaseScenario.timeline || []).slice(0, 5);
  const idealTimeline = (pred.idealBestCaseScenario.timeline || []).slice(0, 5);

  let labels = ['Año 1', 'Año 2', 'Año 3', 'Año 4', 'Año 5'];
  let dataRealFcf = realTimeline.map(t => Math.round(t.projectedFreeCashFlow / 1_000_000));
  let dataIdealFcf = idealTimeline.map(t => Math.round(t.projectedFreeCashFlow / 1_000_000));

  // Si por alguna razón hubiese menos de 5 puntos, proyectar matemáticamente los 5 años continuos
  if (dataRealFcf.length < 5 && dataRealFcf.length > 0) {
    const baseValReal = dataRealFcf[0];
    const baseValIdeal = dataIdealFcf[0] || baseValReal;
    const gReal = pred.realSustainableBaseCaseScenario.projectedAnnualGrowthRate || 0.08;
    const gIdeal = pred.idealBestCaseScenario.projectedAnnualGrowthRate || 0.12;
    dataRealFcf = [1, 2, 3, 4, 5].map(yr => Math.round(baseValReal * Math.pow(1 + gReal, yr - 1)));
    dataIdealFcf = [1, 2, 3, 4, 5].map(yr => Math.round(baseValIdeal * Math.pow(1 + gIdeal, yr - 1)));
  }

  document.getElementById('lineChartSubtext').textContent = `Trayectoria Continua a 5 Años para ${pred.ticker} (${pred.companyName || ''}) • Valores en USD Millones`;

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
          tension: 0.3,
          borderWidth: isReal ? 3 : 2,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: isReal ? 6 : 4,
          pointHoverRadius: 8,
          spanGaps: true
        },
        {
          label: 'FCF Proyectado Ideal (Millones USD)',
          data: dataIdealFcf,
          borderColor: '#a855f7',
          backgroundColor: !isReal ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.03)',
          fill: true,
          tension: 0.3,
          borderWidth: !isReal ? 3 : 2,
          pointBackgroundColor: '#a855f7',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: !isReal ? 6 : 4,
          pointHoverRadius: 8,
          spanGaps: true
        }
      ]
    },
    plugins: [{
      id: 'timelineValueLabels',
      afterDatasetsDraw(chart) {
        const { ctx: c } = chart;
        c.save();
        c.font = 'bold 10px Inter, -apple-system, sans-serif';

        chart.data.datasets.forEach((dataset, datasetIdx) => {
          const meta = chart.getDatasetMeta(datasetIdx);
          if (meta.hidden) return;
          meta.data.forEach((point, index) => {
            const val = dataset.data[index];
            if (val === undefined || val === null || isNaN(val)) return;

            const text = `USD ${Math.round(val).toLocaleString('es-AR')}M`;

            // Alineación horizontal: primer punto a la izquierda, último a la derecha, medio centrado
            let align = 'center';
            if (index === 0) align = 'left';
            else if (index === meta.data.length - 1) align = 'right';

            // Desplazamiento vertical inteligente para evitar solapamiento entre curvas
            const realVal = dataRealFcf[index] ?? 0;
            const idealVal = dataIdealFcf[index] ?? 0;
            const isIdealHigher = idealVal >= realVal;

            let yPos = point.y - 12; // por defecto arriba
            if (datasetIdx === 0) {
              // Real: si Ideal es más alto, colocar Real abajo; sino arriba
              yPos = isIdealHigher ? point.y + 16 : point.y - 12;
            } else {
              // Ideal: si Ideal es más alto, colocar Ideal arriba; sino abajo
              yPos = isIdealHigher ? point.y - 12 : point.y + 16;
            }

            // Dibujar pastilla de fondo sutil para evitar solapamiento con la línea
            c.textAlign = align;
            c.textBaseline = 'middle';
            const metrics = c.measureText(text);
            const padX = 4;
            const padY = 2;
            const boxW = metrics.width + padX * 2;
            const boxH = 14;
            let boxX = point.x - boxW / 2;
            if (align === 'left') boxX = point.x - 2;
            if (align === 'right') boxX = point.x - boxW + 2;
            const boxY = yPos - boxH / 2;

            c.fillStyle = 'rgba(15, 23, 42, 0.85)';
            c.fillRect(boxX, boxY, boxW, boxH);

            c.fillStyle = datasetIdx === 0 ? '#34d399' : '#c084fc';
            c.fillText(text, point.x, yPos);
          });
        });
        c.restore();
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 32, right: 35, bottom: 12, left: 16 }
      },
      plugins: {
        legend: {
          labels: {
            padding: 18,
            boxWidth: 14,
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: USD ${Number(ctx.raw).toFixed(1)}M`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#cbd5e1', font: { family: 'Inter', weight: 'bold' } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          grace: '25%',
          ticks: {
            color: '#94a3b8',
            callback: (v) => `USD ${Math.round(v).toLocaleString('es-AR')}M`
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

    const isSelected = p.ticker === selectedTicker;
    const rawUpside = isReal ? p.realSustainableBaseCaseScenario.upsidePotentialPercentage : p.idealBestCaseScenario.upsidePotentialPercentage;
    const rawRisk = p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage;

    return {
      x: Number(rawRisk.toFixed(1)),
      y: Number(rawUpside.toFixed(1)),
      ticker: p.ticker,
      name: p.companyName || p.ticker,
      recommendation: p.recommendation,
      color: isSelected ? '#38bdf8' : color,
      isSelected
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
        pointBorderColor: scatterData.map(d => d.isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'),
        pointBorderWidth: scatterData.map(d => d.isSelected ? 3 : 1.5),
        pointRadius: scatterData.map(d => d.isSelected ? 11 : 5.5),
        pointHoverRadius: scatterData.map(d => d.isSelected ? 14 : 8)
      }]
    },
    plugins: [{
      id: 'scatterSelectedCallout',
      afterDatasetsDraw(chart) {
        const { ctx: c } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || meta.hidden) return;
        meta.data.forEach((point, index) => {
          const item = scatterData[index];
          if (item && item.isSelected) {
            c.save();
            // Halo de selección circular punteado
            c.beginPath();
            c.arc(point.x, point.y, 17, 0, Math.PI * 2);
            c.strokeStyle = '#38bdf8';
            c.lineWidth = 2;
            c.setLineDash([4, 4]);
            c.stroke();

            // Etiqueta distintiva directa con fondo para evitar solapamientos
            const text = ` ★ ${item.ticker}`;
            c.font = 'bold 12px Inter, sans-serif';
            c.textAlign = 'left';
            c.textBaseline = 'middle';

            const metrics = c.measureText(text);
            c.fillStyle = 'rgba(15, 23, 42, 0.85)';
            c.fillRect(point.x + 13, point.y - 8, metrics.width + 4, 16);

            c.fillStyle = '#ffffff';
            c.fillText(text, point.x + 14, point.y);
            c.restore();
          }
        });
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 20, right: 45, bottom: 12, left: 16 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw;
              const xVal = Number(d.x).toFixed(1);
              const yVal = Number(d.y).toFixed(1);
              return `${d.ticker} (${d.name}) | ${isReal ? 'Upside Real' : 'Upside Ideal'}: ${yVal}% | Riesgo: ${xVal}% [${d.recommendation}]`;
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
            callback: (v) => `${Number(v).toFixed(1)}%`
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          grace: '15%',
          title: {
            display: true,
            text: isReal ? 'Potencial de Suba Real Sostenible (%)' : 'Potencial Máximo Ideal (%)',
            color: isReal ? '#34d399' : '#c084fc',
            font: { family: 'Inter', size: 12, weight: 'bold' }
          },
          ticks: {
            color: '#94a3b8',
            callback: (v) => `${Number(v).toFixed(1)}%`
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
            const focusCard = document.querySelector('.ticker-focus-card');
            if (focusCard) {
              window.scrollTo({ top: focusCard.offsetTop - 70, behavior: 'smooth' });
            }
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
