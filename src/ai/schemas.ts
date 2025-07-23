/**
 * @fileOverview Defines the Zod schemas and TypeScript types for the AI flows.
 * This file centralizes all schema definitions to avoid "use server" conflicts
 * and improve reusability.
 */

import {z} from 'genkit';

// Schemas for: src/ai/flows/ai-health-summary.ts
export const HealthSummaryInputSchema = z.object({
  periodo: z.string().describe('El período de tiempo para el informe (ej. Diario, Semanal, Mensual).'),
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

export const SleepDataSchema = z.object({
    date: z.string().describe("Fecha de las métricas (YYYY-MM-DD)."),
    bedtime: z.string().optional().describe("Hora de dormir."),
    wakeUpTime: z.string().optional().describe("Hora de despertarse."),
    inBedTime: z.string().optional().describe("Tiempo en cama."),
    sleepTime: z.string().optional().describe("Tiempo dormido."),
    awakenings: z.number().optional().describe("Número de despertares.").default(0),
    deepSleepTime: z.string().optional().describe("Tiempo de sueño profundo."),
    quality: z.string().optional().describe("Calidad del sueño (ej. '95%')."),
    efficiency: z.string().optional().describe("Eficiencia del sueño (ej. '98%')."),
    avgHeartRate: z.number().optional().describe("HR promedio dormido (LPM).").default(0),
    hrv: z.number().optional().describe("VFC dormido (ms).").default(0),
    respiratoryRate: z.number().optional().describe("Respiración media.").default(0),
    SPO2: z.object({
        avg: z.string().optional(),
        min: z.string().optional(),
        max: z.string().optional(),
    }).optional(),
    apnea: z.string().optional().describe("Detección de apnea."),
    notes: z.string().optional().describe("Notas sobre el sueño."),
});
export type SleepData = z.infer<typeof SleepDataSchema>;

export const WorkoutDataSchema = z.object({
    date: z.string().describe("Fecha del entrenamiento (YYYY-MM-DD)."),
    type: z.string().optional().describe("Tipo de entrenamiento."),
    startTime: z.string().optional().describe("Hora de inicio."),
    endTime: z.string().optional().describe("Hora de fin."),
    duration: z.string().optional().describe("Duración en minutos."),
    avgHeartRate: z.number().optional().describe("FC media.").default(0),
    minHeartRate: z.number().optional().describe("FC mínima.").default(0),
    maxHeartRate: z.number().optional().describe("FC máxima.").default(0),
    zone1Percent: z.string().optional().describe("Porcentaje en Zona 1."),
    zone2Percent: z.string().optional().describe("Porcentaje en Zona 2."),
    zone3Percent: z.string().optional().describe("Porcentaje en Zona 3."),
    zone4Percent: z.string().optional().describe("Porcentaje en Zona 4."),
    rpe: z.number().optional().describe("Percepción del esfuerzo (RPE).").default(0),
    load: z.number().optional().describe("Carga del entrenamiento.").default(0),
    calories: z.number().optional().describe("Calorías totales.").default(0),
    distance: z.number().optional().describe("Distancia en km.").default(0),
    avgPace: z.string().optional().describe("Ritmo medio."),
    notes: z.string().optional().describe("Notas del entrenamiento."),
});
export type WorkoutData = z.infer<typeof WorkoutDataSchema>;

export const VitalsDataSchema = z.object({
    date: z.string().describe("Fecha de las métricas (YYYY-MM-DD)."),
    sleepingHRV: z.number().optional().describe("HRV al dormir.").default(0),
    wakingHRV: z.number().optional().describe("HRV al despertar.").default(0),
    dailyAvgHeartRate: z.number().optional().describe("HR promedio diario.").default(0),
    sedentaryAvgHeartRate: z.number().optional().describe("HR sedentario.").default(0),
    wakingGlucose: z.number().optional().describe("Glucosa al despertar.").default(0),
    dailyAvgGlucose: z.number().optional().describe("Glucosa media diaria.").default(0),
    minGlucose: z.number().optional().describe("Glucosa mínima.").default(0),
    maxGlucose: z.number().optional().describe("Glucosa máxima.").default(0),
    bodyTemperature: z.number().optional().describe("Temperatura corporal.").default(0),
    morningBP: z.string().optional().describe("Presión arterial (mañana)."),
    eveningBP: z.string().optional().describe("Presión arterial (tarde)."),
    dailySPO2: z.string().optional().describe("SpO2 diaria."),
    sleepSPO2: z.string().optional().describe("SpO2 al dormir."),
    restingHeartRate: z.number().optional().describe("LPM en reposo.").default(0),
    postWorkoutRecovery: z.number().optional().describe("Recuperación post-ejercicio (2min).").default(0),
    weight: z.number().optional().describe("Peso.").default(0),
    waistCircumference: z.number().optional().describe("Medida de cintura.").default(0),
    bodyFatPercentage: z.number().optional().describe("Porcentaje de grasa corporal.").default(0),
    notes: z.string().optional().describe("Notas sobre vitales."),
});
export type VitalsData = z.infer<typeof VitalsDataSchema>;

export const ProcessHealthDataFileOutputSchema = z.object({
  summary: z.string().describe('Un resumen de 1-2 frases sobre los datos procesados.'),
  sleepData: z.array(SleepDataSchema).optional().describe("Datos de sueño extraídos del archivo."),
  workouts: z.array(WorkoutDataSchema).optional().describe("Datos de entrenamientos extraídos del archivo."),
  vitals: z.array(VitalsDataSchema).optional().describe("Datos de vitales extraídos del archivo."),
});
export type ProcessHealthDataFileOutput = z.infer<
  typeof ProcessHealthDataFileOutputSchema
>;

// Combined data structure for the dashboard state
export type DashboardData = {
    workouts: WorkoutData[];
    sleepData: SleepData[];
    vitals: VitalsData[];
};

export const CalculatedCycleDataSchema = z.object({
    currentPhase: z.string().describe("La fase del ciclo menstrual (ej. Folicular, Lútea, Menstruación).").default("No disponible"),
    currentDay: z.number().describe("El día actual dentro del ciclo menstrual.").default(0),
    symptoms: z.array(z.string()).describe("Una lista de síntomas registrados.").default([]),
});
export type CalculatedCycleData = z.infer<typeof CalculatedCycleDataSchema>;

// Schema for calendar events
export const CalendarEventSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha del evento (YYYY-MM-DD)."),
    type: z.enum(["trabajo", "entrenamiento", "nota", "vacaciones", "descanso"]).describe("Tipo de evento."),
    description: z.string().describe("Descripción o detalle del evento."),
    startTime: z.string().optional().describe("Hora de inicio (HH:mm)."),
    endTime: z.string().optional().describe("Hora de fin (HH:mm)."),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;