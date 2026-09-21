import { ValuationEngine } from '../../domain/services/valuation-engine.js';
import { CompanyRepositoryPort } from '../ports/company-repository.port.js';
import { PredictionResult } from '../../domain/entities/prediction.js';

export class GeneratePredictionUseCase {
  private readonly valuationEngine: ValuationEngine;

  constructor(private readonly companyRepository: CompanyRepositoryPort) {
    this.valuationEngine = new ValuationEngine();
  }

  public async execute(ticker: string): Promise<PredictionResult> {
    const formattedTicker = ticker.toUpperCase();
    const aggregate = await this.companyRepository.getAggregate(formattedTicker);

    if (!aggregate || !aggregate.company) {
      throw new Error(`Empresa no encontrada para el ticker: ${formattedTicker}. Debe sincronizar la empresa primero.`);
    }

    if (!aggregate.financialRecords || aggregate.financialRecords.length === 0) {
      throw new Error(`No existen registros financieros contables para ${formattedTicker}. Ejecute la ingesta cuantitativa primero.`);
    }

    const latestFinancials = aggregate.financialRecords[0];

    const prediction = this.valuationEngine.calculateScenarios({
      company: aggregate.company,
      latestFinancials,
      qualitativeAnalysis: aggregate.qualitativeAnalysis
    });

    await this.companyRepository.savePrediction(prediction);
    return prediction;
  }

  public async executeBatch(options?: {
    sortBy?: 'real_upside' | 'ideal_upside' | 'ticker';
    order?: 'asc' | 'desc';
  }): Promise<PredictionResult[]> {
    const allCompanies = await this.companyRepository.getAllCompanies();
    const predictions: PredictionResult[] = [];

    for (const company of allCompanies) {
      try {
        const pred = await this.execute(company.id);
        predictions.push(pred);
      } catch (err) {
        console.warn(`Omitiendo predicción para ${company.id}: ${(err as Error).message}`);
      }
    }

    const sortBy = options?.sortBy || 'real_upside';
    const order = options?.order || 'desc';

    return predictions.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'real_upside') {
        comparison = a.realSustainableBaseCaseScenario.upsidePotentialPercentage - b.realSustainableBaseCaseScenario.upsidePotentialPercentage;
      } else if (sortBy === 'ideal_upside') {
        comparison = a.idealBestCaseScenario.upsidePotentialPercentage - b.idealBestCaseScenario.upsidePotentialPercentage;
      } else if (sortBy === 'ticker') {
        comparison = a.ticker.localeCompare(b.ticker);
      }
      return order === 'desc' ? -comparison : comparison;
    });
  }
}
