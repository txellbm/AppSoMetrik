
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartPulse, Moon, Flame, Droplets, Dumbbell, FileText, Clock, Heart, Calendar } from "lucide-react";
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
import { HealthSummaryInput, ProcessHealthDataFileOutput, HealthData, Workout } from "@/ai/schemas";

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

const initialHealthData: HealthData = {
  averageSleep: 0,
  activeCalories: 0,
  restingHeartRate: 0,
  hydrationLiters: 0,
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

  const handleDataProcessed = (newData: ProcessHealthDataFileOutput) => {
    setHealthData((prevData) => {
      // Simple aggregation logic. This can be improved.
      const newSleepData = [...prevData.sleepData, ...newData.healthData.sleepData]
        .slice(-7); // Keep last 7 days

      const newAverageSleep = newSleepData.length > 0 
        ? newSleepData.reduce((acc, item) => acc + item.hours, 0) / newSleepData.length
        : 0;

      const newRestingHeartRate = prevData.restingHeartRate > 0 && newData.healthData.restingHeartRate > 0
        ? Math.round((prevData.restingHeartRate + newData.healthData.restingHeartRate) / 2)
        : prevData.restingHeartRate || newData.healthData.restingHeartRate;

      return {
        averageSleep: newAverageSleep,
        activeCalories: prevData.activeCalories + newData.healthData.activeCalories,
        restingHeartRate: newRestingHeartRate,
        hydrationLiters: prevData.hydrationLiters + newData.healthData.hydrationLiters,
        movePercentage: Math.min(100, prevData.movePercentage + newData.healthData.movePercentage),
        exercisePercentage: Math.min(100, prevData.exercisePercentage + newData.healthData.exercisePercentage),
        standPercentage: Math.min(100, prevData.standPercentage + newData.healthData.standPercentage),
        sleepData: newSleepData,
        workouts: [...prevData.workouts, ...newData.healthData.workouts],
      };
    });
  };

  const handleGenerateReport = async () => {
    setIsReportDialogOpen(true);
    setIsReportLoading(true);
    setReportContent("");

    try {
        const workoutDetails = healthData.workouts.map(w => `${w.date} - ${w.name}: ${w.distance}km, ${w.calories}kcal, ${w.duration.toFixed(2)}h, ${w.averageHeartRate}bpm`).join('; ');
        const input: HealthSummaryInput = {
            sleepData: `Sueño promedio: ${healthData.averageSleep.toFixed(1)}h. Datos de los últimos días: ${healthData.sleepData.map(d => `${d.day}: ${d.hours}h`).join(', ')}`,
            exerciseData: `Calorías activas: ${healthData.activeCalories}, Entrenamientos: ${workoutDetails}. Anillos: Moverse ${healthData.movePercentage}%, Ejercicio ${healthData.exercisePercentage}%, Pararse ${healthData.standPercentage}%`,
            heartRateData: `Frecuencia cardíaca en reposo: ${healthData.restingHeartRate} bpm`,
            menstruationData: "No hay datos de menstruación disponibles.",
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

        <StatCard icon={<Moon className="text-primary" />} title="Sueño Promedio" value={`${healthData.averageSleep.toFixed(1)}h`} />
        <StatCard icon={<Flame className="text-primary" />} title="Calorías Activas" value={String(healthData.activeCalories)} />
        <StatCard icon={<HeartPulse className="text-primary" />} title="FC en Reposo" value={`${healthData.restingHeartRate} bpm`} />
        <StatCard icon={<Droplets className="text-primary" />} title="Hidratación" value={`${healthData.hydrationLiters.toFixed(1)} L`} />

        <SleepChart data={healthData.sleepData} />
        
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
        
        <WorkoutSummaryCard workouts={healthData.workouts} />

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
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
            <span className="text-xl font-bold" style={{ color }}>{percentage}%</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

function WorkoutSummaryCard({ workouts }: { workouts: Workout[] }) {
  return (
    <Card className="md:col-span-2 lg:col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="text-primary" />
          Resumen de Entrenamiento
        </CardTitle>
        <CardDescription>Tus entrenamientos de la semana.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Entrenamiento</TableHead>
              <TableHead className="text-right">Distancia</TableHead>
              <TableHead className="text-right">Calorías</TableHead>
              <TableHead className="text-right">Duración</TableHead>
              <TableHead className="text-right">FC Promedio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts.length > 0 ? (
              workouts.map((workout, index) => (
                <TableRow key={index}>
                  <TableCell>{workout.date}</TableCell>
                  <TableCell className="font-medium">{workout.name}</TableCell>
                  <TableCell className="text-right">{workout.distance.toFixed(1)} km</TableCell>
                  <TableCell className="text-right">{workout.calories} kcal</TableCell>
                  <TableCell className="text-right">{workout.duration.toFixed(2)} h</TableCell>
                  <TableCell className="text-right">{workout.averageHeartRate} bpm</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
