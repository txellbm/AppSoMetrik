
'use server';

/**
 * @fileOverview Procesa un archivo de datos de salud y genera un resumen y datos estructurados.
 *
 * - processHealthDataFile - Una función que toma el contenido de un archivo y devuelve un resumen y datos estructurados.
 */

import {ai} from '@/ai/genkit';
import { ProcessHealthDataFileInput, ProcessHealthDataFileInputSchema, ProcessHealthDataFileOutput, ProcessHealthDataFileOutputSchema } from '@/ai/schemas';

export async function processHealthDataFile(
  input: ProcessHealthDataFileInput
): Promise<ProcessHealthDataFileOutput> {
  return processHealthDataFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processHealthDataFilePrompt',
  input: {schema: ProcessHealthDataFileInputSchema},
  output: {schema: ProcessHealthDataFileOutputSchema},
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de varios archivos CSV, como los de HeartWatch, Geard, Clue, etc. Tu tarea es analizar el contenido del archivo, identificar qué tipo de datos contiene basándote en sus cabeceras, extraer la información relevante y devolverla en un formato JSON estructurado.

**Instrucciones de Procesamiento:**

1.  **Detección Automática del Tipo de Archivo**:
    -   Analiza las cabeceras (la primera línea del CSV) para identificar qué tipo de datos contiene el archivo.
    -   **Entrenamientos**: Busca cabeceras como 'Activity', 'Duration', 'Distance', 'Calories', 'Heart Rate', 'Workout'.
    -   **Sueño**: Busca cabeceras como 'Sleep', 'Sleep Duration', 'Sleep Quality', 'Sleep Start', 'Sleep End'.
    -   **Salud General**: Busca cabeceras como 'Heart Rate Resting', 'HRV', 'Respiration', 'Steps', 'Hydration', 'Recovery %'.
    -   **Ciclo Menstrual**: Busca cabeceras como 'Cycle Phase', 'Period Start', 'Ovulation', 'Symptoms', 'Cycle Day'.
    -   **Nutrición**: Busca cabeceras como 'Food', 'Calories', 'Macros', 'Supplements'.
    -   Usa el nombre del archivo solo como una pista secundaria si está disponible: \`{{{fileName}}}\`.

2.  **Extracción y Homogeneización de Datos**:
    -   **Fechas**: Normaliza todas las fechas al formato YYYY-MM-DD.
    -   **Duración de Entrenamientos**:
        -   Si la duración viene en un formato como 'hh:mm:ss', mantenlo.
        -   Si viene en horas decimales (ej. 1.5), conviértelo a formato 'hh:mm:ss' (ej. '01:30:00').
        -   Si el archivo contiene múltiples filas por entrenamiento (detectado por 'Entrenamiento-Tipo' o similar), agrupa las filas por fecha y tipo de entreno.
            -   Calcula la **hora de inicio** y **fin** usando la columna 'ISO' (primer y último registro del grupo).
            -   Calcula la **duración exacta** como la diferencia entre la hora de fin y la de inicio, y formátala como 'hh:mm:ss'.
    -   **Ciclo Menstrual**: Extrae la fase actual, el día del ciclo y una lista de síntomas si están presentes.
    -   **Métricas Numéricas**: Redondea los valores decimales a un máximo de 1 o 2 decimales para claridad (ej. distancia, VFC).
    -   **Valores Faltantes**: Si una columna o métrica no está presente, devuélvela con su valor por defecto (0, "No disponible", o un array vacío), sin que esto cause un error.

3.  **Procesamiento de Entrenamientos Detallados vs. Resumen**:
    -   Si un archivo es de 'resumen' y otro de 'detalles', prioriza siempre los datos del archivo de 'detalles' para un mismo entrenamiento (misma fecha y tipo), ya que son más precisos para la duración, FC promedio, hora de inicio/fin, etc.
    -   No dupliques entrenamientos. Si un entreno ya ha sido procesado desde un archivo de detalles, no lo añadas de nuevo desde un archivo de resumen.

4.  **Consolidación**:
    -   El objetivo es devolver solo los datos estructurados extraídos del archivo actual. La consolidación final de múltiples archivos se gestionará fuera de este flujo.
    -   Si no puedes clasificar el archivo de forma fiable, devuelve un resumen indicando que el archivo no fue reconocido y un objeto \`healthData\` vacío con sus valores por defecto.

**Contenido del Archivo:**
\`\`\`
{{{fileContent}}}
\`\`\`

Genera un resumen conciso de lo que has encontrado y los datos estructurados extraídos del archivo.`,
});

const processHealthDataFileFlow = ai.defineFlow(
  {
    name: 'processHealthDataFileFlow',
    inputSchema: ProcessHealthDataFileInputSchema,
    outputSchema: ProcessHealthDataFileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
    
