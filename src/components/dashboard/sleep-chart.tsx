"use client";

import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sleepData = [
  { day: "Lun", hours: 6.5 },
  { day: "Mar", hours: 7 },
  { day: "Mié", hours: 8 },
  { day: "Jue", hours: 7.5 },
  { day: "Vie", hours: 6 },
  { day: "Sáb", hours: 9 },
  { day: "Dom", hours: 8.5 },
];

export default function SleepChart() {
  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle>Análisis de Sueño</CardTitle>
        <CardDescription>La duración de tu sueño durante los últimos 7 días.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsBarChart data={sleepData}>
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
