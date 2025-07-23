
"use client";

import { useState, useRef } from "react";
import { processHealthDataFile } from "@/ai/flows/process-health-data-file";
import { ProcessHealthDataFileOutput, HealthSummaryInput, DashboardData } from "@/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, BrainCircuit, Trash2, FileArchive, Calendar, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateHealthSummary } from "@/ai/flows/ai-health-summary";
import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";


const CHUNK_SIZE = 500; 

const aggregateResults = (combined: ProcessHealthDataFileOutput, chunkResult: ProcessHealthDataFileOutput) => {
    if (chunkResult.summary) {
        combined.summary = combined.summary ? `${combined.summary} ${chunkResult.summary}` : chunkResult.summary;
    }

    if (chunkResult.workouts) {
        combined.workouts.push(...chunkResult.workouts);
    }
    
    if (chunkResult.dailyMetrics) {
        chunkResult.dailyMetrics.forEach(newMetric => {
            const existingMetricIndex = combined.dailyMetrics.findIndex(m => m.date === newMetric.date);
            if (existingMetricIndex !== -1) {
                const existingMetric = combined.dailyMetrics[existingMetricIndex];
                combined.dailyMetrics[existingMetricIndex] = { ...existingMetric, ...newMetric };
            } else {
                combined.dailyMetrics.push(newMetric);
            }
        });
    }
};

export default function DataPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const userId = "user_test_id";

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData>({ workouts: [], dailyMetrics: [] }); // Local state for report generation

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

  const handleDataProcessed = async (processedData: ProcessHealthDataFileOutput) => {
    if (!processedData || (!processedData.workouts?.length && !processedData.dailyMetrics?.length)) {
        toast({ title: "Sin datos nuevos", description: "El archivo no contenía información relevante." });
        return;
    }
    const { workouts, dailyMetrics } = processedData;
    const batch = writeBatch(db);
    const userRef = doc(db, "users", userId);
    let changesCount = 0;

    if (dailyMetrics) {
      for (const item of dailyMetrics) {
          if (!item.date) continue;
          const docRef = doc(userRef, "dailyMetrics", item.date);
          batch.set(docRef, item, { merge: true });
          changesCount++;
      }
    }

    if (workouts) {
        workouts.forEach(item => {
            if (!item.date || !item.tipo) return;
            const docId = `${item.date}_${item.tipo.replace(/\s+/g, '')}_${Math.random().toString(36).substring(2, 9)}`;
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

  const processFileInChunks = async (fileContent: string, fileName: string): Promise<ProcessHealthDataFileOutput> => {
      const lines = fileContent.split('\n');
      const header = lines[0];
      const dataRows = lines.slice(1);
      
      let aggregatedResult: ProcessHealthDataFileOutput = { summary: "", workouts: [], dailyMetrics: [] };
      
      if (dataRows.length === 0 || (dataRows.length === 1 && dataRows[0].trim() === '')) {
          console.log(`[!] Archivo omitido (vacío): ${fileName}`);
          return aggregatedResult;
      }
      
      for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
          const chunkRows = dataRows.slice(i, i + CHUNK_SIZE);
          const chunkContent = [header, ...chunkRows].join('\n');
          try {
            const chunkResult = await processHealthDataFile({ fileContent: chunkContent, fileName });
            if (chunkResult) aggregateResults(aggregatedResult, chunkResult);
          } catch(e) {
             console.error(`[❌] Error procesando chunk de ${fileName}:`, e);
             toast({ variant: "destructive", title: `Error en chunk de ${fileName}`, description: "Se omitió una parte de este archivo." });
          }
      }
      return aggregatedResult;
  }

  const processZipFile = async (file: File): Promise<ProcessHealthDataFileOutput> => {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    let combinedResult: ProcessHealthDataFileOutput = { summary: "", workouts: [], dailyMetrics: [] };
    const csvFiles = Object.values(zip.files).filter(f => !f.dir && f.name.toLowerCase().endsWith('.csv') && !f.name.startsWith('__MACOSX'));

    for (const zipEntry of csvFiles) {
        console.log(`%c[▶️] Procesando archivo del ZIP: ${zipEntry.name}`, 'color: blue; font-weight: bold;');
        try {
            const content = await zipEntry.async('string');
            if (!content || content.trim() === '') {
                 console.log(`[!] Archivo omitido (vacío): ${zipEntry.name}`);
                 continue;
            }
            const fileResult = await processFileInChunks(content, zipEntry.name);
            console.log(`[✅] Archivo procesado: ${zipEntry.name}. Métricas/días: ${fileResult.dailyMetrics.length}, Entrenamientos: ${fileResult.workouts.length}.`);
            aggregateResults(combinedResult, fileResult);
        } catch(error) {
            console.error(`[❌] Error al procesar ${zipEntry.name}:`, error);
            toast({ variant: "destructive", title: `Error en ${zipEntry.name}`, description: `Este archivo fue omitido.` });
        }
    }
    return combinedResult;
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast({ variant: "destructive", title: "No hay archivos seleccionados" });
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
              console.log(`%c[▶️] Procesando archivo: ${file.name}`, 'color: blue; font-weight: bold;');
              const content = await file.text();
              if (content) result = await processFileInChunks(content, file.name);
          }
          if (result) aggregateResults(allProcessedData, result);
      }
      console.log("%c[📊] Datos finales agregados:", 'color: green; font-weight: bold;', allProcessedData);
      onDataProcessed(allProcessedData);
      toast({ title: "Archivos procesados", description: `Análisis de ${files.length} archivo(s) completado.` });
      setFiles([]);
    } catch (error) {
        console.error("No se pudieron procesar los archivos:", error);
        toast({ variant: "destructive", title: "Error de procesamiento", description: `No se pudo procesar uno o más archivos.` });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm("¿Estás seguro de que quieres borrar todos tus datos? Esta acción es irreversible.")) return;
    const userRef = doc(db, "users", userId);
    const collectionsToDelete = ["workouts", "dailyMetrics", "supplements", "calendar"];
    try {
        const batch = writeBatch(db);
        for (const coll of collectionsToDelete) {
             const snapshot = await getDocs(collection(userRef, coll));
             snapshot.forEach(doc => {
                 if (coll === "calendar") { // Handle nested collections if any
                     const eventsRef = collection(doc.ref, "events");
                     getDocs(eventsRef).then(eventsSnap => eventsSnap.forEach(eventDoc => batch.delete(eventDoc.ref)));
                 }
                 batch.delete(doc.ref);
             });
        }
        await batch.commit();
        toast({ title: "Datos eliminados", description: "Todos los datos han sido borrados.", variant: "destructive" });
    } catch (error) {
        console.error("Error al borrar datos:", error);
        toast({ variant: "destructive", title: "Error al borrar", description: "No se pudieron eliminar los datos." });
    }
  };
  
  const handleGenerateReport = async (period: 'Diario' | 'Semanal' | 'Mensual' | 'Completo') => {
    setIsReportDialogOpen(true);
    setIsReportLoading(true);
    setReportContent("");
    try {
        // This is a simplified data fetching. In a real app, you'd fetch from Firestore based on the period.
        const input: HealthSummaryInput = {
            periodo: period,
            sleepData: "Datos de sueño no disponibles para este resumen.",
            exerciseData: "Datos de ejercicio no disponibles para este resumen.",
            heartRateData: "Datos de FC no disponibles para este resumen.",
            menstruationData: "Datos de ciclo no disponibles para este resumen.",
            supplementData: "Datos de suplementos no disponibles para este resumen.",
            foodIntakeData: "Datos de nutrición no disponibles para este resumen.",
            calendarData: "Datos de calendario no disponibles para este resumen.",
        };
        const result = await generateHealthSummary(input);
        setReportContent(result.summary);
    } catch (error) {
        console.error("Fallo al generar el informe:", error);
        setReportContent("Lo sentimos, no se pudo generar el informe.");
        toast({ variant: "destructive", title: "Error al generar informe" });
    } finally {
        setIsReportLoading(false);
    }
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportContent);
    toast({ title: "Informe copiado", description: "El informe ha sido copiado." });
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.zip')) return <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
    return <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Carga de Archivos</CardTitle>
            <CardDescription>Sube aquí tu archivo ZIP o CSV de Apple Health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
                className={cn("p-4 border-2 border-dashed rounded-lg text-center space-y-2 transition-colors flex flex-col items-center justify-center h-32 cursor-pointer", isDragging ? "border-primary bg-primary/10" : "border-border")}
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input type="file" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} className="hidden" accept=".csv,.zip" multiple />
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

        <Card>
            <CardHeader>
                <CardTitle>Acciones</CardTitle>
                <CardDescription>Genera informes o gestiona tus datos almacenados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                    <h4 className="font-medium text-sm">Generar Informe Detallado</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Button variant="secondary" onClick={() => handleGenerateReport('Diario')}><Sun className="mr-2 h-4 w-4" />Diario</Button>
                        <Button variant="secondary" onClick={() => handleGenerateReport('Semanal')}><Calendar className="mr-2 h-4 w-4" />Semanal</Button>
                        <Button variant="secondary" onClick={() => handleGenerateReport('Mensual')}><Moon className="mr-2 h-4 w-4" />Mensual</Button>
                        <Button variant="secondary" onClick={() => handleGenerateReport('Completo')}><FileArchive className="mr-2 h-4 w-4" />Completo</Button>
                    </div>
                </div>

                 <Button variant="destructive" className="w-full" onClick={handleDeleteAllData}>
                    <Trash2 className="mr-2 h-4 w-4" /> Borrar Todos los Datos
                </Button>
            </CardContent>
        </Card>

        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Informe de Salud Detallado</DialogTitle>
                    <DialogDescription>
                        Este es un informe completo basado en los datos seleccionados. Puedes copiarlo para usarlo con otra IA.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isReportLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    ) : (
                        <Textarea readOnly value={reportContent} className="h-96 text-sm" placeholder="Generando informe..." />
                    )}
                </div>
                <DialogClose asChild>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline">Cerrar</Button>
                        <Button onClick={handleCopyReport} disabled={isReportLoading || !reportContent}>Copiar Informe</Button>
                    </div>
                </DialogClose>
            </DialogContent>
        </Dialog>
    </div>
  );
}
