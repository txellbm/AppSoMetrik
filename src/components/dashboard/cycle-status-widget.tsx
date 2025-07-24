
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, orderBy } from "firebase/firestore";
import { startOfDay, differenceInDays, parseISO } from 'date-fns';
import { DailyMetric } from "@/ai/schemas";
import { Skeleton } from "@/components/ui/skeleton";

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};

export default function CycleStatusWidget() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        setIsLoading(true);
        if (!userId) return;
        const userRef = doc(db, "users", userId);
        const qDailyMetrics = query(collection(userRef, "dailyMetrics"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qDailyMetrics, (snapshot) => {
            const metrics = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.id })) as DailyMetric[];
            setDailyMetrics(metrics);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading daily metrics:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const { currentDayOfCycle } = useMemo(() => {
        const sortedMenstruationDays = dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => startOfDay(parseISO(m.date)))
            .sort((a, b) => b.getTime() - a.getTime());

        if (sortedMenstruationDays.length === 0) {
            return { currentDayOfCycle: null };
        }

        let cycleStartDay = sortedMenstruationDays[0];
        for (let i = 1; i < sortedMenstruationDays.length; i++) {
            const diff = differenceInDays(sortedMenstruationDays[i - 1], sortedMenstruationDays[i]);
            if (diff > 1) {
                break;
            }
            cycleStartDay = sortedMenstruationDays[i];
        }

        const currentDay = startOfDay(new Date());
        const dayOfCycle = differenceInDays(currentDay, cycleStartDay) + 1;

        return { currentDayOfCycle: dayOfCycle > 0 ? dayOfCycle : null };

    }, [dailyMetrics]);

    const currentPhase = getCyclePhase(currentDayOfCycle);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="text-primary" />
                    Estado del Ciclo
                </CardTitle>
                <CardDescription>Tu fase y día del ciclo actual.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                    </div>
                ) : (
                    <div className="flex justify-around items-center p-4 bg-muted rounded-lg text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Fase Actual</p>
                            <p className="text-2xl font-bold text-primary">{currentPhase}</p>
                        </div>
                        <div className="border-l h-12"></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Día del Ciclo</p>
                            <p className="text-2xl font-bold text-primary">{currentDayOfCycle || '-'}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
