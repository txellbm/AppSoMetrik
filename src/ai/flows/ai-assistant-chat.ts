// src/ai/flows/ai-assistant-chat.ts
'use server';

/**
 * @fileOverview Implements the AI assistant chat flow for the SoMetrik app.
 *
 * - aiAssistantChat - A function that allows users to chat with an AI assistant for health and wellness advice.
 * - AiAssistantChatInput - The input type for the aiAssistantChat function, representing the user's message.
 * - AiAssistantChatOutput - The return type for the aiAssistantChat function, representing the AI's response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssistantChatInputSchema = z.object({
  message: z.string().describe('The user message to the AI assistant.'),
});
export type AiAssistantChatInput = z.infer<typeof AiAssistantChatInputSchema>;

const AiAssistantChatOutputSchema = z.object({
  response: z.string().describe('The AI assistant response to the user message.'),
});
export type AiAssistantChatOutput = z.infer<typeof AiAssistantChatOutputSchema>;

export async function aiAssistantChat(input: AiAssistantChatInput): Promise<AiAssistantChatOutput> {
  return aiAssistantChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAssistantChatPrompt',
  input: {schema: AiAssistantChatInputSchema},
  output: {schema: AiAssistantChatOutputSchema},
  prompt: `You are a personal AI wellness assistant named SoMetrik.

      You are designed to provide analysis, advice, and reminders related to the user's health and wellness data.
      Your goal is to help the user understand their data, detect patterns, and support their daily self-care routine.

      User Message: {{{message}}}

      Response:`, // The response is what we expect the LLM to generate
});

const aiAssistantChatFlow = ai.defineFlow(
  {
    name: 'aiAssistantChatFlow',
    inputSchema: AiAssistantChatInputSchema,
    outputSchema: AiAssistantChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
