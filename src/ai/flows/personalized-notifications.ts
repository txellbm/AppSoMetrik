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
  cycles: z.string().describe('Información sobre los ciclos del usuario (por ejemplo, ciclo menstrual).'),
  mood: z.string().describe('El estado de ánimo actual del usuario.'),
  workouts: z.string().describe('Información sobre el horario de entrenamiento del usuario.'),
  workSchedule: z.string().describe('El horario de trabajo del usuario.'),
});
export type PersonalizedNotificationsInput = z.infer<
  typeof PersonalizedNotificationsInputSchema
>;

const PersonalizedNotificationsOutputSchema = z.object({
  notifications: z
    .array(z.string())
    .describe('Un array de mensajes de notificación personalizados.'),
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
  prompt: `Eres un asistente personal de salud y bienestar. Basado en los
  ciclos, estado de ánimo, entrenamientos y horario de trabajo del usuario, genera una lista de
  notificaciones personalizadas para ayudarle a gestionar su salud y bienestar.

  Ciclos: {{{cycles}}}
  Estado de ánimo: {{{mood}}}
  Entrenamientos: {{{workouts}}}
  Horario de trabajo: {{{workSchedule}}}

  Notificaciones:`,
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
