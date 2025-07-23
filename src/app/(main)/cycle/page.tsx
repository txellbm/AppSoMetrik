
"use client";

import { useEffect, useState, useMemo } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Stethoscope, Badge } from "lucide-react";

export default function CyclePage() {
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

    const cycleDataRows = useMemo(() => {
        return sortedMetrics
            .filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0))
            .map(metric => ({
                key: metric.date,
                cells: [
                    metric.date,
                    "N/A", // Fase no disponible aún
                    metric.estadoCiclo === "menstruacion" ? "Sí" : "No",
                    metric.sintomas && metric.sintomas.length > 0
                        ? <div className="flex flex-wrap gap-1">{metric.sintomas.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}</div>
                        : "Ninguno",
                    metric.notas || "-",
                ],
            }));
    }, [sortedMetrics]);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Stethoscope className="text-primary"/>
                        Historial del Ciclo Menstrual
                    </CardTitle>
                    <CardDescription>
                        Un registro detallado de tu ciclo menstrual, síntomas y notas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Cargando datos del ciclo...</p>
                    ) : (
                        <DataTable
                            headers={["Fecha", "Fase", "Menstruación", "Síntomas", "Notas"]}
                            rows={cycleDataRows}
                            emptyMessage="No hay datos del ciclo menstrual registrados. Sube un archivo para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
