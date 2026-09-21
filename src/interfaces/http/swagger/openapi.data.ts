export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Plataforma de Valuación Fundamental y Predictiva para 50 CEDEARs",
    version: "1.0.0",
    description: "API REST modular para la demostración y producción de análisis financiero cuantitativo (balances, ratios, EBITDA, FCF, PER), cualitativo con IA (Google Gemini / procesamiento de transcripts) y motor predictivo de doble escenario (Ideal Best-Case vs Real Sostenible con conversión a precios en ARS de CEDEARs según ratios oficiales de BYMA).",
    contact: {
      name: "Equipo de Arquitectura y Desarrollo Senior"
    }
  },
  servers: [
    {
      url: "/",
      description: "Servidor Actual (Relativo / Producción / Local)"
    }
  ],
  tags: [
    { name: "1. Screener & Predicciones en Lote", description: "DEMO SCREENER: Ranking en vivo de las mejores oportunidades de inversión entre los 50 CEDEARs ordenados por Potencial de Suba" },
    { name: "2. Motor de Valuación DCF Dual", description: "DEMO VALUACIÓN DUAL: Proyección de Escenario Ideal (Best-Case) vs Escenario Real Conservador con cálculo en USD y CEDEAR en ARS" },
    { name: "3. Procesamiento Cualitativo con IA", description: "DEMO ANÁLISIS BLANDO: Evaluación de texto no estructurado (Earnings Calls, Guidance) mediante Google Gemini para ajustar la tasa de descuento por riesgo" },
    { name: "4. Ingesta Cuantitativa Centralizada", description: "DEMO DATOS DUROS: Sincronización automática de balances trimestrales, flujo de caja libre, deuda neta y ratios financieros" },
    { name: "5. Catálogo de CEDEARs BYMA", description: "DEMO MERCADO LOCAL: Consulta de los 50 activos con ratios de conversión oficiales y tipo de cambio implícito CCL" }
  ],
  paths: {
    "/api/v1/predictions/batch": {
      get: {
        tags: ["1. Screener & Predicciones en Lote"],
        summary: "Screener de Inversión en Vivo — Ranking de las 50 empresas por Potencial de Suba",
        description: "Endpoint clave: calcula o recupera en <15ms la predicción dual para los 50 CEDEARs, ordenados de forma predeterminada por mayor 'Potencial de Suba Real' (screenerRanking). Permite filtrar por parámetros de consulta.",
        parameters: [
          {
            name: "sortBy",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["real_upside", "ideal_upside", "ticker"],
              default: "real_upside"
            },
            description: "Criterio de ordenamiento para el screener"
          },
          {
            name: "order",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc"
            },
            description: "Dirección del ordenamiento (desc para ver primero las mayores oportunidades)"
          }
        ],
        responses: {
          200: {
            description: "Ranking del Screener y predicciones completas de las 50 empresas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer", example: 50 },
                    sortBy: { type: "string", example: "real_upside" },
                    order: { type: "string", example: "desc" },
                    screenerRanking: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          rank: { type: "integer", example: 1 },
                          ticker: { type: "string", example: "NVDA" },
                          underlyingTicker: { type: "string", example: "NVDA" },
                          currentPriceCedearArs: { type: "number", example: 6500 },
                          idealTargetCedearArs: { type: "number", example: 9200 },
                          realTargetCedearArs: { type: "number", example: 7800 },
                          realUpsidePercentage: { type: "number", example: 20.0 },
                          idealUpsidePercentage: { type: "number", example: 41.5 },
                          recommendation: { type: "string", example: "BUY" },
                          riskDiscountPercentage: { type: "number", example: 14.0 }
                        }
                      }
                    },
                    data: { type: "array", items: { $ref: "#/components/schemas/PredictionResult" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/predictions/{ticker}": {
      get: {
        tags: ["2. Motor de Valuación DCF Dual"],
        summary: "Valuación DCF Proyectada: Escenario Ideal (Best-Case) vs Real Sostenible",
        description: "Calcula la valuación intrínseca combinando los datos duros contables con el descuento de riesgo cualitativo de la IA. Informa precio objetivo en USD y en pesos argentinos para el CEDEAR según su ratio de conversión oficial.",
        parameters: [
          { name: "ticker", in: "path", required: true, schema: { type: "string", example: "AAPL" } }
        ],
        responses: {
          200: {
            description: "Predicción y valuación proyectada en ambos escenarios",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/PredictionResult" }
                  }
                }
              }
            }
          },
          404: { description: "Empresa no encontrada o sin sincronizar" }
        }
      }
    },
    "/api/v1/analysis/qualitative/{ticker}": {
      post: {
        tags: ["3. Procesamiento Cualitativo con IA"],
        summary: "Analizar Earnings Call / Guidance con Google Gemini y calcular factor de riesgo",
        description: "Envía texto libre no estructurado para que el LLM (Gemini API o motor semántico de contingencia) determine el sentimiento, credibilidad del guidance y el factor de descuento de riesgo que luego alimenta el motor de valuación conservador.",
        parameters: [
          { name: "ticker", in: "path", required: true, schema: { type: "string", example: "MELI" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  quarter: { type: "string", example: "2024-Q3" },
                  transcriptEarningsCall: { type: "string", example: "MercadoLibre achieved record revenues in Brazil and Mexico with fintech credit portfolio growing 35% year-over-year while keeping default rates below industry average." },
                  guidanceText: { type: "string", example: "Management expects operating income margins to expand by 150 basis points throughout the upcoming fiscal year." },
                  newsSummary: { type: "string", example: "Expansion in logistics network reduces fulfillment delivery times." }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Resultado estructurado del análisis cualitativo con IA",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string" },
                    data: { $ref: "#/components/schemas/QualitativeResult" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/ingestion/sync": {
      post: {
        tags: ["4. Ingesta Cuantitativa Centralizada"],
        summary: "Disparar ingesta y sincronización de balances contables (Datos Duros)",
        description: "Ingesta automática de Income Statement, Balance Sheet y Cash Flow desde la API financiera centralizada (o seed provider) para los 50 CEDEARs o una lista selectiva de tickers.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tickers: {
                    type: "array",
                    items: { type: "string" },
                    example: ["AAPL", "MELI", "NVDA"],
                    description: "Opcional: Filtrar tickers específicos. Si se omite, sincroniza las 50 empresas."
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Resultado de la sincronización cuantitativa",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string" },
                    data: { $ref: "#/components/schemas/SyncResult" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/companies": {
      get: {
        tags: ["5. Catálogo de CEDEARs BYMA"],
        summary: "Listar los 50 CEDEARs con ratios de conversión y estado de análisis",
        description: "Retorna el listado completo de los 50 activos monitoreados con su ratio de conversión oficial (ej. AAPL 10:1, MELI 120:1, NVDA 24:1, BMA 10:1), cotización en USD y ARS, y estado de carga de balances y análisis de IA.",
        responses: {
          200: {
            description: "Listado de empresas obtenido exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "integer", example: 50 },
                    data: { type: "array", items: { $ref: "#/components/schemas/CompanySummary" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/companies/{ticker}": {
      get: {
        tags: ["5. Catálogo de CEDEARs BYMA"],
        summary: "Consultar detalle contable y financiero integral de un CEDEAR",
        parameters: [
          { name: "ticker", in: "path", required: true, schema: { type: "string", example: "MELI" } }
        ],
        responses: {
          200: { description: "Agregado financiero completo del activo" },
          404: { description: "Empresa no encontrada" }
        }
      }
    }
  },
  components: {
    schemas: {
      CompanySummary: {
        type: "object",
        properties: {
          id: { type: "string", example: "AAPL" },
          name: { type: "string", example: "Apple Inc." },
          underlyingTicker: { type: "string", example: "AAPL" },
          sector: { type: "string", example: "Technology" },
          cedearRatio: { type: "string", example: "10:1" },
          currentPriceUnderlyingUsd: { type: "number", example: 228.5 },
          currentPriceCedearArs: { type: "number", example: 28562 },
          impliedCclExchangeRate: { type: "number", example: 1250 },
          hasFinancials: { type: "boolean", example: true },
          hasQualitativeAnalysis: { type: "boolean", example: true },
          hasPrediction: { type: "boolean", example: true },
          lastPredictionRecommendation: { type: "string", example: "BUY" }
        }
      },
      SyncResult: {
        type: "object",
        properties: {
          totalRequested: { type: "integer", example: 50 },
          syncedCompanies: { type: "integer", example: 50 },
          failedCompanies: { type: "array", items: { type: "string" } },
          durationMs: { type: "integer", example: 45 },
          timestamp: { type: "string" }
        }
      },
      QualitativeResult: {
        type: "object",
        properties: {
          ticker: { type: "string", example: "MELI" },
          overallSentimentScore: { type: "number", example: 0.85 },
          sentimentClassification: { type: "string", example: "VERY_BULLISH" },
          guidanceConfidence: { type: "number", example: 0.90 },
          riskAssessment: {
            type: "object",
            properties: {
              operationalRisk: { type: "number", example: 0.15 },
              regulatoryRisk: { type: "number", example: 0.15 },
              competitivePressure: { type: "number", example: 0.20 },
              macroEconomicRisk: { type: "number", example: 0.25 }
            }
          },
          totalRiskDiscountFactor: { type: "number", example: 0.14 },
          keyTakeaways: { type: "array", items: { type: "string" } },
          executiveSummary: { type: "string" }
        }
      },
      ValuationScenario: {
        type: "object",
        properties: {
          scenarioName: { type: "string", example: "IDEAL_BEST_CASE" },
          description: { type: "string" },
          projectedAnnualGrowthRate: { type: "number", example: 0.16 },
          wacc: { type: "number", example: 0.085 },
          enterpriseValueUsd: { type: "number", example: 3800000000000 },
          equityValueUsd: { type: "number", example: 3723900000000 },
          targetPriceUnderlyingUsd: { type: "number", example: 245.0 },
          targetPriceCedearArs: { type: "number", example: 30625 },
          upsidePotentialPercentage: { type: "number", example: 7.22 },
          appliedRiskDiscountPercentage: { type: "number", example: 0 }
        }
      },
      PredictionResult: {
        type: "object",
        properties: {
          ticker: { type: "string", example: "AAPL" },
          underlyingTicker: { type: "string", example: "AAPL" },
          analysisDate: { type: "string" },
          currentPriceUnderlyingUsd: { type: "number", example: 228.5 },
          currentPriceCedearArs: { type: "number", example: 28562 },
          impliedCclExchangeRate: { type: "number", example: 1250 },
          idealBestCaseScenario: { $ref: "#/components/schemas/ValuationScenario" },
          realSustainableBaseCaseScenario: { $ref: "#/components/schemas/ValuationScenario" },
          spreadBetweenScenariosPercentage: { type: "number", example: 18.5 },
          recommendation: { type: "string", example: "BUY" },
          synthesisNarrative: { type: "string" }
        }
      }
    }
  }
};
