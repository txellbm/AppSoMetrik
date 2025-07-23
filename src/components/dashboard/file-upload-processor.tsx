
"use client";

import { useState, useRef } from "react";
import { processHealthDataFile, ProcessHealthDataFileOutput } from "@/ai/flows/process-health-data-file";
import { SleepData, WorkoutData, VitalsData } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Trash2, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type DataType = "sleepData" | "workouts" | "vitals";

type FileUploadProcessorProps = {
    title: string;
    description: string;
    dataType: DataType;
    userId: string;
};

export default function FileUploadProcessor({ title, description, dataType, userId }: FileUploadProcessorProps) {
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

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  
  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const processAndSaveData = async (processedData: ProcessHealthDataFileOutput) => {
    if (!processedData || (!processedData.sleepData && !processedData.workouts && !processedData.vitals)) {
        toast({ title: "Sin datos nuevos", description: "El archivo no contenía información relevante." });
        return;
    }
    
    const batch = writeBatch(db);
    const userRef = doc(db, "users", userId);
    let changesCount = 0;

    if (processedData.sleepData) {
        processedData.sleepData.forEach(item => {
            const docRef = doc(userRef, "sleep", item.date);
            batch.set(docRef, item, { merge: true });
            changesCount++;
        });
    }

    if (processedData.vitals) {
        processedData.vitals.forEach(item => {
            const docRef = doc(userRef, "vitals", item.date);
            batch.set(docRef, item, { merge: true });
            changesCount++;
        });
    }
    
    if (processedData.workouts) {
        processedData.workouts.forEach(item => {
            if (!item.date || !item.type) return;
            const docId = `${item.date}_${item.type.replace(/\s+/g, '')}_${Math.random().toString(36).substring(2, 9)}`;
            const docRef = doc(userRef, "workouts", docId);
            batch.set(docRef, item);
            changesCount++;
        });
    }

    if (changesCount === 0) {
      toast({ title: "Sin datos nuevos", description: "No se encontraron datos válidos para guardar." });
      return;
    }

    try {
        await batch.commit();
        toast({ title: "Datos procesados y guardados", description: `Se han actualizado/añadido ${changesCount} registros.` });
    } catch (error) {
        console.error("Error guardando datos en Firestore:", error);
        toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron guardar los datos." });
    }
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast({ variant: "destructive", title: "No hay archivos seleccionados" });
      return;
    }
    setIsLoading(true);
    try {
      for (const file of files) {
          console.log(`%c[▶️] Procesando archivo: ${file.name}`, 'color: blue; font-weight: bold;');
          const content = await file.text();
          if (content) {
            const result = await processHealthDataFile({ fileContent: content, fileName: file.name });
            console.log(`[✅] Archivo procesado: ${file.name}.`, result);
            // We only care about the specific data type for this uploader
            const filteredResult = {
                summary: result.summary,
                sleepData: dataType === 'sleepData' ? result.sleepData : undefined,
                workouts: dataType === 'workouts' ? result.workouts : undefined,
                vitals: dataType === 'vitals' ? result.vitals : undefined,
            };
            await processAndSaveData(filteredResult);
          }
      }
      toast({ title: "Archivos procesados", description: `Análisis de ${files.length} archivo(s) completado.` });
      setFiles([]);
    } catch (error) {
        console.error("No se pudieron procesar los archivos:", error);
        toast({ variant: "destructive", title: "Error de procesamiento", description: `No se pudo procesar uno o más archivos.` });
    } finally {
        setIsLoading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.zip')) return <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
    return <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
            className={cn("p-4 border-2 border-dashed rounded-lg text-center space-y-2 transition-colors flex flex-col items-center justify-center h-32 cursor-pointer", isDragging ? "border-primary bg-primary/10" : "border-border")}
            onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input type="file" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} className="hidden" accept=".csv" multiple />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arrastra y suelta o haz clic para subir</p>
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
        
        <Button className="w-full" onClick={processFiles} disabled={isLoading || files.length === 0}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : <><Upload className="mr-2 h-4 w-4" /> Procesar {files.length > 0 ? `(${files.length})` : ''}</>}
        </Button>
      </CardContent>
    </Card>
  );
}
