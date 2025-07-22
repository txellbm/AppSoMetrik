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
  sleepData: z.string().describe('Summary of sleep data.'),
  exerciseData: z.string().describe('Summary of exercise data.'),
  heartRateData: z.string().describe('Summary of heart rate data.'),
  menstruationData: z.string().describe('Summary of menstruation data.'),
  supplementData: z.string().describe('Summary of supplement data.'),
  foodIntakeData: z.string().describe('Summary of food intake data.'),
  calendarData: z.string().describe('Summary of calendar data.'),
});
export type HealthSummaryInput = z.infer<typeof HealthSummaryInputSchema>;

const HealthSummaryOutputSchema = z.object({
  summary: z.string().describe('A comprehensive summary of the user health data.'),
});
export type HealthSummaryOutput = z.infer<typeof HealthSummaryOutputSchema>;

export async function generateHealthSummary(input: HealthSummaryInput): Promise<HealthSummaryOutput> {
  return generateHealthSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthSummaryPrompt',
  input: {schema: HealthSummaryInputSchema},
  output: {schema: HealthSummaryOutputSchema},
  prompt: `You are an AI health assistant. Please generate a comprehensive summary of the user's health data based on the following information.\n\nSleep Data: {{{sleepData}}}\nExercise Data: {{{exerciseData}}}\nHeart Rate Data: {{{heartRateData}}}\nMenstruation Data: {{{menstruationData}}}\nSupplement Data: {{{supplementData}}}\nFood Intake Data: {{{foodIntakeData}}}\nCalendar Data: {{{calendarData}}}\n\nGenerate a detailed and coherent summary that can be shared with another AI agent for further analysis.`,
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
