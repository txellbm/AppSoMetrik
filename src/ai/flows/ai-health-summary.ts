
'use server';

/**
 * @fileOverview AI health summary flow for generating a summary of recorded health data.
 *
 * - generateHealthSummary - A function that generates a summary of health data.
 */

import {ai} from '@/ai/genkit';
import { HealthSummaryInput, HealthSummaryInputSchema, HealthSummaryOutput, HealthSummaryOutputSchema } from '@/ai/schemas';

export async function generateHealthSummary(input: HealthSummaryInput): Promise<HealthSummaryOutput> {
  return generateHealthSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthSummaryPrompt',
  input: {schema: HealthSummaryInputSchema},
  output: {schema: HealthSummaryOutputSchema},
  prompt: `Eres un experto analista de salud y bienestar. Tu tarea es generar un informe completo, detallado y bien estructurado en formato Markdown a partir de los siguientes datos consolidados de un usuario para el **período especificado: {{{periodo}}}**. El informe debe ser fácil de leer, perspicaz y adecuado para ser compartido con un profesional de la salud o para el análisis personal del usuario.

**Instrucciones Clave:**
- **Enfócate en el Período**: Analiza los datos exclusivamente dentro del período de tiempo solicitado (diario, semanal, mensual).
- **Correlaciona Datos:** Busca activamente relaciones entre diferentes áreas. Por ejemplo, ¿cómo afecta el sueño a la recuperación y al rendimiento en los entrenamientos? ¿Hay patrones entre el ciclo menstrual y los niveles de energía o el estado de ánimo? ¿Cómo influyen los eventos del calendario (trabajo, vacaciones) en los niveles de estrés, sueño o actividad?
- **Estructura Clara:** Organiza el informe en las secciones que se detallan a continuación.
- **Tono Profesional y Empático:** Usa un lenguaje claro, alentador y basado en los datos.

**Estructura del Informe:**

- **Resumen General**: Un párrafo introductorio que resuma el estado de salud general para el período, destacando tendencias o patrones importantes que hayas observado (ej. "Esta semana se observa una mejora en la calidad del sueño que parece correlacionarse con una mayor recuperación y energía...").
- **Análisis del Sueño**: Detalles sobre los patrones de sueño, calidad, duración promedio y su posible impacto en otras métricas como la VFC y la energía.
- **Actividad Física y Ejercicio**: Un resumen de las calorías quemadas, el progreso hacia los objetivos y una tabla detallada de los entrenamientos realizados. Analiza la consistencia y la intensidad, considerando la agenda del usuario (trabajo, descanso).
- **Salud Cardíaca y Fisiología**: Información sobre la frecuencia cardíaca en reposo, VFC (HRV), y frecuencia respiratoria. Explica qué significan estas métricas en el contexto del usuario.
- **Hidratación y Nutrición**: Detalles sobre la ingesta de líquidos y alimentos. Analiza la calidad de la dieta y la consistencia en la hidratación.
- **Ciclo Menstrual**: Si hay datos, un análisis de la fase actual del ciclo, el día del ciclo, los síntomas registrados y sus implicaciones en la energía, el estado de ánimo y las recomendaciones de entrenamiento. Analiza la regularidad del ciclo y la duración de la menstruación.
- **Suplementos**: Un resumen de los suplementos tomados durante el período.
- **Recomendaciones Clave**: Una lista con viñetas de las 3-5 recomendaciones más importantes y accionables basadas en el análisis cruzado de todos los datos proporcionados para el período.

**DATOS CONSOLIDADOS DEL USUARIO (Período: {{{periodo}}}):**

- **Sueño**: {{{sleepData}}}
- **Ejercicio**: {{{exerciseData}}}
- **Actividad Diaria**: {{{activityData}}}
- **Salud Cardíaca y Fisiología**: {{{heartRateData}}}
- **Ciclo Menstrual**: {{{menstruationData}}}
- **Suplementos**: {{{supplementData}}}
- **Alimentación e Hidratación**: {{{foodIntakeData}}}
- **Calendario (eventos como trabajo, vacaciones, descanso)**: {{{calendarData}}}
- **Bienestar Mental (Estrés y Ánimo)**: {{{mindfulnessData}}}
- **Objetivos del Usuario**: {{{userGoals}}}

Genera el informe detallado en formato Markdown.`,
});

const generateHealthSummaryFlow = ai.defineFlow(
  {
    name: 'generateHealthSummaryFlow',
    inputSchema: HealthSummaryInputSchema,
    outputSchema: HealthSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

