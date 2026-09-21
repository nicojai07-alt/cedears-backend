import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller.js';

export function createCompanyRoutes(controller: CompanyController): Router {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:ticker', controller.getByTicker);

  return router;
}
