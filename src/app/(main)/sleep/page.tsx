
"use client";

import { useEffect, useState, useMemo } from "react";
import { SleepData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Moon } from "lucide-react";

export default function SleepPage() {
    const [sleepData, setSleepData] = useState<SleepData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qSleep = query(collection(userRef, "sleep"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qSleep, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SleepData[];
            setSleepData(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading sleep data:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const sleepDataRows = useMemo(() => {
        return sleepData.map(metric => ({
            key: metric.date,
            cells: [
                metric.date,
                metric.bedtime || "-",
                metric.wakeUpTime || "-",
                metric.inBedTime || "-",
                metric.sleepTime || "-",
                metric.awakenings || "-",
                metric.deepSleepTime || "-",
                metric.quality || "-",
                metric.efficiency || "-",
                metric.avgHeartRate || "-",
                metric.hrv || "-",
                metric.respiratoryRate || "-",
                metric.SPO2?.avg || "-",
            ],
        }));
    }, [sleepData]);

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
                            headers={[
                                "Fecha", "Hora de Dormir", "Hora de Despertar", "En Cama", "Tiempo Dormido",
                                "Despertares", "Sueño Profundo", "Calidad", "Eficiencia", "FC Dormido",
                                "VFC Dormido", "Respiración", "SpO2 Media"
                            ]}
                            rows={sleepDataRows}
                            emptyMessage="No hay datos de sueño registrados. Sube un archivo para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
