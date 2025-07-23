

/**
 * @fileOverview Defines the Zod schemas and TypeScript types for the AI flows.
 * This file centralizes all schema definitions to avoid "use server" conflicts
 * and improve reusability.
 */

import {z} from 'genkit';

// Schemas for: src/ai/flows/ai-health-summary.ts
export const HealthSummaryInputSchema = z.object({
  sleepData: z.string().describe('Resumen de los datos de sueño.'),
  exerciseData: z.string().describe('Resumen de los datos de ejercicio y actividad.'),
  heartRateData: z.string().describe('Resumen de los datos de frecuencia cardíaca, VFC, recuperación, respiración y nivel de energía.'),
  menstruationData: z.string().describe('Resumen de los datos de menstruación.'),
  supplementData: z.string().describe('Resumen de los datos de suplementos.'),
  foodIntakeData: z.string().describe('Resumen de los datos de ingesta de alimentos e hidratación.'),
  calendarData: z.string().describe('Resumen de los datos del calendario.'),
});
export type HealthSummaryInput = z.infer<typeof HealthSummaryInputSchema>;

export const HealthSummaryOutputSchema = z.object({
  summary: z.string().describe('Un informe de salud completo, detallado y bien estructurado en formato markdown.'),
});
export type HealthSummaryOutput = z.infer<typeof HealthSummaryOutputSchema>;


// Schemas for: src/ai/flows/process-health-data-file.ts
export const ProcessHealthDataFileInputSchema = z.object({
  fileContent: z.string().describe('El contenido del archivo de datos de salud (por ejemplo, en formato CSV).'),
  fileName: z.string().optional().describe('El nombre del archivo subido. Úsalo como pista para el tipo de archivo.'),
});
export type ProcessHealthDataFileInput = z.infer<
  typeof ProcessHealthDataFileInputSchema
>;

export const DailyMetricSchema = z.object({
    date: z.string().describe("Fecha de las métricas (YYYY-MM-DD)."),
    sueño_total: z.number().optional().describe("Duración total del sueño en minutos.").default(0),
    sueño_profundo: z.number().optional().describe("Minutos de sueño profundo.").default(0),
    sueño_ligero: z.number().optional().describe("Minutos de sueño ligero.").default(0),
    sueño_rem: z.number().optional().describe("Minutos de sueño REM.").default(0),
    hrv: z.number().optional().describe("HRV (SDNN) en ms.").default(0),
    respiracion: z.number().optional().describe("Tasa de respiración promedio en RPM.").default(0),
    hidratacion: z.number().optional().describe("Ingesta de agua en ml.").default(0),
    pasos: z.number().optional().describe("Número total de pasos.").default(0),
    caloriasActivas: z.number().optional().describe("Calorías activas quemadas.").default(0),
    caloriasBasales: z.number().optional().describe("Calorías basales quemadas.").default(0),
    minutosEnMovimiento: z.number().optional().describe("Minutos totales de ejercicio.").default(0),
    distanciaKm: z.number().optional().describe("Distancia total recorrida en KM.").default(0),
    estadoCiclo: z.string().optional().describe("Estado del ciclo menstrual (ej. menstruacion)."),
    sintomas: z.array(z.string()).optional().describe("Lista de síntomas registrados."),
    notas: z.string().optional().describe("Notas manuales del usuario."),
    restingHeartRate: z.number().optional().describe("Frecuencia cardíaca en reposo (BPM)."),
});
export type DailyMetric = z.infer<typeof DailyMetricSchema>;

export const WorkoutEntrySchema = z.object({
    date: z.string().describe("La fecha del entrenamiento (YYYY-MM-DD)."),
    tipo: z.string().describe("El tipo de entrenamiento (ej. Pilates, Fuerza)."),
    duracion: z.number().describe("La duración del entrenamiento en minutos.").default(0),
    calorias: z.number().describe("Las calorías quemadas durante el entrenamiento.").default(0),
    frecuenciaCardiacaMedia: z.number().optional().describe("Frecuencia cardíaca promedio (BPM).").default(0),
});
export type Workout = z.infer<typeof WorkoutEntrySchema>;

export const ProcessHealthDataFileOutputSchema = z.object({
  summary: z.string().describe('Un resumen de 1-2 frases sobre los datos procesados.'),
  dailyMetrics: z.array(DailyMetricSchema).describe("Una lista de métricas diarias, con una entrada por cada día con datos."),
  workouts: z.array(WorkoutEntrySchema).describe("Una lista de los entrenamientos extraídos del archivo.").default([]),
});
export type ProcessHealthDataFileOutput = z.infer<
  typeof ProcessHealthDataFileOutputSchema
>;


// Combined data structure for the dashboard state
export type DashboardData = {
    workouts: Workout[];
    dailyMetrics: DailyMetric[];
};

export const CalculatedCycleDataSchema = z.object({
    currentPhase: z.string().describe("La fase del ciclo menstrual (ej. Folicular, Lútea, Menstruación).").default("No disponible"),
    currentDay: z.number().describe("El día actual dentro del ciclo menstrual.").default(0),
    symptoms: z.array(z.string()).describe("Una lista de síntomas registrados.").default([]),
});
export type CalculatedCycleData = z.infer<typeof CalculatedCycleDataSchema>;
