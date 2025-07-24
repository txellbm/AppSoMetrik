
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
  prompt: `Eres un asistente de salud y bienestar proactivo, analítico y perspicaz. Tu tarea es analizar el resumen de datos del usuario y generar 2-3 notificaciones cortas, relevantes y accionables para ayudarle en su día. Busca activamente conexiones y patrones entre los diferentes datos proporcionados.

  **Instrucciones Clave:**
  - **Analiza y Conecta:** No te limites a repetir los datos. Busca correlaciones. Por ejemplo, si durmió mal y tiene un entrenamiento de alta intensidad, sugiérele ajustarlo. Si está en la fase lútea y tiene un evento estresante, dale un consejo para manejarlo.
  - **Sé Conciso y Directo:** Las notificaciones deben ser fáciles de leer.
  - **Ofrece Consejos Prácticos y Oportunos:** Las recomendaciones deben ser aplicables al día de hoy.
  - **Tono de Apoyo:** Usa un tono alentador y empático.
  - **Gestiona Datos Faltantes:** Si un área no tiene datos, puedes generar un recordatorio amable para registrarlos o dar un consejo más general sobre esa área.

  **Resumen de datos del usuario:**
  {{{summary}}}

  Genera las notificaciones analizando y conectando la información disponible.`,
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

    