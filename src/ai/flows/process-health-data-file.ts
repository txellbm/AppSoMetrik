
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
  prompt: `Eres un asistente de salud de IA. Analiza el siguiente contenido de un archivo de datos de salud y genera un resumen completo y extrae los datos estructurados. Los datos pueden estar en cualquier formato, como CSV o texto sin formato. Extrae la información relevante sobre sueño, ejercicio, frecuencia cardíaca, etc., y crea un resumen coherente y rellena el objeto healthData.

Para los datos de sueño, proporciona los datos de los últimos 7 días. Si hay más, utiliza los 7 más recientes. Los días deben ser abreviaturas (Lun, Mar, Mié, Jue, Vie, Sáb, Dom).
Calcula los porcentajes de los anillos de actividad basándote en objetivos estándar (p. ej., 600 calorías para moverse, 30 minutos para ejercicio, 12 horas para pararse). Si los datos no están disponibles, haz una estimación razonable.
Extrae los detalles de cada entrenamiento, incluyendo nombre, distancia, calorías, duración en minutos y frecuencia cardíaca promedio, para rellenar la lista 'workouts'. Si los datos no están disponibles, proporciona una estimación razonable o una lista vacía.

Contenido del Archivo:
{{{fileContent}}}

Genera un resumen detallado y coherente y los datos estructurados.`,
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
