import { Company } from '../../domain/entities/company.js';
import { QuarterlyFinancialRecord } from '../../domain/entities/financial-statement.js';

export interface FinancialDataProviderPort {
  /**
   * Obtiene la lista de empresas y CEDEARs monitoreados (las 50 empresas)
   */
  getTrackedCompanies(): Promise<Company[]>;

  /**
   * Ingesta estados contables e indicadores trimestrales para un ticker
   */
  fetchFinancialRecords(ticker: string): Promise<QuarterlyFinancialRecord[]>;

  /**
   * Obtiene la cotización actual subyacente (USD) y del CEDEAR (ARS)
   */
  fetchLiveQuotes(ticker: string): Promise<{
    priceUnderlyingUsd: number;
    priceCedearArs: number;
    impliedCcl: number;
  }>;
}
