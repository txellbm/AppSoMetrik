
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
};

// This constant defines how many rows of a CSV are sent to the AI in one go.
// A smaller chunk size is more reliable but slower. A larger one is faster but risks hitting token limits.
const CHUNK_SIZE = 500; 

export default function DataActions({ onDataProcessed, onGenerateReport }: DataActionsProps) {
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

  // Processes a single CSV's content in smaller pieces (chunks)
  // to avoid hitting the AI model's token limit.
  const processFileInChunks = async (fileContent: string, fileName: string): Promise<ProcessHealthDataFileOutput | null> => {
      const lines = fileContent.split('\n');
      const header = lines[0];
      const dataRows = lines.slice(1);
      
      // If the file is empty or just has a header, skip it.
      if (dataRows.length === 0 || (dataRows.length === 1 && dataRows[0].trim() === '')) {
          return null;
      }
      
      let aggregatedResult: ProcessHealthDataFileOutput = {
          summary: "", // The summary is generated per-file, the last one will be used.
          workouts: [],
          dailyMetrics: [],
      };

      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
          const chunkRows = dataRows.slice(i, i + CHUNK_SIZE);
          const chunkContent = [header, ...chunkRows].join('\n');
          
          try {
              const chunkResult = await processHealthDataFile({ fileContent: chunkContent, fileName });
              // Aggregate workouts from the chunk
              if (chunkResult.workouts) {
                aggregatedResult.workouts.push(...chunkResult.workouts);
              }
              // Aggregate and merge daily metrics from the chunk
              if (chunkResult.dailyMetrics) {
                 chunkResult.dailyMetrics.forEach(newMetric => {
                    const existingMetricIndex = aggregatedResult.dailyMetrics.findIndex(m => m.date === newMetric.date);
                    if (existingMetricIndex > -1) {
                        // Merge new metric data into the existing day's metric object
                        aggregatedResult.dailyMetrics[existingMetricIndex] = {
                            ...aggregatedResult.dailyMetrics[existingMetricIndex],
                            ...newMetric
                        };
                    } else {
                        // Add the new day's metric object
                        aggregatedResult.dailyMetrics.push(newMetric);
                    }
                });
              }
              aggregatedResult.summary = chunkResult.summary; 
          } catch (error) {
              console.error(`Error processing chunk for ${fileName}:`, error);
              // Don't stop processing other files, just this one.
              return null;
          }
      }
      return aggregatedResult;
  }

  // Handles a single file (either a CSV or a ZIP)
  const processSingleFile = async (file: File): Promise<ProcessHealthDataFileOutput | null> => {
    if (file.name.toLowerCase().endsWith('.zip')) {
        return processZipFile(file);
    }
    if (file.name.toLowerCase().endsWith('.csv')) {
        const content = await file.text();
        if (!content) return null;
        return await processFileInChunks(content, file.name);
    }
    return null; // Ignore other file types
  };
  
  // Unzips a file and processes each CSV inside it sequentially.
  const processZipFile = async (file: File): Promise<ProcessHealthDataFileOutput> => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    let filesProcessed = 0;
    
    let combinedResult: ProcessHealthDataFileOutput = {
      summary: "",
      workouts: [],
      dailyMetrics: [],
    };

    const csvFiles = Object.values(zip.files).filter(f => !f.dir && f.name.toLowerCase().endsWith('.csv'));

    for (const zipEntry of csvFiles) {
        const content = await zipEntry.async('string');
        if (!content) continue;

        const fileResult = await processFileInChunks(content, zipEntry.name);

        if (fileResult) {
            // Aggregate workouts
            if (fileResult.workouts) combinedResult.workouts.push(...fileResult.workouts);
            // Aggregate and merge daily metrics
            if (fileResult.dailyMetrics) {
                fileResult.dailyMetrics.forEach(newMetric => {
                    const existingMetricIndex = combinedResult.dailyMetrics.findIndex(m => m.date === newMetric.date);
                    if (existingMetricIndex > -1) {
                        combinedResult.dailyMetrics[existingMetricIndex] = { ...combinedResult.dailyMetrics[existingMetricIndex], ...newMetric };
                    } else {
                        combinedResult.dailyMetrics.push(newMetric);
                    }
                });
            }
        }
        filesProcessed++;
    }
    
    combinedResult.summary = `Procesados ${filesProcessed} archivos del ZIP.`;
    return combinedResult;
  };

  // Main function to start the processing of all selected files
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
      // Process each selected file (can be a mix of ZIPs and CSVs)
      for (const file of files) {
        const result = await processSingleFile(file);

        if (result) {
            // Aggregate and merge results from each file into one final object
            if(result.dailyMetrics) {
                 result.dailyMetrics.forEach(newMetric => {
                    const existingMetricIndex = allProcessedData.dailyMetrics.findIndex(m => m.date === newMetric.date);
                    if (existingMetricIndex > -1) {
                        allProcessedData.dailyMetrics[existingMetricIndex] = { ...allProcessedData.dailyMetrics[existingMetricIndex], ...newMetric };
                    } else {
                        allProcessedData.dailyMetrics.push(newMetric);
                    }
                });
            }
            if(result.workouts) allProcessedData.workouts.push(...result.workouts);
        }
      }
      
      // Once all files are processed, send the complete, aggregated data to the parent component
      // to be saved in Firestore.
      onDataProcessed(allProcessedData);

      toast({
        title: "Archivos procesados",
        description: `Se completó el análisis de ${files.length} archivo(s). Tu panel se ha actualizado.`,
      });
      setFiles([]); // Clear file list after successful processing

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
        <CardDescription>Sube archivos (CSV, ZIP) o genera un informe.</CardDescription>
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
        </div>
      </CardContent>
    </Card>
  );
}
