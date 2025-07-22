

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

const WorkoutSchema = z.object({
  date: z.string().describe("La fecha del entrenamiento (ej. 2023-10-27)."),
  name: z.string().describe("El nombre o tipo de entrenamiento (ej. Correr, Ciclismo)."),
  distance: z.number().describe("La distancia del entrenamiento en kilómetros.").default(0),
  calories: z.number().describe("Las calorías quemadas durante el entrenamiento.").default(0),
  duration: z.string().describe("La duración del entrenamiento en formato hh:mm:ss.").default("00:00:00"),
  averageHeartRate: z.number().describe("La frecuencia cardíaca promedio durante el entrenamiento en lpm.").default(0),
  startTime: z.string().describe("La hora de inicio del entrenamiento (ej. '18:30:05').").default("00:00:00"),
  endTime: z.string().describe("La hora de finalización del entrenamiento (ej. '19:30:10').").default("00:00:00"),
});
export type Workout = z.infer<typeof WorkoutSchema>;

const SleepEntrySchema = z.object({
    day: z.string().describe("Día de la semana (ej. Lun, Mar) o fecha (YYYY-MM-DD)"),
    hours: z.number().describe("Horas de sueño para ese día"),
});
export type SleepEntry = z.infer<typeof SleepEntrySchema>;

const MenstrualCycleDataSchema = z.object({
    currentPhase: z.string().describe("La fase actual del ciclo menstrual (ej. Folicular, Lútea, Menstruación).").default("No disponible"),
    currentDay: z.number().describe("El día actual dentro del ciclo menstrual.").default(0),
    symptoms: z.array(z.string()).describe("Una lista de síntomas registrados.").default([]),
});
export type MenstrualCycleData = z.infer<typeof MenstrualCycleDataSchema>;

export const HealthDataSchema = z.object({
  averageSleep: z.number().describe('Las horas de sueño promedio.').default(0),
  activeCalories: z.number().describe('Las calorías activas quemadas.').default(0),
  restingHeartRate: z.number().describe('La frecuencia cardíaca en reposo en lpm.').default(0),
  hydrationLiters: z.number().describe('La ingesta de hidratación en litros.').default(0),
  hrv: z.number().describe("La variabilidad de la frecuencia cardíaca (VFC) en ms.").default(0),
  recoveryPercentage: z.number().describe("El porcentaje de recuperación (ej. 85 para 85%).").default(0),
  respiration: z.number().describe("La frecuencia respiratoria promedio en respiraciones por minuto (rpm).").default(0),
  energyLevel: z.number().describe("El nivel de energía estimado (%).").default(0),
  menstrualCycleData: MenstrualCycleDataSchema.describe("Datos detallados sobre el ciclo menstrual actual.").default({ currentPhase: "No disponible", currentDay: 0, symptoms: [] }),
  movePercentage: z.number().describe('El porcentaje del objetivo de movimiento.').default(0),
  exercisePercentage: z.number().describe('El porcentaje del objetivo de ejercicio.').default(0),
  standPercentage: z.number().describe('El porcentaje del objetivo de pararse.').default(0),
  sleepData: z.array(SleepEntrySchema).describe('Datos de sueño de los últimos 7 días.').default([]),
  workouts: z.array(WorkoutSchema).describe("Una lista de los entrenamientos realizados.").default([]),
});
export type HealthData = z.infer<typeof HealthDataSchema>;


export const ProcessHealthDataFileOutputSchema = z.object({
  summary: z
    .string()
    .describe('Un resumen completo de los datos de salud del archivo proporcionado.'),
  healthData: HealthDataSchema.describe("Datos de salud estructurados extraídos del archivo."),
});
export type ProcessHealthDataFileOutput = z.infer<
  typeof ProcessHealthDataFileOutputSchema
>;
