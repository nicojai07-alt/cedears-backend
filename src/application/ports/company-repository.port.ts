import { Company } from '../../domain/entities/company.js';
import { QuarterlyFinancialRecord } from '../../domain/entities/financial-statement.js';
import { QualitativeAnalysisResult } from '../../domain/entities/qualitative-data.js';
import { PredictionResult } from '../../domain/entities/prediction.js';

export interface CompanyDataAggregate {
  company: Company;
  financialRecords: QuarterlyFinancialRecord[];
  qualitativeAnalysis?: QualitativeAnalysisResult;
  lastPrediction?: PredictionResult;
  lastIngestedAt?: string;
}

export interface CompanyRepositoryPort {
  saveCompany(company: Company): Promise<void>;
  saveCompaniesBatch(companies: Company[]): Promise<void>;
  getCompany(ticker: string): Promise<Company | null>;
  getAllCompanies(): Promise<Company[]>;

  saveFinancialRecords(ticker: string, records: QuarterlyFinancialRecord[]): Promise<void>;
  getFinancialRecords(ticker: string): Promise<QuarterlyFinancialRecord[]>;
  getLatestFinancialRecord(ticker: string): Promise<QuarterlyFinancialRecord | null>;

  saveQualitativeAnalysis(ticker: string, analysis: QualitativeAnalysisResult): Promise<void>;
  getQualitativeAnalysis(ticker: string): Promise<QualitativeAnalysisResult | null>;

  savePrediction(prediction: PredictionResult): Promise<void>;
  getPrediction(ticker: string): Promise<PredictionResult | null>;
  getAllPredictions(): Promise<PredictionResult[]>;

  getAggregate(ticker: string): Promise<CompanyDataAggregate | null>;
  getAllAggregates(): Promise<CompanyDataAggregate[]>;
}
