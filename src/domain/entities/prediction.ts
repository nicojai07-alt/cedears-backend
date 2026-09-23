export interface ProjectionTimeline {
  year: number;
  projectedRevenue: number;
  projectedEbitda: number;
  projectedFreeCashFlow: number;
  discountFactor: number;
  presentValueOfFcf: number;
}

export interface ValuationScenario {
  scenarioName: 'IDEAL_BEST_CASE' | 'REAL_SUSTAINABLE_BASE_CASE';
  description: string;
  projectedAnnualGrowthRate: number; // e.g. 0.15 (15%)
  wacc: number; // Weighted Average Cost of Capital (Tasa de descuento)
  terminalGrowthRate: number; // e.g. 0.025 (2.5%)
  enterpriseValueUsd: number;
  equityValueUsd: number; // Enterprise Value - Net Debt
  targetPriceUnderlyingUsd: number;
  targetPriceCedearArs: number;
  upsidePotentialPercentage: number; // ((targetPrice - currentPrice) / currentPrice) * 100
  targetPerMultiple: number;
  appliedRiskDiscountPercentage: number; // 0% en ideal, X% en conservador
  timeline: ProjectionTimeline[];
}

export interface FinancialInputsSummary {
  revenueUsd: number;
  ebitdaUsd: number;
  netIncomeUsd: number;
  freeCashFlowUsd: number;
  netDebtUsd: number;
  operatingMargin: number;
  perCurrent: number;
  industry?: string;
  country?: string;
}

export interface PredictionResult {
  ticker: string;
  companyName?: string;
  sector?: string;
  underlyingTicker: string;
  analysisDate: string;
  currentPriceUnderlyingUsd: number;
  currentPriceCedearArs: number;
  impliedCclExchangeRate: number;
  cedearRatio: {
    cedearShares: number;
    underlyingShares: number;
  };
  idealBestCaseScenario: ValuationScenario;
  realSustainableBaseCaseScenario: ValuationScenario;
  spreadBetweenScenariosPercentage: number; // Brecha de incertidumbre entre escenario ideal y real
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  synthesisNarrative: string;
  financialInputs?: FinancialInputsSummary;
}
