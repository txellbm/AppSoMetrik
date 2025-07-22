

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
  prompt: `Eres un experto analista de salud y bienestar. Tu tarea es generar un informe completo, detallado y bien estructurado en formato Markdown a partir de los siguientes datos consolidados de un usuario. El informe debe ser fácil de leer, perspicaz y adecuado para ser compartido con un profesional de la salud o para el análisis personal del usuario.

**Instrucciones Clave:**
- **Correlaciona Datos:** Busca activamente relaciones entre diferentes áreas. Por ejemplo, ¿cómo afecta el sueño a la recuperación y al rendimiento en los entrenamientos? ¿Hay patrones entre el ciclo menstrual y los niveles de energía o el estado de ánimo?
- **Estructura Clara:** Organiza el informe en las secciones que se detallan a continuación.
- **Tono Profesional y Empático:** Usa un lenguaje claro, alentador y basado en los datos.

**Estructura del Informe:**

- **Resumen General**: Un párrafo introductorio que resuma el estado de salud general, destacando tendencias o patrones importantes que hayas observado (ej. "Esta semana se observa una mejora en la calidad del sueño que parece correlacionarse con una mayor recuperación y energía...").
- **Análisis del Sueño**: Detalles sobre los patrones de sueño, calidad, duración promedio y su posible impacto en otras métricas como la VFC y la energía.
- **Actividad Física y Ejercicio**: Un resumen de las calorías quemadas, el progreso hacia los objetivos y una tabla detallada de los entrenamientos realizados. Analiza la consistencia y la intensidad.
- **Salud Cardíaca y Fisiología**: Información sobre la frecuencia cardíaca en reposo, VFC (HRV), y frecuencia respiratoria. Explica qué significan estas métricas en el contexto del usuario.
- **Hidratación y Nutrición**: Detalles sobre la ingesta de líquidos y alimentos (si están disponibles).
- **Ciclo Menstrual**: Si hay datos, un análisis de la fase actual del ciclo, el día del ciclo, los síntomas registrados y sus implicaciones en la energía, el estado de ánimo y las recomendaciones de entrenamiento. Analiza la regularidad del ciclo y la duración de la menstruación.
- **Recomendaciones Clave**: Una lista con viñetas de las 3-5 recomendaciones más importantes y accionables basadas en el análisis cruzado de todos los datos proporcionados.

**DATOS CONSOLIDADOS DEL USUARIO:**

- **Sueño**: {{{sleepData}}}
- **Ejercicio y Actividad**: {{{exerciseData}}}
- **Salud Cardíaca y Fisiología**: {{{heartRateData}}}
- **Ciclo Menstrual**: {{{menstruationData}}}
- **Suplementos**: {{{supplementData}}}
- **Alimentación e Hidratación**: {{{foodIntakeData}}}
- **Calendario**: {{{calendarData}}}

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
    
