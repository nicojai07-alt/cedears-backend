import { CompanyRepositoryPort, CompanyDataAggregate } from '../ports/company-repository.port.js';

export interface CompanySummaryDto {
  id: string;
  name: string;
  underlyingTicker: string;
  sector: string;
  cedearRatio: string;
  currentPriceUnderlyingUsd: number;
  currentPriceCedearArs: number;
  impliedCclExchangeRate: number;
  hasFinancials: boolean;
  hasQualitativeAnalysis: boolean;
  hasPrediction: boolean;
  lastPredictionRecommendation?: string;
  lastUpdated: string;
}

export class GetCompaniesUseCase {
  constructor(private readonly companyRepository: CompanyRepositoryPort) {}

  public async execute(): Promise<CompanySummaryDto[]> {
    const aggregates = await this.companyRepository.getAllAggregates();

    return aggregates.map((agg: CompanyDataAggregate) => ({
      id: agg.company.id,
      name: agg.company.name,
      underlyingTicker: agg.company.underlyingTicker,
      sector: agg.company.sector,
      cedearRatio: `${agg.company.cedearRatio.cedearShares}:${agg.company.cedearRatio.underlyingShares}`,
      currentPriceUnderlyingUsd: agg.company.currentPriceUnderlyingUsd,
      currentPriceCedearArs: agg.company.currentPriceCedearArs,
      impliedCclExchangeRate: agg.company.impliedCclExchangeRate,
      hasFinancials: agg.financialRecords.length > 0,
      hasQualitativeAnalysis: !!agg.qualitativeAnalysis,
      hasPrediction: !!agg.lastPrediction,
      lastPredictionRecommendation: agg.lastPrediction?.recommendation,
      lastUpdated: agg.company.lastUpdated
    }));
  }

  public async getByTicker(ticker: string): Promise<CompanyDataAggregate | null> {
    return this.companyRepository.getAggregate(ticker.toUpperCase());
  }
}
