"use client";

import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SleepEntry } from "@/ai/schemas";

export default function SleepChart({ data }: { data: SleepEntry[] }) {
  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle>Análisis de Sueño</CardTitle>
        <CardDescription>La duración de tu sueño durante los últimos 7 días.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsBarChart data={data}>
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
            <Tooltip
                contentStyle={{
                    background: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                }}
                labelFormatter={(label) => `Día: ${label}`}
                formatter={(value: number) => [`${value.toFixed(1)} horas`, "Sueño"]}
            />
            <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
