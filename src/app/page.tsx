
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Moon, Dumbbell, HeartPulse, Stethoscope, LayoutDashboard, Pill, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateHealthSummary } from "@/ai/flows/ai-health-summary";
import { HealthSummaryInput, ProcessHealthDataFileOutput, Workout, DashboardData, CalculatedCycleData, DailyMetric } from "@/ai/schemas";
import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import DataActions from "@/components/dashboard/data-actions";
import NotificationsWidget from "@/components/dashboard/notifications-widget";
import { collection, writeBatch, onSnapshot, doc, getDocs, query, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { differenceInDays, format, isValid, parseISO, startOfToday } from "date-fns";
import SleepPage from "./(main)/sleep/page";
import WorkoutsPage from "./(main)/workouts/page";
import RecoveryPage from "./(main)/recovery/page";
import CyclePage from "./(main)/cycle/page";
import SupplementsPage from "./(main)/supplements/page";
import CalendarPage from "./(main)/calendar/page";


const initialDashboardData: DashboardData = {
  workouts: [],
  dailyMetrics: [],
};

const safeParseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Date && isValid(dateInput)) return dateInput;
    if (typeof dateInput === 'object' && dateInput.seconds) {
        const d = new Date(dateInput.seconds * 1000);
        return isValid(d) ? d : null;
    }
    if (typeof dateInput === 'string') {
        const localDate = new Date(dateInput + 'T00:00:00');
        if (isValid(localDate)) return localDate;
        const isoDate = parseISO(dateInput);
        if (isValid(isoDate)) return isoDate;
    }
    return null;
};


export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isReportLoading, setIsReportLoading] = useState(false);
  const { toast } = useToast();

  const userId = "user_test_id";

  useEffect(() => {
    const userRef = doc(db, "users", userId);
    const qWorkouts = query(collection(userRef, "workouts"));
    const qDailyMetrics = query(collection(userRef, "dailyMetrics"));

    const unsubWorkouts = onSnapshot(qWorkouts, (snapshot) => {
        const workouts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Workout[];
        setDashboardData(prev => ({ ...prev, workouts }));
    }, (error) => console.error("Error al cargar entrenamientos:", error));

    const unsubDailyMetrics = onSnapshot(qDailyMetrics, (snapshot) => {
        const dailyMetrics = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DailyMetric[];
        setDashboardData(prev => ({ ...prev, dailyMetrics }));
    }, (error) => console.error("Error al cargar métricas diarias:", error));

    return () => {
        unsubWorkouts();
        unsubDailyMetrics();
    };
}, [userId]);


  const handleDeleteAllData = async () => {
    if (!window.confirm("¿Estás seguro de que quieres borrar todos tus datos? Esta acción es irreversible.")) return;

    const userRef = doc(db, "users", userId);
    const workoutsRef = collection(userRef, "workouts");
    const dailyMetricsRef = collection(userRef, "dailyMetrics");
    const supplementsRef = collection(userRef, "supplements");
    const calendarRef = collection(userRef, "calendar");


    try {
        const batch = writeBatch(db);
        
        const deleteCollection = async (ref: any) => {
             const snapshot = await getDocs(ref);
             snapshot.forEach(doc => batch.delete(doc.ref));
        }

        await deleteCollection(workoutsRef);
        await deleteCollection(dailyMetricsRef);
        await deleteCollection(supplementsRef);

        // Calendar has nested collections
        const calendarSnapshot = await getDocs(calendarRef);
        for(const dateDoc of calendarSnapshot.docs) {
            const eventsRef = collection(dateDoc.ref, "events");
            await deleteCollection(eventsRef);
            batch.delete(dateDoc.ref);
        }

        await batch.commit();

        setDashboardData(initialDashboardData);
        toast({
            title: "Datos eliminados",
            description: "Todas las métricas, entrenamientos y suplementos han sido borrados.",
            variant: "destructive"
        });
    } catch (error) {
        console.error("Error al borrar los datos:", error);
        toast({
            variant: "destructive",
            title: "Error al borrar",
            description: "No se pudieron eliminar los datos. Inténtalo de nuevo.",
        });
    }
  };


 const handleDataProcessed = async (processedData: ProcessHealthDataFileOutput) => {
    if (!processedData || (!processedData.workouts?.length && !processedData.dailyMetrics?.length)) {
        toast({
            title: "Sin datos nuevos para procesar",
            description: "El archivo no contenía información relevante o ya estaba actualizada.",
        });
        return;
    }
    const { workouts, dailyMetrics } = processedData;
    const batch = writeBatch(db);
    const userRef = doc(db, "users", userId);
    let changesCount = 0;

    // Process daily metrics with merging for existing data
    if (dailyMetrics) {
      for (const item of dailyMetrics) {
          if (!item.date) continue;
          const docRef = doc(userRef, "dailyMetrics", item.date);
          
          try {
              // We use set with merge: true to create or update the document.
              // This will merge the new data with existing data if the document already exists.
              batch.set(docRef, item, { merge: true });
              changesCount++;
          } catch (e) {
              console.error(`Error processing metric for date ${item.date}:`, e);
          }
      }
    }

    // Process workouts by adding them to a subcollection
    if (workouts) {
        workouts.forEach(item => {
            if (!item.date || !item.tipo) return;
            // Create a unique ID for each workout to prevent overwrites on the same day
            const docId = `${item.date}_${item.tipo.replace(/\s+/g, '')}_${Math.random().toString(36).substring(2, 9)}`;
            const docRef = doc(userRef, "workouts", docId);
            batch.set(docRef, item);
            changesCount++;
        });
    }

    if (changesCount === 0) {
      toast({
          title: "Sin datos nuevos",
          description: "No se encontraron datos nuevos o válidos para guardar.",
          variant: "default",
      });
      return;
    }

    try {
        await batch.commit();
        toast({
            title: "Datos procesados y guardados",
            description: `Se han actualizado/añadido ${changesCount} registros.`,
        });
    } catch (error) {
        console.error("Error guardando los datos procesados en Firestore:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar los datos",
            description: "No se pudieron guardar los datos en la nube.",
        });
    }
  };


  const handleGenerateReport = async () => {
    setIsReportDialogOpen(true);
    setIsReportLoading(true);
    setReportContent("");

    try {
        const workoutDetails = dashboardData.workouts.map(w => `${w.date} - ${w.tipo}: ${w.duracion}mins, ${w.calorias}kcal`).join('; ');
        const sleepDetails = dashboardData.dailyMetrics.map(s => `${s.date}: ${s.sueño_total || 0}m (REM: ${s.sueño_rem || 0}m, Profundo: ${s.sueño_profundo || 0}m)`).join('; ');
        const menstrualDetails = dashboardData.dailyMetrics.filter(d => d.estadoCiclo).map(d => `${d.date}: Estado ${d.estadoCiclo}`).join('; ');
        const avgSleep = dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.sueño_total || 0), 0) / dashboardData.dailyMetrics.length / 60 : 0;
        const totalCalories = dashboardData.workouts.reduce((acc, w) => acc + w.calorias, 0);

        const input: HealthSummaryInput = {
            sleepData: `Sueño promedio: ${avgSleep.toFixed(1)}h. Detalles: ${sleepDetails}`,
            exerciseData: `Calorías totales quemadas en entrenos: ${totalCalories}. Entrenamientos: ${workoutDetails}.`,
            heartRateData: `No hay datos de frecuencia cardíaca disponibles.`,
            menstruationData: `Detalles del ciclo: ${menstrualDetails}`,
            supplementData: "No hay datos de suplementos disponibles.",
            foodIntakeData: `No hay datos de hidratación disponibles.`,
            calendarData: "No hay datos de calendario disponibles.",
        };

        const result = await generateHealthSummary(input);
        setReportContent(result.summary);
    } catch (error) {
        console.error("Failed to generate report:", error);
        setReportContent("Lo sentimos, no se pudo generar el informe. Por favor, inténtalo de nuevo.");
        toast({
            variant: "destructive",
            title: "Error al generar el informe",
            description: "No se pudo generar el informe de salud.",
        });
    } finally {
        setIsReportLoading(false);
    }
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportContent);
    toast({
        title: "Informe copiado",
        description: "El informe detallado ha sido enviado al portapapeles.",
    });
  }

  return (
    <>
      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <div className="bg-background/95 backdrop-blur-sm sticky top-0 z-10 border-b">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 h-auto p-2">
            <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Panel Principal</TabsTrigger>
            <TabsTrigger value="sleep"><Moon className="mr-2 h-4 w-4"/>Sueño</TabsTrigger>
            <TabsTrigger value="workouts"><Dumbbell className="mr-2 h-4 w-4"/>Entrenamientos</TabsTrigger>
            <TabsTrigger value="recovery"><HeartPulse className="mr-2 h-4 w-4"/>Recuperación</TabsTrigger>
            <TabsTrigger value="cycle"><Stethoscope className="mr-2 h-4 w-4"/>Ciclo</TabsTrigger>
            <TabsTrigger value="supplements"><Pill className="mr-2 h-4 w-4"/>Suplementos</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4"/>Calendario</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dashboard" className="flex-grow p-6">
          <div className="flex flex-col gap-6">
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-primary">Bienvenido a SoMetrik</CardTitle>
                <CardDescription>
                  Tu asistente personal de bienestar IA. Sube tus datos para empezar a chatear.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AIChatWidget />
                </div>
              <div className="lg:col-span-1 space-y-6">
                <NotificationsWidget
                    dailyMetrics={dashboardData.dailyMetrics}
                    workoutData={dashboardData.workouts}
                />
                <DataActions 
                    onDataProcessed={handleDataProcessed} 
                    onGenerateReport={handleGenerateReport}
                    onDeleteAllData={handleDeleteAllData}
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sleep" className="p-6">
           <SleepPage />
        </TabsContent>

        <TabsContent value="workouts" className="p-6">
            <WorkoutsPage />
        </TabsContent>

        <TabsContent value="recovery" className="p-6">
            <RecoveryPage />
        </TabsContent>

        <TabsContent value="cycle" className="p-6">
            <CyclePage />
        </TabsContent>

        <TabsContent value="supplements" className="p-6">
            <SupplementsPage />
        </TabsContent>
        
        <TabsContent value="calendar" className="p-6">
            <CalendarPage />
        </TabsContent>

      </Tabs>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Informe de Salud Detallado</DialogTitle>
                <DialogDescription>
                    Este es un informe completo basado en todos los datos que has subido. Puedes copiarlo y pegarlo en ChatGPT o cualquier otro asistente.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {isReportLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <p>Generando informe...</p>
                    </div>
                ) : (
                    <Textarea
                        readOnly
                        value={reportContent}
                        className="h-96 text-sm"
                        placeholder="Generando informe..."
                    />
                )}
            </div>
            <DialogClose asChild>
                <div className="flex justify-end gap-2">
                    <Button variant="outline">Cerrar</Button>
                    <Button onClick={handleCopyReport} disabled={isReportLoading || !reportContent}>
                        Copiar Informe
                    </Button>
                </div>
            </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
 