
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
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de un archivo CSV de Apple Health (exportado por "Simple Health Export"). Tu tarea es analizar el contenido del archivo, identificar el tipo de datos basándote en el nombre del archivo, extraer la información relevante y devolverla en un formato JSON estructurado y válido que se adhiere estrictamente al esquema de salida. El objetivo final es consolidar todas las métricas posibles por día.

**Instrucciones Clave:**
1.  **Detección del Origen y Mapeo de Datos por Nombre de Archivo**:
    -   El nombre del archivo (\`{{{fileName}}}\`) es la ÚNICA fuente de verdad para determinar qué datos contiene. Ignora las cabeceras si contradicen el nombre del archivo.
    -   **Agregación por Fecha**: Todos los datos deben agruparse por fecha (usa el campo 'startDate' y formatéalo como 'YYYY-MM-DD'). Los datos de un mismo día provenientes de múltiples filas deben sumarse o agregarse lógicamente.
    -   **Valores Numéricos**: Procesa los campos numéricos con parseFloat. Si un valor no está presente, es inválido o es 'NaN', usa el valor por defecto del esquema (ej. 0).
    -   **Ignorar Archivos Irrelevantes**: Si el nombre del archivo es 'ActivitySummary.csv', 'EnvironmentalAudioExposure.csv', 'HeadphoneAudioExposure.csv', o cualquier otro no listado abajo, devuelve un objeto vacío.

2.  **Mapeo Estricto de Archivo a Métrica:**

    -   **Si \`{{{fileName}}}\` contiene 'SleepAnalysis.csv'**:
        -   Extrae la duración en minutos para cada fase ('deep', 'light', 'rem').
        -   Suma todas las duraciones por fase para cada día.
        -   Rellena los campos \`sueño_profundo\`, \`sueño_ligero\`, y \`sueño_rem\` en \`dailyMetrics\`. \`sueño_total\` es la suma de estos tres.

    -   **Si \`{{{fileName}}}\` contiene 'HeartRateVariability.csv'**:
        -   Extrae el \`value\` (en ms) y guárdalo en \`hrv\` dentro de \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'RespiratoryRate.csv'**:
        -   Extrae el \`value\` (en rpm) y guárdalo en \`respiracion\` dentro de \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'Hydration.csv' o 'DietaryWater.csv'**:
        -   Suma los valores de \`value\` (en litros, convierte a ml si es necesario) para el día y guárdalo en \`hidratacion\` dentro de \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'ActiveEnergyBurned.csv'**:
        -   Suma los valores de \`value\` (en kcal) para el día y guárdalo en \`caloriasActivas\` dentro de \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'StepCount.csv'**:
        -   Suma los valores de \`value\` para el día y guárdalo en \`pasos\` dentro de \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'AppleExerciseTime.csv'**:
        -   Suma los valores de \`value\` (en minutos) para el día y guárdalo en \`minutosEnMovimiento\` dentro de \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'MenstrualFlow.csv'**:
        -   Para cada día con datos, establece \`estadoCiclo\` a "menstruacion" en \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'Symptoms.csv'**:
        -   Agrega todos los síntomas para un día a la lista \`sintomas\` en \`dailyMetrics\`.

    -   **Si \`{{{fileName}}}\` contiene 'Workout.csv' o empieza con 'HKWorkout'**:
        -   **Ignora entrenamientos de menos de 5 minutos.**
        -   Extrae cada entrenamiento como un objeto separado en el array \`workouts\`.
        -   Mapea los campos: \`activityType\` -> \`tipo\`, \`duration\` -> \`duracion\` (minutos), \`activeEnergyBurned\` -> \`calorias\`, \`averageHeartRate\` -> \`frecuenciaCardiacaMedia\`.

3.  **Generación de Respuesta**:
    -   Crea un resumen de 1-2 frases sobre el contenido del archivo procesado.
    -   Rellena el objeto \`dailyMetrics\` con todas las métricas diarias encontradas, agrupadas por fecha.
    -   Rellena el array \`workouts\` con los entrenamientos válidos encontrados.
    -   La respuesta final debe ser **únicamente** el objeto JSON que se adhiere al esquema.

**Contenido del Archivo (Pista de nombre: \`{{{fileName}}}\`):**
\`\`\`
{{{fileContent}}}
\`\`\`

Genera el resumen y los datos estructurados.
`});

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
