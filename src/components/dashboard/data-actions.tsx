
"use client";

import { useState, useRef, useCallback } from "react";
import { processHealthDataFile } from "@/ai/flows/process-health-data-file";
import { ProcessHealthDataFileOutput } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Apple, Loader2, BrainCircuit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { cn } from "@/lib/utils";

type DataActionsProps = {
  onDataProcessed: (data: ProcessHealthDataFileOutput[]) => void;
  onGenerateReport: () => void;
};

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

  const processAndUploadFiles = async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay archivos seleccionados",
        description: "Por favor, selecciona o arrastra los archivos que deseas subir.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const uploadPromises = files.map(file => {
        const storageRef = ref(storage, `uploads/${file.name}`);
        return uploadBytes(storageRef, file).then(() => file); // Pass the file along
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      const processingPromises = uploadedFiles.map(file => {
          return new Promise<ProcessHealthDataFileOutput>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = async (e) => {
                  try {
                      const content = e.target?.result as string;
                      if (!content) throw new Error(`El archivo ${file.name} está vacío.`);
                      const result = await processHealthDataFile({ fileContent: content, fileName: file.name });
                      resolve(result);
                  } catch (error) {
                      reject(error);
                  }
              };
              reader.onerror = () => reject(new Error(`Error al leer el archivo ${file.name}`));
              reader.readAsText(file);
          });
      });

      const results = await Promise.all(processingPromises);
      onDataProcessed(results);

      toast({
        title: "Archivos subidos y procesados",
        description: `${files.length} archivo(s) procesado(s) correctamente. Tu panel se ha actualizado.`,
      });
      setFiles([]); // Clear file list after successful upload

    } catch (error) {
        console.error("No se pudieron subir o procesar los archivos:", error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Datos</CardTitle>
        <CardDescription>Sube archivos o genera un informe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
            className={cn(
                "p-4 border-2 border-dashed rounded-lg text-center space-y-2 transition-colors",
                isDragging ? "border-primary bg-primary/10" : "border-border"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              accept=".csv,.txt,.json"
              multiple
            />
            <div className="flex flex-col items-center justify-center space-y-2 h-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arrastra y suelta o haz clic para subir</p>
            </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Archivos para subir:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                   <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
            <Button className="w-full" onClick={processAndUploadFiles} disabled={isLoading || files.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Subir {files.length > 0 ? `(${files.length})` : ''}
                </>
              )}
            </Button>
            <Button variant="secondary" className="w-full" onClick={onGenerateReport}>
                <BrainCircuit className="mr-2 h-4 w-4" /> Generar Informe Detallado
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" className="w-full">
                  <Apple className="mr-2 h-4 w-4" /> Conectar a Apple Health
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conexión con Apple Health</AlertDialogTitle>
                  <AlertDialogDescription>
                    La integración directa con Apple Health desde una aplicación web no es posible por las políticas de privacidad de Apple. La conexión requeriría una aplicación nativa de iOS que sincronice los datos con la nube.
                    <br/><br/>
                    Esta funcionalidad está planificada para el futuro. Por ahora, puedes seguir subiendo tus datos exportados manualmente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction>Entendido</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
