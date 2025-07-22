
"use client";

import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SleepEntry } from "@/ai/schemas";

export default function SleepChart({ data }: { data: SleepEntry[] }) {

  const formattedData = data.map(entry => ({
    ...entry,
    // Format date for display on X-axis, e.g., "Oct 27"
    day: new Date(entry.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }));


  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle>Análisis de Sueño</CardTitle>
        <CardDescription>La duración de tu sueño durante los últimos 7 días.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsBarChart data={formattedData}>
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
                        totalSleep: "Sueño Total",
                        deepSleep: "Profundo",
                        lightSleep: "Ligero",
                        remSleep: "REM"
                    };
                    return [`${value.toFixed(1)} horas`, nameMap[name] || name];
                }}
            />
            <Bar dataKey="totalSleep" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sueño Total" />
            {/* You can add more bars for deep, light, rem sleep if desired */}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
