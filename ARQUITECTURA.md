# ARQUITECTURA TECNICA — Cotizador Inteligente

---

## 1. Vision General del Proyecto

El **Cotizador Inteligente** es una aplicacion web interna disenada para talleres de productos personalizados (grabado laser, sublimacion, DTF, UV DTF, vinil y resina). Su proposito es calcular automaticamente el **costo real de produccion** y generar **tres niveles de precio de venta** (minimo, recomendado, premium) en tiempo real, eliminando el calculo manual y la mezcla de costos con precios.

### Stack tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Runtime | Next.js (App Router) | 15.x |
| UI | React 19, Tailwind CSS 4 | — |
| Lenguaje | TypeScript 5.7+ | — |
| ORM / DB | Prisma 6.5+, SQLite | — |
| Pruebas | Vitest 3.x | — |
| IA (opcional) | OpenAI, Gemini, Ollama | — |

### Rutas principales

| Ruta | Funcion |
|------|---------|
| `/cotizar` | Formulario principal con calculo en vivo |
| `/configuracion` | Editor de margenes, redondeo y costos por tecnica |
| `/historial` | Lista de cotizaciones guardadas |
| `/historial/[id]` | Detalle y snapshot de una cotizacion |

---

## 2. Arquitectura del Sistema

### 2.1 Separacion estricta: COSTO REAL vs. PRECIO DE VENTA

El principio fundacional es que **el costo real nunca se mezcla con el precio de venta**. La interfaz los muestra en paneles separados:

- **Costo real**: lo que le cuesta producir una pieza (producto base + maquina + preparacion + mano de obra + mantenimiento + electricidad + desperdicio + segundos extra). Se muestra internamente y **nunca se comparte con el cliente**.
- **Precio de venta**: el costo real multiplicado por `(1 + margen%)`, con descuento por volumen y redondeo aplicado.

```
COSTO REAL ──► x (1 + margen%) ──► - descuento volumen ──► redondeo ──► PRECIO DE VENTA
```

### 2.2 Estructura de carpetas

```
src/
├── app/                        # App Router — paginas y API routes
│   ├── api/
│   │   ├── quotes/             # CRUD de cotizaciones
│   │   ├── settings/           # GET/PUT configuracion global
│   │   ├── techniques/         # GET/PUT tecnicas
│   │   └── vision/             # Analisis de imagenes con IA
│   ├── configuracion/          # Pagina de configuracion
│   ├── cotizar/                # Pagina principal de cotizacion
│   └── historial/              # Listado y detalle de cotizaciones
├── components/
│   ├── cotizador/              # Componentes de la interfaz de cotizacion
│   │   ├── quote-studio.tsx    # Formulario principal + calculo en vivo
│   │   ├── results-panel.tsx   # Panel de costo real + tarjetas de precio
│   │   └── design-analyzer.tsx # Upload de imagen + analisis IA
│   └── ui/primitives.tsx       # Componentes base (Card, Button, Input, etc.)
├── lib/
│   ├── pricing/                # Motor de precios (puro, sin dependencias UI)
│   │   ├── engine.ts           # calculateQuote() — funcion principal
│   │   ├── types.ts            # Todas las interfaces de pricing
│   │   ├── rounding.ts         # Logica de redondeo
│   │   ├── volume.ts           # Descuentos por volumen
│   │   └── __tests__/          # Pruebas unitarias
│   ├── vision/                 # Abstraccion de IA para analisis de imagenes
│   │   ├── factory.ts          # Seleccion del proveedor
│   │   ├── prompts.ts          # System prompt para la IA
│   │   ├── types.ts            # VisionProvider interface
│   │   ├── validate.ts         # Parsing y validacion de respuestas
│   │   └── providers/          # OpenAI, Gemini, Ollama, Null
│   ├── server/queries.ts       # Consultas a BD + defaults
│   ├── db.ts                   # Singleton de PrismaClient
│   ├── env.ts                  # Lector de variables de entorno
│   ├── format.ts               # formatMoney, formatDate
│   ├── client-types.ts         # DTOs enviados al browser
│   └── snapshot.ts             # Interfaz QuoteSnapshot
prisma/
├── schema.prisma               # Esquema de BD
├── seed.ts                     # Datos iniciales
└── migrations/                 # Migraciones de Prisma
```

### 2.3 Motor puro de precios (`PricingEngine`)

La funcion `calculateQuote()` en `src/lib/pricing/engine.ts` es una **funcion pura**: recibe datos de entrada y retorna el resultado, sin efectos secundarios, sin acceso a BD, sin dependencias de React.

```ts
export function calculateQuote(
  input: QuoteInput,
  config: PricingConfig,
  margins: MarginConfig,
  rounding: RoundingConfig,
): QuoteResult
```

Esto permite:
- Ejecutarse tanto en el **server** (al guardar cotizacion) como en el **client** (calculo en vivo en el formulario).
- Ser testeable con Vitest sin mocks ni bases de datos.
- Ser serializable y snapshot-able.

### 2.4 Patron Strategy para Vision IA (`VisionProvider`)

El analisis de imagenes usa un patron Strategy que abstrae el proveedor de IA detras de una interfaz comun:

```ts
interface VisionProvider {
  readonly name: string;
  isConfigured(): boolean;
  analyze(input: VisionInput): Promise<VisionAnalysis>;
}
```

| Proveedor | Clase | Modelo por defecto |
|-----------|-------|--------------------|
| OpenAI | `OpenAIVisionProvider` | `gpt-4o-mini` |
| Google Gemini | `GeminiVisionProvider` | `gemini-2.0-flash` |
| Ollama (local) | `OllamaVisionProvider` | `llava` |
| Manual | `NullVisionProvider` | — |

La seleccion se realiza en `src/lib/vision/factory.ts` mediante la variable `VISION_PROVIDER` (o deteccion automatica por API keys disponibles). Si ningun proveedor esta configurado, se usa `NullVisionProvider` que lanza `VisionUnavailableError` y la UI muestra un fallback para analisis manual.

### 2.5 Inmutabilidad mediante Snapshots

Cada cotizacion guardada contiene un campo `snapshot` (JSON) que captura **el estado completo del calculo en el momento de la creacion**:

```ts
interface QuoteSnapshot {
  version: 1;
  savedAt: string;
  currency: string;
  technique: { slug: string; name: string };
  input: QuoteInput;
  config: PricingConfig;
  margins: MarginConfig;
  rounding: RoundingConfig;
  result: QuoteResult;
  visionAnalysis: VisionAnalysis | null;
}
```

Esto garantiza que si se modifican los costos o margenes en `/configuracion` **despues** de guardar una cotizacion, el historial mantiene los valores exactos que se usaron en ese momento. Las cotizaciones pasadas no cambian.

---

## 3. Motor de Costos y Formulas de Calculo

### 3.1 Formula del Costo Real

El costo real unitario se calcula sumando las siguientes partidas:

```
Costo Real = Producto Base
           + (Min. Maquina x Costo/Min Maquina)
           + Costo Preparacion/Diseño
           + Mano de Obra
           + Mantenimiento Amortizado
           + Electricidad
           + Desperdicio
           + Segundos Extra de Grabado
```

Detalle de cada partida:

| Partida | Formula | Descripcion |
|---------|---------|-------------|
| **Producto base** | `baseProductCost` | Costo del material/objeto a personalizar |
| **Maquina** | `machineMinutes x machineCostPerMinute` | Tiempo de uso x costo por minuto |
| **Preparacion** | `prepOption.cost` | Costo fijo segun tipo (archivo listo, limpieza, vectorizacion, diseno) |
| **Mano de obura** | `laborRatePerHour x (laborMinutes / 60)` | Costo fijo por pieza |
| **Mantenimiento** | `(maintenanceMonthlyCost / maintenanceMonthlyHours) x (machineMinutes / 60)` | Amortizado proporcional al tiempo de maquina |
| **Electricidad** | `electricityKw x (machineMinutes / 60) x costPerKwh` | Consumo proporcional |
| **Desperdicio** | `baseProductCost x (wastePercentOverMaterials / 100)` | Porcentaje sobre el producto base |
| **Segundos extra** | `max(0, totalEngravedSeconds - includedSeconds) x costPerSecond` | Solo si excede el tiempo incluido |

**Ejemplo con defaults USD:**
- Producto base: $10.00
- Maquina: 15 min x $0.12/min = $1.80
- Preparacion: Archivo listo = $0.00
- Mano de obra: $4.50/h x (5/60) = $0.38
- Mantenimiento: ($15.00/80h) x (15/60) = $0.47
- Electricidad: 0.06kW x (15/60) x $0.10/kWh = $0.015
- Desperdicio: $10.00 x 3% = $0.30
- Segundos extra: 0 (dentro de 180s incluidos)
- **Costo real = $12.97**

### 3.2 Aplicacion de margenes

El precio de venta para cada nivel se calcula asi:

```
Precio unitario = Costo Real x (1 + margen%)
```

| Nivel | Margen default | Uso |
|-------|---------------|-----|
| Minimo | 35% | Piso de venta, margen minimo aceptable |
| Recomendado | 60% | Precio estandar |
| Premium | 90% | Alto valor, urgente, trabajo complejo |

### 3.3 Reglas de redondeo

Despues de calcular el precio con margen y antes de mostrarlo, se aplica la politica de redondeo configurada:

| Modo | Comportamiento |
|------|---------------|
| `none` | Sin redondeo, solo 2 decimales |
| `up` | `Math.ceil(precio / paso) x paso` — siempre redondea hacia arriba |
| `nearest` | `Math.round(precio / paso) x paso` — al mas cercano |

El **paso** default es `0.25` (cuartos de dolar). Ejemplo: $21.73 con paso 0.25 y modo `up` → $22.00.

### 3.4 Descuentos por volumen

Se determina el nivel aplicable filtrando por cantidad minima y tomando el mayor:

```ts
function resolveVolumeDiscount(quantity: number, tiers: VolumeDiscountTier[]): number
```

| Cantidad minima | Descuento |
|----------------|-----------|
| 10 | 5% |
| 25 | 10% |
| 50 | 15% |

El descuento se aplica **antes** del redondeo:

```
Precio con descuento = Precio con margen x (1 - descuento%)
Precio redondeado = applyRounding(Precio con descuento, config)
```

---

## 4. Modelo de Datos y Persistencia (Prisma / SQLite)

### 4.1 Esquema de la base de datos

```
┌──────────────────┐       ┌─────────────────────┐
│    Technique      │       │    GlobalSettings    │
├──────────────────┤       ├─────────────────────┤
│ id        String │       │ id        String PK  │
│ slug      String │ unique│ currency  String     │
│ name      String │       │ margins   Json       │
│ active    Boolean│       │ rounding  Json       │
│ config    Json   │       │ updatedAt DateTime   │
│                   │       └─────────────────────┘
└───────┬──────────┘
        │ 1
        │
        │ N
┌───────┴──────────┐
│      Quote        │
├──────────────────┤
│ id         String│ unique
│ folio      String│ unique
│ clientName String│ nullable
│ productName String│
│ quantity   Int   │
│ snapshot   Json  │
│ createdAt  DateTime│
│ techniqueId String│ FK → Technique.id
└──────────────────┘
```

### 4.2 Entidades

**Technique** — Cada tecnica de personalizacion (grabado laser, sublimacion, DTF, etc.) tiene su propia configuracion de costos almacenada como JSON en el campo `config`. Solo una tecnica puede estar activa a la vez en el formulario de cotizacion.

**GlobalSettings** — Singleton (un solo registro con `id: "singleton"`) que almacena la moneda, los margenes globales y la politica de redondeo.

**Quote** — Cada cotizacion guardada. El campo `snapshot` contiene el estado completo del calculo al momento de crearla (ver seccion 2.5).

### 4.3 Snapshot de cotizacion

El snapshot es un documento JSON autocontenido que incluye:

- Datos de entrada del usuario (`input`)
- Configuracion de la tecnica usada (`config`)
- Margenes y redondeo vigentes (`margins`, `rounding`)
- Resultado completo del calculo (`result`)
- Analisis de vision IA si se uso (`visionAnalysis`)
- Metadatos (`version`, `savedAt`, `currency`, `technique`)

Esto garantiza la **integridad historica**: una cotizacion guardada siempre refleja los valores que se calcularon, sin importar cambios futuros en la configuracion.

---

## 5. Guia de Configuracion y Ejecucion

### 5.1 Instalacion

```bash
# 1. Instalar dependencias
npm install

# 2. Generar cliente de Prisma
npx prisma generate

# 3. Aplicar migraciones y crear la BD
npx prisma migrate dev

# 4. Sembrar datos iniciales
npm run db:seed
```

### 5.2 Variables de entorno (`.env`)

Copiar `.env.example` a `.env` y configurar:

```env
# Base de datos SQLite
DATABASE_URL="file:./dev.db"

# Proveedor de vision IA (none | openai | gemini | ollama | auto)
VISION_PROVIDER="none"

# OpenAI (opcional)
OPENAI_API_KEY=""
OPENAI_VISION_MODEL="gpt-4o-mini"

# Google Gemini (opcional)
GEMINI_API_KEY=""
GEMINI_VISION_MODEL="gemini-2.0-flash"

# Ollama local (opcional)
OLLAMA_BASE_URL=""
OLLAMA_VISION_MODEL="llava"
```

Si `VISION_PROVIDER` es `"none"` o esta vacio, el sistema intenta detectar automaticamente por API keys. Si ninguna esta disponible, usa modo manual (`NullVisionProvider`).

### 5.3 Ejecucion

**Opcion A — Script batch (recomendado para Windows):**

Doble clic en `iniciar_cotizador.bat`. Inicia el servidor en el puerto 4000:

```
http://localhost:4000
```

**Opcion B — Terminal:**

```bash
npm run dev -- -p 4000
```

### 5.4 Pruebas unitarias

```bash
# Ejecutar una vez
npm test

# Modo observacion (rerun al guardar)
npm run test:watch
```

Las pruebas cubren:
- `engine.test.ts` — Desglose de costo real, aplicacion de margenes, escalado por cantidad, validacion de entradas, inmutabilidad.
- `rounding.test.ts` — Modos `up`, `nearest`, `none` con diferentes pasos.
- `volume.test.ts` — Resolucion de niveles de descuento.

### 5.5 Comandos utiles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3000 por defecto) |
| `npm run build` | Build de produccion |
| `npm run typecheck` | Verificacion de tipos TypeScript |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run db:push` | Sincronizar esquema sin migracion |
| `npm run db:seed` | Re-sembrar datos iniciales |
| `npx prisma studio` | UI web para inspeccionar la BD |
