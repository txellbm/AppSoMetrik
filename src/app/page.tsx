

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
import { collection, writeBatch, onSnapshot, doc, getDoc, setDoc, addDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO, differenceInDays, startOfToday, format } from "date-fns";

const initialDashboardData: DashboardData = {
  workouts: [],
  dailyMetrics: [],
};

// Helper function to treat date string as local time, not UTC
const parseDateAsLocal = (dateStr: string): Date => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(NaN); // Return invalid date if format is wrong
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12); // Use noon to avoid timezone shifts
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


 const handleDataProcessed = async (processedData: ProcessHealthDataFileOutput) => {
    if (!processedData || (!processedData.workouts?.length && Object.keys(processedData.dailyMetrics).length === 0)) {
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
      Object.values(dailyMetrics).forEach(item => {
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

  // Calculate aggregate metrics for StatCards
  const avgRestingHR = useMemo(() => dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.restingHeartRate || 0), 0) / dashboardData.dailyMetrics.filter(s => s.restingHeartRate).length : 0, [dashboardData.dailyMetrics]);
  const avgHRV = useMemo(() => dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.hrv || 0), 0) / dashboardData.dailyMetrics.filter(s => s.hrv).length : 0, [dashboardData.dailyMetrics]);
  const avgSleepQuality = useMemo(() => dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.sleepQualityScore || 0), 0) / dashboardData.dailyMetrics.filter(s => s.sleepQualityScore).length : 0, [dashboardData.dailyMetrics]);
  const avgReadiness = useMemo(() => dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.recoveryPercentage || 0), 0) / dashboardData.dailyMetrics.filter(s => s.recoveryPercentage).length : 0, [dashboardData.dailyMetrics]);
  const avgRespiration = useMemo(() => dashboardData.dailyMetrics.length > 0 ? dashboardData.dailyMetrics.reduce((acc, s) => acc + (s.respirationRate || 0), 0) / dashboardData.dailyMetrics.filter(s => s.respirationRate).length : 0, [dashboardData.dailyMetrics]);
  
  const calculatedCycleData = useMemo<CalculatedCycleData>(() => {
    // This logic needs to be adapted to the new dailyMetrics structure
    const today = startOfToday();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayMetric = dashboardData.dailyMetrics.find(d => d.date === todayStr);

    if (!todayMetric || !todayMetric.menstrualCycle) {
        return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }
    
    return {
        currentDay: todayMetric.menstrualCycle.dayOfCycle || 0,
        currentPhase: todayMetric.menstrualCycle.phase || "No disponible",
        symptoms: todayMetric.menstrualCycle.symptoms || [],
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
                <DataActions onDataProcessed={handleDataProcessed} onGenerateReport={handleGenerateReport} />
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
    
  const thisWeekWorkouts = workouts
    .filter(w => {
        try {
            if (!w.date) return false;
            return isWithinInterval(parseDateAsLocal(w.date), { start: startOfThisWeek, end: endOfThisWeek })
        } catch {
            return false;
        }
    })
    .sort((a, b) => parseDateAsLocal(b.date).getTime() - parseDateAsLocal(a.date).getTime());

  const lastWeekWorkouts = workouts
    .filter(w => {
        try {
            if (!w.date) return false;
            return isWithinInterval(parseDateAsLocal(w.date), { start: startOfLastWeek, end: endOfLastWeek })
        } catch {
            return false;
        }
    })
    .sort((a, b) => parseDateAsLocal(b.date).getTime() - parseDateAsLocal(a.date).getTime());
    
  const olderWorkouts = workouts
    .filter(w => {
        try {
            if (!w.date) return false;
            const date = parseDateAsLocal(w.date);
            return !isWithinInterval(date, { start: startOfThisWeek, end: endOfThisWeek }) && !isWithinInterval(date, { start: startOfLastWeek, end: endOfLastWeek })
        } catch {
            return false;
        }
    })
    .sort((a, b) => parseDateAsLocal(b.date).getTime() - parseDateAsLocal(a.date).getTime());

  const WorkoutTable = ({ data }: { data: Workout[] }) => (
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
              <TableCell>{parseDateAsLocal(workout.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
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

