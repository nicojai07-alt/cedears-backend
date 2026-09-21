import { Company } from '../../../domain/entities/company.js';
import { QuarterlyFinancialRecord } from '../../../domain/entities/financial-statement.js';
import { QualitativeAnalysisResult } from '../../../domain/entities/qualitative-data.js';
import { PredictionResult } from '../../../domain/entities/prediction.js';
import { CompanyRepositoryPort, CompanyDataAggregate } from '../../../application/ports/company-repository.port.js';

export class InMemoryCompanyRepository implements CompanyRepositoryPort {
  private companies: Map<string, Company> = new Map();
  private financials: Map<string, QuarterlyFinancialRecord[]> = new Map();
  private qualitative: Map<string, QualitativeAnalysisResult> = new Map();
  private predictions: Map<string, PredictionResult> = new Map();

  public async saveCompany(company: Company): Promise<void> {
    this.companies.set(company.id.toUpperCase(), company);
  }

  public async saveCompaniesBatch(companies: Company[]): Promise<void> {
    for (const company of companies) {
      this.companies.set(company.id.toUpperCase(), company);
    }
  }

  public async getCompany(ticker: string): Promise<Company | null> {
    return this.companies.get(ticker.toUpperCase()) || null;
  }

  public async getAllCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  public async saveFinancialRecords(ticker: string, records: QuarterlyFinancialRecord[]): Promise<void> {
    this.financials.set(ticker.toUpperCase(), records);
  }

  public async getFinancialRecords(ticker: string): Promise<QuarterlyFinancialRecord[]> {
    return this.financials.get(ticker.toUpperCase()) || [];
  }

  public async getLatestFinancialRecord(ticker: string): Promise<QuarterlyFinancialRecord | null> {
    const records = this.financials.get(ticker.toUpperCase());
    if (!records || records.length === 0) return null;
    return records[0];
  }

  public async saveQualitativeAnalysis(ticker: string, analysis: QualitativeAnalysisResult): Promise<void> {
    this.qualitative.set(ticker.toUpperCase(), analysis);
  }

  public async getQualitativeAnalysis(ticker: string): Promise<QualitativeAnalysisResult | null> {
    return this.qualitative.get(ticker.toUpperCase()) || null;
  }

  public async savePrediction(prediction: PredictionResult): Promise<void> {
    this.predictions.set(prediction.ticker.toUpperCase(), prediction);
  }

  public async getPrediction(ticker: string): Promise<PredictionResult | null> {
    return this.predictions.get(ticker.toUpperCase()) || null;
  }

  public async getAllPredictions(): Promise<PredictionResult[]> {
    return Array.from(this.predictions.values());
  }

  public async getAggregate(ticker: string): Promise<CompanyDataAggregate | null> {
    const formatted = ticker.toUpperCase();
    const company = this.companies.get(formatted);
    if (!company) return null;

    return {
      company,
      financialRecords: this.financials.get(formatted) || [],
      qualitativeAnalysis: this.qualitative.get(formatted),
      lastPrediction: this.predictions.get(formatted),
      lastIngestedAt: company.lastUpdated
    };
  }

  public async getAllAggregates(): Promise<CompanyDataAggregate[]> {
    const list: CompanyDataAggregate[] = [];
    for (const [ticker, company] of this.companies.entries()) {
      list.push({
        company,
        financialRecords: this.financials.get(ticker) || [],
        qualitativeAnalysis: this.qualitative.get(ticker),
        lastPrediction: this.predictions.get(ticker),
        lastIngestedAt: company.lastUpdated
      });
    }
    return list;
  }
}
