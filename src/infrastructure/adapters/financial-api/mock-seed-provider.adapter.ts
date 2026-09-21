import { Company } from '../../../domain/entities/company.js';
import { QuarterlyFinancialRecord } from '../../../domain/entities/financial-statement.js';
import { FinancialDataProviderPort } from '../../../application/ports/financial-data-provider.port.js';

interface RawSeedConfig {
  ticker: string;
  name: string;
  underlying: string;
  ratioCedear: number;
  ratioUnderlying: number;
  sector: string;
  industry: string;
  country: string;
  priceUsd: number;
  revenueB: number; // en miles de millones USD
  ebitdaB: number;
  netIncomeB: number;
  fcfB: number;
  totalDebtB: number;
  cashB: number;
  sharesOutstandingB: number;
}

export class MockSeedFinancialProviderAdapter implements FinancialDataProviderPort {
  private readonly defaultCcl = 1250.0; // Tipo de cambio Contado con Liquidación ARS/USD

  // Catálogo completo de las 50 empresas/CEDEARs principales en el mercado argentino
  private readonly seedDefinitions: RawSeedConfig[] = [
    { ticker: 'AAPL', name: 'Apple Inc.', underlying: 'AAPL', ratioCedear: 10, ratioUnderlying: 1, sector: 'Technology', industry: 'Consumer Electronics', country: 'USA', priceUsd: 228.5, revenueB: 94.9, ebitdaB: 30.5, netIncomeB: 24.1, fcfB: 26.8, totalDebtB: 106.0, cashB: 29.9, sharesOutstandingB: 15.2 },
    { ticker: 'MSFT', name: 'Microsoft Corporation', underlying: 'MSFT', ratioCedear: 30, ratioUnderlying: 1, sector: 'Technology', industry: 'Software - Infrastructure', country: 'USA', priceUsd: 435.2, revenueB: 65.6, ebitdaB: 34.2, netIncomeB: 22.0, fcfB: 21.4, totalDebtB: 85.0, cashB: 78.4, sharesOutstandingB: 7.43 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', underlying: 'GOOGL', ratioCedear: 58, ratioUnderlying: 1, sector: 'Communication Services', industry: 'Internet Content & Information', country: 'USA', priceUsd: 172.4, revenueB: 88.2, ebitdaB: 32.5, netIncomeB: 26.3, fcfB: 24.5, totalDebtB: 28.5, cashB: 93.2, sharesOutstandingB: 12.3 },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', underlying: 'NVDA', ratioCedear: 24, ratioUnderlying: 1, sector: 'Technology', industry: 'Semiconductors', country: 'USA', priceUsd: 124.8, revenueB: 35.1, ebitdaB: 21.8, netIncomeB: 19.3, fcfB: 16.8, totalDebtB: 10.0, cashB: 34.8, sharesOutstandingB: 24.5 },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', underlying: 'AMZN', ratioCedear: 144, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Internet Retail', country: 'USA', priceUsd: 186.5, revenueB: 158.8, ebitdaB: 28.4, netIncomeB: 15.3, fcfB: 17.5, totalDebtB: 130.0, cashB: 88.0, sharesOutstandingB: 10.5 },
    { ticker: 'META', name: 'Meta Platforms Inc.', underlying: 'META', ratioCedear: 24, ratioUnderlying: 1, sector: 'Communication Services', industry: 'Internet Content & Information', country: 'USA', priceUsd: 585.0, revenueB: 40.6, ebitdaB: 21.2, netIncomeB: 15.7, fcfB: 15.5, totalDebtB: 38.0, cashB: 70.9, sharesOutstandingB: 2.53 },
    { ticker: 'TSLA', name: 'Tesla Inc.', underlying: 'TSLA', ratioCedear: 15, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', country: 'USA', priceUsd: 218.4, revenueB: 25.2, ebitdaB: 4.6, netIncomeB: 2.2, fcfB: 2.7, totalDebtB: 13.0, cashB: 33.6, sharesOutstandingB: 3.19 },
    { ticker: 'MELI', name: 'MercadoLibre Inc.', underlying: 'MELI', ratioCedear: 120, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Internet Retail', country: 'Uruguay/LatAm', priceUsd: 1980.0, revenueB: 5.3, ebitdaB: 1.1, netIncomeB: 0.53, fcfB: 0.95, totalDebtB: 5.2, cashB: 4.1, sharesOutstandingB: 0.051 },
    { ticker: 'KO', name: 'The Coca-Cola Company', underlying: 'KO', ratioCedear: 5, ratioUnderlying: 1, sector: 'Consumer Defensive', industry: 'Beverages - Non-Alcoholic', country: 'USA', priceUsd: 65.5, revenueB: 11.9, ebitdaB: 3.8, netIncomeB: 2.8, fcfB: 2.6, totalDebtB: 41.5, cashB: 16.2, sharesOutstandingB: 4.3 },
    { ticker: 'PEP', name: 'PepsiCo Inc.', underlying: 'PEP', ratioCedear: 6, ratioUnderlying: 1, sector: 'Consumer Defensive', industry: 'Beverages - Non-Alcoholic', country: 'USA', priceUsd: 168.0, revenueB: 23.3, ebitdaB: 4.2, netIncomeB: 2.9, fcfB: 2.5, totalDebtB: 44.0, cashB: 8.5, sharesOutstandingB: 1.37 },
    { ticker: 'BBD', name: 'Banco Bradesco S.A.', underlying: 'BBD', ratioCedear: 1, ratioUnderlying: 1, sector: 'Financial', industry: 'Banks - Regional', country: 'Brazil', priceUsd: 2.85, revenueB: 8.5, ebitdaB: 2.4, netIncomeB: 1.1, fcfB: 1.2, totalDebtB: 15.0, cashB: 18.0, sharesOutstandingB: 10.6 },
    { ticker: 'PBR', name: 'Petróleo Brasileiro S.A. Petrobras', underlying: 'PBR', ratioCedear: 1, ratioUnderlying: 1, sector: 'Energy', industry: 'Oil & Gas Integrated', country: 'Brazil', priceUsd: 14.2, revenueB: 23.0, ebitdaB: 11.8, netIncomeB: 5.8, fcfB: 6.2, totalDebtB: 53.0, cashB: 14.0, sharesOutstandingB: 6.5 },
    { ticker: 'V', name: 'Visa Inc.', underlying: 'V', ratioCedear: 18, ratioUnderlying: 1, sector: 'Financial', industry: 'Credit Services', country: 'USA', priceUsd: 285.0, revenueB: 9.6, ebitdaB: 6.7, netIncomeB: 5.3, fcfB: 5.2, totalDebtB: 22.0, cashB: 16.5, sharesOutstandingB: 1.95 },
    { ticker: 'MA', name: 'Mastercard Incorporated', underlying: 'MA', ratioCedear: 33, ratioUnderlying: 1, sector: 'Financial', industry: 'Credit Services', country: 'USA', priceUsd: 495.0, revenueB: 7.4, ebitdaB: 4.4, netIncomeB: 3.3, fcfB: 3.2, totalDebtB: 17.5, cashB: 9.8, sharesOutstandingB: 0.92 },
    { ticker: 'WMT', name: 'Walmart Inc.', underlying: 'WMT', ratioCedear: 6, ratioUnderlying: 1, sector: 'Consumer Defensive', industry: 'Discount Stores', country: 'USA', priceUsd: 80.5, revenueB: 169.6, ebitdaB: 10.2, netIncomeB: 4.5, fcfB: 4.8, totalDebtB: 62.0, cashB: 10.0, sharesOutstandingB: 8.04 },
    { ticker: 'PG', name: 'Procter & Gamble Company', underlying: 'PG', ratioCedear: 10, ratioUnderlying: 1, sector: 'Consumer Defensive', industry: 'Household & Personal Products', country: 'USA', priceUsd: 172.0, revenueB: 21.7, ebitdaB: 6.1, netIncomeB: 4.0, fcfB: 4.4, totalDebtB: 34.0, cashB: 9.5, sharesOutstandingB: 2.35 },
    { ticker: 'JNJ', name: 'Johnson & Johnson', underlying: 'JNJ', ratioCedear: 10, ratioUnderlying: 1, sector: 'Healthcare', industry: 'Drug Manufacturers', country: 'USA', priceUsd: 162.0, revenueB: 22.5, ebitdaB: 7.5, netIncomeB: 4.7, fcfB: 5.1, totalDebtB: 36.0, cashB: 24.0, sharesOutstandingB: 2.4 },
    { ticker: 'DIS', name: 'The Walt Disney Company', underlying: 'DIS', ratioCedear: 12, ratioUnderlying: 1, sector: 'Communication Services', industry: 'Entertainment', country: 'USA', priceUsd: 96.0, revenueB: 22.6, ebitdaB: 4.1, netIncomeB: 1.3, fcfB: 2.4, totalDebtB: 47.0, cashB: 6.0, sharesOutstandingB: 1.82 },
    { ticker: 'NFLX', name: 'Netflix Inc.', underlying: 'NFLX', ratioCedear: 48, ratioUnderlying: 1, sector: 'Communication Services', industry: 'Entertainment', country: 'USA', priceUsd: 710.0, revenueB: 9.8, ebitdaB: 3.1, netIncomeB: 2.4, fcfB: 2.2, totalDebtB: 14.0, cashB: 7.0, sharesOutstandingB: 0.43 },
    { ticker: 'AMD', name: 'Advanced Micro Devices Inc.', underlying: 'AMD', ratioCedear: 10, ratioUnderlying: 1, sector: 'Technology', industry: 'Semiconductors', country: 'USA', priceUsd: 155.0, revenueB: 6.8, ebitdaB: 1.6, netIncomeB: 0.77, fcfB: 0.9, totalDebtB: 3.0, cashB: 5.5, sharesOutstandingB: 1.62 },
    { ticker: 'INTC', name: 'Intel Corporation', underlying: 'INTC', ratioCedear: 5, ratioUnderlying: 1, sector: 'Technology', industry: 'Semiconductors', country: 'USA', priceUsd: 22.0, revenueB: 13.3, ebitdaB: 1.8, netIncomeB: -1.6, fcfB: -2.0, totalDebtB: 53.0, cashB: 24.0, sharesOutstandingB: 4.28 },
    { ticker: 'CRM', name: 'Salesforce Inc.', underlying: 'CRM', ratioCedear: 18, ratioUnderlying: 1, sector: 'Technology', industry: 'Software - Application', country: 'USA', priceUsd: 290.0, revenueB: 9.3, ebitdaB: 3.2, netIncomeB: 1.5, fcfB: 2.1, totalDebtB: 13.0, cashB: 14.0, sharesOutstandingB: 0.96 },
    { ticker: 'QCOM', name: 'QUALCOMM Incorporated', underlying: 'QCOM', ratioCedear: 11, ratioUnderlying: 1, sector: 'Technology', industry: 'Semiconductors', country: 'USA', priceUsd: 168.0, revenueB: 10.2, ebitdaB: 3.6, netIncomeB: 2.9, fcfB: 2.8, totalDebtB: 15.0, cashB: 13.0, sharesOutstandingB: 1.11 },
    { ticker: 'TXN', name: 'Texas Instruments Inc.', underlying: 'TXN', ratioCedear: 15, ratioUnderlying: 1, sector: 'Technology', industry: 'Semiconductors', country: 'USA', priceUsd: 205.0, revenueB: 4.1, ebitdaB: 1.8, netIncomeB: 1.3, fcfB: 1.1, totalDebtB: 12.0, cashB: 8.5, sharesOutstandingB: 0.91 },
    { ticker: 'CSCO', name: 'Cisco Systems Inc.', underlying: 'CSCO', ratioCedear: 5, ratioUnderlying: 1, sector: 'Technology', industry: 'Communication Equipment', country: 'USA', priceUsd: 55.0, revenueB: 13.8, ebitdaB: 4.3, netIncomeB: 2.7, fcfB: 3.1, totalDebtB: 28.0, cashB: 18.0, sharesOutstandingB: 4.0 },
    { ticker: 'XOM', name: 'Exxon Mobil Corporation', underlying: 'XOM', ratioCedear: 10, ratioUnderlying: 1, sector: 'Energy', industry: 'Oil & Gas Integrated', country: 'USA', priceUsd: 115.0, revenueB: 93.0, ebitdaB: 18.5, netIncomeB: 8.6, fcfB: 11.3, totalDebtB: 41.0, cashB: 26.0, sharesOutstandingB: 4.4 },
    { ticker: 'CVX', name: 'Chevron Corporation', underlying: 'CVX', ratioCedear: 8, ratioUnderlying: 1, sector: 'Energy', industry: 'Oil & Gas Integrated', country: 'USA', priceUsd: 148.0, revenueB: 50.0, ebitdaB: 9.8, netIncomeB: 4.5, fcfB: 4.9, totalDebtB: 23.0, cashB: 6.0, sharesOutstandingB: 1.83 },
    { ticker: 'BABA', name: 'Alibaba Group Holding Ltd', underlying: 'BABA', ratioCedear: 9, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Internet Retail', country: 'China', priceUsd: 105.0, revenueB: 33.7, ebitdaB: 6.8, netIncomeB: 4.6, fcfB: 5.1, totalDebtB: 25.0, cashB: 65.0, sharesOutstandingB: 2.4 },
    { ticker: 'JD', name: 'JD.com Inc.', underlying: 'JD', ratioCedear: 4, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Internet Retail', country: 'China', priceUsd: 38.0, revenueB: 38.0, ebitdaB: 2.0, netIncomeB: 1.4, fcfB: 1.8, totalDebtB: 10.0, cashB: 30.0, sharesOutstandingB: 1.55 },
    { ticker: 'NIO', name: 'NIO Inc.', underlying: 'NIO', ratioCedear: 2, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', country: 'China', priceUsd: 5.8, revenueB: 2.4, ebitdaB: -0.6, netIncomeB: -0.7, fcfB: -0.8, totalDebtB: 4.0, cashB: 5.5, sharesOutstandingB: 2.08 },
    { ticker: 'GLOB', name: 'Globant S.A.', underlying: 'GLOB', ratioCedear: 18, ratioUnderlying: 1, sector: 'Technology', industry: 'Information Technology Services', country: 'Argentina/Lux', priceUsd: 205.0, revenueB: 0.61, ebitdaB: 0.12, netIncomeB: 0.05, fcfB: 0.08, totalDebtB: 0.8, cashB: 0.3, sharesOutstandingB: 0.043 },
    { ticker: 'DESP', name: 'Despegar.com Corp.', underlying: 'DESP', ratioCedear: 1, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Travel Services', country: 'Argentina', priceUsd: 15.5, revenueB: 0.20, ebitdaB: 0.048, netIncomeB: 0.02, fcfB: 0.035, totalDebtB: 0.15, cashB: 0.25, sharesOutstandingB: 0.088 },
    { ticker: 'VIST', name: 'Vista Energy S.A.B. de C.V.', underlying: 'VIST', ratioCedear: 3, ratioUnderlying: 1, sector: 'Energy', industry: 'Oil & Gas E&P', country: 'Argentina/Mexico', priceUsd: 52.0, revenueB: 0.46, ebitdaB: 0.31, netIncomeB: 0.13, fcfB: 0.15, totalDebtB: 1.1, cashB: 0.22, sharesOutstandingB: 0.095 },
    { ticker: 'LLY', name: 'Eli Lilly and Company', underlying: 'LLY', ratioCedear: 8, ratioUnderlying: 1, sector: 'Healthcare', industry: 'Drug Manufacturers', country: 'USA', priceUsd: 920.0, revenueB: 11.3, ebitdaB: 4.8, netIncomeB: 3.1, fcfB: 2.8, totalDebtB: 27.0, cashB: 3.5, sharesOutstandingB: 0.95 },
    { ticker: 'ABBV', name: 'AbbVie Inc.', underlying: 'ABBV', ratioCedear: 10, ratioUnderlying: 1, sector: 'Healthcare', industry: 'Drug Manufacturers', country: 'USA', priceUsd: 195.0, revenueB: 14.5, ebitdaB: 6.9, netIncomeB: 3.8, fcfB: 4.2, totalDebtB: 65.0, cashB: 12.0, sharesOutstandingB: 1.77 },
    { ticker: 'UNH', name: 'UnitedHealth Group Inc.', underlying: 'UNH', ratioCedear: 33, ratioUnderlying: 1, sector: 'Healthcare', industry: 'Healthcare Plans', country: 'USA', priceUsd: 580.0, revenueB: 100.8, ebitdaB: 9.8, netIncomeB: 6.1, fcfB: 7.2, totalDebtB: 72.0, cashB: 32.0, sharesOutstandingB: 0.92 },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', underlying: 'JPM', ratioCedear: 15, ratioUnderlying: 1, sector: 'Financial', industry: 'Banks - Diversified', country: 'USA', priceUsd: 220.0, revenueB: 43.3, ebitdaB: 18.0, netIncomeB: 12.9, fcfB: 14.0, totalDebtB: 350.0, cashB: 500.0, sharesOutstandingB: 2.85 },
    { ticker: 'BAC', name: 'Bank of America Corporation', underlying: 'BAC', ratioCedear: 4, ratioUnderlying: 1, sector: 'Financial', industry: 'Banks - Diversified', country: 'USA', priceUsd: 41.5, revenueB: 25.5, ebitdaB: 9.5, netIncomeB: 6.9, fcfB: 7.5, totalDebtB: 280.0, cashB: 320.0, sharesOutstandingB: 7.7 },
    { ticker: 'C', name: 'Citigroup Inc.', underlying: 'C', ratioCedear: 3, ratioUnderlying: 1, sector: 'Financial', industry: 'Banks - Diversified', country: 'USA', priceUsd: 65.0, revenueB: 20.3, ebitdaB: 5.5, netIncomeB: 3.2, fcfB: 3.8, totalDebtB: 220.0, cashB: 260.0, sharesOutstandingB: 1.9 },
    { ticker: 'WFC', name: 'Wells Fargo & Company', underlying: 'WFC', ratioCedear: 5, ratioUnderlying: 1, sector: 'Financial', industry: 'Banks - Diversified', country: 'USA', priceUsd: 58.0, revenueB: 20.4, ebitdaB: 6.2, netIncomeB: 5.1, fcfB: 5.5, totalDebtB: 180.0, cashB: 170.0, sharesOutstandingB: 3.48 },
    { ticker: 'BMA', name: 'Banco Macro S.A.', underlying: 'BMA', ratioCedear: 10, ratioUnderlying: 1, sector: 'Financial', industry: 'Banks - Regional', country: 'Argentina', priceUsd: 68.5, revenueB: 1.8, ebitdaB: 0.65, netIncomeB: 0.38, fcfB: 0.42, totalDebtB: 1.2, cashB: 2.1, sharesOutstandingB: 0.063 },
    { ticker: 'VALE', name: 'Vale S.A.', underlying: 'VALE', ratioCedear: 2, ratioUnderlying: 1, sector: 'Basic Materials', industry: 'Other Industrial Metals & Mining', country: 'Brazil', priceUsd: 11.5, revenueB: 9.6, ebitdaB: 3.8, netIncomeB: 2.1, fcfB: 2.3, totalDebtB: 14.0, cashB: 5.2, sharesOutstandingB: 4.3 },
    { ticker: 'SPOT', name: 'Spotify Technology S.A.', underlying: 'SPOT', ratioCedear: 24, ratioUnderlying: 1, sector: 'Communication Services', industry: 'Internet Content & Information', country: 'Sweden/USA', priceUsd: 380.0, revenueB: 4.0, ebitdaB: 0.45, netIncomeB: 0.30, fcfB: 0.71, totalDebtB: 1.8, cashB: 4.8, sharesOutstandingB: 0.20 },
    { ticker: 'UBER', name: 'Uber Technologies Inc.', underlying: 'UBER', ratioCedear: 8, ratioUnderlying: 1, sector: 'Technology', industry: 'Software - Application', country: 'USA', priceUsd: 78.0, revenueB: 11.2, ebitdaB: 1.6, netIncomeB: 2.6, fcfB: 2.1, totalDebtB: 9.5, cashB: 5.8, sharesOutstandingB: 2.08 },
    { ticker: 'ABNB', name: 'Airbnb Inc.', underlying: 'ABNB', ratioCedear: 15, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Travel Services', country: 'USA', priceUsd: 132.0, revenueB: 3.7, ebitdaB: 1.9, netIncomeB: 1.4, fcfB: 1.1, totalDebtB: 2.0, cashB: 11.0, sharesOutstandingB: 0.63 },
    { ticker: 'BKNG', name: 'Booking Holdings Inc.', underlying: 'BKNG', ratioCedear: 120, ratioUnderlying: 1, sector: 'Consumer Cyclical', industry: 'Travel Services', country: 'USA', priceUsd: 4350.0, revenueB: 8.0, ebitdaB: 3.6, netIncomeB: 2.5, fcfB: 2.6, totalDebtB: 14.5, cashB: 16.0, sharesOutstandingB: 0.034 },
    { ticker: 'PYPL', name: 'PayPal Holdings Inc.', underlying: 'PYPL', ratioCedear: 10, ratioUnderlying: 1, sector: 'Financial', industry: 'Credit Services', country: 'USA', priceUsd: 76.0, revenueB: 7.8, ebitdaB: 1.6, netIncomeB: 1.0, fcfB: 1.4, totalDebtB: 11.0, cashB: 15.0, sharesOutstandingB: 1.02 },
    { ticker: 'SQ', name: 'Block Inc.', underlying: 'SQ', ratioCedear: 10, ratioUnderlying: 1, sector: 'Technology', industry: 'Software - Infrastructure', country: 'USA', priceUsd: 72.0, revenueB: 6.0, ebitdaB: 0.81, netIncomeB: 0.28, fcfB: 0.45, totalDebtB: 5.4, cashB: 8.2, sharesOutstandingB: 0.62 },
    { ticker: 'COST', name: 'Costco Wholesale Corporation', underlying: 'COST', ratioCedear: 48, ratioUnderlying: 1, sector: 'Consumer Defensive', industry: 'Discount Stores', country: 'USA', priceUsd: 915.0, revenueB: 79.7, ebitdaB: 3.5, netIncomeB: 2.3, fcfB: 2.5, totalDebtB: 7.0, cashB: 11.0, sharesOutstandingB: 0.44 },
    { ticker: 'GOLD', name: 'Barrick Gold Corp (Direct)', underlying: 'GOLD', ratioCedear: 1, ratioUnderlying: 1, sector: 'Basic Materials', industry: 'Gold', country: 'Canada', priceUsd: 20.2, revenueB: 3.4, ebitdaB: 1.5, netIncomeB: 0.48, fcfB: 0.52, totalDebtB: 4.7, cashB: 4.0, sharesOutstandingB: 1.75 }
  ];

  public async getTrackedCompanies(): Promise<Company[]> {
    return this.seedDefinitions.map(def => {
      const conversionRatio = def.ratioUnderlying / def.ratioCedear;
      const priceCedearArs = Math.round((def.priceUsd * conversionRatio) * this.defaultCcl);

      return {
        id: def.ticker,
        name: def.name,
        underlyingTicker: def.underlying,
        market: 'BYMA',
        cedearRatio: {
          cedearShares: def.ratioCedear,
          underlyingShares: def.ratioUnderlying
        },
        sector: def.sector,
        industry: def.industry,
        country: def.country,
        currency: 'USD',
        currentPriceUnderlyingUsd: def.priceUsd,
        currentPriceCedearArs: priceCedearArs,
        impliedCclExchangeRate: this.defaultCcl,
        lastUpdated: new Date().toISOString()
      };
    });
  }

  public async fetchFinancialRecords(ticker: string): Promise<QuarterlyFinancialRecord[]> {
    const seed = this.seedDefinitions.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    if (!seed) {
      throw new Error(`Ticker no encontrado en el proveedor financiero: ${ticker}`);
    }

    const rev = seed.revenueB * 1_000_000_000;
    const ebitda = seed.ebitdaB * 1_000_000_000;
    const netIncome = seed.netIncomeB * 1_000_000_000;
    const fcf = seed.fcfB * 1_000_000_000;
    const debt = seed.totalDebtB * 1_000_000_000;
    const cash = seed.cashB * 1_000_000_000;
    const shares = seed.sharesOutstandingB * 1_000_000_000;

    const netDebt = debt - cash;
    const eps = netIncome / shares;
    const annualNetIncome = netIncome * 4;
    const marketCap = seed.priceUsd * shares;
    const per = annualNetIncome > 0 ? Number((marketCap / annualNetIncome).toFixed(2)) : 0;
    const ev = marketCap + netDebt;
    const evToEbitda = ebitda > 0 ? Number((ev / (ebitda * 4)).toFixed(2)) : 0;

    const record: QuarterlyFinancialRecord = {
      period: '2024-Q3',
      incomeStatement: {
        fiscalDateEnding: '2024-09-30',
        totalRevenue: rev,
        costOfRevenue: rev * 0.55,
        grossProfit: rev * 0.45,
        operatingExpenses: rev * 0.20,
        operatingIncome: rev * 0.25,
        netIncome: netIncome,
        ebitda: ebitda,
        eps: Number(eps.toFixed(2)),
        sharesOutstanding: shares
      },
      balanceSheet: {
        fiscalDateEnding: '2024-09-30',
        totalAssets: cash + rev * 1.5,
        currentAssets: cash + rev * 0.8,
        cashAndCashEquivalents: cash,
        totalLiabilities: debt + rev * 0.5,
        currentLiabilities: debt * 0.3,
        shortTermDebt: debt * 0.2,
        longTermDebt: debt * 0.8,
        totalDebt: debt,
        totalStockholderEquity: (cash + rev * 1.5) - (debt + rev * 0.5)
      },
      cashFlow: {
        fiscalDateEnding: '2024-09-30',
        operatingCashflow: fcf * 1.25,
        capitalExpenditures: fcf * 0.25,
        freeCashFlow: fcf,
        dividendPayout: netIncome * 0.2,
        netFinancingActivities: -netIncome * 0.3
      },
      ratios: {
        ebitda: ebitda,
        freeCashFlow: fcf,
        per: per,
        evToEbitda: evToEbitda,
        netDebt: netDebt,
        netDebtToEbitda: ebitda > 0 ? Number((netDebt / (ebitda * 4)).toFixed(2)) : 0,
        grossMargin: 0.45,
        operatingMargin: 0.25,
        netProfitMargin: Number((netIncome / rev).toFixed(4)),
        roe: 0.22,
        fcfYield: Number(((fcf * 4) / marketCap).toFixed(4))
      }
    };

    return [record];
  }

  public async fetchLiveQuotes(ticker: string): Promise<{
    priceUnderlyingUsd: number;
    priceCedearArs: number;
    impliedCcl: number;
  }> {
    const seed = this.seedDefinitions.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());
    if (!seed) {
      throw new Error(`Ticker no encontrado: ${ticker}`);
    }

    const conversionRatio = seed.ratioUnderlying / seed.ratioCedear;
    const priceCedearArs = Math.round((seed.priceUsd * conversionRatio) * this.defaultCcl);

    return {
      priceUnderlyingUsd: seed.priceUsd,
      priceCedearArs,
      impliedCcl: this.defaultCcl
    };
  }
}
