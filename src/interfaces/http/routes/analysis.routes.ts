import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller.js';

export function createAnalysisRoutes(controller: AnalysisController): Router {
  const router = Router();

  router.post('/qualitative/:ticker', controller.analyzeText);
  router.post('/qualitative', controller.analyzeText);

  return router;
}
