
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc, getDoc, orderBy, deleteField, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};


export default function CyclePage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();
    
    const [isMarkingMode, setIsMarkingMode] = useState(false);

    useEffect(() => {
        setIsLoading(true);
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

    const { cycleStartDay, currentDayOfCycle } = useMemo(() => {
        const sortedMenstruationDays = dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => startOfDay(parseISO(m.date))) 
            .sort((a, b) => b.getTime() - a.getTime());

        if (sortedMenstruationDays.length === 0) {
            return { cycleStartDay: null, currentDayOfCycle: null };
        }

        let cycleStartDay = sortedMenstruationDays[0];
        for (let i = 1; i < sortedMenstruationDays.length; i++) {
            const diff = differenceInDays(sortedMenstruationDays[i - 1], sortedMenstruationDays[i]);
            if (diff > 1) { 
                break;
            }
            cycleStartDay = sortedMenstruationDays[i];
        }
        
        const currentDay = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
        const dayOfCycle = differenceInDays(currentDay, cycleStartDay) + 1;

        return { cycleStartDay, currentDayOfCycle: dayOfCycle > 0 ? dayOfCycle : null };

    }, [dailyMetrics, selectedDate]);
    
    const currentPhase = getCyclePhase(currentDayOfCycle);
    
    const menstruationDays = useMemo(() => {
        return dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => parseISO(m.date));
    }, [dailyMetrics]);


    const handleDayClick = async (day: Date | undefined) => {
        setSelectedDate(day);

        if (isMarkingMode && day) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);
            
            try {
                const docSnap = await getDoc(docRef);
                let newStatusIsSet = false;

                if (docSnap.exists() && docSnap.data().estadoCiclo === 'menstruacion') {
                    // Day exists and is marked, so we unmark it.
                    await updateDoc(docRef, { estadoCiclo: deleteField() });
                    toast({
                        title: "Día desmarcado",
                        description: `${format(day, 'PPP', { locale: es })} ya no está marcado como día de menstruación.`,
                        duration: 2000,
                    });
                } else {
                    // Day doesn't exist or is not marked, so we mark it.
                    await setDoc(docRef, { estadoCiclo: 'menstruacion' }, { merge: true });
                    newStatusIsSet = true;
                     toast({
                        title: "Día marcado",
                        description: `${format(day, 'PPP', { locale: es })} ha sido marcado como día de menstruación.`,
                        duration: 2000,
                    });
                }
            } catch (error) {
                 console.error("Error toggling menstruation day:", error);
                 toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el día." });
            }
        }
    };

    const cycleDataRows = useMemo(() => {
        const formatDateForTable = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy');
        
        const allRelevantMetrics = dailyMetrics
            .filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0) || m.notas)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return allRelevantMetrics.map(metric => {
                let dayOfCycle: number | null = null;
                const metricDate = parseISO(metric.date);
                if (cycleStartDay) {
                    const diff = differenceInDays(metricDate, cycleStartDay) + 1;
                    if (diff > 0) dayOfCycle = diff;
                }

                return {
                    key: metric.date,
                    cells: [
                        formatDateForTable(metric.date),
                        getCyclePhase(dayOfCycle),
                        metric.estadoCiclo === "menstruacion" ? <Badge variant="destructive">Sí</Badge> : "No",
                        metric.sintomas && metric.sintomas.length > 0
                            ? <div className="flex flex-wrap gap-1">{metric.sintomas.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>
                            : "Ninguno",
                        metric.notas || "-",
                    ],
                }
            });
    }, [dailyMetrics, cycleStartDay]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <CalendarIcon className="text-primary"/> 
                           Registro del Ciclo
                        </CardTitle>
                        <CardDescription>
                           Usa el botón para activar el modo de marcado y haz clic en los días del calendario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                       <Button 
                         onClick={() => setIsMarkingMode(!isMarkingMode)}
                         variant={isMarkingMode ? 'destructive' : 'outline'}
                         className="w-full"
                        >
                         {isMarkingMode ? 'Desactivar Modo Marcador' : 'Marcar/Desmarcar Días'}
                       </Button>
                       <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDayClick}
                            locale={es}
                            className="rounded-md border"
                            disabled={(date) => date > new Date()}
                            modifiers={{ menstruation: menstruationDays }}
                            modifiersStyles={{
                                menstruation: { 
                                    backgroundColor: 'hsl(var(--destructive))', 
                                    color: 'hsl(var(--destructive-foreground))' 
                                },
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Estado Actual</CardTitle>
                        <CardDescription>Tu fase actual basada en los datos registrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-around items-center p-4 bg-muted rounded-lg text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Fase Actual</p>
                                <p className="text-xl font-bold text-primary">{currentPhase}</p>
                            </div>
                            <div className="border-l h-10"></div>
                            <div>
                                <p className="text-sm text-muted-foreground">Día del Ciclo</p>
                                <p className="text-xl font-bold text-primary">{currentDayOfCycle || '-'}</p>
                            </div>
                        </div>
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
        </div>
    );
}
