
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
  todayEvents: z.string().optional().describe('Los eventos programados para hoy (trabajo, entrenamientos, etc.). Esta es información clave para adaptar las sugerencias.'),
  stressAndMood: z.string().optional().describe('El nivel de estrés y estado de ánimo reportados hoy.'),
  userGoals: z.string().optional().describe('El objetivo principal de bienestar del usuario.'),
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
  - **Conecta los Datos (Prioriza la Agenda, Objetivos y Estrés):** No te limites a la puntuación de recuperación. Cruza la información con el sueño, el ciclo menstrual, el estrés y, muy importante, la agenda del día y los objetivos del usuario. Si hay un entrenamiento de alta intensidad, adapta la sugerencia de "Entrenamiento" a eso. Si es un día de trabajo estresante, la sugerencia de "Mindfulness" podría centrarse en manejar ese estrés.
  - **Sé Específico y Accionable:** Las sugerencias deben ser concretas. En lugar de "descansa bien", sugiere "considera una siesta de 20 minutos por la tarde si tu agenda lo permite".
  - **Tono de Coach:** Usa un tono de apoyo, informativo y motivador.

  **Datos del Usuario para Hoy:**
  - **Puntuación de Recuperación:** {{{recoveryScore}}}/100
  - **Hora Actual:** {{{currentTime}}}
  - **Objetivo Principal:** {{{userGoals}}}
  - **Agenda de Hoy (CLAVE):** {{{todayEvents}}}
  - **Datos del Último Sueño:** {{{lastSleep}}}
  - **Estado del Ciclo Menstrual:** {{{cycleStatus}}}
  - **Nivel de Estrés y Ánimo de Hoy:** {{{stressAndMood}}}

  Analiza todos estos datos y genera 3 sugerencias, asegurándote de que cada una corresponda a una categoría diferente (Entrenamiento, Descanso, Mindfulness/Nutrición). Prioriza las conexiones más relevantes y adapta tus consejos a la agenda del día y los objetivos del usuario.`,
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
