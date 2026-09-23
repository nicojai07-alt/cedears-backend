# CEDEARs Valuation & Predictive Platform

Plataforma integral de análisis fundamental cuantitativo, análisis cualitativo con Inteligencia Artificial (Google Gemini) y motor predictivo de escenarios duales (**Best-Case Ideal** vs. **Base-Case Conservador Sostenible**) para los **50 CEDEARs** de mayor liquidez en BYMA (Bolsas y Mercados Argentinos).

El sistema incluye:
1. **API REST Modular** bajo Arquitectura Hexagonal (*Ports & Adapters*) en TypeScript.
2. **Dashboard Visual Interactivo** con Chart.js servido en `/` y `/dashboard`.
3. **Documentación Swagger UI** interactiva en `/api/docs`.

---

## 1. Acceso Rápido a la Plataforma

* **Dashboard Visual Principal**: `http://localhost:3000/` o `http://localhost:3000/dashboard`
* **Swagger UI (OpenAPI 3.0)**: `http://localhost:3000/api/docs`
* **Healthcheck del Servicio**: `http://localhost:3000/health`
* **Screener Masivo (50 CEDEARs)**: `http://localhost:3000/api/v1/predictions/batch?sortBy=real_upside&order=desc`

---

## 2. Separación Conceptual: Datos Reales vs. Datos Ideales

La plataforma desglosa la valuación de cada empresa en dos universos claramente diferenciados:

### A. Sección de Datos Reales (Mercado Actual & Base-Case Conservador)
Representa la realidad observada del mercado y una valuación prudente basada en riesgos tangibles:
* **Cotización Actual (USD)**: Precio de la acción subyacente en NYSE/NASDAQ.
* **Cotización Actual CEDEAR (ARS)**: Precio de cotización en el mercado local argentino.
* **Ratio de Conversión Oficial BYMA**: Cantidad de CEDEARs equivalentes a 1 acción subyacente (ej. AAPL 10:1, MELI 120:1, NVDA 24:1, BMA 10:1).
* **CCL Implícito**: Tipo de cambio Contado con Liquidación resultante de la relación entre el precio local en ARS y el subyacente en USD:
  $$\text{CCL Implícito} = \frac{\text{Precio CEDEAR (ARS)} \times \text{Ratio CEDEAR}}{\text{Precio Subyacente (USD)}}$$
* **Precio Objetivo Real (USD & ARS)**: Valor intrínseco calculado mediante Flujo de Fondos Descontados (DCF), penalizado por:
  - Fricciones de mercado y presiones de costos.
  - Prima de riesgo cambiario e inflación en CEDEARs (WACC ajustado al 9.5% - 11.5%).
  - Factor de descuento cualitativo proveniente del análisis de IA (10% a 35%).
* **Potencial de Suba Real (% / Upside)**: Porcentaje de apreciación estimado bajo condiciones conservadoras y sostenibles.

### B. Sección de Datos Ideales (Best-Case Teórico)
Representa el valor razonable teórico en un escenario óptimo sin fricciones:
* **Cumplimiento al 100% del Guidance**: Se asume ejecución perfecta de las metas de crecimiento de ingresos y márgenes dadas por el management.
* **WACC Eficiente (8.5%)**: Tasa de descuento teórica de referencia para empresas líderes sin prima por fricciones operativas.
* **Descuento de Riesgo (0%)**: Sin penalizaciones por incertidumbre cualitativa.
* **Precio Objetivo Ideal (USD & ARS)**: Techo teórico de valuación.
* **Potencial Máximo Ideal (%)**: Rendimiento potencial en caso de que la compañía supere ampliamente las expectativas.
* **Brecha de Incertidumbre (Spread %)**: Dispersión entre el valor ideal y el valor conservador real. Cuanto mayor es esta brecha, mayor es la incertidumbre del negocio.

---

## 3. Guía de Uso del Dashboard y Gráficos Comparativos

El panel visual interactivo incorpora herramientas analíticas para evaluar múltiples activos de manera simultánea:

### 1. Barra de Filtros Dinámicos
* **Búsqueda por Ticker / Empresa**: Filtra al instante entre las 50 compañías (ej. `AAPL`, `MercadoLibre`, `BMA`, `NVDA`).
* **Filtro por Sector Económico**: Segmenta por *Technology*, *Financial*, *Energy*, *Consumer Cyclical*, *Healthcare*, etc.
* **Filtro por Recomendación**: Filtra activos categorizados como `STRONG_BUY`, `BUY`, `HOLD`, `SELL` o `STRONG_SELL`.
* **Ventana Temporal (1 a 5 años)**: Ajusta el horizonte de proyección del modelo DCF y actualiza los gráficos temporales.
* **Slider de Upside Mínimo**: Permite aislar oportunidades que presenten rendimientos superiores a un umbral determinado (ej. > +20%).

### 2. Interpretación de los Gráficos Interactivos (Chart.js)
* **Gráfico 1: Barras Comparativas de Precios (ARS / USD)**
  - Compara visualmente el **Precio Actual** (gris), el **Precio Real Sostenible** (verde esmeralda) y el **Precio Ideal** (violeta).
  - Incluye un selector de divisa para alternar entre pesos argentinos (ARS) y dólares (USD).
* **Gráfico 2: Proyección Temporal de Flujo de Fondos (FCF de 1 a 5 años)**
  - Muestra la trayectoria año a año del Free Cash Flow proyectado en millones de USD.
  - La curva verde representa el flujo sostenible y la curva violeta el escenario ideal de guidance.
* **Gráfico 3: Matriz de Inversión (Dispersión Riesgo vs. Retorno)**
  - **Eje X (Horizontal)**: Factor de Descuento de Riesgo Cualitativo (%).
  - **Eje Y (Vertical)**: Potencial de Suba Real Sostenible (%).
  - **Interpretación**: Los activos situados en el **cuadrante superior izquierdo** representan las oportunidades más atractivas (alto potencial de suba con bajo riesgo cualitativo).
  - Al hacer clic en cualquier punto del gráfico de dispersión, el panel se sincroniza automáticamente con ese CEDEAR.

### 3. Modal de Análisis Cualitativo con Inteligencia Artificial
* Haz clic en el botón superior **"Analizar con IA"**.
* Selecciona cualquier CEDEAR y pega un extracto de una llamada de resultados (*Earnings Call*) o noticias.
* El sistema invocará el puerto de IA (Google Gemini / motor semántico de contingencia), calculará el nuevo puntaje de sentimiento y recalculará la valuación y el precio objetivo del CEDEAR en tiempo real.

---

## 4. Guía de Consumo de la API REST

La API expone endpoints estándar documentados bajo la especificación OpenAPI 3.0:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/health` | Chequeo de estado del servicio y latencia |
| `GET` | `/api/docs` | Interfaz interactiva de Swagger UI |
| `GET` | `/api/v1/companies` | Listado de las 50 empresas con ratios BYMA |
| `GET` | `/api/v1/companies/:ticker` | Agregado financiero completo de un CEDEAR |
| `GET` | `/api/v1/predictions/batch` | Screener de 50 CEDEARs ordenados por Upside |
| `GET` | `/api/v1/predictions/:ticker` | Valuación dual proyectada para un ticker |
| `POST` | `/api/v1/analysis/qualitative/:ticker` | Envío de texto de Earnings Call a la IA |
| `POST` | `/api/v1/ingestion/sync` | Sincronización manual de balances contables |

### Ejemplos de Uso con cURL:

#### Consultar Screener de Oportunidades:
```bash
curl -X GET "http://localhost:3000/api/v1/predictions/batch?sortBy=real_upside&order=desc"
```

#### Consultar Predicción Dual de un CEDEAR (ej. MercadoLibre):
```bash
curl -X GET "http://localhost:3000/api/v1/predictions/MELI"
```

#### Enviar Earnings Call para Análisis de IA:
```bash
curl -X POST "http://localhost:3000/api/v1/analysis/qualitative/MELI" \
     -H "Content-Type: application/json" \
     -d '{
       "quarter": "2024-Q3",
       "transcriptEarningsCall": "Record revenues driven by commerce and fintech expansion with expanding margins.",
       "guidanceText": "Management expects operating income to increase 20% next fiscal year."
     }'
```

---

## 5. Instalación y Ejecución Local

### Prerrequisitos:
* **Node.js**: v20+ o v22+ LTS instalado.
* **npm**: v10+ o superior.

### Pasos:
```bash
# 1. Clonar el repositorio
git clone https://github.com/nicojai07-alt/cedears-backend.git
cd cedears-backend

# 2. Instalar dependencias
npm install

# 3. Ejecutar pruebas unitarias
npm test

# 4. Compilar TypeScript
npm run build

# 5. Iniciar el servidor
npm start
```
Abrir el navegador en `http://localhost:3000`.

---

## 6. Despliegue en Render (Web Service)

El proyecto cuenta con el archivo de infraestructura como código [`render.yaml`](./render.yaml).

### Configuración Automática en Render:
1. En [dashboard.render.com](https://dashboard.render.com), selecciona **New +** > **Blueprint** (o **Web Service**).
2. Vincula el repositorio `nicojai07-alt/cedears-backend`.
3. Render aplicará la configuración:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. En **Environment Variables**, puedes configurar de forma opcional:
   - `GEMINI_API_KEY`: Tu clave de Google AI Studio si deseas llamadas reales a Gemini.
   - `FINANCIAL_API_KEY`: Clave de Financial Modeling Prep si deseas balances externos en vivo.

El servicio estará disponible en pocos minutos con el Dashboard y Swagger activos.
