import { Router } from 'express';
import { PredictionController } from '../controllers/prediction.controller.js';

export function createPredictionRoutes(controller: PredictionController): Router {
  const router = Router();

  router.get('/batch', controller.getBatchPredictions);
  router.get('/:ticker', controller.getPredictionByTicker);

  return router;
}
