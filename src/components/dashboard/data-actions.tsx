

"use client";

import { useState, useRef } from "react";
import { processHealthDataFile } from "@/ai/flows/process-health-data-file";
import { ProcessHealthDataFileOutput, Workout, DailyMetric } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, BrainCircuit, Trash2, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type DataActionsProps = {
  onDataProcessed: (data: ProcessHealthDataFileOutput) => void;
  onGenerateReport: () => void;
  onDeleteAllData: () => void;
};

// This constant defines how many rows of a CSV are sent to the AI in one go.
// A smaller chunk size is more reliable but slower. A larger one is faster but risks hitting token limits.
const CHUNK_SIZE = 500; 

// Helper function to deeply merge two dailyMetric objects.
const mergeDailyMetrics = (existingMetric: DailyMetric, newMetric: DailyMetric): DailyMetric => {
    const merged: DailyMetric = { ...existingMetric };

    for (const key in newMetric) {
        const aKey = key as keyof DailyMetric;
        const newValue = newMetric[aKey];

        if (aKey === 'date' || newValue === undefined || newValue === null) continue;
        
        // Handle array merging for symptoms
        if (aKey === 'sintomas' && Array.isArray(newValue) && newValue.length > 0) {
            merged.sintomas = [...(merged.sintomas || []), ...newValue];
            continue;
        }

        // Overwrite only if the new value is not a default/empty one
        if (newValue !== 0 && newValue !== '' && !Number.isNaN(newValue)) {
            (merged as any)[aKey] = newValue;
        }
    }
    return merged;
};

// Helper function to aggregate processed data into a combined result
const aggregateResults = (combinedResult: ProcessHealthDataFileOutput, fileResult: ProcessHealthDataFileOutput | null) => {
    if (!fileResult) return;

    if (fileResult.workouts && fileResult.workouts.length > 0) {
        combinedResult.workouts.push(...fileResult.workouts);
    }

    if (fileResult.dailyMetrics && fileResult.dailyMetrics.length > 0) {
        fileResult.dailyMetrics.forEach(newMetric => {
            if (!newMetric.date) return; // Skip metrics without a date
            const existingMetricIndex = combinedResult.dailyMetrics.findIndex(m => m.date === newMetric.date);
            if (existingMetricIndex > -1) {
                combinedResult.dailyMetrics[existingMetricIndex] = mergeDailyMetrics(
                    combinedResult.dailyMetrics[existingMetricIndex],
                    newMetric
                );
            } else {
                combinedResult.dailyMetrics.push(newMetric);
            }
        });
    }
    
    combinedResult.summary += (fileResult.summary || "") + " ";
};


export default function DataActions({ onDataProcessed, onGenerateReport, onDeleteAllData }: DataActionsProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = (newFiles: FileList | null) => {
    if (newFiles) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(newFiles)]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  }

  const processFileInChunks = async (fileContent: string, fileName: string): Promise<ProcessHealthDataFileOutput> => {
      const lines = fileContent.split('\n');
      const header = lines[0];
      const dataRows = lines.slice(1);
      
      let aggregatedResult: ProcessHealthDataFileOutput = {
          summary: "",
          workouts: [],
          dailyMetrics: [],
      };
      
      if (dataRows.length === 0 || (dataRows.length === 1 && dataRows[0].trim() === '')) {
          console.log(`[!] Archivo omitido (vacío o solo encabezado): ${fileName}`);
          return aggregatedResult;
      }
      
      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
          const chunkRows = dataRows.slice(i, i + CHUNK_SIZE);
          const chunkContent = [header, ...chunkRows].join('\n');
          
          try {
            const chunkResult = await processHealthDataFile({ fileContent: chunkContent, fileName });
            aggregateResults(aggregatedResult, chunkResult);
          } catch(e) {
             console.error(`[❌] Error al procesar un trozo del archivo ${fileName}:`, e);
          }
      }
      return aggregatedResult;
  }

  const processZipFile = async (file: File): Promise<ProcessHealthDataFileOutput> => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    
    let combinedResult: ProcessHealthDataFileOutput = {
      summary: "",
      workouts: [],
      dailyMetrics: [],
    };

    const csvFiles = Object.values(zip.files).filter(f => !f.dir && f.name.toLowerCase().endsWith('.csv'));

    for (const zipEntry of csvFiles) {
        console.log(`%c[▶️] Procesando archivo del ZIP: ${zipEntry.name}`, 'color: blue; font-weight: bold;');
        try {
            const content = await zipEntry.async('string');
            if (!content || content.trim() === '') {
                 console.log(`[!] Archivo omitido (vacío): ${zipEntry.name}`);
                 continue;
            }

            const fileResult = await processFileInChunks(content, zipEntry.name);
            const metricsFound = fileResult.dailyMetrics.length;
            const workoutsFound = fileResult.workouts.length;
            
            console.log(`[✅] Archivo procesado: ${zipEntry.name}. Métricas/días encontrados: ${metricsFound}, Entrenamientos: ${workoutsFound}.`);
            console.log("Datos extraídos:", fileResult);
            
            aggregateResults(combinedResult, fileResult);
        } catch(error) {
            console.error(`[❌] Error al procesar el archivo ${zipEntry.name}:`, error);
            toast({
                variant: "destructive",
                title: `Error en ${zipEntry.name}`,
                description: `Este archivo no se pudo procesar y fue omitido.`
            });
        }
    }
    
    return combinedResult;
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay archivos seleccionados",
        description: "Por favor, selecciona o arrastra los archivos que deseas procesar.",
      });
      return;
    }

    setIsLoading(true);
    let allProcessedData: ProcessHealthDataFileOutput = { summary: "", dailyMetrics: [], workouts: [] };
    
    try {
      for (const file of files) {
          let result: ProcessHealthDataFileOutput | null = null;
          if (file.name.toLowerCase().endsWith('.zip')) {
              result = await processZipFile(file);
          } else if (file.name.toLowerCase().endsWith('.csv')) {
              console.log(`%c[▶️] Procesando archivo único: ${file.name}`, 'color: blue; font-weight: bold;');
              const content = await file.text();
              if (content) {
                  result = await processFileInChunks(content, file.name);
                  const metricsFound = result.dailyMetrics.length;
                  const workoutsFound = result.workouts.length;
                  console.log(`[✅] Archivo procesado: ${file.name}. Métricas/días encontrados: ${metricsFound}, Entrenamientos: ${workoutsFound}.`);
                  console.log("Datos extraídos:", result);
              }
          }
          aggregateResults(allProcessedData, result);
      }
      
      console.log("%c[📊] Datos finales agregados para guardar en Firestore:", 'color: green; font-weight: bold;', allProcessedData);
      onDataProcessed(allProcessedData);

      toast({
        title: "Archivos procesados",
        description: `Se completó el análisis de ${files.length} archivo(s). Tu panel se ha actualizado.`,
      });
      setFiles([]);

    } catch (error) {
        console.error("No se pudieron procesar los archivos:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        toast({
          variant: "destructive",
          title: "Error de procesamiento",
          description: `No se pudo procesar uno o más archivos: ${errorMessage}`,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.zip')) {
        return <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Datos</CardTitle>
        <CardDescription>Sube archivos, genera informes o limpia tus datos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
            className={cn(
                "p-4 border-2 border-dashed rounded-lg text-center space-y-2 transition-colors",
                "flex flex-col items-center justify-center h-32 cursor-pointer",
                isDragging ? "border-primary bg-primary/10" : "border-border"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              accept=".csv,.zip"
              multiple
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arrastra y suelta o haz clic para subir</p>
            </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Archivos para procesar:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                   <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(file.name)}
                    <span className="text-sm truncate" title={file.name}>{file.name}</span>
                   </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-2">
            <Button className="w-full" onClick={processFiles} disabled={isLoading || files.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Procesar {files.length > 0 ? `(${files.length})` : ''}
                </>
              )}
            </Button>
            <Button variant="secondary" className="w-full" onClick={onGenerateReport}>
                <BrainCircuit className="mr-2 h-4 w-4" /> Generar Informe Detallado
            </Button>
            <Button variant="destructive" className="w-full" onClick={onDeleteAllData}>
                <Trash2 className="mr-2 h-4 w-4" /> Borrar Datos Anteriores
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
