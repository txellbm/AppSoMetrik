'use server';

/**
 * @fileOverview AI health summary flow for generating a summary of recorded health data.
 *
 * - generateHealthSummary - A function that generates a summary of health data.
 * - HealthSummaryInput - The input type for the generateHealthSummary function.
 * - HealthSummaryOutput - The return type for the generateHealthSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthSummaryInputSchema = z.object({
  sleepData: z.string().describe('Resumen de los datos de sueño.'),
  exerciseData: z.string().describe('Resumen de los datos de ejercicio.'),
  heartRateData: z.string().describe('Resumen de los datos de frecuencia cardíaca.'),
  menstruationData: z.string().describe('Resumen de los datos de menstruación.'),
  supplementData: z.string().describe('Resumen de los datos de suplementos.'),
  foodIntakeData: z.string().describe('Resumen de los datos de ingesta de alimentos.'),
  calendarData: z.string().describe('Resumen de los datos del calendario.'),
});
export type HealthSummaryInput = z.infer<typeof HealthSummaryInputSchema>;

const HealthSummaryOutputSchema = z.object({
  summary: z.string().describe('Un resumen completo de los datos de salud del usuario.'),
});
export type HealthSummaryOutput = z.infer<typeof HealthSummaryOutputSchema>;

export async function generateHealthSummary(input: HealthSummaryInput): Promise<HealthSummaryOutput> {
  return generateHealthSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthSummaryPrompt',
  input: {schema: HealthSummaryInputSchema},
  output: {schema: HealthSummaryOutputSchema},
  prompt: `Eres un asistente de salud de IA. Genera un resumen completo de los datos de salud del usuario basándote en la siguiente información.\n\nDatos de sueño: {{{sleepData}}}\nDatos de ejercicio: {{{exerciseData}}}\nDatos de frecuencia cardíaca: {{{heartRateData}}}\nDatos de menstruación: {{{menstruationData}}}\nDatos de suplementos: {{{supplementData}}}\nDatos de ingesta de alimentos: {{{foodIntakeData}}}\nDatos del calendario: {{{calendarData}}}\n\nGenera un resumen detallado y coherente que se pueda compartir con otro agente de IA para un análisis más profundo.`,
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
