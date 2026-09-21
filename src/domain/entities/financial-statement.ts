export interface IncomeStatement {
  fiscalDateEnding: string;
  totalRevenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  eps: number; // Earnings Per Share
  sharesOutstanding: number;
}

export interface BalanceSheet {
  fiscalDateEnding: string;
  totalAssets: number;
  currentAssets: number;
  cashAndCashEquivalents: number;
  totalLiabilities: number;
  currentLiabilities: number;
  shortTermDebt: number;
  longTermDebt: number;
  totalDebt: number;
  totalStockholderEquity: number;
}

export interface CashFlowStatement {
  fiscalDateEnding: string;
  operatingCashflow: number;
  capitalExpenditures: number; // CapEx
  freeCashFlow: number; // Operating Cashflow - CapEx
  dividendPayout: number;
  netFinancingActivities: number;
}

export interface KeyFinancialRatios {
  ebitda: number;
  freeCashFlow: number;
  per: number; // Price to Earnings Ratio
  evToEbitda: number; // Enterprise Value to EBITDA
  netDebt: number; // Total Debt - Cash
  netDebtToEbitda: number;
  grossMargin: number; // grossProfit / totalRevenue
  operatingMargin: number; // operatingIncome / totalRevenue
  netProfitMargin: number; // netIncome / totalRevenue
  roe: number; // Return on Equity: netIncome / totalStockholderEquity
  fcfYield: number; // Free Cash Flow / Market Cap
}

export interface QuarterlyFinancialRecord {
  period: string; // e.g. '2024-Q3'
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlowStatement;
  ratios: KeyFinancialRatios;
}
