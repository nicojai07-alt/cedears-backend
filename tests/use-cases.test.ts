import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCompanyRepository } from '../src/infrastructure/adapters/repositories/in-memory-company.repository.js';
import { MockSeedFinancialProviderAdapter } from '../src/infrastructure/adapters/financial-api/mock-seed-provider.adapter.js';
import { GeminiQualitativeAnalyzerAdapter } from '../src/infrastructure/adapters/ai/gemini-analyzer.adapter.js';

import { SyncCompaniesDataUseCase } from '../src/application/use-cases/sync-companies-data.use-case.js';
import { AnalyzeQualitativeUseCase } from '../src/application/use-cases/analyze-qualitative.use-case.js';
import { GeneratePredictionUseCase } from '../src/application/use-cases/generate-prediction.use-case.js';
import { GetCompaniesUseCase } from '../src/application/use-cases/get-companies.use-case.js';

describe('Application Use Cases & Hexagonal Integration', () => {
  let repository: InMemoryCompanyRepository;
  let financialProvider: MockSeedFinancialProviderAdapter;
  let qualitativeAnalyzer: GeminiQualitativeAnalyzerAdapter;

  let syncUseCase: SyncCompaniesDataUseCase;
  let analyzeUseCase: AnalyzeQualitativeUseCase;
  let predictionUseCase: GeneratePredictionUseCase;
  let getCompaniesUseCase: GetCompaniesUseCase;

  beforeEach(() => {
    repository = new InMemoryCompanyRepository();
    financialProvider = new MockSeedFinancialProviderAdapter();
    qualitativeAnalyzer = new GeminiQualitativeAnalyzerAdapter(); // Correrá en modo heurístico fallback sin API key

    syncUseCase = new SyncCompaniesDataUseCase(financialProvider, repository);
    analyzeUseCase = new AnalyzeQualitativeUseCase(qualitativeAnalyzer, repository);
    predictionUseCase = new GeneratePredictionUseCase(repository);
    getCompaniesUseCase = new GetCompaniesUseCase(repository);
  });

  it('debe sincronizar los 50 CEDEARs y cargar sus estados contables', async () => {
    const syncResult = await syncUseCase.execute();

    expect(syncResult.totalRequested).toBe(50);
    expect(syncResult.syncedCompanies).toBe(50);
    expect(syncResult.failedCompanies).toHaveLength(0);

    const companies = await getCompaniesUseCase.execute();
    expect(companies).toHaveLength(50);

    // Verificar que un ticker específico (ej. MELI) posea sus datos cargados
    const meli = companies.find(c => c.id === 'MELI');
    expect(meli).toBeDefined();
    expect(meli?.hasFinancials).toBe(true);
    expect(meli?.cedearRatio).toBe('120:1');
  });

  it('debe procesar un texto de earnings call con el analizador cualitativo', async () => {
    await syncUseCase.execute(['NVDA']);

    const qualitativeResult = await analyzeUseCase.execute({
      ticker: 'NVDA',
      quarter: '2024-Q3',
      transcriptEarningsCall: 'We experienced record demand for our Blackwell architecture. Strong growth across all data centers.',
      guidanceText: 'Management raises guidance for the next quarter by 15%.',
      newsSummary: 'AI investments continue to accelerate globally.'
    });

    expect(qualitativeResult.ticker).toBe('NVDA');
    expect(qualitativeResult.overallSentimentScore).toBeGreaterThan(0);
    expect(['BULLISH', 'VERY_BULLISH']).toContain(qualitativeResult.sentimentClassification);
    expect(qualitativeResult.totalRiskDiscountFactor).toBeGreaterThan(0);
  });

  it('debe calcular la predicción dual combinando datos duros y blandos', async () => {
    await syncUseCase.execute(['AAPL']);

    await analyzeUseCase.execute({
      ticker: 'AAPL',
      quarter: '2024-Q3',
      transcriptEarningsCall: 'Strong iPhone cycle, but some headwinds and regulatory challenges in the EU market.',
      guidanceText: 'Guidance remains stable with moderate expansion.',
      newsSummary: 'Foreign exchange and inflation pressure margins.'
    });

    const prediction = await predictionUseCase.execute('AAPL');

    expect(prediction.ticker).toBe('AAPL');
    expect(prediction.idealBestCaseScenario.targetPriceUnderlyingUsd).toBeGreaterThan(0);
    expect(prediction.realSustainableBaseCaseScenario.targetPriceUnderlyingUsd).toBeGreaterThan(0);
    expect(prediction.idealBestCaseScenario.targetPriceCedearArs).toBeGreaterThan(0);
    expect(prediction.realSustainableBaseCaseScenario.targetPriceCedearArs).toBeGreaterThan(0);
    expect(prediction.spreadBetweenScenariosPercentage).toBeGreaterThan(0);
    expect(prediction.synthesisNarrative).toBeDefined();
  });
});
