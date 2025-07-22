
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartPulse, Moon, Flame, Droplets, Dumbbell, FileText, Activity, ShieldCheck, Heart, Stethoscope, BrainCircuit, Wind } from "lucide-react";
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
import { HealthSummaryInput, ProcessHealthDataFileOutput, HealthData, Workout, SleepEntry } from "@/ai/schemas";

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


const initialHealthData: HealthData = {
  averageSleep: 0,
  activeCalories: 0,
  restingHeartRate: 0,
  hydrationLiters: 0,
  hrv: 0,
  recoveryPercentage: 0,
  respiration: 0,
  energyLevel: 0,
  menstrualCycleData: {
    currentPhase: "No disponible",
    currentDay: 0,
    symptoms: []
  },
  movePercentage: 0,
  exercisePercentage: 0,
  standPercentage: 0,
  sleepData: [],
  workouts: [],
};

export default function Home() {
  const [healthData, setHealthData] = useState<HealthData>(initialHealthData);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isReportLoading, setIsReportLoading] = useState(false);
  const { toast } = useToast();

  const handleDataProcessed = (processedData: ProcessHealthDataFileOutput[]) => {
    setHealthData((prevData) => {
      const combinedData = processedData.reduce((acc, current) => {
        const { healthData: newHealth } = current;
        
        const existingWorkoutKeys = new Set(acc.workouts.map(w => `${w.date}-${w.name}-${w.startTime}`));
        const newWorkouts = newHealth.workouts.filter(w => !existingWorkoutKeys.has(`${w.date}-${w.name}-${w.startTime}`));

        const updateAverage = (oldVal: number, newVal: number) => {
            const oldIsValid = typeof oldVal === 'number' && oldVal > 0;
            const newIsValid = typeof newVal === 'number' && newVal > 0;
            if (oldIsValid && newIsValid) return (oldVal + newVal) / 2;
            if (newIsValid) return newVal;
            return oldVal;
        };
        
        acc.averageSleep = updateAverage(acc.averageSleep, newHealth.averageSleep);
        acc.restingHeartRate = updateAverage(acc.restingHeartRate, newHealth.restingHeartRate);
        acc.hrv = updateAverage(acc.hrv, newHealth.hrv);
        acc.recoveryPercentage = updateAverage(acc.recoveryPercentage, newHealth.recoveryPercentage);
        acc.respiration = updateAverage(acc.respiration, newHealth.respiration);
        acc.energyLevel = updateAverage(acc.energyLevel, newHealth.energyLevel);
        
        if (newHealth.menstrualCycleData && newHealth.menstrualCycleData.currentPhase !== "No disponible") {
          acc.menstrualCycleData = newHealth.menstrualCycleData;
        }
        
        acc.activeCalories += newHealth.activeCalories;
        acc.hydrationLiters += newHealth.hydrationLiters;
        
        if (newHealth.movePercentage > 0) acc.movePercentage = newHealth.movePercentage;
        if (newHealth.exercisePercentage > 0) acc.exercisePercentage = newHealth.exercisePercentage;
        if (newHealth.standPercentage > 0) acc.standPercentage = newHealth.standPercentage;
        
        const sleepMap = new Map((acc.sleepData || []).map(s => [s.day, s.hours]));
        if (Array.isArray(newHealth.sleepData)) {
            newHealth.sleepData.forEach(s => sleepMap.set(s.day, s.hours));
        }
        acc.sleepData = Array.from(sleepMap, ([day, hours]) => ({ day, hours })).slice(-7);

        acc.workouts.push(...newWorkouts);

        return acc;

      }, { ...prevData, workouts: [...prevData.workouts], sleepData: [...(prevData.sleepData || [])] });

      if (combinedData.sleepData && combinedData.sleepData.length > 0) {
        const totalSleepHours = combinedData.sleepData.reduce((sum, s) => sum + s.hours, 0);
        if (totalSleepHours > 0) {
            combinedData.averageSleep = totalSleepHours / combinedData.sleepData.length;
        }
      }

      return combinedData;
    });
  };
  
  const handleGenerateReport = async () => {
    setIsReportDialogOpen(true);
    setIsReportLoading(true);
    setReportContent("");

    try {
        const workoutDetails = healthData.workouts.map(w => `${w.date} - ${w.name}: ${w.distance.toFixed(1)}km, ${w.calories}kcal, ${w.duration}, ${w.averageHeartRate}bpm (Inicio: ${w.startTime}, Fin: ${w.endTime})`).join('; ');
        const input: HealthSummaryInput = {
            sleepData: `Sueño promedio: ${healthData.averageSleep.toFixed(1)}h. Datos de los últimos días: ${healthData.sleepData.map(d => `${d.day}: ${d.hours}h`).join(', ')}`,
            exerciseData: `Calorías activas: ${healthData.activeCalories}, Entrenamientos: ${workoutDetails}. Anillos: Moverse ${healthData.movePercentage}% Ejercicio ${healthData.exercisePercentage}% Pararse ${healthData.standPercentage}%`,
            heartRateData: `Frecuencia cardíaca en reposo: ${(healthData.restingHeartRate || 0).toFixed(0)} bpm. VFC: ${(healthData.hrv || 0).toFixed(1)} ms. Recuperación: ${(healthData.recoveryPercentage || 0).toFixed(0)}%. Respiración: ${(healthData.respiration || 0).toFixed(1)} rpm. Nivel de energía: ${(healthData.energyLevel || 0).toFixed(0)}%`,
            menstruationData: `Fase del ciclo: ${healthData.menstrualCycleData.currentPhase}. Día del ciclo: ${healthData.menstrualCycleData.currentDay}. Síntomas: ${healthData.menstrualCycleData.symptoms.join(', ')}`,
            supplementData: "No hay datos de suplementos disponibles.",
            foodIntakeData: `Hidratación: ${healthData.hydrationLiters.toFixed(1)} L`,
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
        description: "El informe detallado ha sido copiado al portapapeles.",
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">Bienvenido a SoMetrik</CardTitle>
              <CardDescription>
                Tu asistente personal de bienestar IA. Aquí tienes un resumen de tu semana.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="lg:col-span-4">
            <Card>
                <CardHeader>
                    <CardTitle>Panel de Salud y Bienestar</CardTitle>
                    <CardDescription>Métricas clave de tu salud general.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard icon={<Moon className="text-primary" />} title="Sueño Promedio" value={`${(healthData.averageSleep || 0).toFixed(1)}h`} />
                    <StatCard icon={<Flame className="text-primary" />} title="Calorías Activas" value={String(healthData.activeCalories || 0)} />
                    <StatCard icon={<HeartPulse className="text-primary" />} title="FC en Reposo" value={`${(healthData.restingHeartRate || 0).toFixed(0)} bpm`} />
                    <StatCard icon={<Droplets className="text-primary" />} title="Hidratación" value={`${(healthData.hydrationLiters || 0).toFixed(1)} L`} />
                    <StatCard icon={<Activity className="text-primary" />} title="VFC (HRV)" value={`${(healthData.hrv || 0).toFixed(1)} ms`} />
                    <StatCard icon={<ShieldCheck className="text-primary" />} title="Recuperación" value={`${(healthData.recoveryPercentage || 0).toFixed(0)}%`} />
                    <StatCard icon={<Wind className="text-primary" />} title="Respiración" value={`${(healthData.respiration || 0).toFixed(1)} rpm`} />
                    <StatCard icon={<BrainCircuit className="text-primary" />} title="Nivel Energía" value={`${(healthData.energyLevel || 0).toFixed(0)}%`} />
                    <StatCard icon={<Stethoscope className="text-primary" />} title="Fase Actual" value={healthData.menstrualCycleData.currentPhase} />
                </CardContent>
            </Card>
        </div>
        
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen de Actividad</CardTitle>
            <CardDescription>El progreso de tus metas diarias.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center gap-4 pt-4">
              <ActivityRing percentage={healthData.movePercentage} color="hsl(var(--primary))" label="Moverse" />
              <ActivityRing percentage={healthData.exercisePercentage} color="hsl(var(--accent))" label="Ejercicio" />
              <ActivityRing percentage={healthData.standPercentage} color="hsl(var(--chart-2))" label="Pararse" />
          </CardContent>
        </Card>
        
        <SleepChart data={healthData.sleepData} />
        
        <WorkoutSummaryCard workouts={healthData.workouts} />
        
        <MenstrualCyclePanel data={healthData.menstrualCycleData} />

        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIChatWidget />
          <div className="lg:col-span-1 space-y-6">
            <NotificationsWidget />
            <DataActions onDataProcessed={handleDataProcessed} onGenerateReport={handleGenerateReport} />
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
    <Card className="text-center">
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
              <TableHead>Hora Inicio</TableHead>
              <TableHead>Hora Fin</TableHead>
              <TableHead className="text-right">Duración</TableHead>
              <TableHead className="text-right">Distancia (km)</TableHead>
              <TableHead className="text-right">Calorías</TableHead>
              <TableHead className="text-right">FC Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts.length > 0 ? (
              workouts.map((workout, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(workout.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
                  <TableCell className="font-medium">{workout.name}</TableCell>
                  <TableCell>{workout.startTime}</TableCell>
                  <TableCell>{workout.endTime}</TableCell>
                  <TableCell className="text-right">{workout.duration}</TableCell>
                  <TableCell className="text-right">{workout.distance.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{workout.calories}</TableCell>
                  <TableCell className="text-right">{workout.averageHeartRate} bpm</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
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
