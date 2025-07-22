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
  heartRateData: z.string().describe('Resumen de los datos de frecuencia cardíaca.'),
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
  fileName: z.string().optional().describe('El nombre del archivo subido.'),
});
export type ProcessHealthDataFileInput = z.infer<
  typeof ProcessHealthDataFileInputSchema
>;

const WorkoutSchema = z.object({
  date: z.string().describe("La fecha del entrenamiento (ej. 2023-10-27)."),
  name: z.string().describe("El nombre o tipo de entrenamiento (ej. Correr, Ciclismo)."),
  distance: z.number().describe("La distancia del entrenamiento en kilómetros."),
  calories: z.number().describe("Las calorías quemadas durante el entrenamiento."),
  duration: z.number().describe("La duración del entrenamiento en horas."),
  averageHeartRate: z.number().describe("La frecuencia cardíaca promedio durante el entrenamiento en lpm."),
  startTime: z.string().describe("La hora de inicio del entrenamiento (ej. 18:30)."),
  endTime: z.string().describe("La hora de finalización del entrenamiento (ej. 19:30)."),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const HealthDataSchema = z.object({
  averageSleep: z.number().describe('Las horas de sueño promedio.'),
  activeCalories: z.number().describe('Las calorías activas quemadas.'),
  restingHeartRate: z.number().describe('La frecuencia cardíaca en reposo en lpm.'),
  hydrationLiters: z.number().describe('La ingesta de hidratación en litros.'),
  hrv: z.number().describe("La variabilidad de la frecuencia cardíaca (VFC) en ms.").default(0),
  recoveryPercentage: z.number().describe("El porcentaje de recuperación (ej. 85 para 85%).").default(0),
  movePercentage: z.number().describe('El porcentaje del objetivo de movimiento.'),
  exercisePercentage: z.number().describe('El porcentaje del objetivo de ejercicio.'),
  standPercentage: z.number().describe('El porcentaje del objetivo de pararse.'),
  sleepData: z.array(z.object({
    day: z.string().describe("Día de la semana (ej. Lun, Mar)"),
    hours: z.number().describe("Horas de sueño para ese día"),
  })).describe('Datos de sueño de los últimos 7 días.'),
  workouts: z.array(WorkoutSchema).describe("Una lista de los entrenamientos realizados."),
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