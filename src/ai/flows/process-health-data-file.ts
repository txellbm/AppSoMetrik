
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
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de varios archivos CSV, como los de HeartWatch. Tu tarea es analizar el contenido del archivo, identificar qué tipo de datos contiene (resumen de entreno, detalles de entreno, métricas generales de salud), extraer la información relevante y devolverla en un formato JSON estructurado.

**Pista de Contenido (Basado en el Nombre del Archivo):** {{{fileName}}}
- Si el nombre incluye “Resumen-Entrenamientos”: es probable que sea un resumen de entrenos.
- Si incluye “Entrenamientos-Detalles”: es probable que sea un archivo detallado de entreno.
- Si incluye “HeartWatch-Detalles”: es probable que contenga métricas generales de salud.
Usa esta pista junto con el contenido del archivo para el procesamiento más preciso. Si no puedes determinar el tipo de archivo, haz tu mejor esfuerzo para extraer los datos basándote en las cabeceras.

Instrucciones de Procesamiento:
1.  **Identifica el tipo de archivo**: Analiza las cabeceras y el contenido para determinar si es un resumen de entrenos, un archivo detallado de entreno (con datos cada 5 segundos) o métricas generales de salud.
2.  **Extrae Métricas Generales**: Busca y extrae métricas como la frecuencia cardíaca en reposo (lpm), la variabilidad de la frecuencia cardíaca (VFC o HRV) y la recuperación (%). Si no están presentes, devuélvelas como 0.
3.  **Procesa Datos de Entrenamiento**:
    -   Si es un archivo de **resumen de entrenos**, extrae cada entreno con su fecha, nombre, distancia, calorías, duración y frecuencia cardíaca promedio.
    -   Si es un archivo de **entrenos detallados** (múltiples filas por sesión), sigue estas reglas:
        a.  **Agrupa** las filas por entreno usando las columnas 'Fecha', 'Entrenamiento' y 'Entrenamiento-Tipo'.
        b.  Para cada grupo, **calcula la duración total en horas** usando la fórmula: \`(Número de filas * 5) / 3600\`.
        c.  Para cada grupo, **calcula la frecuencia cardíaca promedio (lpm)**, promediando los valores de la columna 'lpm'.
        d.  Crea un objeto de entreno para cada grupo con todos los datos (fecha, nombre, distancia, calorías, duración calculada y FC promedio calculada).
4.  **Extrae Datos de Sueño**: Proporciona los datos de sueño de los últimos 7 días si están disponibles. Los días deben ser abreviaturas (Lun, Mar, Mié, Jue, Vie, Sáb, Dom).
5.  **Calcula Anillos de Actividad**: Calcula los porcentajes para los anillos de Moverse, Ejercicio y Pararse basándote en objetivos estándar (ej. 600 kcal, 30 min, 12 horas). Si los datos no están disponibles, haz una estimación razonable o devuélvelos como 0.
6.  **Consolidación**: El objetivo es devolver solo los datos extraídos del archivo actual. La consolidación de múltiples archivos se realizará fuera de este flujo. No intentes unificar datos aquí.

Contenido del Archivo:
{{{fileContent}}}

Genera un resumen conciso y los datos estructurados extraídos del archivo.`,
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
