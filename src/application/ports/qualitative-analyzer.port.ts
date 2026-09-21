import { QualitativeAnalysisInput, QualitativeAnalysisResult } from '../../domain/entities/qualitative-data.js';

export interface QualitativeAnalyzerPort {
  /**
   * Procesa texto desestructurado (Earnings Calls, Guidance, Noticias)
   * utilizando un LLM (Gemini u otro) y retorna métricas cuantitativas de riesgo/sentimiento.
   */
  analyzeText(input: QualitativeAnalysisInput): Promise<QualitativeAnalysisResult>;
}
