import { QualitativeAnalyzerPort } from '../ports/qualitative-analyzer.port.js';
import { CompanyRepositoryPort } from '../ports/company-repository.port.js';
import { QualitativeAnalysisInput, QualitativeAnalysisResult } from '../../domain/entities/qualitative-data.js';

export class AnalyzeQualitativeUseCase {
  constructor(
    private readonly qualitativeAnalyzer: QualitativeAnalyzerPort,
    private readonly companyRepository: CompanyRepositoryPort
  ) {}

  public async execute(input: QualitativeAnalysisInput): Promise<QualitativeAnalysisResult> {
    const ticker = input.ticker.toUpperCase();
    const company = await this.companyRepository.getCompany(ticker);

    if (!company) {
      throw new Error(`La empresa con ticker ${ticker} no se encuentra registrada. Sincronice primero los datos.`);
    }

    const analysisResult = await this.qualitativeAnalyzer.analyzeText({
      ...input,
      ticker
    });

    await this.companyRepository.saveQualitativeAnalysis(ticker, analysisResult);
    return analysisResult;
  }
}
