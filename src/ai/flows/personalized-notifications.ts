
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
  currentTime: z.string().optional().describe('La hora actual en formato HH:mm para contextualizar las sugerencias.'),
  cycleStatus: z.string().optional().describe('El estado actual del ciclo menstrual del usuario (fase y día).'),
  lastSleep: z.string().optional().describe('Un resumen de los datos de la última sesión de sueño.'),
  todayEvents: z.string().optional().describe('Los eventos programados para hoy en el calendario del usuario.'),
  recentWorkouts: z.string().optional().describe('Un resumen de los entrenamientos más recientes.'),
  lastRecovery: z.string().optional().describe('Los datos de recuperación más recientes.'),
  lastActivity: z.string().optional().describe('Los datos de actividad más recientes.'),
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
  - **Usa la Hora Actual:** La hora actual es {{{currentTime}}}. Usa este dato para dar consejos oportunos. Si un evento ya ha pasado, habla de él en pasado. Si está por venir, anticípalo.
  - **Analiza y Conecta:** No te limites a repetir los datos. Busca correlaciones. Por ejemplo, si durmió mal y tiene un entrenamiento de alta intensidad, sugiérele ajustarlo. Si está en la fase lútea y su recuperación fue baja, dale un consejo para manejarlo. Si no hay datos de sueño, recuérdale que los registre.
  - **Sé Conciso y Directo:** Las notificaciones deben ser fáciles de leer.
  - **Ofrece Consejos Prácticos y Oportunos:** Las recomendaciones deben ser aplicables al día de hoy.
  - **Tono de Apoyo:** Usa un tono alentador y empático.
  - **Gestiona Datos Faltantes:** Si un área no tiene datos, puedes generar un recordatorio amable para registrarlos o dar un consejo más general sobre esa área.

  **DATOS DEL USUARIO PARA HOY:**
  - **Hora Actual:** {{{currentTime}}}
  - **Estado del Ciclo Menstrual:** {{{cycleStatus}}}
  - **Último Sueño Registrado:** {{{lastSleep}}}
  - **Recuperación de Hoy:** {{{lastRecovery}}}
  - **Actividad de Ayer:** {{{lastActivity}}}
  - **Entrenamientos Recientes:** {{{recentWorkouts}}}
  - **Agenda de Hoy:** {{{todayEvents}}}
  
  Genera las notificaciones analizando y conectando la información disponible. Si faltan datos clave (como el sueño o la recuperación), una de las notificaciones debe ser un recordatorio amable para registrarlos.`,
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
