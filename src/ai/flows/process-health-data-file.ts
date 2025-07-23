
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
  prompt: `Eres un asistente de IA experto en analizar y consolidar datos de salud desde archivos CSV de las apps AutoSleep y HeartWatch. Tu tarea es analizar el contenido del archivo, identificar el tipo de datos basándote en el nombre del archivo y las cabeceras, extraer TODA la información relevante y devolverla en un formato JSON estructurado y válido que se adhiere estrictamente al esquema de salida. El objetivo final es consolidar todas las métricas posibles por día.

**Instrucciones Clave:**
1.  **Detección del Origen y Mapeo de Datos por Nombre de Archivo**:
    - El nombre del archivo (\`{{{fileName}}}\`) es la fuente principal para determinar qué datos contiene.
    - Ignora los archivos que no coincidan con la lista de archivos a procesar.

2.  **Agregación por Fecha**: Todos los datos deben agruparse por fecha (usa el campo 'ISO8601', 'date' o 'date Y-M-d' y formatéalo como 'YYYY-MM-DD'). Los datos de un mismo día provenientes de múltiples filas deben sumarse o agregarse lógicamente.

3.  **Mapeo Estricto de Archivo a Métrica:**

    - **Si \`{{{fileName}}}\` contiene 'AutoSleep'**: Procesa como datos de **Sueño**.
        - Extrae y mapea los siguientes campos a \`sleepData\`:
        - \`ISO8601\` -> \`date\` (extraer solo la fecha)
        - \`horaDedormir\` -> \`bedtime\`
        - \`horaDedespertarse\` -> \`wakeUpTime\`
        - \`enCama\` -> \`inBedTime\`
        - \`dormido\` -> \`sleepTime\`
        - \`despierto\` -> \`awakeTime\`
        - \`seDurmióEn\` -> \`timeToFallAsleep\`
        - \`eficiencia\` -> \`efficiency\`
        - \`calidad\` -> \`quality\`
        - \`vfc\` -> \`hrv\`
        - \`mediaVFCdormido7días\` -> \`hrv7DayAvg\`
        - \`mediaSatOx\` -> \`SPO2.avg\`
        - \`mínSatOx\` -> \`SPO2.min\`
        - \`máxSatOx\` -> \`SPO2.max\`
        - \`mediaResp\` -> \`respiratoryRate\`
        - \`mínResp\` -> \`respiratoryRateMin\`
        - \`máxResp\` -> \`respiratoryRateMax\`
        - \`apnea\` -> \`apnea\`
        - \`etiquetas\` -> \`tags\`
        - \`notas\` -> \`notes\`

    - **Si \`{{{fileName}}}\` contiene 'HeartWatch-Entrenamientos.csv'**: Procesa como datos de **Entrenamientos**.
        - Extrae y mapea los siguientes campos a \`workouts\`:
        - \`date Y-M-d\` -> \`date\`
        - \`type\` -> \`type\`
        - \`start\` -> \`startTime\`
        - \`end\` -> \`endTime\`
        - \`minutes\` -> \`duration\`
        - \`avg bpm\` -> \`avgHeartRate\`
        - \`min bpm\` -> \`minHeartRate\`
        - \`max bpm\` -> \`maxHeartRate\`
        - \`calories\` -> \`calories\`
        - \`distance\` -> \`distance\`
        - \`avg pace\` -> \`avgPace\`
        - \`RPE\` -> \`rpe\`
        - \`load\` -> \`load\`
        - \`Z1 %\` -> \`zone1Percent\`
        - \`Z2 %\` -> \`zone2Percent\`
        - \`Z3 %\` -> \`zone3Percent\`
        - \`Z4 %\` -> \`zone4Percent\`
        - \`notes\` -> \`notes\`

    - **Si \`{{{fileName}}}\` contiene 'HeartWatch.csv' (general) o 'HeartWatch-Detalles.csv'**: Procesa como datos de **Vitales**.
        - Extrae y mapea los siguientes campos a \`vitals\`:
        - \`date\` -> \`date\`
        - \`Daily HR Average\` -> \`dailyAvgHeartRate\`
        - \`Sedentary HR Average\` -> \`sedentaryAvgHeartRate\`
        - \`Waking Glucose\` -> \`wakingGlucose\`
        - \`Daily Glucose Average\` -> \`dailyAvgGlucose\`
        - \`Lowest Glucose\` -> \`minGlucose\`
        - \`Highest Glucose\` -> \`maxGlucose\`
        - \`Sleeping HRV\` -> \`sleepingHRV\`
        - \`Waking HRV\` -> \`wakingHRV\`
        - \`Resting HR\` -> \`restingHeartRate\`
        - \`2 Min Recovery\` -> \`postWorkoutRecovery\`
        - \`AM BP\` -> \`morningBP\`
        - \`PM BP\` -> \`eveningBP\`
        - \`Body Temp\` -> \`bodyTemperature\`
        - \`Daily SpO2 %\` -> \`dailySPO2\`
        - \`Sleep SpO2 %\` -> \`sleepSPO2\`

4.  **Generación de Respuesta**:
    -   Crea un resumen de 1-2 frases sobre el contenido del archivo procesado.
    -   Rellena los objetos de datos (\`sleepData\`, \`workouts\`, \`vitals\`) con todas las métricas encontradas, agrupadas por fecha.
    -   La respuesta final debe ser **únicamente** el objeto JSON que se adhiere al esquema de salida. Si el archivo está vacío o no es relevante, devuelve un objeto vacío para todos los campos de datos.

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
