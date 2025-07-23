
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
import SleepChart from "@/components/dashboard/sleep-chart";
import MenstrualCyclePanel from "@/components/dashboard/menstrual-cycle-panel";
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
    const userRef = doc(db, "users", userId);
    const workoutsRef = collection(userRef, "workouts");
    const dailyMetricsRef = collection(userRef, "dailyMetrics");
    const supplementsRef = collection(userRef, "supplements");

    try {
        const batch = writeBatch(db);
        const workoutsSnapshot = await getDocs(workoutsRef);
        workoutsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const dailyMetricsSnapshot = await getDocs(dailyMetricsRef);
        dailyMetricsSnapshot.forEach(doc => batch.delete(doc.ref));

        const supplementsSnapshot = await getDocs(supplementsRef);
        supplementsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();

        setDashboardData(initialDashboardData);
        toast({
            title: "Datos eliminados",
            description: "Todas las métricas, entrenamientos y suplementos han sido borrados.",
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

  const calculateAverage = (items: number[]) => {
      const validItems = items.filter(item => item !== null && item !== undefined && !isNaN(item) && item > 0);
      if (validItems.length === 0) return 0;
      const sum = validItems.reduce((acc, item) => acc + item, 0);
      return sum / validItems.length;
  };

  const avgRestingHR = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.restingHeartRate || 0)), [dashboardData.dailyMetrics]);
  const avgHRV = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.hrv || 0)), [dashboardData.dailyMetrics]);
  const avgRespiration = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.respiracion || 0)), [dashboardData.dailyMetrics]);
  
  const calculatedCycleData = useMemo<CalculatedCycleData>(() => {
    const today = startOfToday();
    const sortedMetrics = [...dashboardData.dailyMetrics]
      .map(d => ({ ...d, parsedDate: safeParseDate(d.date) }))
      .filter(d => d.parsedDate && isValid(d.parsedDate))
      .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime());

    if (sortedMetrics.length === 0) {
      return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }

    let lastCycleStartDate: Date | null = null;
    for (const metric of sortedMetrics) {
        if (metric.estadoCiclo === 'menstruacion') {
            const potentialStartDate = metric.parsedDate;
            if (potentialStartDate) {
                lastCycleStartDate = potentialStartDate;
                break;
            }
        }
    }

    if (!lastCycleStartDate) {
      return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }
    
    const dayOfCycle = differenceInDays(today, lastCycleStartDate) + 1;
    let currentPhase = "No disponible";
    if (dayOfCycle < 1) {
         return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }
    const todayMetric = sortedMetrics.find(d => format(d.parsedDate!, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
    if (todayMetric?.estadoCiclo === 'menstruacion') {
        currentPhase = "Menstrual";
    } else if (dayOfCycle >= 1 && dayOfCycle <= 7) currentPhase = "Menstrual";
    else if (dayOfCycle > 7 && dayOfCycle <= 14) currentPhase = "Folicular";
    else if (dayOfCycle > 14 && dayOfCycle <= 16) currentPhase = "Ovulatoria";
    else if (dayOfCycle > 16) currentPhase = "Lútea";

    return {
      currentDay: dayOfCycle,
      currentPhase: currentPhase,
      symptoms: todayMetric?.sintomas || [],
    };
  }, [dashboardData.dailyMetrics]);


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
                  Tu asistente personal de bienestar IA. Aquí tienes un resumen de tus métricas clave.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SleepChart data={dashboardData.dailyMetrics} />
                <VitalsCard 
                    hrv={avgHRV}
                    respiration={avgRespiration}
                    restingHR={avgRestingHR}
                />
                <div className="md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MenstrualCyclePanel data={calculatedCycleData} />
                </div>
                <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

function VitalsCard({ hrv, respiration, restingHR }: { hrv: number, respiration: number, restingHR: number }) {
    return (
        <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="text-primary" />
                    Vitales Clave
                </CardTitle>
                <CardDescription>Promedio de tus métricas de salud más importantes.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 pt-2">
                 <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg text-center space-y-1">
                    <p className="text-sm text-muted-foreground">VFC (HRV)</p>
                    <p className="text-2xl font-bold text-primary">{!isNaN(hrv) ? hrv.toFixed(1) : '0'}<span className="text-sm ml-1">ms</span></p>
                 </div>
                 <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg text-center space-y-1">
                    <p className="text-sm text-muted-foreground">FC Reposo</p>
                    <p className="text-2xl font-bold text-primary">{!isNaN(restingHR) ? restingHR.toFixed(0) : '0'}<span className="text-sm ml-1">bpm</span></p>
                 </div>
                 <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg text-center space-y-1">
                    <p className="text-sm text-muted-foreground">Respiración</p>
                    <p className="text-2xl font-bold text-primary">{!isNaN(respiration) ? respiration.toFixed(1) : '0'}<span className="text-sm ml-1">rpm</span></p>
                 </div>
            </CardContent>
        </Card>
    )
}

    