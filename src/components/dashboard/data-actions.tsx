
"use client";

import { useState, useRef } from "react";
import { processHealthDataFile } from "@/ai/flows/process-health-data-file";
import { ProcessHealthDataFileOutput } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Apple, Loader2, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DataActionsProps = {
  onDataProcessed: (data: ProcessHealthDataFileOutput) => void;
  onGenerateReport: () => void;
};

export default function DataActions({ onDataProcessed, onGenerateReport }: DataActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) {
                    throw new Error(`El archivo ${file.name} está vacío.`);
                }
                const result = await processHealthDataFile({ fileContent: content });
                onDataProcessed(result);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => {
            console.error(`Error al leer el archivo ${file.name}`);
            reject(new Error(`Error al leer el archivo ${file.name}`));
        };
        reader.readAsText(file);
    });
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      const fileCount = files.length;
      setFileName(`${fileCount} archivo${fileCount > 1 ? 's' : ''}`);
      
      try {
        for (const file of Array.from(files)) {
            await processFile(file);
        }
        toast({
          title: "Archivos procesados",
          description: `${fileCount} archivo${fileCount > 1 ? 's' : ''} procesado${fileCount > 1 ? 's' : ''} correctamente. El panel ha sido actualizado.`,
        });
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
          // Reset file input
          if(fileInputRef.current) {
            fileInputRef.current.value = "";
          }
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Datos</CardTitle>
        <CardDescription>Sube archivos o genera un informe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".csv,.txt,.json"
          multiple
        />
        <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-2 h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Procesando {fileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 h-24">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arrastra y suelta o sube archivos</p>
              <Button variant="outline" size="sm" onClick={handleUploadClick}>
                <FileText className="mr-2 h-4 w-4" /> Subir Archivos
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={onGenerateReport}>
                <BrainCircuit className="mr-2 h-4 w-4" /> Generar Informe Detallado
            </Button>
            <Button variant="secondary" className="w-full" disabled>
              <Apple className="mr-2 h-4 w-4" /> Conectar a Apple Health
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
