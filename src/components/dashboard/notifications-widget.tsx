
"use client";

import { useEffect, useState, useMemo } from "react";
import { generatePersonalizedNotifications } from "@/ai/flows/personalized-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Moon, Heart, Dumbbell } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, orderBy, limit } from "firebase/firestore";
import { format, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { DailyMetric, SleepData, WorkoutData, CalendarEvent } from "@/ai/schemas";

type Notification = {
    icon: React.ReactNode;
    text: string;
};

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};


const iconMap: { [key: string]: React.ReactNode } = {
    cycle: <Calendar className="h-4 w-4 text-accent" />,
    sleep: <Moon className="h-4 w-4 text-blue-400" />,
    mood: <Heart className="h-4 w-4 text-pink-400" />,
    workout: <Dumbbell className="h-4 w-4 text-orange-400" />,
    default: <Bell className="h-4 w-4 text-primary" />,
};

const getIconForNotification = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('ciclo') || lowerText.includes('período') || lowerText.includes('folicular') || lowerText.includes('lútea') || lowerText.includes('menstrua')) return iconMap.cycle;
    if (lowerText.includes('sueño') || lowerText.includes('descanso')) return iconMap.sleep;
    if (lowerText.includes('ánimo') || lowerText.includes('energía') || lowerText.includes('sientes')) return iconMap.mood;
    if (lowerText.includes('entrenamiento') || lowerText.includes('ejercicio') || lowerText.includes('pilates') || lowerText.includes('gimnasio') || lowerText.includes('fuerza')) return iconMap.workout;
    return iconMap.default;
};

export default function NotificationsWidget() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const fetchAndGenerate = async () => {
            setIsLoading(true);

            try {
                // 1. Fetch all necessary data in parallel
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const userRef = doc(db, "users", userId);
                
                const dailyMetricsQuery = query(collection(userRef, "dailyMetrics"), orderBy("date", "desc"));
                const sleepQuery = query(collection(userRef, "sleep"), where("date", "==", todayStr));
                const workoutsQuery = query(collection(userRef, "workouts"), where("date", "==", todayStr));
                const eventsQuery = query(collection(userRef, "events"), where("date", "==", todayStr));

                const [dailyMetricsSnap, sleepSnap, workoutsSnap, eventsSnap] = await Promise.all([
                    getDocs(dailyMetricsQuery),
                    getDocs(sleepQuery),
                    getDocs(workoutsQuery),
                    getDocs(eventsQuery),
                ]);

                // 2. Process data
                const dailyMetrics = dailyMetricsSnap.docs.map(d => ({...d.data(), date: d.id})) as DailyMetric[];
                const lastSleep = sleepSnap.docs.length > 0 ? sleepSnap.docs[0].data() as SleepData : null;
                const todayWorkouts = workoutsSnap.docs.map(d => d.data()) as WorkoutData[];
                const todayEvents = eventsSnap.docs.map(d => d.data()) as CalendarEvent[];

                // --- Cycle Calculation ---
                const sortedMenstruationDays = dailyMetrics
                    .filter(m => m.estadoCiclo === 'menstruacion')
                    .map(m => startOfDay(parseISO(m.date)))
                    .sort((a, b) => b.getTime() - a.getTime());

                let cycleStartDay = null;
                if (sortedMenstruationDays.length > 0) {
                    cycleStartDay = sortedMenstruationDays[0];
                    for (let i = 1; i < sortedMenstruationDays.length; i++) {
                        if (differenceInDays(sortedMenstruationDays[i - 1], sortedMenstruationDays[i]) > 1) break;
                        cycleStartDay = sortedMenstruationDays[i];
                    }
                }
                const dayOfCycle = cycleStartDay ? differenceInDays(startOfDay(new Date()), cycleStartDay) + 1 : null;
                const currentPhase = getCyclePhase(dayOfCycle);
                // --- End Cycle Calculation ---

                // 3. Build summary for the AI
                let summary = "Datos de hoy: ";
                if(currentPhase !== "N/A" && dayOfCycle) {
                    summary += `Día ${dayOfCycle} del ciclo, fase ${currentPhase}. `;
                } else {
                    summary += "No hay datos del ciclo menstrual. ";
                }
                if (lastSleep) {
                    summary += `Anoche durmió ${lastSleep.sleepTime} minutos con una calidad del ${lastSleep.quality}. `;
                } else {
                    summary += "No hay datos de sueño de anoche. ";
                }
                if (todayWorkouts.length > 0) {
                    summary += `Entrenamientos planeados para hoy: ${todayWorkouts.map(w => w.type).join(', ')}. `;
                }
                if (todayEvents.length > 0) {
                     summary += `Agenda de hoy: ${todayEvents.map(e => `${e.description} de ${e.startTime} a ${e.endTime}`).join(', ')}. `;
                }
                 if(summary === "Datos de hoy: ") {
                    summary = "La usuaria no tiene datos registrados recientemente. Anímala a registrar su sueño, ciclo o entrenamientos.";
                }

                // 4. Call the AI flow
                const result = await generatePersonalizedNotifications({ summary });

                const formattedNotifications = result.notifications.map(n => ({
                    text: n,
                    icon: getIconForNotification(n),
                }));

                setNotifications(formattedNotifications.length > 0 ? formattedNotifications : [{ text: "Sube tus datos para recibir ideas personalizadas.", icon: iconMap.default }]);

            } catch (error) {
                console.error("No se pudieron obtener las notificaciones:", error);
                setNotifications([{ text: "No se pudieron cargar las sugerencias.", icon: iconMap.default }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndGenerate();

    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Para Ti</CardTitle>
                <CardDescription>Ideas y recordatorios personalizados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                           <div key={i} className="flex items-center space-x-4 animate-pulse">
                               <div className="h-8 w-8 rounded-full bg-muted"></div>
                               <div className="space-y-2">
                                   <div className="h-4 w-48 rounded bg-muted"></div>
                               </div>
                           </div>
                        ))
                    ) : (
                        notifications.map((notification, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                                  {notification.icon}
                                </div>
                                <p className="text-sm pt-1.5 text-muted-foreground">{notification.text}</p>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
