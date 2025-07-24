'use server';

/**
 * @fileOverview Generates personalized recovery suggestions.
 *
 * - generateRecoverySuggestions - A function that generates personalized recovery suggestions based on user data.
 * - RecoverySuggestionsInput - The input type for the generateRecoverySuggestions function.
 * - RecoverySuggestionsOutput - The return type for the generateRecoverySuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecoverySuggestionsInputSchema = z.object({
  recoveryScore: z.number().describe('La puntuación de recuperación del usuario (0-100).'),
  currentTime: z.string().optional().describe('La hora actual en formato HH:mm para contextualizar las sugerencias.'),
  lastSleep: z.string().optional().describe('Un resumen de los datos de la última sesión de sueño.'),
  cycleStatus: z.string().optional().describe('El estado actual del ciclo menstrual del usuario (fase y día).'),
  todayEvents: z.string().optional().describe('Los eventos programados para hoy en el calendario del usuario.'),
});
export type RecoverySuggestionsInput = z.infer<typeof RecoverySuggestionsInputSchema>;

const SuggestionSchema = z.object({
    category: z.enum(["Entrenamiento", "Descanso", "Mindfulness", "Nutrición"]),
    suggestion: z.string().describe('El consejo o sugerencia personalizada.')
});

const RecoverySuggestionsOutputSchema = z.object({
  suggestions: z
    .array(SuggestionSchema)
    .describe('Un array de 3 sugerencias personalizadas sobre entrenamiento, descanso y mindfulness/nutrición.'),
});
export type RecoverySuggestionsOutput = z.infer<
  typeof RecoverySuggestionsOutputSchema
>;

export async function generateRecoverySuggestions(
  input: RecoverySuggestionsInput
): Promise<RecoverySuggestionsOutput> {
  return recoverySuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recoverySuggestionsPrompt',
  input: { schema: RecoverySuggestionsInputSchema },
  output: { schema: RecoverySuggestionsOutputSchema },
  prompt: `Eres un coach de salud y bienestar experto. Tu tarea es analizar los datos de recuperación del usuario y proporcionar 3 sugerencias accionables y personalizadas para el día de hoy, una para cada una de las siguientes categorías: Entrenamiento, Descanso y Mindfulness/Nutrición.

  **Instrucciones Clave:**
  - **Usa la Hora Actual:** La hora actual es {{{currentTime}}}. Usa este dato para dar consejos oportunos. Si un evento ya ha pasado, habla de él en pasado. Si está por venir, anticípalo.
  - **Conecta los Datos:** No te limites a la puntuación de recuperación. Cruza la información con el sueño, el ciclo menstrual y la agenda del día.
  - **Sé Específico y Accionable:** Las sugerencias deben ser concretas. En lugar de "descansa bien", sugiere "considera una siesta de 20 minutos por la tarde si tu agenda lo permite".
  - **Tono de Coach:** Usa un tono de apoyo, informativo y motivador.

  **Datos del Usuario para Hoy:**
  - **Puntuación de Recuperación:** {{{recoveryScore}}}/100
  - **Hora Actual:** {{{currentTime}}}
  - **Datos del Último Sueño:** {{{lastSleep}}}
  - **Estado del Ciclo Menstrual:** {{{cycleStatus}}}
  - **Agenda de Hoy:** {{{todayEvents}}}

  Analiza todos estos datos y genera 3 sugerencias, asegurándote de que cada una corresponda a una categoría diferente (Entrenamiento, Descanso, Mindfulness/Nutrición). Prioriza las conexiones más relevantes. Por ejemplo, si la recuperación es baja y hay un entreno de alta intensidad, enfócate en eso. Si el sueño fue malo, da consejos para el descanso. Si el ciclo está en fase lútea, adapta la nutrición.`,
});

const recoverySuggestionsFlow = ai.defineFlow(
  {
    name: 'recoverySuggestionsFlow',
    inputSchema: RecoverySuggestionsInputSchema,
    outputSchema: RecoverySuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
