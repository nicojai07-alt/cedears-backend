// ==========================================================================
// CEDEARs Fundamental Analysis Platform - Frontend Logic
// ==========================================================================

let allPredictions = [];
let filteredPredictions = [];
let selectedTicker = 'BMA';
let currencyMode = 'ARS'; // 'ARS' | 'USD'

// Chart.js Instances
let chartPriceComparison = null;
let chartTimeline = null;
let chartScatter = null;

// DOM Elements
const systemStatusEl = document.getElementById('systemStatus');
const statusTextEl = document.getElementById('statusText');
const filterSearchEl = document.getElementById('filterSearch');
const filterSectorEl = document.getElementById('filterSector');
const filterRecommendationEl = document.getElementById('filterRecommendation');
const filterHorizonEl = document.getElementById('filterHorizon');
const filterUpsideMinEl = document.getElementById('filterUpsideMin');
const upsideMinValueEl = document.getElementById('upsideMinValue');
const btnResetFiltersEl = document.getElementById('btnResetFilters');
const filterCountEl = document.getElementById('filterCount');
const selectFocusTickerEl = document.getElementById('selectFocusTicker');
const screenerTableBodyEl = document.getElementById('screenerTableBody');
const tableFilterInputEl = document.getElementById('tableFilterInput');

const btnCurrencyArsEl = document.getElementById('btnCurrencyArs');
const btnCurrencyUsdEl = document.getElementById('btnCurrencyUsd');

// AI Modal Elements
const aiModalEl = document.getElementById('aiModal');
const btnOpenAiModalEl = document.getElementById('btnOpenAiModal');
const btnCloseAiModalEl = document.getElementById('btnCloseAiModal');
const btnCancelAiEl = document.getElementById('btnCancelAi');
const aiAnalysisFormEl = document.getElementById('aiAnalysisForm');
const aiTickerEl = document.getElementById('aiTicker');
const aiResultBoxEl = document.getElementById('aiResultBox');

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkSystemHealth();
  await loadBatchPredictions();
});

function setupEventListeners() {
  filterSearchEl.addEventListener('input', applyFilters);
  filterSectorEl.addEventListener('change', applyFilters);
  filterRecommendationEl.addEventListener('change', applyFilters);
  filterHorizonEl.addEventListener('change', () => {
    updateTimelineChart();
  });

  filterUpsideMinEl.addEventListener('input', (e) => {
    upsideMinValueEl.textContent = `${e.target.value}%`;
    applyFilters();
  });

  btnResetFiltersEl.addEventListener('click', resetFilters);

  selectFocusTickerEl.addEventListener('change', (e) => {
    selectTicker(e.target.value);
  });

  btnCurrencyArsEl.addEventListener('click', () => setCurrencyMode('ARS'));
  btnCurrencyUsdEl.addEventListener('click', () => setCurrencyMode('USD'));

  tableFilterInputEl.addEventListener('input', (e) => {
    filterSearchEl.value = e.target.value;
    applyFilters();
  });

  // Table header sorting
  document.querySelectorAll('#screenerTable th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      sortTable(field);
    });
  });

  // AI Modal
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

    // Select first opportunity by default (e.g. BMA or top upside)
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
    option.textContent = `${p.ticker} - ${p.companyName || p.underlyingTicker} (${p.realSustainableBaseCaseScenario.upsidePotentialPercentage >= 0 ? '+' : ''}${p.realSustainableBaseCaseScenario.upsidePotentialPercentage}%)`;
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

  // Top Upside
  const sorted = [...allPredictions].sort((a, b) =>
    b.realSustainableBaseCaseScenario.upsidePotentialPercentage - a.realSustainableBaseCaseScenario.upsidePotentialPercentage
  );
  const top = sorted[0];
  document.getElementById('kpiTopUpside').textContent = `+${top.realSustainableBaseCaseScenario.upsidePotentialPercentage.toFixed(1)}%`;
  document.getElementById('kpiTopTicker').textContent = `${top.ticker} ($${top.realSustainableBaseCaseScenario.targetPriceCedearArs.toLocaleString('es-AR')} ARS)`;

  // Average Upside
  const avgUpside = allPredictions.reduce((acc, p) => acc + p.realSustainableBaseCaseScenario.upsidePotentialPercentage, 0) / allPredictions.length;
  const avgUpsideEl = document.getElementById('kpiAvgUpside');
  avgUpsideEl.textContent = `${avgUpside >= 0 ? '+' : ''}${avgUpside.toFixed(1)}%`;
  avgUpsideEl.className = `kpi-value ${avgUpside >= 0 ? 'text-emerald' : 'text-amber'}`;

  // Average Risk Discount
  const avgRisk = allPredictions.reduce((acc, p) => acc + p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage, 0) / allPredictions.length;
  document.getElementById('kpiAvgRisk').textContent = `${avgRisk.toFixed(1)}%`;
}

// ==========================================================================
// Ticker Focus & Dedicated Sections (Real vs Ideal)
// ==========================================================================
function selectTicker(ticker) {
  selectedTicker = ticker;
  selectFocusTickerEl.value = ticker;

  const pred = allPredictions.find(p => p.ticker === ticker);
  if (!pred) return;

  const real = pred.realSustainableBaseCaseScenario;
  const ideal = pred.idealBestCaseScenario;

  // Header
  document.getElementById('focusTicker').textContent = pred.ticker;
  document.getElementById('focusName').textContent = pred.companyName || pred.ticker;
  document.getElementById('focusSector').textContent = `${pred.sector || 'General'} • NYSE/NASDAQ: ${pred.underlyingTicker} • Ratio BYMA: ${pred.cedearRatio.cedearShares}:${pred.cedearRatio.underlyingShares}`;

  // Recommendation Badge
  const recBadge = document.getElementById('focusRecommendation');
  recBadge.textContent = pred.recommendation.replace('_', ' ');
  recBadge.className = `badge ${getRecommendationBadgeClass(pred.recommendation)}`;

  // SECCIÓN 1: DATOS REALES (MERCADO & SOSTENIBLE)
  document.getElementById('realCedearPrice').textContent = `$${pred.currentPriceCedearArs.toLocaleString('es-AR')}`;
  document.getElementById('realUsdPrice').textContent = `USD ${pred.currentPriceUnderlyingUsd.toFixed(2)}`;
  document.getElementById('realRatio').textContent = `${pred.cedearRatio.cedearShares}:${pred.cedearRatio.underlyingShares}`;
  document.getElementById('realCcl').textContent = `$${pred.impliedCclExchangeRate.toLocaleString('es-AR')} ARS`;

  document.getElementById('realTargetCedear').textContent = `$${real.targetPriceCedearArs.toLocaleString('es-AR')}`;
  document.getElementById('realTargetUsd').textContent = `USD ${real.targetPriceUnderlyingUsd.toFixed(2)}`;

  const realUpsideEl = document.getElementById('realUpside');
  realUpsideEl.textContent = `${real.upsidePotentialPercentage >= 0 ? '+' : ''}${real.upsidePotentialPercentage.toFixed(2)}%`;
  realUpsideEl.className = `metric-value font-lg ${real.upsidePotentialPercentage >= 0 ? 'text-emerald' : 'text-red'}`;

  document.getElementById('realRiskDiscount').textContent = `${real.appliedRiskDiscountPercentage.toFixed(2)}%`;
  document.getElementById('realWacc').textContent = `${(real.wacc * 100).toFixed(2)}%`;

  // SECCIÓN 2: DATOS IDEALES (BEST-CASE TEÓRICO)
  document.getElementById('idealGrowth').textContent = `${(ideal.projectedAnnualGrowthRate * 100).toFixed(2)}%`;
  document.getElementById('idealWacc').textContent = `${(ideal.wacc * 100).toFixed(2)}%`;
  document.getElementById('idealPer').textContent = `${ideal.targetPerMultiple.toFixed(1)}x`;

  document.getElementById('idealTargetCedear').textContent = `$${ideal.targetPriceCedearArs.toLocaleString('es-AR')}`;
  document.getElementById('idealTargetUsd').textContent = `USD ${ideal.targetPriceUnderlyingUsd.toFixed(2)}`;

  const idealUpsideEl = document.getElementById('idealUpside');
  idealUpsideEl.textContent = `${ideal.upsidePotentialPercentage >= 0 ? '+' : ''}${ideal.upsidePotentialPercentage.toFixed(2)}%`;
  idealUpsideEl.className = `metric-value font-lg ${ideal.upsidePotentialPercentage >= 0 ? 'text-purple' : 'text-amber'}`;

  document.getElementById('focusSpread').textContent = `${pred.spreadBetweenScenariosPercentage.toFixed(2)}%`;
  document.getElementById('idealEv').textContent = `USD ${(ideal.enterpriseValueUsd / 1_000_000_000).toFixed(1)}B`;

  // Síntesis Narrativa
  document.getElementById('focusNarrative').textContent = pred.synthesisNarrative;

  // Badge del Gráfico de Líneas
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
  updateTimelineChart();
}

// ==========================================================================
// Filtering & Table Render
// ==========================================================================
function applyFilters() {
  const searchTerm = filterSearchEl.value.trim().toLowerCase();
  const sector = filterSectorEl.value;
  const recommendation = filterRecommendationEl.value;
  const minUpside = parseFloat(filterUpsideMinEl.value);

  filteredPredictions = allPredictions.filter(p => {
    // Search
    const matchesSearch = !searchTerm ||
      p.ticker.toLowerCase().includes(searchTerm) ||
      (p.companyName && p.companyName.toLowerCase().includes(searchTerm)) ||
      p.underlyingTicker.toLowerCase().includes(searchTerm);

    // Sector
    const matchesSector = sector === 'ALL' || p.sector === sector;

    // Recommendation
    const matchesRec = recommendation === 'ALL' || p.recommendation === recommendation;

    // Upside Min
    const matchesUpside = p.realSustainableBaseCaseScenario.upsidePotentialPercentage >= minUpside;

    return matchesSearch && matchesSector && matchesRec && matchesUpside;
  });

  filterCountEl.textContent = `Mostrando ${filteredPredictions.length} de ${allPredictions.length} CEDEARs`;

  renderScreenerTable();
  updatePriceComparisonChart();
  updateScatterChart();
}

function resetFilters() {
  filterSearchEl.value = '';
  tableFilterInputEl.value = '';
  filterSectorEl.value = 'ALL';
  filterRecommendationEl.value = 'ALL';
  filterHorizonEl.value = '5';
  filterUpsideMinEl.value = -50;
  upsideMinValueEl.textContent = '-50%';
  applyFilters();
}

function renderScreenerTable() {
  screenerTableBodyEl.innerHTML = '';

  if (filteredPredictions.length === 0) {
    screenerTableBodyEl.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 2rem; color: var(--text-dim);">No se encontraron CEDEARs con los filtros seleccionados.</td></tr>`;
    return;
  }

  filteredPredictions.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.ticker = p.ticker;
    if (p.ticker === selectedTicker) {
      tr.classList.add('active-row');
    }

    const realUpside = p.realSustainableBaseCaseScenario.upsidePotentialPercentage;
    const idealUpside = p.idealBestCaseScenario.upsidePotentialPercentage;

    tr.innerHTML = `
      <td class="font-mono text-dim">${idx + 1}</td>
      <td><strong>${p.ticker}</strong> <span class="subtext">(${p.cedearRatio.cedearShares}:${p.cedearRatio.underlyingShares})</span></td>
      <td>${p.companyName || p.ticker}</td>
      <td><span class="subtext">${p.sector || 'General'}</span></td>
      <td class="font-mono">$${p.currentPriceCedearArs.toLocaleString('es-AR')}</td>
      <td class="font-mono text-emerald">$${p.realSustainableBaseCaseScenario.targetPriceCedearArs.toLocaleString('es-AR')}</td>
      <td class="font-mono text-purple">$${p.idealBestCaseScenario.targetPriceCedearArs.toLocaleString('es-AR')}</td>
      <td class="font-mono ${realUpside >= 0 ? 'text-emerald' : 'text-red'}"><strong>${realUpside >= 0 ? '+' : ''}${realUpside.toFixed(1)}%</strong></td>
      <td class="font-mono text-purple">${idealUpside >= 0 ? '+' : ''}${idealUpside.toFixed(1)}%</td>
      <td class="font-mono text-amber">${p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage.toFixed(0)}%</td>
      <td><span class="badge ${getRecommendationBadgeClass(p.recommendation)}">${p.recommendation.replace('_', ' ')}</span></td>
      <td>
        <button class="btn btn-sm btn-outline btn-select" data-ticker="${p.ticker}">Ver Detalle</button>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      selectTicker(p.ticker);
    });

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
    } else if (field === 'realTargetCedearArs') {
      valA = a.realSustainableBaseCaseScenario.targetPriceCedearArs;
      valB = b.realSustainableBaseCaseScenario.targetPriceCedearArs;
    } else if (field === 'idealTargetCedearArs') {
      valA = a.idealBestCaseScenario.targetPriceCedearArs;
      valB = b.idealBestCaseScenario.targetPriceCedearArs;
    } else if (field === 'realUpsidePercentage') {
      valA = a.realSustainableBaseCaseScenario.upsidePotentialPercentage;
      valB = b.realSustainableBaseCaseScenario.upsidePotentialPercentage;
    } else if (field === 'idealUpsidePercentage') {
      valA = a.idealBestCaseScenario.upsidePotentialPercentage;
      valB = b.idealBestCaseScenario.upsidePotentialPercentage;
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

// Gráfico 1: Barras Comparativas (Precios Actuales vs Reales vs Ideales)
function updatePriceComparisonChart() {
  const ctx = document.getElementById('chartPriceComparison').getContext('2d');

  // Muestra hasta 8 CEDEARs destacados del conjunto filtrado
  const sample = filteredPredictions.slice(0, 8);
  const labels = sample.map(p => p.ticker);

  const isArs = currencyMode === 'ARS';

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
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 4
        },
        {
          label: isArs ? 'Target Ideal Best-Case (ARS)' : 'Target Ideal (USD)',
          data: dataIdeal,
          backgroundColor: 'rgba(168, 85, 247, 0.85)',
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

// Gráfico 2: Líneas Temporales de Flujo de Fondos (FCF Proyectado)
function updateTimelineChart() {
  const ctx = document.getElementById('chartTimeline').getContext('2d');
  const pred = allPredictions.find(p => p.ticker === selectedTicker);
  if (!pred) return;

  const horizon = parseInt(filterHorizonEl.value, 10) || 5;

  const realTimeline = pred.realSustainableBaseCaseScenario.timeline.slice(0, horizon);
  const idealTimeline = pred.idealBestCaseScenario.timeline.slice(0, horizon);

  const labels = realTimeline.map(t => `Año ${t.year}`);
  const dataRealFcf = realTimeline.map(t => Math.round(t.projectedFreeCashFlow / 1_000_000));
  const dataIdealFcf = idealTimeline.map(t => Math.round(t.projectedFreeCashFlow / 1_000_000));

  document.getElementById('lineChartSubtext').textContent = `Trayectoria a ${horizon} año(s) para ${pred.ticker} (${pred.companyName || ''})`;

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
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#10b981'
        },
        {
          label: 'FCF Proyectado Ideal (Millones USD)',
          data: dataIdealFcf,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#a855f7'
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

// Gráfico 3: Dispersión Riesgo vs Retorno (Matriz de Inversión)
function updateScatterChart() {
  const ctx = document.getElementById('chartScatter').getContext('2d');

  const scatterData = filteredPredictions.map(p => {
    let color = '#3b82f6';
    if (p.recommendation === 'STRONG_BUY') color = '#10b981';
    else if (p.recommendation === 'BUY') color = '#60a5fa';
    else if (p.recommendation === 'HOLD') color = '#fbbf24';
    else color = '#ef4444';

    return {
      x: p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage,
      y: p.realSustainableBaseCaseScenario.upsidePotentialPercentage,
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
              return `${d.ticker} (${d.name}) | Upside: ${d.y.toFixed(1)}% | Descuento Riesgo: ${d.x.toFixed(1)}% [${d.recommendation}]`;
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
            text: 'Potencial de Suba Real Sostenible (%)',
            color: '#94a3b8',
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
// AI Analysis Form Handling
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

    // Recalculate prediction for this ticker
    const predRes = await fetch(`/api/v1/predictions/${ticker}`);
    const predData = await predRes.json();
    if (predData.success) {
      // Update in allPredictions array
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
