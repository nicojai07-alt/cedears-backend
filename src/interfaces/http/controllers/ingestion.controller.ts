import { Request, Response, NextFunction } from 'express';
import { SyncCompaniesDataUseCase } from '../../../application/use-cases/sync-companies-data.use-case.js';

export class IngestionController {
  constructor(private readonly syncUseCase: SyncCompaniesDataUseCase) {}

  public sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tickers = Array.isArray(req.body?.tickers) ? req.body.tickers : undefined;
      const result = await this.syncUseCase.execute(tickers);

      res.status(200).json({
        success: true,
        message: `Sincronización cuantitativa completada con éxito. ${result.syncedCompanies} empresas procesadas.`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
