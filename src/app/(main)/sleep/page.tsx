
"use client";

import { useEffect, useState, useMemo } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Moon } from "lucide-react";

export default function SleepPage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qDailyMetrics = query(collection(userRef, "dailyMetrics"));

        const unsubscribe = onSnapshot(qDailyMetrics, (snapshot) => {
            const metrics = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DailyMetric[];
            setDailyMetrics(metrics);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading daily metrics:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);
    
    const sortedMetrics = useMemo(() => {
        return [...dailyMetrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyMetrics]);

    const sleepDataRows = useMemo(() => {
        return sortedMetrics
            .filter(m => m.sueño && m.sueño.total > 0)
            .map(metric => ({
                key: metric.date,
                cells: [
                    metric.date,
                    metric.sueño?.total || "-",
                    metric.sueño?.profundo || "-",
                    metric.sueño?.ligero || "-",
                    metric.sueño?.rem || "-",
                    metric.restingHeartRate || "-",
                    metric.hrv || "-",
                ],
            }));
    }, [sortedMetrics]);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Moon className="text-primary"/>
                        Historial de Sueño
                    </CardTitle>
                    <CardDescription>
                        Un registro detallado de tus patrones de sueño a lo largo del tiempo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Cargando datos de sueño...</p>
                    ) : (
                        <DataTable
                            headers={["Fecha", "Total (min)", "Profundo (min)", "Ligero (min)", "REM (min)", "FC Reposo", "VFC (ms)"]}
                            rows={sleepDataRows}
                            emptyMessage="No hay datos de sueño registrados. Sube un archivo para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    