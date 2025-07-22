
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
  prompt: `Eres un experto analista de salud y bienestar. Tu tarea es generar un informe completo, detallado y bien estructurado en formato Markdown a partir de los siguientes datos de salud de un usuario. El informe debe ser fácil de leer, perspicaz y adecuado para ser compartido con un profesional de la salud o para el análisis personal del usuario.

Estructura el informe con las siguientes secciones:
- **Resumen General**: Un párrafo introductorio que resuma el estado de salud general, incluyendo nivel de energía y recuperación.
- **Análisis del Sueño**: Detalles sobre los patrones de sueño, calidad y recomendaciones.
- **Actividad Física y Ejercicio**: Un resumen de las calorías quemadas, el progreso hacia los objetivos y una tabla detallada de los entrenamientos realizados.
- **Salud Cardíaca y Fisiología**: Información sobre la frecuencia cardíaca en reposo, VFC (HRV), y frecuencia respiratoria.
- **Hidratación y Nutrición**: Detalles sobre la ingesta de líquidos y alimentos.
- **Ciclo Menstrual**: Si hay datos, un análisis de la fase actual del ciclo y sus implicaciones.
- **Recomendaciones Clave**: Una lista con viñetas de las 3-5 recomendaciones más importantes basadas en todos los datos proporcionados.

Utiliza un tono profesional pero empático.

DATOS DEL USUARIO:
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

    