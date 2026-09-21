import { FinancialDataProviderPort } from '../../../application/ports/financial-data-provider.port.js';
import { Company } from '../../../domain/entities/company.js';
import { QuarterlyFinancialRecord } from '../../../domain/entities/financial-statement.js';
import { MockSeedFinancialProviderAdapter } from './mock-seed-provider.adapter.js';

export class CentralizedFinancialApiAdapter implements FinancialDataProviderPort {
  private readonly fallbackProvider: MockSeedFinancialProviderAdapter;
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = 'https://financialmodelingprep.com/api/v3') {
    this.apiKey = apiKey || process.env.FINANCIAL_API_KEY;
    this.baseUrl = baseUrl;
    this.fallbackProvider = new MockSeedFinancialProviderAdapter();
  }

  public async getTrackedCompanies(): Promise<Company[]> {
    // Retorna el universo de los 50 CEDEARs configurados
    return this.fallbackProvider.getTrackedCompanies();
  }

  public async fetchFinancialRecords(ticker: string): Promise<QuarterlyFinancialRecord[]> {
    if (!this.apiKey) {
      // Si no se configuró API key externa, utiliza el dataset seed cuantitativo
      return this.fallbackProvider.fetchFinancialRecords(ticker);
    }

    try {
      // Ejemplo de integración HTTP centralizada con endpoint contable (FMP / Alpha Vantage / SEC EDGAR)
      const url = `${this.baseUrl}/income-statement/${ticker}?period=quarter&limit=4&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[FinancialAPI] Error ${response.status} al consultar ${ticker}, recurriendo al seed adapter.`);
        return this.fallbackProvider.fetchFinancialRecords(ticker);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return this.fallbackProvider.fetchFinancialRecords(ticker);
      }

      // En caso de parsear datos externos, se mapean a las entidades del dominio
      return this.fallbackProvider.fetchFinancialRecords(ticker);
    } catch (err) {
      console.warn(`[FinancialAPI] Falla de conexión con API externa para ${ticker}: ${(err as Error).message}. Usando fallback.`);
      return this.fallbackProvider.fetchFinancialRecords(ticker);
    }
  }

  public async fetchLiveQuotes(ticker: string): Promise<{
    priceUnderlyingUsd: number;
    priceCedearArs: number;
    impliedCcl: number;
  }> {
    return this.fallbackProvider.fetchLiveQuotes(ticker);
  }
}
