
"use client";

import { useEffect, useState, useMemo } from "react";
import { SleepData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Moon } from "lucide-react";
import FileUploadProcessor from "@/components/dashboard/file-upload-processor";

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
        // Helper to format date from YYYY-MM-DD to DD/MM/YYYY
        const formatDate = (dateString: string) => {
            if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '-';
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        };
        
        return sleepData.map(metric => ({
            key: metric.date,
            cells: [
                formatDate(metric.date),
                metric.bedtime || "-",
                metric.wakeUpTime || "-",
                metric.inBedTime || "-",
                metric.sleepTime || "-",
                metric.awakeTime || "-",
                metric.timeToFallAsleep || "-",
                metric.efficiency || "-",
                metric.quality || "-",
                metric.hrv || "-",
                metric.hrv7DayAvg || "-",
                metric.SPO2?.avg || "-",
                metric.SPO2?.min || "-",
                metric.SPO2?.max || "-",
                metric.respiratoryRate || "-",
                metric.respiratoryRateMin || "-",
                metric.respiratoryRateMax || "-",
                metric.apnea || "-",
                metric.notes || metric.tags || "-",
            ],
        }));
    }, [sleepData]);

    return (
        <div className="flex flex-col gap-6">
            <FileUploadProcessor 
                title="Subir Datos de Sueño de AutoSleep"
                description="Sube aquí tu archivo CSV exportado desde AutoSleep."
                dataType="sleepData"
                userId={userId}
            />
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
                                "Fecha", "Hora de Dormir", "Hora de Despertar", "En Cama (min)", "Dormido (min)", "Despierto (min)",
                                "Para Dormir (min)", "Eficiencia (%)", "Calidad (%)", "VFC (ms)", "VFC 7d (ms)",
                                "Sat. O2 Media (%)", "Sat. O2 Mín (%)", "Sat. O2 Máx (%)", "Resp. Media", "Resp. Mín", "Resp. Máx",
                                "Apnea", "Notas/Etiquetas"
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
