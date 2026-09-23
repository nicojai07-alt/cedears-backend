import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { join } from 'path';
import { openApiDocument } from './swagger/openapi.data.js';

// Ports & Adapters (Infrastructure)
import { InMemoryCompanyRepository } from '../../infrastructure/adapters/repositories/in-memory-company.repository.js';
import { CentralizedFinancialApiAdapter } from '../../infrastructure/adapters/financial-api/fmp-provider.adapter.js';
import { GeminiQualitativeAnalyzerAdapter } from '../../infrastructure/adapters/ai/gemini-analyzer.adapter.js';

// Application Use Cases
import { SyncCompaniesDataUseCase } from '../../application/use-cases/sync-companies-data.use-case.js';
import { AnalyzeQualitativeUseCase } from '../../application/use-cases/analyze-qualitative.use-case.js';
import { GeneratePredictionUseCase } from '../../application/use-cases/generate-prediction.use-case.js';
import { GetCompaniesUseCase } from '../../application/use-cases/get-companies.use-case.js';

// HTTP Controllers & Routes
import { CompanyController } from './controllers/company.controller.js';
import { IngestionController } from './controllers/ingestion.controller.js';
import { AnalysisController } from './controllers/analysis.controller.js';
import { PredictionController } from './controllers/prediction.controller.js';

import { createCompanyRoutes } from './routes/company.routes.js';
import { createIngestionRoutes } from './routes/ingestion.routes.js';
import { createAnalysisRoutes } from './routes/analysis.routes.js';
import { createPredictionRoutes } from './routes/prediction.routes.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp(): {
  app: Express;
  companyRepository: InMemoryCompanyRepository;
  syncUseCase: SyncCompaniesDataUseCase;
  analyzeQualitativeUseCase: AnalyzeQualitativeUseCase;
  generatePredictionUseCase: GeneratePredictionUseCase;
} {
  const app = express();

  // Middleware globales
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Archivos estáticos del Dashboard Visual
  const publicDir = join(process.cwd(), 'public');
  app.use(express.static(publicDir));
  app.get('/dashboard', (_req: Request, res: Response) => {
    res.sendFile(join(publicDir, 'index.html'));
  });

  // Inyección de Dependencias (Hexagonal Ports & Adapters Wiring)
  const companyRepository = new InMemoryCompanyRepository();
  const financialProvider = new CentralizedFinancialApiAdapter();
  const qualitativeAnalyzer = new GeminiQualitativeAnalyzerAdapter();

  const syncUseCase = new SyncCompaniesDataUseCase(financialProvider, companyRepository);
  const analyzeQualitativeUseCase = new AnalyzeQualitativeUseCase(qualitativeAnalyzer, companyRepository);
  const generatePredictionUseCase = new GeneratePredictionUseCase(companyRepository);
  const getCompaniesUseCase = new GetCompaniesUseCase(companyRepository);

  const companyController = new CompanyController(getCompaniesUseCase);
  const ingestionController = new IngestionController(syncUseCase);
  const analysisController = new AnalysisController(analyzeQualitativeUseCase);
  const predictionController = new PredictionController(generatePredictionUseCase);

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'HEALTHY',
      service: 'CEDEARs Fundamental Analysis & Prediction API',
      timestamp: new Date().toISOString()
    });
  });

  // Montaje de Rutas API v1
  app.use('/api/v1/companies', createCompanyRoutes(companyController));
  app.use('/api/v1/ingestion', createIngestionRoutes(ingestionController));
  app.use('/api/v1/analysis', createAnalysisRoutes(analysisController));
  app.use('/api/v1/predictions', createPredictionRoutes(predictionController));

  // Middleware de manejo de errores
  app.use(errorHandler);

  return { app, companyRepository, syncUseCase, analyzeQualitativeUseCase, generatePredictionUseCase };
}
