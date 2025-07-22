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
  cycles: z.string().describe('Information about the user\'s cycles (e.g., menstrual cycle).'),
  mood: z.string().describe('The user\'s current mood.'),
  workouts: z.string().describe('Information about the user\'s workout schedule.'),
  workSchedule: z.string().describe('The user\'s work schedule.'),
});
export type PersonalizedNotificationsInput = z.infer<
  typeof PersonalizedNotificationsInputSchema
>;

const PersonalizedNotificationsOutputSchema = z.object({
  notifications: z
    .array(z.string())
    .describe('An array of personalized notification messages.'),
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
  prompt: `You are a personalized health and wellness assistant. Based on the
  user's cycles, mood, workouts, and work schedule, generate a list of
  personalized notifications to help them manage their health and well-being.

  Cycles: {{{cycles}}}
  Mood: {{{mood}}}
  Workouts: {{{workouts}}}
  Work Schedule: {{{workSchedule}}}

  Notifications:`,
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
