
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
  prompt: `Eres un asistente de salud de IA experto en analizar y consolidar datos de salud de varios archivos CSV y JSON. Tu tarea es analizar el contenido del archivo, identificar qué tipo de datos contiene, extraer la información relevante y devolverla en un formato JSON estructurado y válido.

**Instrucciones de Procesamiento:**

1.  **Detección Automática del Tipo de Archivo**:
    -   Analiza las cabeceras (para CSV) o las claves (para JSON) para identificar qué tipo de datos contiene el archivo.
    -   **Entrenamientos**: Busca cabeceras como 'Activity', 'Duration', 'Distance', 'Calories', 'Heart Rate'.
    -   **Sueño**: Busca cabeceras como 'Sleep Duration', 'Sleep Quality', 'Sleep Start', 'Sleep End'.
    -   **Salud General**: Busca cabeceras como 'Heart Rate Resting', 'HRV', 'Respiration'.
    -   **Ciclo Menstrual**: Busca claves como 'period', 'symptoms', 'flow', 'startDate', 'endDate'.
    -   Usa el nombre del archivo solo como una pista secundaria si está disponible: \`{{{fileName}}}\`.

2.  **Extracción y Homogeneización de Datos**:
    -   **Fechas**: Normaliza todas las fechas al formato YYYY-MM-DD.
    -   **Duración**: Convierte duraciones a formato 'hh:mm:ss'.
    -   **Métricas Numéricas**: Redondea los valores decimales a 1 o 2 decimales.
    -   **Valores Faltantes**: Si una métrica no está presente, usa su valor por defecto del esquema (0, "No disponible", o un array vacío) sin que cause un error.
    -   **Tiempos**: Mantén los \`startTime\` y \`endTime\` como strings simples ('18:30:05') sin procesar zonas horarias.

3.  **Generación de Respuesta**:
    -   Crea un resumen de 1-2 frases sobre el contenido del archivo. Si no puedes clasificarlo, el resumen debe indicarlo y el objeto \`healthData\` debe contener los valores por defecto.
    -   **IMPORTANTE**: Tu respuesta final debe ser únicamente el objeto JSON que se adhiere al esquema de salida. No incluyas ningún texto, explicación o carácter adicional fuera del JSON.

**Contenido del Archivo:**
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
    
