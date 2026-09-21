import { Router } from 'express';
import { IngestionController } from '../controllers/ingestion.controller.js';

export function createIngestionRoutes(controller: IngestionController): Router {
  const router = Router();

  router.post('/sync', controller.sync);

  return router;
}
