'use server';

/**
 * @fileOverview Procesa un archivo de datos de salud y genera un resumen y datos estructurados.
 *
 * - processHealthDataFile - Una función que toma el contenido de un archivo y devuelve un resumen y datos estructurados.
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

const HealthDataSchema = z.object({
  averageSleep: z.number().describe('Las horas de sueño promedio.'),
  activeCalories: z.number().describe('Las calorías activas quemadas.'),
  restingHeartRate: z.number().describe('La frecuencia cardíaca en reposo en lpm.'),
  hydrationLiters: z.number().describe('La ingesta de hidratación en litros.'),
  movePercentage: z.number().describe('El porcentaje del objetivo de movimiento.'),
  exercisePercentage: z.number().describe('El porcentaje del objetivo de ejercicio.'),
  standPercentage: z.number().describe('El porcentaje del objetivo de pararse.'),
  sleepData: z.array(z.object({
    day: z.string().describe("Día de la semana (ej. Lun, Mar)"),
    hours: z.number().describe("Horas de sueño para ese día"),
  })).describe('Datos de sueño de los últimos 7 días.'),
});

const ProcessHealthDataFileOutputSchema = z.object({
  summary: z
    .string()
    .describe('Un resumen completo de los datos de salud del archivo proporcionado.'),
  healthData: HealthDataSchema.describe("Datos de salud estructurados extraídos del archivo."),
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
  prompt: `Eres un asistente de salud de IA. Analiza el siguiente contenido de un archivo de datos de salud y genera un resumen completo y extrae los datos estructurados. Los datos pueden estar en cualquier formato, como CSV o texto sin formato. Extrae la información relevante sobre sueño, ejercicio, frecuencia cardíaca, etc., y crea un resumen coherente y rellena el objeto healthData.

Para los datos de sueño, proporciona los datos de los últimos 7 días. Si hay más, utiliza los 7 más recientes. Los días deben ser abreviaturas (Lun, Mar, Mié, Jue, Vie, Sáb, Dom).
Calcula los porcentajes de los anillos de actividad basándote en objetivos estándar (p. ej., 600 calorías para moverse, 30 minutos para ejercicio, 12 horas para pararse). Si los datos no están disponibles, haz una estimación razonable.

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
