
"use client";

import { useState, useRef } from "react";
import { processHealthDataFile } from "@/ai/flows/process-health-data-file";
import { ProcessHealthDataFileOutput } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, BrainCircuit, Trash2, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type DataActionsProps = {
  onDataProcessed: (data: ProcessHealthDataFileOutput) => void;
  onGenerateReport: () => void;
};

const CHUNK_SIZE = 500; // Process 500 rows at a time

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

  const processFileInChunks = async (fileContent: string, fileName: string) => {
      const lines = fileContent.split('\n');
      const header = lines[0];
      const dataRows = lines.slice(1);
      const totalChunks = Math.ceil(dataRows.length / CHUNK_SIZE);
      let aggregatedResult: ProcessHealthDataFileOutput = {
          summary: "",
          workouts: [],
          sleepData: [],
          menstrualData: [],
      };

      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
          const chunkRows = dataRows.slice(i, i + CHUNK_SIZE);
          const chunkContent = [header, ...chunkRows].join('\n');
          
          try {
              const chunkResult = await processHealthDataFile({ fileContent: chunkContent, fileName });
              // Aggregate results
              aggregatedResult.workouts.push(...chunkResult.workouts);
              aggregatedResult.sleepData.push(...chunkResult.sleepData);
              aggregatedResult.menstrualData.push(...chunkResult.menstrualData);
              // We can build a more detailed summary later if needed
              aggregatedResult.summary = chunkResult.summary; 
          } catch (error) {
              console.error(`Error processing chunk for ${fileName}:`, error);
              toast({
                  variant: "destructive",
                  title: `Error en el archivo ${fileName}`,
                  description: `No se pudo procesar una parte del archivo.`,
              });
              // Stop processing this file if a chunk fails
              return;
          }
      }
      onDataProcessed(aggregatedResult);
  }

  const processSingleFile = async (file: File) => {
    const content = await file.text();
    if (!content) {
      toast({
        variant: "destructive",
        title: "Archivo vacío",
        description: `El archivo ${file.name} parece estar vacío.`,
      });
      return;
    }
    await processFileInChunks(content, file.name);
  };
  
  const processZipFile = async (file: File) => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.csv')) {
        const content = await zipEntry.async('string');
        if (!content) {
          console.warn(`Archivo vacío en ZIP: ${zipEntry.name}`);
          continue;
        }
        await processFileInChunks(content, zipEntry.name);
      }
    }
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
    
    try {
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          await processZipFile(file);
        } else {
          await processSingleFile(file);
        }
      }

      toast({
        title: "Archivos procesados correctamente",
        description: `${files.length} archivo(s) analizado(s). Tu panel se ha actualizado.`,
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
              accept=".csv,.txt,.json,.zip"
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
