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
  { day: "Mon", hours: 6.5 },
  { day: "Tue", hours: 7 },
  { day: "Wed", hours: 8 },
  { day: "Thu", hours: 7.5 },
  { day: "Fri", hours: 6 },
  { day: "Sat", hours: 9 },
  { day: "Sun", hours: 8.5 },
];

export default function SleepChart() {
  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle>Sleep Analysis</CardTitle>
        <CardDescription>Your sleep duration for the last 7 days.</CardDescription>
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
