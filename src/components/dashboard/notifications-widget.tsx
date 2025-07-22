"use client";

import { useEffect, useState } from "react";
import { generatePersonalizedNotifications } from "@/ai/flows/personalized-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Moon, Heart, Dumbbell } from "lucide-react";

type Notification = {
    icon: React.ReactNode;
    text: string;
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
    if (lowerText.includes('cycle') || lowerText.includes('period') || lowerText.includes('follicular')) return iconMap.cycle;
    if (lowerText.includes('sleep')) return iconMap.sleep;
    if (lowerText.includes('mood') || lowerText.includes('feeling')) return iconMap.mood;
    if (lowerText.includes('workout') || lowerText.includes('pilates') || lowerText.includes('gym')) return iconMap.workout;
    return iconMap.default;
};

export default function NotificationsWidget() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                const result = await generatePersonalizedNotifications({
                    cycles: "Follicular phase, day 8.",
                    mood: "Feeling energetic and positive.",
                    workouts: "Pilates session scheduled for tomorrow evening.",
                    workSchedule: "Busy day with back-to-back meetings.",
                });
                const formattedNotifications = result.notifications.map(n => ({
                    text: n,
                    icon: getIconForNotification(n),
                }));
                setNotifications(formattedNotifications);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
                setNotifications([{ text: "Could not load notifications.", icon: iconMap.default }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>For You</CardTitle>
                <CardDescription>Personalized insights and reminders.</CardDescription>
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
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
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
