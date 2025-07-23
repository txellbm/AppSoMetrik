

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, Calendar, Dumbbell, FileText, HeartPulse, Zap, Shield, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateHealthSummary } from "@/ai/flows/ai-health-summary";
import { HealthSummaryInput, ProcessHealthDataFileOutput, Workout, DashboardData, CalculatedCycleData, DailyMetric } from "@/ai/schemas";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import DataActions from "@/components/dashboard/data-actions";
import NotificationsWidget from "@/components/dashboard/notifications-widget";
import SleepChart from "@/components/dashboard/sleep-chart";
import MenstrualCyclePanel from "@/components/dashboard/menstrual-cycle-panel";
import MenstrualCalendar from "@/components/dashboard/menstrual-calendar";
import { collection, writeBatch, onSnapshot, doc, getDoc, setDoc, addDoc, query, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO, differenceInDays, startOfToday, format, isValid } from "date-fns";

const initialDashboardData: DashboardData = {
  workouts: [],
  dailyMetrics: [],
};

// Helper function to safely parse dates that might be in different formats
const safeParseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    
    // If it's already a Date object and is valid
    if (dateInput instanceof Date) {
        return isValid(dateInput) ? dateInput : null;
    }

    // If it's a Firestore Timestamp object
    if (typeof dateInput === 'object' && dateInput.seconds) {
        const d = new Date(dateInput.seconds * 1000);
        return isValid(d) ? d : null;
    }

    // If it's a string
    if (typeof dateInput === 'string') {
        // Handle 'YYYY-MM-DD' strings by parsing them in the local timezone
        // Appending 'T12:00:00' makes it explicit that it's local time, not UTC.
        const date = new Date(`${dateInput}T12:00:00`);
        if (isValid(date)) return date;

        // Attempt to parse ISO string as a fallback
        const isoDate = parseISO(dateInput);
        if (isValid(isoDate)) return isoDate;
    }
    
    return null; // Return null if parsing fails for any reason
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

    if (!confirm("¿Estás seguro de que quieres borrar TODOS los datos de entrenamientos y métricas diarias? Esta acción no se puede deshacer.")) {
        return;
    }

    try {
        const batch = writeBatch(db);
        
        const workoutsSnapshot = await getDocs(workoutsRef);
        workoutsSnapshot.forEach(doc => batch.delete(doc.ref));

        const dailyMetricsSnapshot = await getDocs(dailyMetricsRef);
        dailyMetricsSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        setDashboardData(initialDashboardData);

        toast({
            title: "Datos eliminados",
            description: "Todas las métricas y entrenamientos han sido borrados de la base de datos.",
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

    // Process Daily Metrics: one doc per day (date is the ID)
    if (dailyMetrics) {
      dailyMetrics.forEach(item => {
          if (!item.date) return;
          const docRef = doc(userRef, "dailyMetrics", item.date);
          batch.set(docRef, item, { merge: true });
          changesCount++;
      });
    }

    // Process Workouts: a new doc for each workout
    if (workouts) {
      workouts.forEach(item => {
          if (!item.date || !item.type) return; // Basic validation
          const docRef = doc(collection(userRef, "workouts")); // Auto-generate ID
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
        const workoutDetails = dashboardData.workouts.map(w => `${w.date} - ${w.type}: ${w.duration}mins, ${w.calories}kcal`).join('; ');
        const sleepDetails = dashboardData.dailyMetrics.map(s => `${s.date}: ${s.sleepHours?.toFixed(1) || 0}h (REM: ${s.remSleepMinutes || 0}m, Profundo: ${s.deepSleepMinutes || 0}m)`).join('; ');
        const menstrualDetails = dashboardData.dailyMetrics.filter(d => d.menstrualCycle).map(d => `${d.date}: Fase ${d.menstrualCycle?.phase}, Día ${d.menstrualCycle?.dayOfCycle}, Flujo ${d.menstrualCycle?.flow || 'N/A'}`).join('; ');
        
        const avgSleep = dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.sleepHours || 0), 0) / dashboardData.dailyMetrics.length : 0;
        const totalCalories = dashboardData.workouts.reduce((acc, w) => acc + w.calories, 0);

        const input: HealthSummaryInput = {
            sleepData: `Sueño promedio: ${avgSleep.toFixed(1)}h. Detalles: ${sleepDetails}`,
            exerciseData: `Calorías totales quemadas en entrenos: ${totalCalories}. Entrenamientos: ${workoutDetails}.`,
            heartRateData: `No hay datos de frecuencia cardíaca disponibles.`, // This needs to be populated from dailyMetrics
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

  // Calculate aggregate metrics for StatCards, ensuring we don't divide by zero or use NaN values.
  const calculateAverage = (items: number[]) => {
      const validItems = items.filter(item => item !== null && item !== undefined && !isNaN(item) && item > 0);
      if (validItems.length === 0) return 0;
      const sum = validItems.reduce((acc, item) => acc + item, 0);
      return sum / validItems.length;
  };

  const avgRestingHR = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.restingHeartRate || 0)), [dashboardData.dailyMetrics]);
  const avgHRV = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.hrv || 0)), [dashboardData.dailyMetrics]);
  const avgSleepQuality = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.sleepQualityScore || 0)), [dashboardData.dailyMetrics]);
  const avgReadiness = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.recoveryPercentage || 0)), [dashboardData.dailyMetrics]);
  const avgRespiration = useMemo(() => calculateAverage(dashboardData.dailyMetrics.map(s => s.respirationRate || 0)), [dashboardData.dailyMetrics]);
  
  const calculatedCycleData = useMemo<CalculatedCycleData>(() => {
    const today = startOfToday();
    
    // 1. Parse all dates safely and sort them descending
    const sortedMetrics = [...dashboardData.dailyMetrics]
      .map(d => ({ ...d, parsedDate: safeParseDate(d.date) }))
      .filter(d => d.parsedDate && isValid(d.parsedDate))
      .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime());

    if (sortedMetrics.length === 0) {
      return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }

    // 2. Find the most recent day that could be a cycle start
    // A cycle start is either marked as dayOfCycle: 1, or is the first day of flow after a gap.
    let lastCycleStartDate: Date | null = null;
    
    // Prioritize `dayOfCycle: 1` if available and recent
    const explicitStart = sortedMetrics.find(d => d.menstrualCycle?.dayOfCycle === 1);
    if(explicitStart?.parsedDate) {
        lastCycleStartDate = explicitStart.parsedDate;
    } else {
        // Fallback: Find the most recent day with flow that's preceded by at least 5 days without flow.
        // This avoids counting spotting as a new cycle.
        const flowDays = sortedMetrics.filter(d => d.menstrualCycle?.flow && d.menstrualCycle.flow !== 'spotting');
        for (let i = 0; i < flowDays.length; i++) {
            const currentFlowDay = flowDays[i];
            const nextFlowDay = i + 1 < flowDays.length ? flowDays[i + 1] : null;

            if (!nextFlowDay) { // If it's the earliest flow day on record
                lastCycleStartDate = currentFlowDay.parsedDate;
                break;
            }
            
            const daysBetween = differenceInDays(currentFlowDay.parsedDate!, nextFlowDay.parsedDate!);
            if (daysBetween > 5) { // A gap of more than 5 days indicates a new cycle
                lastCycleStartDate = currentFlowDay.parsedDate;
                break;
            }
        }
        // If no clear start found, take the most recent flow day as a best guess
        if (!lastCycleStartDate && flowDays.length > 0) {
            lastCycleStartDate = flowDays[0].parsedDate;
        }
    }

    if (!lastCycleStartDate) {
      return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }

    // 3. Calculate day of cycle and phase
    const dayOfCycle = differenceInDays(today, lastCycleStartDate) + 1;
    let currentPhase = "No disponible";

    if (dayOfCycle < 1) { // Start date is in the future, invalid state
         return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }

    if (dayOfCycle >= 1 && dayOfCycle <= 7) currentPhase = "Menstrual";
    else if (dayOfCycle > 7 && dayOfCycle <= 14) currentPhase = "Folicular";
    else if (dayOfCycle > 14 && dayOfCycle <= 16) currentPhase = "Ovulatoria";
    else if (dayOfCycle > 16) currentPhase = "Lútea";

    // 4. Get symptoms for today
    const todayMetric = sortedMetrics.find(d => format(d.parsedDate!, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));

    return {
      currentDay: dayOfCycle,
      currentPhase: currentPhase,
      symptoms: todayMetric?.menstrualCycle?.symptoms || [],
    };
  }, [dashboardData.dailyMetrics]);


  return (
    <>
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
                readiness={avgReadiness}
                hrv={avgHRV}
                respiration={avgRespiration}
                restingHR={avgRestingHR}
            />

            <div className="md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <MenstrualCyclePanel data={calculatedCycleData} />
                <MenstrualCalendar data={dashboardData.dailyMetrics} />
            </div>

            <div className="md:col-span-2 lg:col-span-4">
                <WorkoutSummaryCard workouts={dashboardData.workouts} />
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
                        <FileText className="h-12 w-12 animate-pulse text-primary" />
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

function StatCard({ icon, title, value, description }: { icon: React.ReactNode; title: string; value: string, description: string }) {
  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
  );
}

function VitalsCard({ readiness, hrv, respiration, restingHR }: { readiness: number, hrv: number, respiration: number, restingHR: number }) {
    return (
        <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="text-primary" />
                    Vitales y Recuperación
                </CardTitle>
                <CardDescription>Métricas clave de recuperación de la última noche.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-2">
                 <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg text-center space-y-1">
                    <p className="text-sm text-muted-foreground">Recuperación</p>
                    <p className="text-3xl font-bold text-primary">{!isNaN(readiness) ? readiness.toFixed(0) : '0'}<span className="text-lg">%</span></p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">VFC (HRV)</p>
                        <p className="text-lg font-semibold">{!isNaN(hrv) ? hrv.toFixed(1) : '0'} <span className="text-sm">ms</span></p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">FC Reposo</p>
                        <p className="text-lg font-semibold">{!isNaN(restingHR) ? restingHR.toFixed(0) : '0'} <span className="text-sm">bpm</span></p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg text-center col-span-2">
                        <p className="text-xs text-muted-foreground">Frec. Respiratoria</p>
                        <p className="text-lg font-semibold">{!isNaN(respiration) ? respiration.toFixed(1) : '0'} <span className="text-sm">rpm</span></p>
                    </div>
                 </div>
            </CardContent>
        </Card>
    )
}


function WorkoutSummaryCard({ workouts }: { workouts: Workout[] }) {
  const now = new Date();
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
  
  const startOfLastWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const endOfLastWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const filterAndSortWorkouts = (data: Workout[], interval: { start: Date, end: Date } | null) => {
    return data
      .map(w => ({ ...w, parsedDate: safeParseDate(w.date) }))
      .filter(w => {
          if (!w.parsedDate) return false;
          if (interval) {
              return isWithinInterval(w.parsedDate, interval);
          }
          return true; // for older workouts
      })
      .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime());
  };
    
  const thisWeekWorkouts = filterAndSortWorkouts(workouts, { start: startOfThisWeek, end: endOfThisWeek });
  const lastWeekWorkouts = filterAndSortWorkouts(workouts, { start: startOfLastWeek, end: endOfLastWeek });
    
  const olderWorkouts = workouts
    .map(w => ({...w, parsedDate: safeParseDate(w.date)}))
    .filter(w => {
        if (!w.parsedDate) return false;
        const isThisWeek = isWithinInterval(w.parsedDate, { start: startOfThisWeek, end: endOfThisWeek });
        const isLastWeek = isWithinInterval(w.parsedDate, { start: startOfLastWeek, end: endOfLastWeek });
        return !isThisWeek && !isLastWeek;
    })
    .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime());

  const WorkoutTable = ({ data }: { data: (Workout & { parsedDate: Date | null })[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Entrenamiento</TableHead>
          <TableHead className="text-right">Duración</TableHead>
          <TableHead className="text-right">Calorías</TableHead>
          <TableHead className="text-right">Intensidad (FC)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((workout, index) => (
            <TableRow key={index}>
              <TableCell>{workout.parsedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) || 'Fecha inválida'}</TableCell>
              <TableCell className="font-medium">{workout.type}</TableCell>
              <TableCell className="text-right">{workout.duration} min</TableCell>
              <TableCell className="text-right">{workout.calories}</TableCell>
              <TableCell className="text-right">{workout.heartRateAvg && workout.heartRateAvg > 0 ? `${workout.heartRateAvg} bpm` : '-'}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
              No hay entrenamientos registrados para este período.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="text-primary" />
          Panel de Entrenamientos
        </CardTitle>
        <CardDescription>Tus entrenamientos recientes organizados por semana.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="thisWeek">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="thisWeek">Esta Semana</TabsTrigger>
            <TabsTrigger value="lastWeek">Semana Anterior</TabsTrigger>
            <TabsTrigger value="older">Anteriores</TabsTrigger>
          </TabsList>
          <TabsContent value="thisWeek">
            <WorkoutTable data={thisWeekWorkouts} />
          </TabsContent>
          <TabsContent value="lastWeek">
            <WorkoutTable data={lastWeekWorkouts} />
          </TabsContent>
          <TabsContent value="older">
            <WorkoutTable data={olderWorkouts} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

    