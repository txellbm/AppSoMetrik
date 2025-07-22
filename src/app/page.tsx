"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartPulse, Moon, Flame, Droplets } from "lucide-react";

import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import DataActions from "@/components/dashboard/data-actions";
import NotificationsWidget from "@/components/dashboard/notifications-widget";
import SleepChart from "@/components/dashboard/sleep-chart";
import { ProcessHealthDataFileOutput } from "@/ai/flows/process-health-data-file";

type HealthData = ProcessHealthDataFileOutput['healthData'];

const initialHealthData: HealthData = {
  averageSleep: 7.2,
  activeCalories: 450,
  restingHeartRate: 62,
  hydrationLiters: 1.8,
  movePercentage: 75,
  exercisePercentage: 60,
  standPercentage: 90,
  sleepData: [
    { day: "Lun", hours: 6.5 },
    { day: "Mar", hours: 7 },
    { day: "Mié", hours: 8 },
    { day: "Jue", hours: 7.5 },
    { day: "Vie", hours: 6 },
    { day: "Sáb", hours: 9 },
    { day: "Dom", hours: 8.5 },
  ],
};

export default function Home() {
  const [healthData, setHealthData] = useState<HealthData>(initialHealthData);

  const handleDataProcessed = (data: ProcessHealthDataFileOutput) => {
    setHealthData(data.healthData);
  };

  return (
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

      <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIChatWidget />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <NotificationsWidget />
          <DataActions onDataProcessed={handleDataProcessed} />
        </div>
      </div>
    </div>
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
