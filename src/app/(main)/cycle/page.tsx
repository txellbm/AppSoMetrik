
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar as CalendarIcon, Droplet, Wind, Shield, Zap, NotepadText, Activity } from "lucide-react";
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
    { id: 'dolor_piernas', label: 'Dolor de piernas' },
];

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    // Ovulation around day 14, can be considered part of follicular or luteal
    return "Lútea";
};


export default function CyclePage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();

    const [selectedDayMetric, setSelectedDayMetric] = useState<Partial<DailyMetric>>({ sintomas: [], notas: '' });


    // Fetch all metrics to initialize calendar and for the history table
    useEffect(() => {
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

    // Fetch or create data for the selected day
    useEffect(() => {
        if (!selectedDate) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const fetchDayData = async () => {
            const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSelectedDayMetric({ date: dateStr, ...docSnap.data()});
            } else {
                setSelectedDayMetric({ date: dateStr, estadoCiclo: undefined, sintomas: [], notas: '' });
            }
        };
        fetchDayData();
    }, [selectedDate, userId]);
    
    const { cycleStartDay, currentDayOfCycle } = useMemo(() => {
        const sortedMenstruationDays = dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => startOfDay(new Date(m.date.replace(/-/g, '/')))) // Use replace for broader compatibility
            .sort((a, b) => b.getTime() - a.getTime());

        if (sortedMenstruationDays.length === 0) {
            return { cycleStartDay: null, currentDayOfCycle: null };
        }

        let cycleStartDay = sortedMenstruationDays[0];
        // Find the actual start of the last cycle
        for (let i = 1; i < sortedMenstruationDays.length; i++) {
            // Check for a gap of more than one day
            const diff = differenceInDays(sortedMenstruationDays[i - 1], sortedMenstruationDays[i]);
            if (diff > 1) { 
                break;
            }
            cycleStartDay = sortedMenstruationDays[i];
        }
        
        const currentDayOfCycle = differenceInDays(startOfDay(selectedDate || new Date()), cycleStartDay) + 1;

        return { cycleStartDay, currentDayOfCycle: currentDayOfCycle > 0 ? currentDayOfCycle : null };

    }, [dailyMetrics, selectedDate]);
    
    const currentPhase = getCyclePhase(currentDayOfCycle);
    
    const menstruationDays = useMemo(() => {
        return dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => startOfDay(new Date(m.date.replace(/-/g, '/'))));
    }, [dailyMetrics]);


    const handleUpdateMetric = useCallback(async (field: keyof DailyMetric, value: any) => {
        if (!selectedDate) return;

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const updatedMetric = { ...selectedDayMetric, [field]: value };
        setSelectedDayMetric(updatedMetric);

        const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);
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
    }, [selectedDate, selectedDayMetric, userId, toast]);


    const cycleDataRows = useMemo(() => {
        const formatDateForTable = (dateString: string) => format(new Date(dateString.replace(/-/g, '/')), 'dd/MM/yyyy');
        
        const allRelevantMetrics = dailyMetrics
            .filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0) || m.notas)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return allRelevantMetrics.map(metric => {
                let dayOfCycle: number | null = null;
                if (cycleStartDay) {
                    const diff = differenceInDays(new Date(metric.date.replace(/-/g, '/')), cycleStartDay) + 1;
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

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="menstruation-day"
                                checked={selectedDayMetric?.estadoCiclo === 'menstruacion'}
                                onCheckedChange={(checked) => handleUpdateMetric('estadoCiclo', checked ? 'menstruacion' : null)}
                                disabled={!selectedDate}
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
                                            disabled={!selectedDate}
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
                                disabled={!selectedDate}
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
