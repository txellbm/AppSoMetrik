
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
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de varios archivos CSV. Tu tarea es analizar el contenido del archivo, identificar el tipo de datos y su origen, extraer la información relevante y devolverla en un formato JSON estructurado y válido que se adhiere estrictamente al esquema de salida.

**Instrucciones Clave:**
1.  **Detección del Origen y Tipo de Archivo**:
    - Analiza el nombre del archivo (\`{{{fileName}}}\`) y las cabeceras del CSV para identificar el origen (AutoSleep, HeartWatch, Apple Health via "Simple Health Export CSV") y el tipo de datos.
    - **Apple Health (Simple Health Export):** Los nombres de archivo son la clave. Ej: \`HKCategoryTypeIdentifierSleepAnalysis.csv\` es sueño, \`HKWorkoutActivityTypeCycling.csv\` es un entrenamiento de ciclismo.
    - **AutoSleep/HeartWatch:** Archivos con nombres como 'AutoSleep.csv' o 'HeartWatch.csv'.

2.  **Extracción Precisa y Conversión de Unidades**:
    - Presta atención a las unidades y formatos. Convierte duraciones a horas o minutos según corresponda.
    - Los campos numéricos deben procesarse como números (usando parseFloat). Si un valor no está presente o es inválido, usa los valores por defecto del esquema (ej. 0). No dejes campos como NaN.
    - **Fechas**: La fecha principal para agrupar datos es \`date\`. Usa el \`startDate\` de los archivos de Apple Health, formateado como 'YYYY-MM-DD'.

3.  **Manejo de Formatos Específicos**:

    - **Formato Apple Health (Simple Health Export CSV)**:
        - La estructura suele ser \`startDate\`, \`endDate\`, \`value\`, y a veces \`sourceName\`.
        - **Sueño (\`HKCategoryTypeIdentifierSleepAnalysis.csv\`):** El campo \`value\` contiene la fase ('inBed', 'asleep', 'awake', 'rem', 'deep', 'light'). La duración es la diferencia entre \`endDate\` y \`startDate\` en segundos. Debes **agregar todas las duraciones por cada fase** para la misma fecha. Convierte los segundos totales de cada fase a horas.
        - **Entrenamientos (IMPORTANTE: SOLO archivos \`HKWorkout...\`):** El tipo de entrenamiento viene en el nombre del archivo (ej. de 'HKWorkoutActivityTypePilates.csv' extraer 'Pilates'). Extrae \`duration\` (minutos) y \`activeEnergyBurned\` (kcal). **CRÍTICO: Ignora por completo cualquier archivo que NO empiece por \`HKWorkout\` al rellenar el array 'workouts'. Archivos como \`HKQuantityTypeIdentifierAppleExerciseTime.csv\`, \`HKQuantityTypeIdentifierFlightsClimbed.csv\` y \`HKQuantityTypeIdentifierDistanceWalkingRunning.csv\` NO SON entrenamientos y no deben ser procesados como tal.**
        - **HRV (\`HKQuantityTypeIdentifierHeartRateVariabilitySDNN.csv\`):** Extrae \`value\` (en ms) y asócialo a la fecha.
        - **Frecuencia Cardíaca en Reposo (\`HKQuantityTypeIdentifierRestingHeartRate.csv\`):** Extrae \`value\` (en bpm).
        - **Frecuencia Respiratoria (\`HKQuantityTypeIdentifierRespiratoryRate.csv\`):** Extrae \`value\` (en rpm).
        - **Ciclo Menstrual (\`HKCategoryTypeIdentifierMenstrualFlow.csv\`):** El campo \`value\` indica la intensidad. \`HKMenstrualCycleStart\` (valor 1) indica el inicio del ciclo.

    - **Formato AutoSleep/HeartWatch (Legado)**:
        - **AutoSleep CSV**: Extrae 'inBed', 'awake', 'deep', 'light', 'rem', 'quality', 'Readiness'. Calcula 'totalSleep' sumando 'deep', 'light' y 'rem'.
        - **HeartWatch Entrenamientos CSV**: Extrae 'Activity', 'Duration (mins)', 'Active Calories', 'Average Heart Rate (bpm)'.

4.  **Generación de Respuesta**:
    -   Crea un resumen de 1-2 frases sobre el contenido del archivo procesado.
    -   **IMPORTANTE**: Rellena **SOLO** los arrays correspondientes en el objeto de salida. Si un archivo solo contiene datos de sueño, los arrays 'workouts' y 'menstrualData' deben estar vacíos.
    -   La respuesta final debe ser **únicamente** el objeto JSON que se adhiere al esquema. No incluyas ningún texto fuera del JSON.

**Contenido del Archivo (Pista de nombre: \`{{{fileName}}}\`):**
\`\`\`
{{{fileContent}}}
\`\`\`

Genera el resumen y los datos estructurados.`,
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
    

    









