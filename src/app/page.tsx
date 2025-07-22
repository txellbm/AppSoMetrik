import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, HeartPulse, Moon, Zap, Flame, Droplets, BrainCircuit } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import DataActions from "@/components/dashboard/data-actions";
import NotificationsWidget from "@/components/dashboard/notifications-widget";

const sleepData = [
  { day: "Mon", hours: 6.5 },
  { day: "Tue", hours: 7 },
  { day: "Wed", hours: 8 },
  { day: "Thu", hours: 7.5 },
  { day: "Fri", hours: 6 },
  { day: "Sat", hours: 9 },
  { day: "Sun", hours: 8.5 },
];

export default function Home() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Welcome to SoMetrik</CardTitle>
            <CardDescription>
              Your personal AI wellness assistant. Here's a snapshot of your week.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <StatCard icon={<Moon className="text-primary" />} title="Avg Sleep" value="7.2h" />
      <StatCard icon={<Flame className="text-primary" />} title="Active Calories" value="450" />
      <StatCard icon={<HeartPulse className="text-primary" />} title="Resting HR" value="62 bpm" />
      <StatCard icon={<Droplets className="text-primary" />} title="Hydration" value="1.8 L" />

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
      
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>Your daily goals progress.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center gap-4 pt-4">
            <ActivityRing percentage={75} color="hsl(var(--primary))" label="Move" />
            <ActivityRing percentage={60} color="hsl(var(--accent))" label="Exercise" />
            <ActivityRing percentage={90} color="hsl(var(--chart-2))" label="Stand" />
        </CardContent>
      </Card>

      <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIChatWidget />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <NotificationsWidget />
          <DataActions />
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