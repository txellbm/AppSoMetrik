
"use client";

import { useState, useRef } from "react";
import { processHealthDataFile } from "@/ai/flows/process-health-data-file";
import { ProcessHealthDataFileOutput } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Apple, Loader2, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";

type DataActionsProps = {
  onDataProcessed: (data: ProcessHealthDataFileOutput[]) => void;
};

export default function DataActions({ onDataProcessed }: DataActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = (file: File): Promise<ProcessHealthDataFileOutput> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                if (!content) {
                    throw new Error(`El archivo ${file.name} está vacío.`);
                }
                const result = await processHealthDataFile({ fileContent: content, fileName: file.name });
                resolve(result);
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
  
  const handleGenerateReport = () => {
    // This logic is now in the main page
    // We could trigger it from here via a callback if needed
    (document.getElementById('generate-report-button') as HTMLButtonElement)?.click();
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      const fileCount = files.length;
      setFileName(`${fileCount} archivo${fileCount > 1 ? 's' : ''}`);
      
      try {
        const uploadPromises = Array.from(files).map(file => {
          const storageRef = ref(storage, `uploads/${file.name}`);
          return uploadBytes(storageRef, file);
        });
        await Promise.all(uploadPromises);

        const processingPromises = Array.from(files).map(file => processFile(file));
        const results = await Promise.all(processingPromises);
        onDataProcessed(results);

        toast({
          title: "Archivos subidos y procesados",
          description: `${fileCount} archivo${fileCount > 1 ? 's' : ''} subido${fileCount > 1 ? 's' : ''} y procesado${fileCount > 1 ? 's' : ''} correctamente.`,
        });
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
            <Button variant="secondary" className="w-full" onClick={handleGenerateReport} id="generate-report-button-proxy">
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
                    Esta funcionalidad está planificada para el futuro. Por ahora, puedes seguir subiendo tus datos exportados manually.
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
