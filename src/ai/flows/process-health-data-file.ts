
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
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de varios archivos CSV y JSON. Tu tarea es analizar el contenido del archivo, identificar qué tipo de datos contiene, extraer la información relevante y devolverla en un formato JSON estructurado y válido que se adhiera estrictamente al esquema de salida.

**Instrucciones Clave:**
1.  **Detección del Tipo de Archivo**: Analiza las cabeceras (para CSV) o la estructura (para JSON) para identificar el tipo de datos. Los nombres de archivo como 'AutoSleep', 'HeartWatch' o 'measurements.json' son pistas importantes.
2.  **Extracción Precisa**: Presta mucha atención a las unidades y formatos. Convierte duraciones a horas o minutos según corresponda. Asegúrate de que los campos numéricos (calorías, distancia, HRV, calidad, respiración, frecuencia cardíaca, readiness) se procesen como números (por ejemplo, usando parseFloat), no como texto. Si un valor no está presente o es inválido (ej. 'unknown', 'N/A'), usa los valores por defecto del esquema (ej. 0). No dejes campos como NaN.
3.  **Manejo de Archivos Específicos**:
    *   **AutoSleep CSV**: Extrae 'Sleep Session End Date', 'inBed', 'awake', 'deep', 'light', 'rem', 'quality' (calidad) y 'Readiness'. Calcula la duración total del sueño ('totalSleep') sumando 'deep', 'light' y 'rem'.
    *   **HeartWatch CSV (Sueño/Vitales)**: Extrae 'Date', 'Heart Rate Resting', 'HRV', 'Respiration' (Frecuencia Respiratoria). Estos datos a menudo se corresponden con una fecha de sueño. Intenta asociarlos a la entrada de sueño correcta si es posible.
    *   **HeartWatch Entrenamientos CSV**: Extrae 'Date', 'Activity', 'Duration (mins)', 'Active Calories', 'Distance (km)' y 'Average Heart Rate (bpm)'.
    *   **measurements.json (Clue)**: Procesa cada entrada. Si 'type' es 'period', extrae 'date' y 'value.option' (que corresponde al 'flow').
4.  **Generación de Respuesta**:
    -   Crea un resumen de 1-2 frases sobre el contenido del archivo.
    -   **IMPORTANTE**: Rellena los arrays correspondientes en el objeto de salida ('workouts', 'sleepData', 'menstrualData'). Si un archivo solo contiene datos de sueño, el array 'workouts' y 'menstrualData' deben estar vacíos.
    -   Tu respuesta final debe ser **únicamente** el objeto JSON que se adhiere al esquema. No incluyas ningún texto, explicación o carácter adicional fuera del JSON.

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
    

    


