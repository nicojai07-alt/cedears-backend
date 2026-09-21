import { describe, it, expect } from 'vitest';
import { ValuationEngine } from '../src/domain/services/valuation-engine.js';
import { Company } from '../src/domain/entities/company.js';
import { QuarterlyFinancialRecord } from '../src/domain/entities/financial-statement.js';
import { QualitativeAnalysisResult } from '../src/domain/entities/qualitative-data.js';

describe('ValuationEngine Domain Service', () => {
  const mockCompany: Company = {
    id: 'AAPL',
    name: 'Apple Inc.',
    underlyingTicker: 'AAPL',
    market: 'BYMA',
    cedearRatio: {
      cedearShares: 10,
      underlyingShares: 1
    },
    sector: 'Technology',
    industry: 'Consumer Electronics',
    country: 'USA',
    currency: 'USD',
    currentPriceUnderlyingUsd: 200.0,
    currentPriceCedearArs: 25000,
    impliedCclExchangeRate: 1250.0,
    lastUpdated: new Date().toISOString()
  };

  const mockFinancials: QuarterlyFinancialRecord = {
    period: '2024-Q3',
    incomeStatement: {
      fiscalDateEnding: '2024-09-30',
      totalRevenue: 100_000_000_000,
      costOfRevenue: 55_000_000_000,
      grossProfit: 45_000_000_000,
      operatingExpenses: 15_000_000_000,
      operatingIncome: 30_000_000_000,
      netIncome: 25_000_000_000,
      ebitda: 35_000_000_000,
      eps: 1.64,
      sharesOutstanding: 15_200_000_000
    },
    balanceSheet: {
      fiscalDateEnding: '2024-09-30',
      totalAssets: 350_000_000_000,
      currentAssets: 140_000_000_000,
      cashAndCashEquivalents: 30_000_000_000,
      totalLiabilities: 280_000_000_000,
      currentLiabilities: 120_000_000_000,
      shortTermDebt: 10_000_000_000,
      longTermDebt: 95_000_000_000,
      totalDebt: 105_000_000_000,
      totalStockholderEquity: 70_000_000_000
    },
    cashFlow: {
      fiscalDateEnding: '2024-09-30',
      operatingCashflow: 30_000_000_000,
      capitalExpenditures: 3_000_000_000,
      freeCashFlow: 27_000_000_000,
      dividendPayout: 3_800_000_000,
      netFinancingActivities: -25_000_000_000
    },
    ratios: {
      ebitda: 35_000_000_000,
      freeCashFlow: 27_000_000_000,
      per: 30.4,
      evToEbitda: 22.1,
      netDebt: 75_000_000_000,
      netDebtToEbitda: 0.53,
      grossMargin: 0.45,
      operatingMargin: 0.30,
      netProfitMargin: 0.25,
      roe: 0.35,
      fcfYield: 0.035
    }
  };

  const mockQualitative: QualitativeAnalysisResult = {
    ticker: 'AAPL',
    analyzedAt: new Date().toISOString(),
    modelUsed: 'Test Model',
    overallSentimentScore: 0.5,
    sentimentClassification: 'BULLISH',
    guidanceConfidence: 0.90,
    riskAssessment: {
      operationalRisk: 0.15,
      regulatoryRisk: 0.20,
      competitivePressure: 0.20,
      macroEconomicRisk: 0.20
    },
    totalRiskDiscountFactor: 0.12, // 12% de descuento por riesgo
    keyTakeaways: ['Guidance sólido de ventas'],
    bullishCatalysts: ['Ecosistema de servicios'],
    bearishRisks: ['Riesgo regulatorio en la App Store'],
    executiveSummary: 'Perspectiva favorable'
  };

  const engine = new ValuationEngine();

  it('debe generar ambos escenarios: Ideal (Best-Case) y Real (Base-Case conservador)', () => {
    const prediction = engine.calculateScenarios({
      company: mockCompany,
      latestFinancials: mockFinancials,
      qualitativeAnalysis: mockQualitative
    });

    expect(prediction.ticker).toBe('AAPL');
    expect(prediction.idealBestCaseScenario).toBeDefined();
    expect(prediction.realSustainableBaseCaseScenario).toBeDefined();

    // El escenario ideal debe tener 0% de penalización por riesgo
    expect(prediction.idealBestCaseScenario.appliedRiskDiscountPercentage).toBe(0);
    // El escenario real debe tener la penalización correspondiente al análisis cualitativo
    expect(prediction.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage).toBe(12);

    // El precio objetivo ideal debe ser estrictamente superior al precio objetivo conservador real
    expect(prediction.idealBestCaseScenario.targetPriceUnderlyingUsd)
      .toBeGreaterThan(prediction.realSustainableBaseCaseScenario.targetPriceUnderlyingUsd);

    // El precio en CEDEARs (ARS) debe reflejar el ratio y tipo de cambio CCL
    const expectedCedearIdealArs = Math.round((prediction.idealBestCaseScenario.targetPriceUnderlyingUsd * (1 / 10)) * 1250);
    expect(prediction.idealBestCaseScenario.targetPriceCedearArs).toBeCloseTo(expectedCedearIdealArs, -2);
  });

  it('debe incluir una recomendación de inversión coherente', () => {
    const prediction = engine.calculateScenarios({
      company: mockCompany,
      latestFinancials: mockFinancials,
      qualitativeAnalysis: mockQualitative
    });

    const validRecommendations = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
    expect(validRecommendations).toContain(prediction.recommendation);
    expect(prediction.synthesisNarrative).toContain('AAPL');
  });
});
