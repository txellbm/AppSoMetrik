
"use client";

import { useEffect, useState, useMemo } from "react";
import { generatePersonalizedNotifications, PersonalizedNotificationsInput } from "@/ai/flows/personalized-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Moon, Heart, Dumbbell } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, orderBy, limit } from "firebase/firestore";
import { format, startOfDay, differenceInDays, parseISO, subDays } from 'date-fns';
import { DailyMetric, SleepData, CalendarEvent, RecoveryData, ActivityData } from "@/ai/schemas";

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
                const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
                const userRef = doc(db, "users", userId);
                
                const dailyMetricsQuery = query(collection(userRef, "dailyMetrics"), orderBy("date", "desc"));
                const sleepQuery = query(collection(userRef, "sleep_manual"), orderBy("date", "desc"), limit(1));
                const eventsQuery = query(collection(userRef, "events"), where("date", "==", todayStr));
                const recentWorkoutsQuery = query(collection(userRef, "events"), where("type", "==", "entrenamiento"));
                const recoveryQuery = query(collection(userRef, "recovery"), orderBy("date", "desc"), limit(1));
                const activityQuery = query(collection(userRef, "activity"), where("date", "==", yesterdayStr));


                const [dailyMetricsSnap, sleepSnap, eventsSnap, recentWorkoutsSnap, recoverySnap, activitySnap] = await Promise.all([
                    getDocs(dailyMetricsQuery),
                    getDocs(sleepQuery),
                    getDocs(eventsQuery),
                    getDocs(recentWorkoutsQuery),
                    getDocs(recoveryQuery),
                    getDocs(activityQuery),
                ]);

                // 2. Process data
                const dailyMetrics = dailyMetricsSnap.docs.map(d => ({...d.data(), date: d.id})) as DailyMetric[];
                const lastSleep = sleepSnap.docs.length > 0 ? sleepSnap.docs[0].data() as SleepData : null;
                const todayEvents = eventsSnap.docs.map(d => d.data()) as CalendarEvent[];
                const recentWorkouts = recentWorkoutsSnap.docs.map(d => d.data() as CalendarEvent)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5);
                const lastRecovery = recoverySnap.docs.length > 0 ? recoverySnap.docs[0].data() as RecoveryData : null;
                const lastActivity = activitySnap.docs.length > 0 ? activitySnap.docs[0].data() as ActivityData : null;


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

                // 3. Build structured input for the AI
                const input: PersonalizedNotificationsInput = {
                    currentTime: format(new Date(), "HH:mm"),
                    cycleStatus: `Fase: ${currentPhase}, Día: ${dayOfCycle || 'N/A'}.`,
                    lastSleep: lastSleep ? `Duración: ${lastSleep.sleepTime} min, Eficiencia: ${lastSleep.efficiency}%, VFC al despertar: ${lastSleep.vfcAlDespertar} ms` : 'No hay datos de sueño.',
                    todayEvents: todayEvents.length > 0 ? todayEvents.map(e => `${e.description} de ${e.startTime} a ${e.endTime}`).join('; ') : 'No hay eventos programados.',
                    recentWorkouts: recentWorkouts.length > 0 ? recentWorkouts.map(w => `${w.description} (${w.date})`).join(', ') : 'No hay entrenamientos recientes.',
                    lastRecovery: lastRecovery ? `Percepción: ${lastRecovery.perceivedRecovery}/10, VFC matutina: ${lastRecovery.morningHrv}ms, Síntomas: ${(lastRecovery.symptoms || []).join(', ')}` : 'No hay datos de recuperación de hoy.',
                    lastActivity: lastActivity ? `Pasos: ${lastActivity.steps}, Calorías: ${lastActivity.totalCalories}, Tiempo activo: ${lastActivity.activeTime} min.` : 'No hay datos de actividad de ayer.'
                };
                
                // 4. Call the AI flow
                const result = await generatePersonalizedNotifications(input);

                const formattedNotifications = result.notifications.map(n => ({
                    text: n,
                    icon: getIconForNotification(n),
                }));

                setNotifications(formattedNotifications.length > 0 ? formattedNotifications : [{ text: "Registra tus datos para recibir ideas personalizadas.", icon: iconMap.default }]);

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
