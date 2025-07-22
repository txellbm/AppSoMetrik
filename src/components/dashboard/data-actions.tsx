"use client";

import { useState, useRef } from "react";
import { processHealthDataFile, ProcessHealthDataFileOutput } from "@/ai/flows/process-health-data-file";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Apple, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DataActionsProps = {
  onDataProcessed: (data: ProcessHealthDataFileOutput) => void;
};

export default function DataActions({ onDataProcessed }: DataActionsProps) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setFileName(file.name);
      setSummary("");

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            throw new Error("El archivo está vacío.");
          }
          const result = await processHealthDataFile({ fileContent: content });
          setSummary(result.summary);
          onDataProcessed(result);
          toast({
            title: "Archivo procesado",
            description: "Se ha generado un nuevo resumen de salud y los datos del panel se han actualizado.",
          });
        } catch (error) {
          console.error("No se pudo procesar el archivo:", error);
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          setSummary(`Lo sentimos, hubo un error al procesar tu archivo: ${errorMessage}`);
          toast({
            variant: "destructive",
            title: "Error de procesamiento",
            description: "No se pudo generar un resumen a partir del archivo subido.",
          });
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        console.error("Error al leer el archivo");
        setSummary("Lo sentimos, hubo un error al leer el archivo.");
        setIsLoading(false);
      }
      reader.readAsText(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Datos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".csv,.txt,.json"
        />
        <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Procesando {fileName}...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arrastra y suelta o sube un archivo</p>
              <Button variant="outline" size="sm" onClick={handleUploadClick}>
                <FileText className="mr-2 h-4 w-4" /> Subir Archivo
              </Button>
            </>
          )}
        </div>
        <Button variant="secondary" className="w-full" disabled>
          <Apple className="mr-2 h-4 w-4" /> Conectar a Apple Health
        </Button>
        <div className="space-y-2">
          <Textarea
            readOnly
            value={summary}
            className="mt-2 h-32 text-sm"
            placeholder="El resumen de tu archivo de salud aparecerá aquí..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
