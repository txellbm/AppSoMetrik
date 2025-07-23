

"use client";

import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DailyMetric } from "@/ai/schemas";
import { Moon } from "lucide-react";

export default function SleepChart({ data }: { data: DailyMetric[] }) {

  const formattedData = data
    .filter(entry => entry.sueño_total) // Only include entries with sleep data
    .map(entry => ({
    ...entry,
    // Format date for display on X-axis, e.g., "Oct 27"
    day: new Date(entry.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    // Convert minutes to hours for the chart
    deepSleepHours: (entry.sueño_profundo || 0) / 60,
    lightSleepHours: (entry.sueño_ligero || 0) / 60,
    remSleepHours: (entry.sueño_rem || 0) / 60,
  }));


  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Moon className="text-primary" />
            Análisis de Sueño
        </CardTitle>
        <CardDescription>Tus fases de sueño durante la última semana.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsBarChart data={formattedData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
            <Tooltip
                contentStyle={{
                    background: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value: number, name: string) => {
                    const nameMap: { [key: string]: string } = {
                        deepSleepHours: "Profundo",
                        lightSleepHours: "Ligero",
                        remSleepHours: "REM"
                    };
                    return [`${value.toFixed(1)} horas`, nameMap[name] || name];
                }}
            />
            <Legend
                verticalAlign="top"
                align="right"
                height={40}
                iconType="circle"
                iconSize={10}
                formatter={(value, entry) => {
                    const nameMap: { [key: string]: string } = {
                        deepSleepHours: "Profundo",
                        lightSleepHours: "Ligero",
                        remSleepHours: "REM"
                    };
                    return <span className="text-xs text-muted-foreground font-medium">{nameMap[value]}</span>;
                }}
            />
            <Bar dataKey="deepSleepHours" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
            <Bar dataKey="lightSleepHours" stackId="a" fill="hsl(var(--chart-2))" />
            <Bar dataKey="remSleepHours" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
