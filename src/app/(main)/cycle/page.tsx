
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar as CalendarIcon, Save, Droplet, Wind, Shield, Zap, NotepadText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const allSymptoms = [
    { id: 'colicos', label: 'Cólicos', icon: <Droplet className="h-4 w-4" /> },
    { id: 'hinchazon', label: 'Hinchazón', icon: <Wind className="h-4 w-4" /> },
    { id: 'dolor_de_cabeza', label: 'Dolor de cabeza', icon: <Shield className="h-4 w-4" /> },
    { id: 'fatiga', label: 'Fatiga', icon: <Zap className="h-4 w-4" /> },
    { id: 'acne', label: 'Acné' },
    { id: 'antojos', label: 'Antojos' },
    { id: 'dolor_lumbar', label: 'Dolor lumbar' },
    { id: 'cambios_de_humor', label: 'Cambios de humor' },
];

export default function CyclePage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();

    const selectedDateStr = useMemo(() => selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', [selectedDate]);
    
    const [selectedDayMetric, setSelectedDayMetric] = useState<Partial<DailyMetric>>({});


    // Fetch all metrics to initialize calendar and for the history table
    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qDailyMetrics = query(collection(userRef, "dailyMetrics"));

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

    // Fetch data for the selected day
    useEffect(() => {
        if (!selectedDateStr) return;
        const fetchDayData = async () => {
            const docRef = doc(db, "users", userId, "dailyMetrics", selectedDateStr);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSelectedDayMetric(docSnap.data());
            } else {
                setSelectedDayMetric({ sintomas: [], notas: '' });
            }
        };
        fetchDayData();
    }, [selectedDateStr, userId]);
    
    const menstruationDays = useMemo(() => {
        return dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => startOfDay(new Date(m.date + "T00:00:00"))); // Ensure local time
    }, [dailyMetrics]);


    const handleUpdateMetric = useCallback(async (field: keyof DailyMetric, value: any) => {
        if (!selectedDateStr) return;

        const updatedMetric = { ...selectedDayMetric, [field]: value };
        setSelectedDayMetric(updatedMetric);

        const docRef = doc(db, "users", userId, "dailyMetrics", selectedDateStr);
        try {
            await setDoc(docRef, { [field]: value }, { merge: true });
            toast({
                title: "Registro actualizado",
                description: `Se guardó el cambio para el día ${format(selectedDate!, 'dd/MM/yyyy')}.`,
                duration: 2000,
            });
        } catch (error) {
            console.error("Error updating metric:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el cambio." });
        }
    }, [selectedDateStr, selectedDayMetric, userId, toast, selectedDate]);


    const sortedMetrics = useMemo(() => {
        return [...dailyMetrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyMetrics]);

    const cycleDataRows = useMemo(() => {
        return sortedMetrics
            .filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0) || m.notas)
            .map(metric => ({
                key: metric.date,
                cells: [
                    format(new Date(metric.date + "T00:00:00"), 'dd/MM/yyyy'),
                    "N/A", // Fase no disponible aún
                    metric.estadoCiclo === "menstruacion" ? <Badge variant="destructive">Sí</Badge> : "No",
                    metric.sintomas && metric.sintomas.length > 0
                        ? <div className="flex flex-wrap gap-1">{metric.sintomas.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>
                        : "Ninguno",
                    metric.notas || "-",
                ],
            }));
    }, [sortedMetrics]);


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
                            Selecciona un día para añadir síntomas, notas o marcarlo como día de menstruación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                       <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
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
                        <CardTitle>Registro del día: {selectedDate ? format(selectedDate, "PPP", { locale: es }) : ""}</CardTitle>
                        <CardDescription>Añade los detalles de tu ciclo para el día seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="menstruation-day"
                                checked={selectedDayMetric.estadoCiclo === 'menstruacion'}
                                onCheckedChange={(checked) => handleUpdateMetric('estadoCiclo', checked ? 'menstruacion' : 'normal')}
                            />
                            <Label htmlFor="menstruation-day" className="text-base">¿Día de menstruación?</Label>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base">Síntomas</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                               {allSymptoms.map(symptom => (
                                    <div key={symptom.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`symptom-${symptom.id}`}
                                            checked={selectedDayMetric.sintomas?.includes(symptom.label) || false}
                                            onCheckedChange={(checked) => {
                                                const currentSymptoms = selectedDayMetric.sintomas || [];
                                                const newSymptoms = checked
                                                    ? [...currentSymptoms, symptom.label]
                                                    : currentSymptoms.filter(s => s !== symptom.label);
                                                handleUpdateMetric('sintomas', newSymptoms);
                                            }}
                                        />
                                        <Label htmlFor={`symptom-${symptom.id}`} className="font-normal flex items-center gap-2">
                                            {symptom.icon} {symptom.label}
                                        </Label>
                                    </div>
                               ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="notes" className="text-base flex items-center gap-2"><NotepadText className="h-4 w-4" />Notas Adicionales</Label>
                            <Textarea
                                id="notes"
                                placeholder="Añade cualquier otra observación sobre cómo te sientes, energía, etc."
                                value={selectedDayMetric.notas || ''}
                                onChange={(e) => setSelectedDayMetric(prev => ({...prev, notas: e.target.value}))}
                                onBlur={(e) => handleUpdateMetric('notas', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                 </Card>
            </div>
            <div className="lg:col-span-3">
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

    