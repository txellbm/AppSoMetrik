
"use client";

import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import NotificationsWidget from "@/components/dashboard/notifications-widget";
import HealthSummaryWidget from "@/components/dashboard/health-summary-widget";
import { LayoutDashboard, Moon, Dumbbell, HeartPulse, Stethoscope, Pill, CalendarDays, Flame, Salad, Smile, Target } from "lucide-react";
import SleepPage from "./(main)/sleep/page";
import WorkoutsPage from "./(main)/workouts/page";
import RecoveryPage from "./(main)/recovery/page";
import CyclePage from "./(main)/cycle/page";
import SupplementsPage from "./(main)/supplements/page";
import CalendarPage from "./(main)/calendar/page";
import ActivityPage from "./(main)/activity/page";
import CycleStatusWidget from "@/components/dashboard/cycle-status-widget";
import DietPage from "./(main)/diet/page";
import MindfulnessPage from "./(main)/mindfulness/page";
import GoalsPage from "./(main)/goals/page";


export default function Home() {

  return (
    <>
      <Tabs defaultValue="dashboard" className="flex-grow flex flex-col">
        <div className="bg-background/95 backdrop-blur-sm sticky top-0 z-10 border-b">
          <TabsList className="grid w-full grid-cols-5 md:grid-cols-11 h-auto p-2">
            <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Panel</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4"/>Calendario</TabsTrigger>
            <TabsTrigger value="goals"><Target className="mr-2 h-4 w-4"/>Objetivos</TabsTrigger>
            <TabsTrigger value="cycle"><Stethoscope className="mr-2 h-4 w-4"/>Ciclo</TabsTrigger>
            <TabsTrigger value="mind"><Smile className="mr-2 h-4 w-4"/>Mente</TabsTrigger>
            <TabsTrigger value="workouts"><Dumbbell className="mr-2 h-4 w-4"/>Entrenos</TabsTrigger>
            <TabsTrigger value="sleep"><Moon className="mr-2 h-4 w-4"/>Sueño</TabsTrigger>
            <TabsTrigger value="recovery"><HeartPulse className="mr-2 h-4 w-4"/>Recuperación</TabsTrigger>
            <TabsTrigger value="activity"><Flame className="mr-2 h-4 w-4"/>Actividad</TabsTrigger>
            <TabsTrigger value="diet"><Salad className="mr-2 h-4 w-4"/>Dieta</TabsTrigger>
            <TabsTrigger value="supplements"><Pill className="mr-2 h-4 w-4"/>Suplementos</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dashboard" className="flex-grow p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIChatWidget />
                <HealthSummaryWidget />
                <NotificationsWidget />
                <CycleStatusWidget />
            </div>
        </TabsContent>

        <TabsContent value="calendar" className="p-6">
            <CalendarPage />
        </TabsContent>

        <TabsContent value="goals" className="p-6">
            <GoalsPage />
        </TabsContent>
        
        <TabsContent value="cycle" className="p-6">
            <CyclePage />
        </TabsContent>

        <TabsContent value="mind" className="p-6">
            <MindfulnessPage />
        </TabsContent>

        <TabsContent value="workouts" className="p-6">
            <WorkoutsPage />
        </TabsContent>

        <TabsContent value="sleep" className="p-6">
           <SleepPage />
        </TabsContent>

        <TabsContent value="recovery" className="p-6">
            <RecoveryPage />
        </TabsContent>
        
        <TabsContent value="activity" className="p-6">
            <ActivityPage />
        </TabsContent>

        <TabsContent value="diet" className="p-6">
            <DietPage />
        </TabsContent>
        
        <TabsContent value="supplements" className="p-6">
            <SupplementsPage />
        </TabsContent>
        
      </Tabs>
    </>
  );
}
