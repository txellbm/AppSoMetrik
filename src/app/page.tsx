
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DashboardData, DailyMetric, Workout } from "@/ai/schemas";
import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import NotificationsWidget from "@/components/dashboard/notifications-widget";
import { collection, onSnapshot, doc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LayoutDashboard, Moon, Dumbbell, HeartPulse, Stethoscope, Pill, CalendarDays, Database } from "lucide-react";
import SleepPage from "./(main)/sleep/page";
import WorkoutsPage from "./(main)/workouts/page";
import RecoveryPage from "./(main)/recovery/page";
import CyclePage from "./(main)/cycle/page";
import SupplementsPage from "./(main)/supplements/page";
import CalendarPage from "./(main)/calendar/page";
import DataPage from "./(main)/data/page";


const initialDashboardData: DashboardData = {
  workouts: [],
  dailyMetrics: [],
};

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const { toast } = useToast();
  const userId = "user_test_id";

  useEffect(() => {
    const userRef = doc(db, "users", userId);
    const qWorkouts = query(collection(userRef, "workouts"));
    const qDailyMetrics = query(collection(userRef, "dailyMetrics"));

    const unsubWorkouts = onSnapshot(qWorkouts, (snapshot) => {
        const workouts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Workout[];
        setDashboardData(prev => ({ ...prev, workouts }));
    }, (error) => console.error("Error al cargar entrenamientos:", error));

    const unsubDailyMetrics = onSnapshot(qDailyMetrics, (snapshot) => {
        const dailyMetrics = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DailyMetric[];
        setDashboardData(prev => ({ ...prev, dailyMetrics }));
    }, (error) => console.error("Error al cargar métricas diarias:", error));

    return () => {
        unsubWorkouts();
        unsubDailyMetrics();
    };
  }, [userId]);


  return (
    <>
      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <div className="bg-background/95 backdrop-blur-sm sticky top-0 z-10 border-b">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-8 h-auto p-2">
            <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Panel</TabsTrigger>
            <TabsTrigger value="data"><Database className="mr-2 h-4 w-4"/>Gestión</TabsTrigger>
            <TabsTrigger value="sleep"><Moon className="mr-2 h-4 w-4"/>Sueño</TabsTrigger>
            <TabsTrigger value="workouts"><Dumbbell className="mr-2 h-4 w-4"/>Entrenos</TabsTrigger>
            <TabsTrigger value="recovery"><HeartPulse className="mr-2 h-4 w-4"/>Recuperación</TabsTrigger>
            <TabsTrigger value="cycle"><Stethoscope className="mr-2 h-4 w-4"/>Ciclo</TabsTrigger>
            <TabsTrigger value="supplements"><Pill className="mr-2 h-4 w-4"/>Suplementos</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4"/>Calendario</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dashboard" className="flex-grow p-6">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AIChatWidget />
                </div>
              <div className="lg:col-span-1 space-y-6">
                <NotificationsWidget
                    dailyMetrics={dashboardData.dailyMetrics}
                    workoutData={dashboardData.workouts}
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="data" className="p-6">
           <DataPage />
        </TabsContent>

        <TabsContent value="sleep" className="p-6">
           <SleepPage />
        </TabsContent>

        <TabsContent value="workouts" className="p-6">
            <WorkoutsPage />
        </TabsContent>

        <TabsContent value="recovery" className="p-6">
            <RecoveryPage />
        </TabsContent>

        <TabsContent value="cycle" className="p-6">
            <CyclePage />
        </TabsContent>

        <TabsContent value="supplements" className="p-6">
            <SupplementsPage />
        </TabsContent>
        
        <TabsContent value="calendar" className="p-6">
            <CalendarPage />
        </TabsContent>

      </Tabs>
    </>
  );
}
