
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
  todayEvents: z.string().optional().describe('Los eventos programados para hoy en el calendario del usuario (trabajo, entrenamientos, descanso, etc.).'),
  recentWorkouts: z.string().optional().describe('Un resumen de los entrenamientos más recientes.'),
  lastRecovery: z.string().optional().describe('Los datos de recuperación más recientes.'),
  lastActivity: z.string().optional().describe('Los datos de actividad más recientes.'),
  stressAndMood: z.string().optional().describe('El nivel de estrés y estado de ánimo reportados hoy.'),
  userGoals: z.string().optional().describe('Los objetivos principales de bienestar del usuario.'),
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
  prompt: `Eres un asistente de salud y bienestar proactivo, analítico y perspicaz. Tu tarea es analizar el resumen de datos del usuario y generar 2-3 notificaciones cortas, relevantes y accionables para ayudarle en su día. Busca activamente conexiones y patrones entre los diferentes datos proporcionados, especialmente la agenda del día y los objetivos del usuario.

  **Instrucciones Clave:**
  - **Usa la Hora Actual:** La hora actual es {{{currentTime}}}. Usa este dato para dar consejos oportunos. Si un evento ya ha pasado, habla de él en pasado. Si está por venir, anticípalo.
  - **Analiza y Conecta (Prioriza la Agenda y Objetivos):** No te limites a repetir los datos. La agenda del día y los objetivos del usuario son clave. Si tiene un día de trabajo largo, enfoca los consejos en manejar el estrés o la energía. Si tiene un entrenamiento, relaciona el sueño y la recuperación con ese entreno. Si su objetivo es perder peso, adapta las sugerencias a ello.
  - **Sé Conciso y Directo:** Las notificaciones deben ser fáciles de leer.
  - **Ofrece Consejos Prácticos y Oportunos:** Las recomendaciones deben ser aplicables al día de hoy.
  - **Tono de Apoyo:** Usa un tono alentador y empático.
  - **Gestiona Datos Faltantes:** Si un área no tiene datos, puedes generar un recordatorio amable para registrarlos o dar un consejo más general sobre esa área.

  **DATOS DEL USUARIO PARA HOY:**
  - **Hora Actual:** {{{currentTime}}}
  - **Objetivos Principales:** {{{userGoals}}}
  - **Agenda de Hoy (CLAVE):** {{{todayEvents}}}
  - **Estado del Ciclo Menstrual:** {{{cycleStatus}}}
  - **Nivel de Estrés y Ánimo de Hoy:** {{{stressAndMood}}}
  - **Último Sueño Registrado:** {{{lastSleep}}}
  - **Recuperación de Hoy:** {{{lastRecovery}}}
  - **Actividad de Ayer:** {{{lastActivity}}}
  - **Entrenamientos Recientes:** {{{recentWorkouts}}}
  
  Genera las notificaciones analizando y conectando la información disponible. Si faltan datos clave (como el sueño o la recuperación), una de las notificaciones debe ser un recordatorio amable para registrarlos. Da prioridad a la agenda del día y los objetivos del usuario para que los consejos sean coherentes.`,
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

