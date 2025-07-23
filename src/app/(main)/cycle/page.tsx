
"use client";

import { useEffect, useState, useMemo } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar as CalendarIcon, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CyclePage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [selectedDays, setSelectedDays] = useState<Date[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const userId = "user_test_id";
    const { toast } = useToast();

    // Fetch all metrics to initialize calendar and for the history table
    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qDailyMetrics = query(collection(userRef, "dailyMetrics"));

        const unsubscribe = onSnapshot(qDailyMetrics, (snapshot) => {
            const metrics = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.id })) as DailyMetric[];
            setDailyMetrics(metrics);

            const menstruationDays = metrics
                .filter(m => m.estadoCiclo === 'menstruacion')
                .map(m => startOfDay(new Date(m.date)));
            setSelectedDays(menstruationDays);

            setIsLoading(false);
        }, (error) => {
            console.error("Error loading daily metrics:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleSaveSelection = async () => {
        setIsSubmitting(true);
        const batch = writeBatch(db);
        const userRef = doc(db, "users", userId);
        
        // Create a set of selected dates for efficient lookup
        const selectedDatesSet = new Set(selectedDays.map(d => format(d, 'yyyy-MM-dd')));
        
        // Find days that were previously marked but are now deselected
        const daysToUnmark = dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion' && !selectedDatesSet.has(m.date))
            .map(m => m.date);

        try {
            // Mark selected days as 'menstruacion'
            selectedDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const docRef = doc(userRef, "dailyMetrics", dateStr);
                batch.set(docRef, { estadoCiclo: "menstruacion" }, { merge: true });
            });

            // Unmark deselected days by setting estadoCiclo to 'normal'
            daysToUnmark.forEach(dateStr => {
                 const docRef = doc(userRef, "dailyMetrics", dateStr);
                 batch.set(docRef, { estadoCiclo: "normal" }, { merge: true });
            });

            await batch.commit();
            toast({ title: "Registro del ciclo guardado", description: "Se han actualizado los días de tu ciclo." });
        } catch (error) {
            console.error("Error saving cycle selection:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la selección." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const sortedMetrics = useMemo(() => {
        return [...dailyMetrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyMetrics]);

    const cycleDataRows = useMemo(() => {
        return sortedMetrics
            .filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0))
            .map(metric => ({
                key: metric.date,
                cells: [
                    format(new Date(metric.date), 'dd/MM/yyyy'),
                    "N/A", // Fase no disponible aún
                    metric.estadoCiclo === "menstruacion" ? <Badge variant="destructive">Sí</Badge> : (metric.estadoCiclo || "No"),
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
                        <CalendarIcon className="text-primary"/>
                        Registro Manual del Ciclo
                    </CardTitle>
                    <CardDescription>
                        Selecciona los días de tu menstruación en el calendario y pulsa guardar. Puedes añadir síntomas y notas desde el historial si es necesario.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Calendar
                        mode="multiple"
                        selected={selectedDays}
                        onSelect={setSelectedDays as any}
                        locale={es}
                        className="rounded-md border"
                        disabled={(date) => date > new Date()}
                        modifiersStyles={{
                            selected: { 
                                backgroundColor: 'hsl(var(--destructive))', 
                                color: 'hsl(var(--destructive-foreground))' 
                            },
                        }}
                    />
                    <Button onClick={handleSaveSelection} disabled={isSubmitting}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Guardando..." : "Guardar Selección"}
                    </Button>
                </CardContent>
            </Card>

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
                            headers={["Fecha", "Fase", "Sangrado", "Síntomas", "Notas"]}
                            rows={cycleDataRows}
                            emptyMessage="No hay datos del ciclo menstrual registrados. Usa el calendario de arriba para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

