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
  message: z.string().describe('El mensaje del usuario al asistente de IA.'),
});
export type AiAssistantChatInput = z.infer<typeof AiAssistantChatInputSchema>;

const AiAssistantChatOutputSchema = z.object({
  response: z.string().describe('La respuesta del asistente de IA al mensaje del usuario.'),
});
export type AiAssistantChatOutput = z.infer<typeof AiAssistantChatOutputSchema>;

export async function aiAssistantChat(input: AiAssistantChatInput): Promise<AiAssistantChatOutput> {
  return aiAssistantChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAssistantChatPrompt',
  input: {schema: AiAssistantChatInputSchema},
  output: {schema: AiAssistantChatOutputSchema},
  prompt: `Eres un asistente personal de bienestar de IA llamado SoMetrik.

      Estás diseñado para proporcionar análisis, consejos y recordatorios relacionados con los datos de salud y bienestar del usuario.
      Tu objetivo es ayudar al usuario a comprender sus datos, detectar patrones y apoyar su rutina diaria de autocuidado.

      Mensaje del usuario: {{{message}}}

      Respuesta:`, // The response is what we expect the LLM to generate
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
