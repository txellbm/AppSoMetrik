
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
  cycles: z.string().describe('Un resumen del estado actual del usuario, incluyendo ciclo menstrual, sueño y actividad física reciente.'),
  mood: z.string().describe('El estado de ánimo actual del usuario (puede no estar disponible).'),
  workouts: z.string().describe('Información sobre el horario de entrenamiento del usuario (puede no estar disponible).'),
  workSchedule: z.string().describe('El horario de trabajo del usuario (puede no estar disponible).'),
});
export type PersonalizedNotificationsInput = z.infer<
  typeof PersonalizedNotificationsInputSchema
>;

const PersonalizedNotificationsOutputSchema = z.object({
  notifications: z
    .array(z.string())
    .describe('Un array de 2-3 mensajes de notificación personalizados, cortos y accionables.'),
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
  prompt: `Eres un asistente personal de salud y bienestar conciso, proactivo y amigable.
  Tu tarea es generar 2 o 3 notificaciones cortas, relevantes y accionables para la usuaria basándote en el siguiente contexto.
  Céntrate en dar consejos prácticos y oportunos que ella pueda aplicar hoy. Evita ser demasiado genérico.

  Contexto de la usuaria: {{{cycles}}}

  Genera las notificaciones:`,
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
