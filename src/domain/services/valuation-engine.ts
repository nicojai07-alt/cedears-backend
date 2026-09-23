import { Company } from '../entities/company.js';
import { QuarterlyFinancialRecord } from '../entities/financial-statement.js';
import { QualitativeAnalysisResult } from '../entities/qualitative-data.js';
import { PredictionResult, ValuationScenario, ProjectionTimeline } from '../entities/prediction.js';

export interface ValuationEngineParams {
  company: Company;
  latestFinancials: QuarterlyFinancialRecord;
  qualitativeAnalysis?: QualitativeAnalysisResult;
  horizonYears?: number; // Default 5 years
}

export class ValuationEngine {
  private readonly defaultHorizonYears = 5;

  /**
   * Genera los dos escenarios de valoración:
   * 1. Ideal / Best-Case (100% guidance, crecimiento óptimo sin fricciones)
   * 2. Real / Sostenible (Base-Case conservador ajustado por datos blandos e incertidumbre)
   */
  public calculateScenarios(params: ValuationEngineParams): PredictionResult {
    const { company, latestFinancials, qualitativeAnalysis } = params;
    const horizon = params.horizonYears || this.defaultHorizonYears;

    const baseFcf = latestFinancials.cashFlow.freeCashFlow > 0
      ? latestFinancials.cashFlow.freeCashFlow
      : Math.max(latestFinancials.incomeStatement.operatingIncome * 0.7, 1_000_000); // Estimación prudente si FCF trimestral fue negativo

    const baseRevenue = latestFinancials.incomeStatement.totalRevenue;
    const baseEbitda = latestFinancials.incomeStatement.ebitda;
    const sharesOutstanding = latestFinancials.incomeStatement.sharesOutstanding || 1;
    const netDebt = latestFinancials.ratios.netDebt;

    // --- ESCENARIO 1: IDEAL (BEST-CASE) ---
    // Crecimiento pleno sin penalizaciones, WACC teórico eficiente
    const idealGrowthRate = this.determineIdealGrowthRate(company.sector, latestFinancials);
    const idealWacc = 0.085; // 8.5% costo de capital eficiente
    const idealTerminalGrowth = 0.025; // 2.5% crecimiento a perpetuidad
    const idealScenario = this.buildScenario({
      scenarioName: 'IDEAL_BEST_CASE',
      description: 'Valuación teórica óptima con cumplimiento del 100% del guidance y máxima eficiencia operativa.',
      horizon,
      baseRevenue,
      baseEbitda,
      baseFcf,
      annualGrowthRate: idealGrowthRate,
      wacc: idealWacc,
      terminalGrowthRate: idealTerminalGrowth,
      netDebt,
      sharesOutstanding,
      company,
      riskDiscountFactor: 0.0,
      targetPerMultiple: 24.0
    });

    // --- ESCENARIO 2: REAL / SOSTENIBLE (BASE-CASE CONSERVADOR) ---
    // Ajustado por riesgos operativos, sentimiento de earnings call y riesgo cambiario/soberano
    const riskDiscount = qualitativeAnalysis?.totalRiskDiscountFactor ?? 0.15;
    const guidanceConfidence = qualitativeAnalysis?.guidanceConfidence ?? 0.80;
    const operationalRisk = qualitativeAnalysis?.riskAssessment.operationalRisk ?? 0.20;
    const macroRisk = qualitativeAnalysis?.riskAssessment.macroEconomicRisk ?? 0.25;

    // Reducción del crecimiento proyectado por fricciones y sesgo cualitativo
    const realGrowthRate = idealGrowthRate * guidanceConfidence * (1 - operationalRisk * 0.3);
    // Incremento de tasa WACC como prima por riesgo de ejecución y volatilidad CEDEAR
    const realWacc = idealWacc + (operationalRisk * 0.02) + (macroRisk * 0.025);
    const realTerminalGrowth = 0.018; // Crecimiento terminal más cauto (1.8%)

    const realScenario = this.buildScenario({
      scenarioName: 'REAL_SUSTAINABLE_BASE_CASE',
      description: 'Valuación sostenible conservadora penalizada por riesgos operativos, macroeconómicos y sentimiento cualitativo.',
      horizon,
      baseRevenue,
      baseEbitda,
      baseFcf,
      annualGrowthRate: realGrowthRate,
      wacc: realWacc,
      terminalGrowthRate: realTerminalGrowth,
      netDebt,
      sharesOutstanding,
      company,
      riskDiscountFactor: riskDiscount,
      targetPerMultiple: 18.5
    });

    const spread = ((idealScenario.targetPriceUnderlyingUsd - realScenario.targetPriceUnderlyingUsd) / realScenario.targetPriceUnderlyingUsd) * 100;
    const recommendation = this.determineRecommendation(realScenario.upsidePotentialPercentage);
    const synthesisNarrative = this.generateSynthesisNarrative(company, idealScenario, realScenario, qualitativeAnalysis);

    return {
      ticker: company.id,
      companyName: company.name,
      sector: company.sector,
      underlyingTicker: company.underlyingTicker,
      analysisDate: new Date().toISOString(),
      currentPriceUnderlyingUsd: company.currentPriceUnderlyingUsd,
      currentPriceCedearArs: company.currentPriceCedearArs,
      impliedCclExchangeRate: company.impliedCclExchangeRate,
      cedearRatio: company.cedearRatio,
      idealBestCaseScenario: idealScenario,
      realSustainableBaseCaseScenario: realScenario,
      spreadBetweenScenariosPercentage: Number(spread.toFixed(2)),
      recommendation,
      synthesisNarrative,
      financialInputs: {
        revenueUsd: latestFinancials.incomeStatement.totalRevenue,
        ebitdaUsd: latestFinancials.incomeStatement.ebitda,
        netIncomeUsd: latestFinancials.incomeStatement.netIncome,
        freeCashFlowUsd: latestFinancials.cashFlow.freeCashFlow,
        netDebtUsd: latestFinancials.ratios.netDebt,
        operatingMargin: latestFinancials.ratios.operatingMargin,
        perCurrent: latestFinancials.ratios.per,
        industry: company.industry,
        country: company.country
      }
    };
  }

  private buildScenario(params: {
    scenarioName: 'IDEAL_BEST_CASE' | 'REAL_SUSTAINABLE_BASE_CASE';
    description: string;
    horizon: number;
    baseRevenue: number;
    baseEbitda: number;
    baseFcf: number;
    annualGrowthRate: number;
    wacc: number;
    terminalGrowthRate: number;
    netDebt: number;
    sharesOutstanding: number;
    company: Company;
    riskDiscountFactor: number;
    targetPerMultiple: number;
  }): ValuationScenario {
    const timeline: ProjectionTimeline[] = [];
    let cumulativePvOfFcf = 0;
    let currentFcf = params.baseFcf;
    let currentRev = params.baseRevenue;
    let currentEbitda = params.baseEbitda;

    for (let year = 1; year <= params.horizon; year++) {
      currentRev *= (1 + params.annualGrowthRate);
      currentEbitda *= (1 + params.annualGrowthRate * 0.95);
      currentFcf *= (1 + params.annualGrowthRate);

      const discountFactor = Math.pow(1 + params.wacc, year);
      const presentValueOfFcf = currentFcf / discountFactor;

      cumulativePvOfFcf += presentValueOfFcf;
      timeline.push({
        year,
        projectedRevenue: Math.round(currentRev),
        projectedEbitda: Math.round(currentEbitda),
        projectedFreeCashFlow: Math.round(currentFcf),
        discountFactor: Number(discountFactor.toFixed(4)),
        presentValueOfFcf: Math.round(presentValueOfFcf)
      });
    }

    // Terminal Value (Gordon Growth Model)
    const terminalFcf = currentFcf * (1 + params.terminalGrowthRate);
    const terminalValue = terminalFcf / (params.wacc - params.terminalGrowthRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + params.wacc, params.horizon);

    let enterpriseValue = cumulativePvOfFcf + pvTerminalValue;
    // Aplicación del factor de descuento de riesgo cualitativo
    if (params.riskDiscountFactor > 0) {
      enterpriseValue *= (1 - params.riskDiscountFactor);
    }

    const equityValue = enterpriseValue - params.netDebt;
    const targetPriceUnderlying = Math.max(equityValue / params.sharesOutstanding, 1.0);

    // Conversión a CEDEAR en ARS según ratio y tipo de cambio CCL
    const conversionRatio = params.company.cedearRatio.underlyingShares / params.company.cedearRatio.cedearShares;
    const targetPriceCedearArs = (targetPriceUnderlying * conversionRatio) * params.company.impliedCclExchangeRate;

    const upsidePotential = ((targetPriceUnderlying - params.company.currentPriceUnderlyingUsd) / params.company.currentPriceUnderlyingUsd) * 100;

    return {
      scenarioName: params.scenarioName,
      description: params.description,
      projectedAnnualGrowthRate: Number(params.annualGrowthRate.toFixed(4)),
      wacc: Number(params.wacc.toFixed(4)),
      terminalGrowthRate: Number(params.terminalGrowthRate.toFixed(4)),
      enterpriseValueUsd: Math.round(enterpriseValue),
      equityValueUsd: Math.round(equityValue),
      targetPriceUnderlyingUsd: Number(targetPriceUnderlying.toFixed(2)),
      targetPriceCedearArs: Math.round(targetPriceCedearArs),
      upsidePotentialPercentage: Number(upsidePotential.toFixed(2)),
      targetPerMultiple: params.targetPerMultiple,
      appliedRiskDiscountPercentage: Number((params.riskDiscountFactor * 100).toFixed(2)),
      timeline
    };
  }

  private determineIdealGrowthRate(sector: string, financials: QuarterlyFinancialRecord): number {
    // Tasa basada en sector y salud de márgenes
    const baseSectorRate: Record<string, number> = {
      'Technology': 0.16,
      'Consumer Cyclical': 0.13,
      'Communication Services': 0.12,
      'Healthcare': 0.10,
      'Financial': 0.09,
      'Energy': 0.08,
      'Consumer Defensive': 0.07,
      'Basic Materials': 0.07,
      'Industrial': 0.08
    };

    const sectorRate = baseSectorRate[sector] || 0.10;
    // Si el margen operativo es superior a 25%, premia con un extra de crecimiento sostenible
    const marginBonus = financials.ratios.operatingMargin > 0.25 ? 0.02 : 0;
    return sectorRate + marginBonus;
  }

  private determineRecommendation(realUpside: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
    if (realUpside >= 25.0) return 'STRONG_BUY';
    if (realUpside >= 10.0) return 'BUY';
    if (realUpside >= -5.0) return 'HOLD';
    if (realUpside >= -20.0) return 'SELL';
    return 'STRONG_SELL';
  }

  private generateSynthesisNarrative(
    company: Company,
    ideal: ValuationScenario,
    real: ValuationScenario,
    qualitative?: QualitativeAnalysisResult
  ): string {
    const sentimentDesc = qualitative
      ? `El análisis de IA cataloga el tono del management como '${qualitative.sentimentClassification}' con un scoring de riesgo del ${(qualitative.totalRiskDiscountFactor * 100).toFixed(0)}%.`
      : 'No se cuenta aún con transcripción cualitativa de Earnings Call, por lo que se aplicaron márgenes estándar de prudencia.';

    return `Para ${company.name} (${company.id}), la predicción ideal proyecta un valor objetivo de USD ${ideal.targetPriceUnderlyingUsd} (${ideal.upsidePotentialPercentage >= 0 ? '+' : ''}${ideal.upsidePotentialPercentage}% vs mercado), equivalente a $${ideal.targetPriceCedearArs.toLocaleString('es-AR')} ARS por CEDEAR. Bajo el escenario conservador real, descontando riesgos de ejecución y volatilidad cambiaria, el valor razonable sostenible se ubica en USD ${real.targetPriceUnderlyingUsd} (${real.upsidePotentialPercentage >= 0 ? '+' : ''}${real.upsidePotentialPercentage}% de margen), fijando un precio local estimado de $${real.targetPriceCedearArs.toLocaleString('es-AR')} ARS. ${sentimentDesc}`;
  }
}
