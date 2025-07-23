

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

export const WorkoutSchema = z.object({
  date: z.string().describe("La fecha del entrenamiento (YYYY-MM-DD)."),
  type: z.string().describe("El tipo de entrenamiento (ej. Pilates, Fuerza)."),
  duration: z.number().describe("La duración del entrenamiento en minutos.").default(0),
  calories: z.number().describe("Las calorías quemadas durante el entrenamiento.").default(0),
  intensity: z.string().optional().describe("Intensidad del entrenamiento (baja, media, alta)."),
  heartRateAvg: z.number().optional().describe("Frecuencia cardíaca promedio.").default(0),
  startTime: z.string().describe("La hora de inicio del entrenamiento (ej. '18:30:05').").optional().default("00:00:00"),
  endTime: z.string().describe("La hora de finalización del entrenamiento (ej. '19:30:10').").optional().default("00:00:00"),
});
export type Workout = z.infer<typeof WorkoutSchema>;

const MenstrualCycleSchema = z.object({
  phase: z.string().optional().describe("Fase del ciclo (menstrual, folicular, ovulatoria, lútea)."),
  dayOfCycle: z.number().optional().describe("El día actual dentro del ciclo menstrual."),
  symptoms: z.array(z.string()).optional().describe("Síntomas registrados."),
  flow: z.enum(['light', 'medium', 'heavy', 'spotting']).optional().describe("El nivel de sangrado."),
});

export const DailyMetricSchema = z.object({
    date: z.string().describe("Fecha de las métricas (YYYY-MM-DD)."),
    // Sleep
    sleepHours: z.number().optional().default(0),
    remSleepMinutes: z.number().optional().default(0),
    deepSleepMinutes: z.number().optional().default(0),
    lightSleepMinutes: z.number().optional().default(0),
    sleepQualityScore: z.number().optional().default(0),
    // Vitals
    restingHeartRate: z.number().optional().default(0),
    hrv: z.number().optional().default(0),
    respirationRate: z.number().optional().default(0),
    // Activity
    hydrationLiters: z.number().optional().default(0),
    activeCalories: z.number().optional().default(0),
    movePercentage: z.number().optional().default(0),
    standHours: z.number().optional().default(0),
    steps: z.number().optional().default(0),
    distance: z.number().optional().default(0),
    // Wellness
    energyLevel: z.number().optional().default(0),
    recoveryPercentage: z.number().optional().default(0),
    // Menstrual Cycle (embedded)
    menstrualCycle: MenstrualCycleSchema.optional(),
});
export type DailyMetric = z.infer<typeof DailyMetricSchema>;


export const ProcessHealthDataFileOutputSchema = z.object({
  summary: z
    .string()
    .describe('Un resumen completo de los datos de salud del archivo proporcionado.'),
  dailyMetrics: z.record(z.string(), DailyMetricSchema).describe("Un objeto con métricas diarias, donde cada clave es una fecha 'YYYY-MM-DD'."),
  workouts: z.array(WorkoutSchema).describe("Una lista de los entrenamientos extraídos del archivo.").default([]),
});
export type ProcessHealthDataFileOutput = z.infer<
  typeof ProcessHealthDataFileOutputSchema
>;

// Combined data structure for the dashboard state
export type DashboardData = {
    workouts: Workout[];
    dailyMetrics: DailyMetric[];
};


// Legacy schemas, can be removed later
export const SleepEntrySchema = z.object({
    date: z.string().describe("Fecha de la sesión de sueño (YYYY-MM-DD)."),
    totalSleep: z.number().describe("Duración total del sueño en horas.").default(0),
    deepSleep: z.number().describe("Horas de sueño profundo.").default(0),
    lightSleep: z.number().describe("Horas de sueño ligero.").default(0),
    remSleep: z.number().describe("Horas de sueño REM.").default(0),
    awake: z.number().describe("Tiempo despierto en horas.").default(0),
    quality: z.number().describe("Puntuación de calidad del sueño (%).").default(0),
    readiness: z.number().describe("Puntuación de preparación/energía (%).").optional().default(0),
    restingHeartRate: z.number().describe('La frecuencia cardíaca en reposo en lpm.').optional().default(0),
    hrv: z.number().describe("La variabilidad de la frecuencia cardíaca (VFC) en ms.").optional().default(0),
    respiration: z.number().describe("La frecuencia respiratoria promedio en rpm.").optional().default(0),
});
export type SleepEntry = z.infer<typeof SleepEntrySchema>;

export const MenstrualCycleDataSchema = z.object({
    date: z.string().describe("La fecha del registro (YYYY-MM-DD)."),
    flow: z.enum(['light', 'medium', 'heavy', 'spotting']).describe("El nivel de sangrado.").optional(),
    symptoms: z.array(z.string()).describe("Una lista de síntomas registrados.").default([]),
});
export type MenstrualCycleData = z.infer<typeof MenstrualCycleDataSchema>;


export const CalculatedCycleDataSchema = z.object({
    currentPhase: z.string().describe("La fase del ciclo menstrual (ej. Folicular, Lútea, Menstruación).").default("No disponible"),
    currentDay: z.number().describe("El día actual dentro del ciclo menstrual.").default(0),
    symptoms: z.array(z.string()).describe("Una lista de síntomas registrados.").default([]),
});
export type CalculatedCycleData = z.infer<typeof CalculatedCycleDataSchema>;
