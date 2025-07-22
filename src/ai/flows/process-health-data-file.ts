'use server';

/**
 * @fileOverview Procesa un archivo de datos de salud y genera un resumen.
 *
 * - processHealthDataFile - Una función que toma el contenido de un archivo y devuelve un resumen de salud.
 * - ProcessHealthDataFileInput - El tipo de entrada para la función.
 * - ProcessHealthDataFileOutput - El tipo de salida para la función.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessHealthDataFileInputSchema = z.object({
  fileContent: z.string().describe('El contenido del archivo de datos de salud (por ejemplo, en formato CSV).'),
});
export type ProcessHealthDataFileInput = z.infer<
  typeof ProcessHealthDataFileInputSchema
>;

const ProcessHealthDataFileOutputSchema = z.object({
  summary: z
    .string()
    .describe('Un resumen completo de los datos de salud del archivo proporcionado.'),
});
export type ProcessHealthDataFileOutput = z.infer<
  typeof ProcessHealthDataFileOutputSchema
>;

export async function processHealthDataFile(
  input: ProcessHealthDataFileInput
): Promise<ProcessHealthDataFileOutput> {
  return processHealthDataFileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processHealthDataFilePrompt',
  input: {schema: ProcessHealthDataFileInputSchema},
  output: {schema: ProcessHealthDataFileOutputSchema},
  prompt: `Eres un asistente de salud de IA. Analiza el siguiente contenido de un archivo de datos de salud y genera un resumen completo. Los datos pueden estar en cualquier formato, como CSV o texto sin formato. Extrae la información relevante sobre sueño, ejercicio, frecuencia cardíaca, etc., y crea un resumen coherente.

Contenido del Archivo:
{{{fileContent}}}

Genera un resumen detallado y coherente.`,
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
