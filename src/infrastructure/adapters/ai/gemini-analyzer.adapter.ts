import { QualitativeAnalyzerPort } from '../../../application/ports/qualitative-analyzer.port.js';
import { QualitativeAnalysisInput, QualitativeAnalysisResult } from '../../../domain/entities/qualitative-data.js';

export class GeminiQualitativeAnalyzerAdapter implements QualitativeAnalyzerPort {
  private readonly apiKey?: string;
  private readonly modelName: string;

  constructor(apiKey?: string, modelName: string = 'gemini-2.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.modelName = modelName;
  }

  public async analyzeText(input: QualitativeAnalysisInput): Promise<QualitativeAnalysisResult> {
    const rawText = [
      input.transcriptEarningsCall ? `EARNINGS CALL TRANSCRIPT:\n${input.transcriptEarningsCall}` : '',
      input.guidanceText ? `OFFICIAL GUIDANCE:\n${input.guidanceText}` : '',
      input.newsSummary ? `NEWS & MARKET ENVIRONMENT:\n${input.newsSummary}` : ''
    ].filter(Boolean).join('\n\n');

    if (!rawText.trim()) {
      return this.generateDefaultNeutralAnalysis(input.ticker);
    }

    if (this.apiKey) {
      try {
        return await this.callGeminiApi(input.ticker, rawText);
      } catch (err) {
        console.warn(`[GeminiAdapter] Error invocando Gemini API: ${(err as Error).message}. Usando analizador semántico local.`);
      }
    }

    // Heurística de fallback estructurada si no hay API key o hay problemas de red
    return this.fallbackSemanticAnalysis(input.ticker, rawText);
  }

  private async callGeminiApi(ticker: string, rawContent: string): Promise<QualitativeAnalysisResult> {
    const prompt = `
Actúa como Analista Financiero Senior de Wall Street y especialista en CEDEARs y finanzas corporativas.
Analiza el siguiente texto no estructurado (Earnings call, guidance y noticias) para la empresa ${ticker}.
Debes extraer métricas de sentimiento, nivel de credibilidad del guidance y riesgos operacionales/macroeconómicos.

Texto a analizar:
${rawContent}

Devuelve EXCLUSIVAMENTE un JSON válido con la siguiente estructura exacta (sin markdown extra ni bloques de código redundantes si es posible):
{
  "overallSentimentScore": number, // entre -1.0 (muy bajista) y 1.0 (muy alcista)
  "sentimentClassification": "VERY_BEARISH" | "BEARISH" | "NEUTRAL" | "BULLISH" | "VERY_BULLISH",
  "guidanceConfidence": number, // entre 0.0 y 1.0 (probabilidad estimada de cumplimiento)
  "riskAssessment": {
    "operationalRisk": number, // 0.0 a 1.0
    "regulatoryRisk": number, // 0.0 a 1.0
    "competitivePressure": number, // 0.0 a 1.0
    "macroEconomicRisk": number // 0.0 a 1.0 (incluye FX e inflación)
  },
  "totalRiskDiscountFactor": number, // factor entre 0.05 y 0.40 para descontar el escenario conservador
  "keyTakeaways": ["string"],
  "bullishCatalysts": ["string"],
  "bearishRisks": ["string"],
  "executiveSummary": "string"
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API respondió con estado ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as any;
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) throw new Error('Respuesta vacía de Gemini');

    const parsed = JSON.parse(jsonText);

    return {
      ticker,
      analyzedAt: new Date().toISOString(),
      modelUsed: `Google Gemini (${this.modelName})`,
      overallSentimentScore: Number(parsed.overallSentimentScore || 0),
      sentimentClassification: parsed.sentimentClassification || 'NEUTRAL',
      guidanceConfidence: Number(parsed.guidanceConfidence || 0.75),
      riskAssessment: {
        operationalRisk: Number(parsed.riskAssessment?.operationalRisk || 0.2),
        regulatoryRisk: Number(parsed.riskAssessment?.regulatoryRisk || 0.15),
        competitivePressure: Number(parsed.riskAssessment?.competitivePressure || 0.25),
        macroEconomicRisk: Number(parsed.riskAssessment?.macroEconomicRisk || 0.2)
      },
      totalRiskDiscountFactor: Number(parsed.totalRiskDiscountFactor || 0.15),
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      bullishCatalysts: Array.isArray(parsed.bullishCatalysts) ? parsed.bullishCatalysts : [],
      bearishRisks: Array.isArray(parsed.bearishRisks) ? parsed.bearishRisks : [],
      executiveSummary: parsed.executiveSummary || 'Análisis cualitativo generado con Gemini API.'
    };
  }

  private fallbackSemanticAnalysis(ticker: string, text: string): QualitativeAnalysisResult {
    const lower = text.toLowerCase();

    // Palabras clave alcistas / de fortaleza
    const positiveTokens = ['record', 'growth', 'strong', 'outperform', 'expansion', 'ai', 'margin expansion', 'beat', 'guidance raise', 'dividends'];
    // Palabras clave de riesgo / debilidad
    const negativeTokens = ['challenge', 'headwind', 'inflation', 'slowdown', 'miss', 'cut', 'debt', 'recession', 'regulatory', 'fx risk', 'pressure'];

    let posCount = 0;
    let negCount = 0;

    for (const p of positiveTokens) {
      if (lower.includes(p)) posCount++;
    }
    for (const n of negativeTokens) {
      if (lower.includes(n)) negCount++;
    }

    const total = posCount + negCount;
    let sentimentScore = total > 0 ? (posCount - negCount) / total : 0.2;
    sentimentScore = Math.max(-1.0, Math.min(1.0, sentimentScore));

    let classification: 'VERY_BEARISH' | 'BEARISH' | 'NEUTRAL' | 'BULLISH' | 'VERY_BULLISH' = 'NEUTRAL';
    if (sentimentScore >= 0.4) classification = 'VERY_BULLISH';
    else if (sentimentScore > 0.1) classification = 'BULLISH';
    else if (sentimentScore <= -0.4) classification = 'VERY_BEARISH';
    else if (sentimentScore < -0.1) classification = 'BEARISH';

    const operationalRisk = Math.min(0.8, 0.15 + (negCount * 0.05));
    const macroRisk = lower.includes('inflation') || lower.includes('fx') || lower.includes('cedear') ? 0.35 : 0.20;
    const totalRiskDiscountFactor = Math.min(0.35, 0.10 + (operationalRisk * 0.15) + (macroRisk * 0.10));

    return {
      ticker,
      analyzedAt: new Date().toISOString(),
      modelUsed: 'Heuristic Semantic NLP Engine (Gemini fallback)',
      overallSentimentScore: Number(sentimentScore.toFixed(2)),
      sentimentClassification: classification,
      guidanceConfidence: Number((0.85 - (negCount * 0.04)).toFixed(2)),
      riskAssessment: {
        operationalRisk: Number(operationalRisk.toFixed(2)),
        regulatoryRisk: 0.15,
        competitivePressure: 0.25,
        macroEconomicRisk: Number(macroRisk.toFixed(2))
      },
      totalRiskDiscountFactor: Number(totalRiskDiscountFactor.toFixed(2)),
      keyTakeaways: [
        `Procesamiento de ${posCount} señales positivas y ${negCount} factores de fricción.`,
        `Sensibilidad moderada a variaciones del tipo de cambio implícito en CEDEARs.`
      ],
      bullishCatalysts: ['Demanda sostenida del negocio principal', 'Expansión de márgenes proyectada'],
      bearishRisks: ['Incertidumbre macroeconómica y volatilidad de tasas de interés', 'Presiones de costos operativos'],
      executiveSummary: `Análisis de datos blandos para ${ticker}: Tono calificado como '${classification}' con score de sentimiento ${sentimentScore.toFixed(2)}. Factor de descuento conservador estimado en ${(totalRiskDiscountFactor * 100).toFixed(1)}%.`
    };
  }

  private generateDefaultNeutralAnalysis(ticker: string): QualitativeAnalysisResult {
    return {
      ticker,
      analyzedAt: new Date().toISOString(),
      modelUsed: 'Baseline Default Settings',
      overallSentimentScore: 0.0,
      sentimentClassification: 'NEUTRAL',
      guidanceConfidence: 0.80,
      riskAssessment: {
        operationalRisk: 0.20,
        regulatoryRisk: 0.15,
        competitivePressure: 0.20,
        macroEconomicRisk: 0.25
      },
      totalRiskDiscountFactor: 0.15,
      keyTakeaways: ['Sin texto cualitativo provisto; se aplican parámetros neutrales de referencia.'],
      bullishCatalysts: ['Continuidad operativa promedio del sector'],
      bearishRisks: ['Riesgo macroeconómico de mercado estándar'],
      executiveSummary: `Evaluación cualitativa neutral de base para ${ticker}. Factor de descuento conservador del 15%.`
    };
  }
}
