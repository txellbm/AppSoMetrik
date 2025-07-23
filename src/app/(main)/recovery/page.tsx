
"use client";

import { useEffect, useState, useMemo } from "react";
import { VitalsData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { HeartPulse } from "lucide-react";

export default function RecoveryPage() {
    const [vitals, setVitals] = useState<VitalsData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qVitals = query(collection(userRef, "vitals"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qVitals, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as VitalsData[];
            setVitals(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading vitals data:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const recoveryDataRows = useMemo(() => {
        return vitals.map(metric => ({
            key: metric.date,
            cells: [
              metric.date,
              metric.sleepingHRV || "-",
              metric.wakingHRV || "-",
              metric.dailyAvgHeartRate || "-",
              metric.sedentaryAvgHeartRate || "-",
              metric.restingHeartRate || "-",
              metric.wakingGlucose || "-",
              metric.bodyTemperature || "-",
              metric.sleepSPO2 || "-",
              metric.postWorkoutRecovery || "-",
            ],
        }));
    }, [vitals]);

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="text-primary"/>
                        Historial de Recuperación y Vitales
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
                            headers={[
                                "Fecha", "VFC Dormido", "VFC Despertar", "FC Media Diaria", "FC Sedentaria",
                                "FC Reposo", "Glucosa Despertar", "Temp. Corporal", "SpO2 Dormir", "Recuperación 2min"
                            ]}
                            rows={recoveryDataRows}
                            emptyMessage="No hay datos de recuperación registrados. Sube un archivo para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
