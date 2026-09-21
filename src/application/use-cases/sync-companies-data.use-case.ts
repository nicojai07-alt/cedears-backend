import { FinancialDataProviderPort } from '../ports/financial-data-provider.port.js';
import { CompanyRepositoryPort } from '../ports/company-repository.port.js';

export interface SyncResult {
  totalRequested: number;
  syncedCompanies: number;
  failedCompanies: string[];
  durationMs: number;
  timestamp: string;
}

export class SyncCompaniesDataUseCase {
  constructor(
    private readonly financialDataProvider: FinancialDataProviderPort,
    private readonly companyRepository: CompanyRepositoryPort
  ) {}

  /**
   * Sincroniza la lista de empresas (50 CEDEARs) y sus estados contables trimestrales.
   * Si se pasa un arreglo de tickers, solo sincroniza esos; si está vacío, sincroniza los 50.
   */
  public async execute(tickers?: string[]): Promise<SyncResult> {
    const startTime = Date.now();
    const trackedCompanies = await this.financialDataProvider.getTrackedCompanies();

    const targetCompanies = tickers && tickers.length > 0
      ? trackedCompanies.filter(c => tickers.includes(c.id.toUpperCase()))
      : trackedCompanies;

    await this.companyRepository.saveCompaniesBatch(targetCompanies);

    let syncedCount = 0;
    const failedTickers: string[] = [];

    for (const company of targetCompanies) {
      try {
        const records = await this.financialDataProvider.fetchFinancialRecords(company.id);
        const quotes = await this.financialDataProvider.fetchLiveQuotes(company.id);

        company.currentPriceUnderlyingUsd = quotes.priceUnderlyingUsd;
        company.currentPriceCedearArs = quotes.priceCedearArs;
        company.impliedCclExchangeRate = quotes.impliedCcl;
        company.lastUpdated = new Date().toISOString();

        await this.companyRepository.saveCompany(company);
        await this.companyRepository.saveFinancialRecords(company.id, records);
        syncedCount++;
      } catch (error) {
        console.error(`Error al sincronizar ${company.id}:`, error);
        failedTickers.push(company.id);
      }
    }

    return {
      totalRequested: targetCompanies.length,
      syncedCompanies: syncedCount,
      failedCompanies: failedTickers,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}
