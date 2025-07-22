
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartPulse, Moon, Flame, Droplets, Dumbbell, FileText, Activity, ShieldCheck, Heart, Stethoscope, BrainCircuit, Wind, Calendar } from "lucide-react";
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

import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import DataActions from "@/components/dashboard/data-actions";
import NotificationsWidget from "@/components/dashboard/notifications-widget";
import SleepChart from "@/components/dashboard/sleep-chart";
import MenstrualCyclePanel from "@/components/dashboard/menstrual-cycle-panel";
import { collection, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  const totalCalories = dashboardData.workouts.reduce((acc, w) => acc + w.calories, 0);
  const avgRestingHR = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.restingHeartRate || 0), 0) / dashboardData.sleepData.filter(s => s.restingHeartRate).length : 0;
  const avgHRV = dashboardData.sleepData.length > 0 ? dashboardData.sleepData.reduce((acc, s) => acc + (s.hrv || 0), 0) / dashboardData.sleepData.filter(s => s.hrv).length : 0;
  const latestMenstrualData = dashboardData.menstrualData.length > 0 ? dashboardData.menstrualData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;


  return (
    <>
      <div className="flex flex-col gap-6">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Bienvenido a SoMetrik</CardTitle>
            <CardDescription>
              Tu asistente personal de bienestar IA. Aquí tienes un resumen de tu semana.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Panel de Salud y Bienestar</CardTitle>
                <CardDescription>Métricas clave de tu salud general.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon={<Moon className="text-primary" />} title="Sueño Promedio" value={`${!isNaN(avgSleep) ? avgSleep.toFixed(1) : '0.0'}h`} />
                <StatCard icon={<Flame className="text-primary" />} title="Calorías Activas" value={String(totalCalories || 0)} />
                <StatCard icon={<HeartPulse className="text-primary" />} title="FC en Reposo" value={`${!isNaN(avgRestingHR) ? avgRestingHR.toFixed(0) : '0'} bpm`} />
                <StatCard icon={<Droplets className="text-primary" />} title="Hidratación" value={`N/A`} />
                <StatCard icon={<Activity className="text-primary" />} title="VFC (HRV)" value={`${!isNaN(avgHRV) ? avgHRV.toFixed(1) : '0.0'} ms`} />
                <StatCard icon={<ShieldCheck className="text-primary" />} title="Recuperación" value={`N/A`} />
                <StatCard icon={<Wind className="text-primary" />} title="Respiración" value={`N/A`} />
                <StatCard icon={<BrainCircuit className="text-primary" />} title="Nivel Energía" value={`N/A`} />
                <StatCard icon={<Calendar className="text-primary" />} title="Fase Actual" value={latestMenstrualData?.currentPhase || "N/A"} />
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Resumen de Actividad</CardTitle>
                <CardDescription>El progreso de tus metas diarias.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center gap-4 pt-4">
                  <ActivityRing percentage={0} color="hsl(var(--primary))" label="Moverse" />
                  <ActivityRing percentage={0} color="hsl(var(--accent))" label="Ejercicio" />
                  <ActivityRing percentage={0} color="hsl(var(--chart-2))" label="Pararse" />
              </CardContent>
            </Card>

            <SleepChart data={dashboardData.sleepData} />

            <WorkoutSummaryCard workouts={dashboardData.workouts} />

            <MenstrualCyclePanel data={latestMenstrualData} />

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

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <Card className="text-center flex-1">
      <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2">
        {icon}
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ActivityRing({ percentage, color, label }: { percentage: number; color: string; label: string }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="50" cy="50" r="45"
            stroke={color}
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold" style={{ color }}>{Math.round(percentage)}%</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

function WorkoutSummaryCard({ workouts }: { workouts: Workout[] }) {
  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="text-primary" />
          Panel de Entrenamientos
        </CardTitle>
        <CardDescription>Tus entrenamientos recientes.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Entrenamiento</TableHead>
              <TableHead className="text-right">Distancia (km)</TableHead>
              <TableHead className="text-right">Calorías</TableHead>
              <TableHead className="text-right">Duración (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts && workouts.length > 0 ? (
              workouts.slice(0, 5).map((workout, index) => ( // Show last 5 workouts
                <TableRow key={index}>
                  <TableCell>{new Date(workout.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
                  <TableCell className="font-medium">{workout.name}</TableCell>
                  <TableCell className="text-right">{workout.distance.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{workout.calories}</TableCell>
                  <TableCell className="text-right">{workout.duration}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay datos de entrenamiento
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    
