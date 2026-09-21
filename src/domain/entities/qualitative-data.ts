export interface QualitativeAnalysisInput {
  ticker: string;
  quarter: string;
  transcriptEarningsCall?: string;
  guidanceText?: string;
  newsSummary?: string;
}

export interface QualitativeRiskAssessment {
  operationalRisk: number; // 0.0 (mínimo) a 1.0 (crítico)
  regulatoryRisk: number; // 0.0 a 1.0
  competitivePressure: number; // 0.0 a 1.0
  macroEconomicRisk: number; // 0.0 a 1.0 (incluye riesgo cambiario/soberano CEDEAR)
}

export interface QualitativeAnalysisResult {
  ticker: string;
  analyzedAt: string;
  modelUsed: string;
  overallSentimentScore: number; // -1.0 (Extremadamente negativo) a +1.0 (Muy positivo)
  sentimentClassification: 'VERY_BEARISH' | 'BEARISH' | 'NEUTRAL' | 'BULLISH' | 'VERY_BULLISH';
  guidanceConfidence: number; // 0.0 a 1.0 (Nivel de confianza en cumplimiento de metas)
  riskAssessment: QualitativeRiskAssessment;
  totalRiskDiscountFactor: number; // Factor entre 0.0 y 0.50 para penalizar el modelo conservador
  keyTakeaways: string[];
  bullishCatalysts: string[];
  bearishRisks: string[];
  executiveSummary: string;
}
