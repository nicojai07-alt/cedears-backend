import { Request, Response, NextFunction } from 'express';
import { GeneratePredictionUseCase } from '../../../application/use-cases/generate-prediction.use-case.js';

export class PredictionController {
  constructor(private readonly predictionUseCase: GeneratePredictionUseCase) {}

  public getPredictionByTicker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticker = String(req.params.ticker || '').toUpperCase();
      if (!ticker) {
        res.status(400).json({
          success: false,
          error: { message: 'El parámetro ticker es obligatorio', statusCode: 400 }
        });
        return;
      }

      const prediction = await this.predictionUseCase.execute(ticker);
      res.json({
        success: true,
        data: prediction
      });
    } catch (error) {
      next(error);
    }
  };

  public getBatchPredictions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sortBy = (req.query.sortBy as any) || 'real_upside';
      const order = (req.query.order as any) || 'desc';

      const predictions = await this.predictionUseCase.executeBatch({ sortBy, order });

      const screenerRanking = predictions.map((p, index) => ({
        rank: index + 1,
        ticker: p.ticker,
        companyName: p.companyName || p.ticker,
        sector: p.sector || 'General',
        underlyingTicker: p.underlyingTicker,
        currentPriceCedearArs: p.currentPriceCedearArs,
        idealTargetCedearArs: p.idealBestCaseScenario.targetPriceCedearArs,
        realTargetCedearArs: p.realSustainableBaseCaseScenario.targetPriceCedearArs,
        realUpsidePercentage: p.realSustainableBaseCaseScenario.upsidePotentialPercentage,
        idealUpsidePercentage: p.idealBestCaseScenario.upsidePotentialPercentage,
        recommendation: p.recommendation,
        riskDiscountPercentage: p.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage
      }));

      res.json({
        success: true,
        count: predictions.length,
        sortBy,
        order,
        screenerRanking,
        data: predictions
      });
    } catch (error) {
      next(error);
    }
  };
}
