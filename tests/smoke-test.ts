import { createApp } from '../src/interfaces/http/app.js';

async function runSmokeTest() {
  console.log('--- Starting Smoke Test ---');
  const { app, syncUseCase } = createApp();

  const server = app.listen(3001, async () => {
    try {
      console.log('1. Server running on port 3001');

      // Sincronizar catálogo
      console.log('2. Syncing 50 CEDEARs...');
      const syncResult = await syncUseCase.execute();
      console.log(`Synced ${syncResult.syncedCompanies} companies successfully.`);

      // Query /health
      const healthRes = await fetch('http://localhost:3001/health');
      const healthJson = (await healthRes.json()) as any;
      console.log('3. Health check response:', healthJson.status);

      // Query /api/v1/companies
      const companiesRes = await fetch('http://localhost:3001/api/v1/companies');
      const companiesJson = (await companiesRes.json()) as any;
      console.log(`4. Total companies returned: ${companiesJson.count}`);

      // Query /api/v1/predictions/AAPL
      const aaplPredRes = await fetch('http://localhost:3001/api/v1/predictions/AAPL');
      const aaplPredJson = (await aaplPredRes.json()) as any;
      console.log('5. AAPL Prediction Scenarios:');
      console.log('   - Ideal Target USD:', aaplPredJson.data.idealBestCaseScenario.targetPriceUnderlyingUsd);
      console.log('   - Ideal Target CEDEAR ARS: $', aaplPredJson.data.idealBestCaseScenario.targetPriceCedearArs);
      console.log('   - Real Target USD:', aaplPredJson.data.realSustainableBaseCaseScenario.targetPriceUnderlyingUsd);
      console.log('   - Real Target CEDEAR ARS: $', aaplPredJson.data.realSustainableBaseCaseScenario.targetPriceCedearArs);
      console.log('   - Recommendation:', aaplPredJson.data.recommendation);

      // Test Qualitative Analysis /api/v1/analysis/qualitative/MELI
      const meliAnalysisRes = await fetch('http://localhost:3001/api/v1/analysis/qualitative/MELI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarter: '2024-Q3',
          transcriptEarningsCall: 'MercadoLibre achieved record fintech revenue growth with strong credit portfolio expansion and margin gains.',
          guidanceText: 'Management targets continued expansion across Brazil and Mexico.'
        })
      });
      const meliAnalysisJson = (await meliAnalysisRes.json()) as any;
      console.log('6. MELI Qualitative Sentiment:', meliAnalysisJson.data.sentimentClassification, 'Score:', meliAnalysisJson.data.overallSentimentScore);

      // Re-calculate MELI prediction after soft data
      const meliPredRes = await fetch('http://localhost:3001/api/v1/predictions/MELI');
      const meliPredJson = (await meliPredRes.json()) as any;
      console.log('7. MELI Updated Scenarios with Soft Data:');
      console.log('   - Ideal CEDEAR ARS: $', meliPredJson.data.idealBestCaseScenario.targetPriceCedearArs);
      console.log('   - Real CEDEAR ARS: $', meliPredJson.data.realSustainableBaseCaseScenario.targetPriceCedearArs);
      console.log('   - Risk Discount Applied: %', meliPredJson.data.realSustainableBaseCaseScenario.appliedRiskDiscountPercentage);

      console.log('✅ ALL SMOKE TESTS PASSED!');
    } catch (err) {
      console.error('Smoke test failed:', err);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

runSmokeTest();
