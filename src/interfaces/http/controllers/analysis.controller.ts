import { Request, Response, NextFunction } from 'express';
import { AnalyzeQualitativeUseCase } from '../../../application/use-cases/analyze-qualitative.use-case.js';

export class AnalysisController {
  constructor(private readonly analyzeQualitativeUseCase: AnalyzeQualitativeUseCase) {}

  public analyzeText = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticker = String(req.params.ticker || req.body?.ticker || '').toUpperCase();
      if (!ticker) {
        res.status(400).json({
          success: false,
          error: { message: 'El parámetro ticker es obligatorio', statusCode: 400 }
        });
        return;
      }

      const { quarter, transcriptEarningsCall, guidanceText, newsSummary } = req.body;

      const result = await this.analyzeQualitativeUseCase.execute({
        ticker,
        quarter: quarter || 'LATEST',
        transcriptEarningsCall,
        guidanceText,
        newsSummary
      });

      res.status(200).json({
        success: true,
        message: `Análisis cualitativo procesado exitosamente para ${ticker}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
