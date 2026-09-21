export interface CedearRatio {
  cedearShares: number; // e.g. 10 (10 CEDEARs)
  underlyingShares: number; // e.g. 1 (equal 1 underlying share)
}

export interface Company {
  id: string; // Ticker CEDEAR (e.g., 'AAPL', 'MELI')
  name: string;
  underlyingTicker: string; // e.g. 'AAPL' on NASDAQ
  market: 'BCBA' | 'BYMA';
  cedearRatio: CedearRatio; // Ratio de conversión CEDEAR a acción subyacente
  sector: string;
  industry: string;
  country: string;
  currency: string; // 'USD' for underlying, 'ARS' for local CEDEAR
  currentPriceUnderlyingUsd: number;
  currentPriceCedearArs: number;
  impliedCclExchangeRate: number; // Tipo de cambio implícito Contado con Liquidación
  lastUpdated: string;
}
