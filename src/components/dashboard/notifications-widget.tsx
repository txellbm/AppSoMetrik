

"use client";

import { useEffect, useState } from "react";
import { generatePersonalizedNotifications } from "@/ai/flows/personalized-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Moon, Heart, Dumbbell } from "lucide-react";
import { DailyMetric, Workout } from "@/ai/schemas";

type Notification = {
    icon: React.ReactNode;
    text: string;
};

type NotificationsWidgetProps = {
    dailyMetrics: DailyMetric[];
    workoutData: Workout[];
}

const iconMap: { [key: string]: React.ReactNode } = {
    cycle: <Calendar className="h-4 w-4 text-accent" />,
    sleep: <Moon className="h-4 w-4 text-blue-400" />,
    mood: <Heart className="h-4 w-4 text-pink-400" />,
    workout: <Dumbbell className="h-4 w-4 text-orange-400" />,
    default: <Bell className="h-4 w-4 text-primary" />,
};

const getIconForNotification = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('ciclo') || lowerText.includes('período') || lowerText.includes('folicular') || lowerText.includes('lútea')) return iconMap.cycle;
    if (lowerText.includes('sueño') || lowerText.includes('descanso')) return iconMap.sleep;
    if (lowerText.includes('ánimo') || lowerText.includes('energía') || lowerText.includes('sentimiento')) return iconMap.mood;
    if (lowerText.includes('entrenamiento') || lowerText.includes('ejercicio') || lowerText.includes('pilates') || lowerText.includes('gimnasio')) return iconMap.workout;
    return iconMap.default;
};

export default function NotificationsWidget({ dailyMetrics, workoutData }: NotificationsWidgetProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                // Create a summary of the latest data to send to the AI
                const latestMetric = dailyMetrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const latestWorkout = workoutData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                const sleepSummary = latestMetric?.sueño_total ? `El último registro de sueño fue de ${(latestMetric.sueño_total / 60).toFixed(1)}h.` : "No hay datos de sueño recientes.";
                const workoutSummary = latestWorkout ? `El último entrenamiento fue ${latestWorkout.tipo} de ${latestWorkout.duracion} minutos.` : "No ha habido entrenamientos recientes.";
                const cycleSummary = latestMetric?.estadoCiclo ? `Actualmente en estado: ${latestMetric.estadoCiclo}.` : "No hay datos del ciclo menstrual.";
                
                const combinedSummary = `Contexto de la usuaria: ${cycleSummary} ${sleepSummary} ${workoutSummary}`;
                
                const result = await generatePersonalizedNotifications({
                    // The prompt now expects a generic context string
                    cycles: combinedSummary,
                    mood: "No disponible",
                    workouts: "No disponible",
                    workSchedule: "No disponible",
                });
                
                const formattedNotifications = result.notifications.map(n => ({
                    text: n,
                    icon: getIconForNotification(n),
                }));

                setNotifications(formattedNotifications);
            } catch (error) {
                console.error("No se pudieron obtener las notificaciones:", error);
                setNotifications([{ text: "No se pudieron cargar las sugerencias personalizadas.", icon: iconMap.default }]);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch notifications if there is data to analyze
        if (dailyMetrics.length > 0 || workoutData.length > 0) {
            fetchNotifications();
        } else {
             setNotifications([{ text: "Sube tus datos para recibir ideas personalizadas.", icon: iconMap.default }]);
             setIsLoading(false);
        }
    }, [dailyMetrics, workoutData]);

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
