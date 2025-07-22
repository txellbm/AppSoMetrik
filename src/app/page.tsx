

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
import { HealthSummaryInput, ProcessHealthDataFileOutput, Workout, SleepEntry, MenstrualCycleData, DashboardData, CalculatedCycleData } from "@/ai/schemas";

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
import { collection, writeBatch, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO, differenceInDays, startOfToday } from "date-fns";
import { doc } from "firebase/firestore";

const initialDashboardData: DashboardData = {
  workouts: [],
  sleepData: [],
  menstrualData: [],
};

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isReportLoading, setIsReportLoading] = useState(false);
  const { toast } = useToast();

  const userId = "user_test_id";

  useEffect(() => {
    const collections = {
        workouts: collection(db, "users", userId, "workouts"),
        sleepData: collection(db, "users", userId, "sleepEntries"),
        menstrualData: collection(db, "users", userId, "menstrualCycles"),
    };

    const unsubscribers = Object.entries(collections).map(([key, coll]) => {
        return onSnapshot(coll, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() } as any)); // Type assertion here
            setDashboardData(prevData => ({
                ...prevData,
                [key]: data,
            }));
        }, (error) => {
          console.error(`Error en el listener de ${key}:`, error);
          toast({
            variant: "destructive",
            title: `Error de Firestore (${key})`,
            description: "No se pudieron cargar los datos. Revisa los permisos de la base de datos.",
          });
        });
    });

    // Cleanup function
    return () => unsubscribers.forEach(unsub => unsub());
  }, [userId, toast]);


  const handleDataProcessed = async (processedData: ProcessHealthDataFileOutput) => {
    const batch = writeBatch(db);
    const { workouts, sleepData, menstrualData } = processedData;

    try {
        if (workouts.length > 0) {
            workouts.forEach(item => {
                const docRef = doc(db, "users", userId, "workouts", item.date);
                batch.set(docRef, item, { merge: true });
            });
        }
        if (sleepData.length > 0) {
            sleepData.forEach(item => {
                const docRef = doc(db, "users", userId, "sleepEntries", item.date);
                batch.set(docRef, item, { merge: true });
            });
        }
        if (menstrualData.length > 0) {
            menstrualData.forEach(item => {
                const docRef = doc(db, "users", userId, "menstrualCycles", item.date);
                batch.set(docRef, item, { merge: true });
            });
        }

        await batch.commit();

        toast({
            title: "Datos procesados y guardados",
            description: `Se han actualizado ${workouts.length} entrenamientos, ${sleepData.length} noches de sueño y ${menstrualData.length} registros del ciclo.`,
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
        const workoutDetails = dashboardData.workouts.map(w => `${w.date} - ${w.name}: ${w.distance.toFixed(1)}km, ${w.calories}kcal, ${w.duration}mins`).join('; ');
        const sleepDetails = dashboardData.sleepData.map(s => `${s.date}: ${s.totalSleep.toFixed(1)}h (Profundo: ${s.deepSleep}h, Ligero: ${s.lightSleep}h, REM: ${s.remSleep}h)`).join('; ');
        const menstrualDetails = dashboardData.menstrualData.map(m => `${m.date}: Flujo ${m.flow || 'N/A'}`).join('; ');
        
        const avgSleep = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + s.totalSleep, 0) / dashboardData.sleepData.length : 0;
        const totalCalories = dashboardData.workouts.reduce((acc, w) => acc + w.calories, 0);

        const input: HealthSummaryInput = {
            sleepData: `Sueño promedio: ${avgSleep.toFixed(1)}h. Detalles: ${sleepDetails}`,
            exerciseData: `Calorías totales quemadas: ${totalCalories}. Entrenamientos: ${workoutDetails}.`,
            heartRateData: `No hay datos de frecuencia cardíaca disponibles.`, // This needs to be populated from sleep or workout data if available
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
  const avgRestingHR = useMemo(() => dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.restingHeartRate || 0), 0) / dashboardData.sleepData.filter(s => s.restingHeartRate).length : 0, [dashboardData.sleepData]);
  const avgHRV = useMemo(() => dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.hrv || 0), 0) / dashboardData.sleepData.filter(s => s.hrv).length : 0, [dashboardData.sleepData]);
  const avgSleepQuality = useMemo(() => dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + s.quality, 0) / dashboardData.sleepData.filter(s => s.quality).length : 0, [dashboardData.sleepData]);
  const avgReadiness = useMemo(() => dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.readiness || 0), 0) / dashboardData.sleepData.filter(s => s.readiness).length : 0, [dashboardData.sleepData]);
  const avgRespiration = useMemo(() => dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.respiration || 0), 0) / dashboardData.sleepData.filter(s => s.respiration).length : 0, [dashboardData.sleepData]);
  
  const calculatedCycleData = useMemo<CalculatedCycleData>(() => {
    const sortedData = [...dashboardData.menstrualData]
      .filter((d) => d.flow && d.flow !== "spotting")
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  
    if (sortedData.length === 0) {
      return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }
  
    let lastPeriodStartDate: Date | null = null;
    if (sortedData.length > 0) {
        // Find groups of consecutive days
        const periods = [];
        let currentPeriod = [parseISO(sortedData[0].date)];
        
        for (let i = 1; i < sortedData.length; i++) {
            const currentDate = parseISO(sortedData[i].date);
            const prevDate = parseISO(sortedData[i-1].date);
            if (differenceInDays(currentDate, prevDate) === 1) {
                currentPeriod.push(currentDate);
            } else {
                periods.push(currentPeriod);
                currentPeriod = [currentDate];
            }
        }
        periods.push(currentPeriod);
        
        const lastPeriod = periods[periods.length - 1];
        if(lastPeriod && lastPeriod.length > 0){
            lastPeriodStartDate = lastPeriod[0];
        }
    }
  
    if (!lastPeriodStartDate) {
      return { currentDay: 0, currentPhase: "No disponible", symptoms: [] };
    }
  
    const today = startOfToday();
    const currentDay = differenceInDays(today, lastPeriodStartDate) + 1;
  
    let currentPhase = "No disponible";
    const isBleedingToday = dashboardData.menstrualData.some(
      (d) => parseISO(d.date).getTime() === today.getTime() && d.flow && d.flow !== "spotting"
    );
  
    if (isBleedingToday || (currentDay >= 1 && currentDay <= 7)) {
      currentPhase = "Menstruación";
    } else if (currentDay > 7 && currentDay < 14) {
      currentPhase = "Folicular";
    } else if (currentDay >= 14 && currentDay <= 15) {
      currentPhase = "Ovulación";
    } else if (currentDay > 15) {
      currentPhase = "Lútea";
    }
  
    const symptomsToday =
      dashboardData.menstrualData.find((d) => parseISO(d.date).getTime() === today.getTime())
        ?.symptoms || [];
  
    return {
      currentDay: currentDay,
      currentPhase: currentPhase,
      symptoms: symptomsToday,
    };
  }, [dashboardData.menstrualData]);


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
            <SleepChart data={dashboardData.sleepData} />
            
            <VitalsCard 
                readiness={avgReadiness}
                hrv={avgHRV}
                respiration={avgRespiration}
                restingHR={avgRestingHR}
            />

            <div className="md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <MenstrualCyclePanel data={calculatedCycleData} />
                <MenstrualCalendar data={dashboardData.menstrualData} />
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
                    sleepData={dashboardData.sleepData}
                    workoutData={dashboardData.workouts}
                    cycleData={calculatedCycleData}
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
            return isWithinInterval(parseISO(w.date), { start: startOfThisWeek, end: endOfThisWeek })
        } catch {
            return false;
        }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastWeekWorkouts = workouts
    .filter(w => {
        try {
            return isWithinInterval(parseISO(w.date), { start: startOfLastWeek, end: endOfLastWeek })
        } catch {
            return false;
        }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
  const olderWorkouts = workouts
    .filter(w => {
        try {
            return !isWithinInterval(parseISO(w.date), { start: startOfLastWeek, end: endOfThisWeek })
        } catch {
            return false;
        }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
              <TableCell>{new Date(workout.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
              <TableCell className="font-medium">{workout.name}</TableCell>
              <TableCell className="text-right">{workout.duration} min</TableCell>
              <TableCell className="text-right">{workout.calories}</TableCell>
              <TableCell className="text-right">{workout.averageHeartRate > 0 ? `${workout.averageHeartRate} bpm` : '-'}</TableCell>
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
