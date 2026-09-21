import { Request, Response, NextFunction } from 'express';
import { GetCompaniesUseCase } from '../../../application/use-cases/get-companies.use-case.js';

export class CompanyController {
  constructor(private readonly getCompaniesUseCase: GetCompaniesUseCase) {}

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companies = await this.getCompaniesUseCase.execute();
      res.json({
        success: true,
        count: companies.length,
        data: companies
      });
    } catch (error) {
      next(error);
    }
  };

  public getByTicker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticker = String(req.params.ticker || '');
      const aggregate = await this.getCompaniesUseCase.getByTicker(ticker);

      if (!aggregate) {
        res.status(404).json({
          success: false,
          error: {
            message: `Empresa con ticker '${ticker}' no encontrada. Ejecute la sincronización primero.`,
            statusCode: 404
          }
        });
        return;
      }

      res.json({
        success: true,
        data: aggregate
      });
    } catch (error) {
      next(error);
    }
  };
}
