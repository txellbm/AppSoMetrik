
"use client";

import { useEffect, useState, useMemo } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { HeartPulse } from "lucide-react";

export default function RecoveryPage() {
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

    const recoveryDataRows = useMemo(() => {
        return sortedMetrics
            .map(metric => ({
                key: metric.date,
                cells: [
                  metric.date,
                  metric.hrv || "-",
                  metric.restingHeartRate || "-",
                  metric.respiracion || "-",
                  "N/A", // Placeholder for stress
                  "N/A", // Placeholder for quality
                ],
            }));
    }, [sortedMetrics]);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="text-primary"/>
                        Historial de Recuperación
                    </CardTitle>
                    <CardDescription>
                        Métricas clave de recuperación como VFC, Frecuencia Cardíaca en Reposo y más.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Cargando datos de recuperación...</p>
                    ) : (
                        <DataTable
                            headers={["Fecha", "VFC (ms)", "FC Reposo", "Respiración", "Estrés", "Calidad"]}
                            rows={recoveryDataRows}
                            emptyMessage="No hay datos de recuperación registrados."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
