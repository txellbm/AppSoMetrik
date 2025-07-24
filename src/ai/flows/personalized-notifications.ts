
'use server';

/**
 * @fileOverview Personalized notifications AI agent.
 *
 * - generatePersonalizedNotifications - A function that generates personalized notifications based on user data.
 * - PersonalizedNotificationsInput - The input type for the generatePersonalizedNotifications function.
 * - PersonalizedNotificationsOutput - The return type for the generatePersonalizedNotifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedNotificationsInputSchema = z.object({
  summary: z.string().describe('Un resumen del estado y los datos actuales del usuario, incluyendo el día del ciclo, fase, sueño reciente, entrenamientos y agenda del día.'),
});
export type PersonalizedNotificationsInput = z.infer<
  typeof PersonalizedNotificationsInputSchema
>;

const PersonalizedNotificationsOutputSchema = z.object({
  notifications: z
    .array(z.string())
    .describe('Un array de 2-3 mensajes de notificación personalizados, cortos y accionables basados en los datos del usuario.'),
});
export type PersonalizedNotificationsOutput = z.infer<
  typeof PersonalizedNotificationsOutputSchema
>;

export async function generatePersonalizedNotifications(
  input: PersonalizedNotificationsInput
): Promise<PersonalizedNotificationsOutput> {
  return personalizedNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedNotificationsPrompt',
  input: {schema: PersonalizedNotificationsInputSchema},
  output: {schema: PersonalizedNotificationsOutputSchema},
  prompt: `Eres un asistente de salud y bienestar proactivo y perspicaz. Tu tarea es analizar el resumen de datos del usuario y generar 2-3 notificaciones cortas, relevantes y accionables para ayudarle en su día. Busca conexiones entre los datos.

  **Instrucciones:**
  - Sé conciso y directo.
  - Ofrece consejos prácticos y oportunos.
  - Basa tus sugerencias en la correlación de los datos proporcionados (ej. sueño y energía, fase del ciclo y tipo de entrenamiento, etc.).
  - Si no hay datos suficientes, ofrece un consejo general o un recordatorio para registrar datos.
  - El tono debe ser de apoyo y alentador.

  **Resumen de datos del usuario:**
  {{{summary}}}

  Genera las notificaciones.`,
});

const personalizedNotificationsFlow = ai.defineFlow(
  {
    name: 'personalizedNotificationsFlow',
    inputSchema: PersonalizedNotificationsInputSchema,
    outputSchema: PersonalizedNotificationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
