
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
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de varios archivos CSV. Tu tarea es analizar el contenido del archivo, identificar el tipo de datos y su origen, extraer la información relevante y devolverla en un formato JSON estructurado y válido que se adhiere estrictamente al esquema de salida. El objetivo final es consolidar todas las métricas posibles por día.

**Instrucciones Clave:**
1.  **Detección del Origen y Tipo de Archivo**:
    - Analiza el nombre del archivo (\`{{{fileName}}}\`) y las cabeceras del CSV para identificar el origen (AutoSleep, HeartWatch, Apple Health via "Simple Health Export CSV").
    - **Apple Health (Simple Health Export):** Los nombres de archivo son la clave. Ej: \`HKCategoryTypeIdentifierSleepAnalysis.csv\` es sueño, \`HKWorkoutActivityTypeCycling.csv\` es un entrenamiento de ciclismo.

2.  **Extracción Precisa y Agregación por Día**:
    - Presta atención a las unidades y formatos. Convierte duraciones a horas o minutos según corresponda.
    - Los campos numéricos deben procesarse como números (usando parseFloat). Si un valor no está presente o es inválido, usa los valores por defecto del esquema (ej. 0). No dejes campos como NaN.
    - **FECHA CLAVE**: La fecha principal para agrupar datos es \`date\`. Usa el \`startDate\` de los archivos de Apple Health, formateado como 'YYYY-MM-DD'. Es CRÍTICO que la fecha extraída corresponda al día correcto sin desfases por zona horaria.
    - **Agregación**: Debes agregar todas las métricas encontradas en el archivo a un único objeto por día en el objeto 'dailyMetrics'. La clave del objeto debe ser la fecha 'YYYY-MM-DD'.

3.  **Manejo de Formatos Específicos**:

    - **Formato Apple Health (Simple Health Export CSV)**:
        - La estructura suele ser \`startDate\`, \`endDate\`, \`value\`, y a veces \`sourceName\`.
        - **Sueño (\`HKCategoryTypeIdentifierSleepAnalysis.csv\`):** El campo \`value\` contiene la fase ('inBed', 'asleep', 'awake', 'rem', 'deep', 'light'). La duración es la diferencia entre \`endDate\` y \`startDate\` en segundos. Debes **agregar todas las duraciones por cada fase** para la misma fecha y guardarlas en minutos en los campos correspondientes de \`dailyMetrics\`. Asegúrate de sumar correctamente los minutos de sueño profundo, ligero y REM en sus respectivos campos.
        - **Entrenamientos (CRÍTICO: SOLO archivos \`HKWorkout...\`):**
            - Solo procesa archivos cuyo nombre comience con \`HKWorkoutActivityType\`.
            - Ignora cualquier entrenamiento con una duración inferior a 5 minutos.
            - Extrae \`duration\` (minutos) y \`activeEnergyBurned\` (kcal). El tipo de entrenamiento se extrae del nombre del archivo (ej. de 'HKWorkoutActivityTypePilates.csv' extraer 'Pilates').
            - **IMPORTANTE: Ignora por completo cualquier archivo que NO empiece por \`HKWorkout\` al rellenar el array 'workouts'. Archivos como \`HKQuantityTypeIdentifierAppleExerciseTime.csv\`, \`HKQuantityTypeIdentifierFlightsClimbed.csv\`, \`HKQuantityTypeIdentifierActiveEnergyBurned.csv\`, \`HKQuantityTypeIdentifierDistanceWalkingRunning.csv\` y similares NO SON entrenamientos y no deben ser procesados como tal.**
        - **Métricas Diarias (agregar a \`dailyMetrics\` para el día correspondiente):**
            - **HRV (\`HKQuantityTypeIdentifierHeartRateVariabilitySDNN.csv\`):** Extrae \`value\` (en ms) y guárdalo en \`hrv\`.
            - **Frecuencia Cardíaca en Reposo (\`HKQuantityTypeIdentifierRestingHeartRate.csv\`):** Extrae \`value\` (en bpm) y guárdalo en \`restingHeartRate\`.
            - **Frecuencia Respiratoria (\`HKQuantityTypeIdentifierRespiratoryRate.csv\`):** Extrae \`value\` (en rpm) y guárdalo en \`respirationRate\`.
            - **Agua (\`HKQuantityTypeIdentifierDietaryWater.csv\`):** Suma los valores de \`value\` (en litros) para el día y guárdalo en \`hydrationLiters\`.
            - **Pasos (\`HKQuantityTypeIdentifierStepCount.csv\`):** Suma los valores de \`value\` para el día y guárdalo en \`steps\`.
            - **Distancia (\`HKQuantityTypeIdentifierDistanceWalkingRunning.csv\`):** Suma los valores de \`value\` (en km) para el día y guárdalo en \`distance\`.
            - **Calorías Activas (\`HKQuantityTypeIdentifierActiveEnergyBurned.csv\`):** Suma los valores de \`value\` (en kcal) para el día y guárdalo en \`activeCalories\`.
        - **Ciclo Menstrual (\`HKCategoryTypeIdentifierMenstrualFlow.csv\`):**
            - La fecha correcta es la que indica \`startDate\`, no la modifiques.
            - Extrae el \`value\` para el campo \`flow\` y agrégalo al objeto \`menstrualCycle\` dentro de \`dailyMetrics\` para el día correspondiente.
            - Si encuentras un \`HKMenstrualCycleStart\`, marca ese día como el inicio del ciclo.

4.  **Generación de Respuesta**:
    -   Crea un resumen de 1-2 frases sobre el contenido del archivo procesado.
    -   Rellena el objeto \`dailyMetrics\` con todas las métricas diarias encontradas, agrupadas por fecha.
    -   Rellena el array \`workouts\` con los entrenamientos válidos encontrados.
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
    
    // Fallback mechanism to ensure the output object has the required structure
    const validatedOutput: ProcessHealthDataFileOutput = {
        summary: output?.summary || `Procesado ${input.fileName || 'archivo'}.`,
        dailyMetrics: output?.dailyMetrics || [],
        workouts: output?.workouts || [],
    };
    
    return validatedOutput;
  }
);
    
