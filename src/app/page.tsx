

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartPulse, Moon, Flame, Droplets, Dumbbell, FileText, Activity, ShieldCheck, Heart, Stethoscope, BrainCircuit, Wind, Calendar, Zap } from "lucide-react";
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
import { HealthSummaryInput, ProcessHealthDataFileOutput, Workout, SleepEntry, MenstrualCycleData, DashboardData } from "@/ai/schemas";

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
import MenstrualCalendar from "@/components/dashboard/menstrual-calendar";
import { collection, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from "date-fns";

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
  const avgSleep = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + s.totalSleep, 0) / dashboardData.sleepData.length : 0;
  const avgRestingHR = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.restingHeartRate || 0), 0) / dashboardData.sleepData.filter(s => s.restingHeartRate).length : 0;
  const avgHRV = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.hrv || 0), 0) / dashboardData.sleepData.filter(s => s.hrv).length : 0;
  const avgSleepQuality = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + s.quality, 0) / dashboardData.sleepData.filter(s => s.quality).length : 0;
  const latestMenstrualData = dashboardData.menstrualData.length > 0 ? dashboardData.menstrualData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;


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

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <StatCard icon={<HeartPulse className="text-primary" />} title="FC en Reposo" value={`${!isNaN(avgRestingHR) ? avgRestingHR.toFixed(0) : '0'} bpm`} description="Promedio semanal" />
             <StatCard icon={<Activity className="text-primary" />} title="VFC (HRV)" value={`${!isNaN(avgHRV) ? avgHRV.toFixed(1) : '0'} ms`} description="Promedio semanal" />
             <StatCard icon={<Zap className="text-primary" />} title="Calidad Sueño" value={`${!isNaN(avgSleepQuality) ? avgSleepQuality.toFixed(0) : '0'}%`} description="Promedio semanal" />
             <StatCard icon={<Calendar className="text-primary" />} title="Fase Actual" value={latestMenstrualData?.currentPhase || "N/A"} description={latestMenstrualData ? `Día ${latestMenstrualData.currentDay}`: "Sin datos"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SleepChart data={dashboardData.sleepData} />

            <WorkoutSummaryCard workouts={dashboardData.workouts} />

            <MenstrualCalendar data={dashboardData.menstrualData} />

            <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AIChatWidget />
                </div>
              <div className="lg:col-span-1 space-y-6">
                <NotificationsWidget />
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

function WorkoutSummaryCard({ workouts }: { workouts: Workout[] }) {
  const now = new Date();
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
  
  const startOfLastWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const endOfLastWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
  const thisWeekWorkouts = workouts
    .filter(w => isWithinInterval(parseISO(w.date), { start: startOfThisWeek, end: endOfThisWeek }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastWeekWorkouts = workouts
    .filter(w => isWithinInterval(parseISO(w.date), { start: startOfLastWeek, end: endOfLastWeek }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
  const olderWorkouts = workouts
    .filter(w => !isWithinInterval(parseISO(w.date), { start: startOfLastWeek, end: endOfThisWeek }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const WorkoutTable = ({ data }: { data: Workout[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Entrenamiento</TableHead>
          <TableHead className="text-right">Distancia</TableHead>
          <TableHead className="text-right">Calorías</TableHead>
          <TableHead className="text-right">Duración</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((workout, index) => (
            <TableRow key={index}>
              <TableCell>{new Date(workout.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
              <TableCell className="font-medium">{workout.name}</TableCell>
              <TableCell className="text-right">{workout.distance.toFixed(2)} km</TableCell>
              <TableCell className="text-right">{workout.calories}</TableCell>
              <TableCell className="text-right">{workout.duration} min</TableCell>
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
    <Card className="md:col-span-2 lg:col-span-2">
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
