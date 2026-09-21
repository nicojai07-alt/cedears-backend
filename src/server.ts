import dotenv from 'dotenv';
import { createApp } from './interfaces/http/app.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const { app, companyRepository, syncUseCase, analyzeQualitativeUseCase, generatePredictionUseCase } = createApp();

  const server = app.listen(PORT, HOST, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 CEDEARs Fundamental Analysis & Predictive Platform`);
    console.log(`📡 Servidor activo en: http://${HOST}:${PORT}`);
    console.log(`📖 Documentación Swagger UI: http://${HOST}:${PORT}/api/docs`);
    console.log(`🏥 Healthcheck: http://${HOST}:${PORT}/health`);
    console.log(`=======================================================`);

    // Ingesta y precarga completa en memoria para latencia sub-10ms en la demo
    try {
      console.log('⏳ [1/3] Sincronizando catálogo cuantitativo de 50 empresas/CEDEARs...');
      const syncResult = await syncUseCase.execute();
      console.log(`✅ [1/3] Datos contables listos: ${syncResult.syncedCompanies} CEDEARs cargados.`);

      console.log('⏳ [2/3] Precargando análisis cualitativo de referencia para los 50 CEDEARs...');
      for (const comp of await companyRepository.getAllCompanies()) {
        await analyzeQualitativeUseCase.execute({
          ticker: comp.id,
          quarter: '2024-Q3'
        });
      }
      console.log('✅ [2/3] Datos blandos cualitativos precargados en memoria.');

      console.log('⏳ [3/3] Precomputando predicciones duales (Ideal vs Real Sostenible) para el Screener...');
      const screener = await generatePredictionUseCase.executeBatch({ sortBy: 'real_upside', order: 'desc' });
      console.log(`✅ [3/3] ${screener.length} predicciones duales precomputadas y almacenadas en memoria.`);

      console.log('-------------------------------------------------------');
      console.log('🏆 TOP 3 OPORTUNIDADES EN SCREENER (POR UPSIDE REAL):');
      screener.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.ticker} (${p.underlyingTicker}) | Real: +${p.realSustainableBaseCaseScenario.upsidePotentialPercentage}% ($${p.realSustainableBaseCaseScenario.targetPriceCedearArs.toLocaleString('es-AR')} ARS) | Ideal: +${p.idealBestCaseScenario.upsidePotentialPercentage}%`);
      });
      console.log('-------------------------------------------------------');
      console.log('🎯 Servidor 100% listo para la DEMO EN VIVO (Latencia de respuesta: <15ms)');
      console.log(`=======================================================`);
    } catch (err) {
      console.error('❌ Error al inicializar precarga:', err);
    }
  });

  return server;
}

bootstrap().catch(err => {
  console.error('Error fatal al iniciar la aplicación:', err);
  process.exit(1);
});
