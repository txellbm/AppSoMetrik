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
  exerciseData: z.string().describe('Resumen de los datos de ejercicio.'),
  activityData: z.string().describe('Resumen de los datos de actividad diaria.'),
  heartRateData: z.string().describe('Resumen de los datos de frecuencia cardíaca, VFC, recuperación, respiración y nivel de energía.'),
  menstruationData: z.string().describe('Resumen de los datos de menstruación.'),
  supplementData: z.string().describe('Resumen de los datos de suplementos.'),
  foodIntakeData: z.string().describe('Resumen de los datos de ingesta de alimentos e hidratación.'),
  calendarData: z.string().describe('Resumen de los datos del calendario.'),
  mindfulnessData: z.string().describe('Resumen de los datos de estrés y estado de ánimo.'),
  userGoals: z.string().describe('Los objetivos personales del usuario.'),
});
export type HealthSummaryInput = z.infer<typeof HealthSummaryInputSchema>;

export const HealthSummaryOutputSchema = z.object({
  summary: z.string().describe('Un informe de salud completo, detallado y bien estructurado en formato markdown.'),
});
export type HealthSummaryOutput = z.infer<typeof HealthSummaryOutputSchema>;


// Schemas for: Manual Data Entry
export const SleepDataSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha de la sesión de sueño (YYYY-MM-DD)."),
    type: z.enum(["noche", "siesta"]).default("noche").describe("Tipo de sesión de sueño."),
    bedtime: z.string().describe("Hora de dormir (HH:mm)."), // Hora de inicio del sueño
    wakeUpTime: z.string().describe("Hora de despertarse (HH:mm)."), // Hora de finalización del sueño
    sleepTime: z.number().optional().describe("Duración total del sueño (minutos)."),
    timeToFallAsleep: z.number().optional().describe("Tiempo para dormirse (minutos)."),
    timeAwake: z.number().optional().describe("Tiempo despierto (minutos)."),
    efficiency: z.number().optional().describe("Eficiencia del sueño (%)."),
    avgHeartRate: z.number().optional().describe("FC media durante el sueño (lpm)."),
    minHeartRate: z.number().optional().describe("FC mínima durante el sueño (lpm)."),
    maxHeartRate: z.number().optional().describe("FC máxima durante el sueño (lpm)."),
    lpmAlDespertar: z.number().optional().describe("LPM al despertar."),
    vfcAlDormir: z.number().optional().describe("VFC al dormir (ms)."),
    vfcAlDespertar: z.number().optional().describe("VFC al despertar (ms)."),
    respiratoryRate: z.number().optional().describe("Frecuencia respiratoria media durante el sueño (rpm)."),
    phases: z.object({
        deep: z.number().optional().describe("Tiempo en sueño profundo (minutos)."),
        light: z.number().optional().describe("Tiempo en sueño ligero (minutos)."),
        rem: z.number().optional().describe("Tiempo en sueño REM (minutos)."),
    }).optional(),
    notes: z.string().optional().describe("Notas o sensación al despertar."),
});
export type SleepData = z.infer<typeof SleepDataSchema>;


export const WorkoutDataSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha del entrenamiento (YYYY-MM-DD)."),
    type: z.string().describe("Tipo de entrenamiento (ej. Fuerza, Pilates)."),
    startTime: z.string().describe("Hora de inicio (HH:mm)."),
    duration: z.number().describe("Duración en minutos."),
    calories: z.number().optional().describe("Calorías quemadas."),
    avgHeartRate: z.number().optional().describe("FC media."),
    maxHeartRate: z.number().optional().describe("FC máxima."),
    zones: z.object({
        z1: z.number().optional().describe("Minutos en Zona 1."),
        z2: z.number().optional().describe("Minutos en Zona 2."),
        z3: z.number().optional().describe("Minutos en Zona 3."),
        z4: z.number().optional().describe("Minutos en Zona 4."),
        z5: z.number().optional().describe("Minutos en Zona 5."),
    }).optional(),
    notes: z.string().optional().describe("Sensaciones o notas post-entreno."),
});
export type WorkoutData = z.infer<typeof WorkoutDataSchema>;

export const VitalsDataSchema = z.object({
    date: z.string().describe("Fecha de las métricas (YYYY-MM-DD)."),
    recoveryScore: z.number().describe("Puntuación de recuperación del 0 al 100."),
    restingHeartRate: z.number().optional().describe("LPM en reposo.").default(0),
    hrv: z.number().optional().describe("VFC del día (ms).").default(0),
    notes: z.string().optional().describe("Notas sobre vitales."),
});
export type VitalsData = z.infer<typeof VitalsDataSchema>;

export const ActivityDataSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha de la actividad (YYYY-MM-DD)."),
    totalCalories: z.number().optional().describe("Calorías totales quemadas en el día."),
    steps: z.number().optional().describe("Pasos totales del día."),
    activeTime: z.number().optional().describe("Tiempo total activo (en minutos)."),
    avgDayHeartRate: z.number().optional().describe("FC media del día."),
    distance: z.number().optional().describe("Distancia recorrida en kilómetros."),
    standHours: z.number().optional().describe("Horas de pie."),
    restingHeartRate: z.number().optional().describe("FC en reposo o sedentaria (lpm)."),
});
export type ActivityData = z.infer<typeof ActivityDataSchema>;


// Combined data structure for the dashboard state
export type DashboardData = {
    workouts: WorkoutData[];
    sleepData: SleepData[];
    vitals: VitalsData[];
};

export const CalculatedCycleDataSchema = z.object({
    currentPhase: z.string().describe("La fase del ciclo menstrual (ej. Folicular, Lútea, Menstruación).").default("No disponible"),
    currentDay: z.number().describe("El día actual dentro del ciclo menstrual.").default(0),
    sintomas: z.array(z.string()).describe("Una lista de síntomas registrados.").default([]),
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
    // Workout specific data can be nested
    workoutDetails: z.object({
        realStartTime: z.string().optional().describe("Hora de inicio real (HH:mm)."),
        realEndTime: z.string().optional().describe("Hora de fin real (HH:mm)."),
        realDuration: z.string().optional().describe("Duración real en formato hh:mm:ss."),
        activeCalories: z.number().optional().describe("Calorías activas quemadas."),
        totalCalories: z.number().optional().describe("Calorías totales quemadas."),
        avgHeartRate: z.number().optional().describe("FC media."),
        minHeartRate: z.number().optional().describe("FC mínima (lpm)."),
        maxHeartRate: z.number().optional().describe("FC máxima (lpm)."),
        steps: z.number().optional().describe("Pasos durante el entreno."),
        distance: z.number().optional().describe("Distancia recorrida en metros."),
        notes: z.string().optional().describe("Sensaciones o notas post-entreno."),
        zones: z.object({
          extremo: z.number().optional().describe("Minutos en Zona Extrema."),
          altaIntensidad: z.number().optional().describe("Minutos en Zona de Alta Intensidad."),
          aptitudFisica: z.number().optional().describe("Minutos en Zona de Aptitud Física."),
          quemaGrasa: z.number().optional().describe("Minutos en Zona de Quema de Grasa."),
          salud: z.number().optional().describe("Minutos en Zona de Salud."),
        }).optional(),
        videoUrl: z.string().optional().describe("URL a un vídeo de YouTube."),
    }).optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;


export const DailyMetricSchema = z.object({
  date: z.string().describe("Fecha de la métrica (YYYY-MM-DD)."),
  estadoCiclo: z.string().optional().describe("Estado del ciclo, ej. 'menstruacion'"),
  sintomas: z.array(z.string()).optional().describe("Lista de síntomas."),
  notas: z.string().optional().describe("Notas generales del día."),
  dayOfCycle: z.number().optional().describe("Día del ciclo."),
  phase: z.string().optional().describe("Fase del ciclo."),
});
export type DailyMetric = z.infer<typeof DailyMetricSchema>;

export const FoodIntakeSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha del registro (YYYY-MM-DD)."),
    waterIntake: z.number().optional().describe("Agua total bebida en ml."),
    otherDrinks: z.string().optional().describe("Otras bebidas consumidas."),
    breakfast: z.string().optional().describe("Descripción del desayuno."),
    breakfastTags: z.string().optional().describe("Etiquetas para el desayuno (ej. casero, alto en proteína)."),
    lunch: z.string().optional().describe("Descripción de la comida."),
    lunchTags: z.string().optional().describe("Etiquetas para la comida."),
    dinner: z.string().optional().describe("Descripción de la cena."),
    dinnerTags: z.string().optional().describe("Etiquetas para la cena."),
    snacks: z.string().optional().describe("Descripción de snacks o picoteos."),
    snacksTags: z.string().optional().describe("Etiquetas para los snacks."),
    notes: z.string().optional().describe("Notas generales sobre la alimentación del día."),
});
export type FoodIntakeData = z.infer<typeof FoodIntakeSchema>;

export const RecoveryDataSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha del registro (YYYY-MM-DD)."),
    morningHrv: z.number().optional().describe("VFC matutina (ms)."),
    perceivedRecovery: z.number().optional().describe("Recuperación percibida (escala 1-10)."),
    symptoms: z.array(z.string()).optional().describe("Síntomas relacionados a la recuperación."),
    notes: z.string().optional().describe("Observaciones sobre la recuperación."),
});
export type RecoveryData = z.infer<typeof RecoveryDataSchema>;

export const MindfulnessDataSchema = z.object({
    id: z.string().optional(),
    date: z.string().describe("Fecha del registro (YYYY-MM-DD)."),
    stressLevel: z.number().optional().describe("Nivel de estrés percibido (escala 1-10)."),
    mood: z.string().optional().describe("Estado de ánimo (ej. Contenta, Normal, Irritable, Triste)."),
    notes: z.string().optional().describe("Notas sobre el estado mental o emocional del día."),
});
export type MindfulnessData = z.infer<typeof MindfulnessDataSchema>;

export const UserGoalsSchema = z.object({
    primaryGoals: z.array(z.string()).optional().describe("Una lista de los principales objetivos de bienestar del usuario."),
    specifics: z.string().optional().describe("Detalles o notas específicas sobre los objetivos."),
});
export type UserGoalsData = z.infer<typeof UserGoalsSchema>;

