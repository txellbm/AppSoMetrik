
"use client";

import { useEffect, useState, useMemo } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar as CalendarIcon, Droplet, PlusCircle, X } from "lucide-react";

export default function CyclePage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();

    // State for the manual entry form
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [cycleStatus, setCycleStatus] = useState<string>("");
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [currentSymptom, setCurrentSymptom] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Load existing data for the selected date
    useEffect(() => {
        if (!selectedDate) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as DailyMetric;
                setCycleStatus(data.estadoCiclo || "");
                setSymptoms(data.sintomas || []);
                setNotes(data.notas || "");
            } else {
                // Reset form if no data for this date
                setCycleStatus("");
                setSymptoms([]);
                setNotes("");
            }
        });
        return () => unsubscribe();
    }, [selectedDate, userId]);


    // Fetch all metrics for the history table
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

    const handleAddSymptom = () => {
        if (currentSymptom && !symptoms.includes(currentSymptom)) {
            setSymptoms([...symptoms, currentSymptom]);
            setCurrentSymptom("");
        }
    };
    
    const handleRemoveSymptom = (symptomToRemove: string) => {
        setSymptoms(symptoms.filter(s => s !== symptomToRemove));
    };

    const handleSaveMetric = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona una fecha." });
            return;
        }
        setIsSubmitting(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);

        const dataToSave: Partial<DailyMetric> = {
            date: dateStr,
            estadoCiclo: cycleStatus,
            sintomas: symptoms,
            notas: notes,
        };

        try {
            await setDoc(docRef, dataToSave, { merge: true });
            toast({ title: "Datos guardados", description: `Se ha actualizado el registro para el ${format(selectedDate, 'PPP', { locale: es })}.` });
        } catch (error) {
            console.error("Error saving daily metric:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
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
                    metric.estadoCiclo === "menstruacion" ? "Sí" : (metric.estadoCiclo || "No"),
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
                        Selecciona un día y añade tus síntomas, estado y notas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex justify-center">
                       <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            locale={es}
                            className="rounded-md border"
                            disabled={(date) => date > new Date()}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <form onSubmit={handleSaveMetric} className="space-y-4">
                            <h4 className="font-semibold text-lg">
                                Registrando para: <span className="text-primary">{selectedDate ? format(selectedDate, 'PPP', { locale: es }) : '...'}</span>
                            </h4>
                            <div>
                               <label className="text-sm font-medium">Estado del Ciclo</label>
                               <Select value={cycleStatus} onValueChange={setCycleStatus}>
                                   <SelectTrigger>
                                       <SelectValue placeholder="Selecciona un estado" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       <SelectItem value="menstruacion">Menstruación</SelectItem>
                                       <SelectItem value="manchado">Manchado (spotting)</SelectItem>
                                       <SelectItem value="normal">Normal (sin sangrado)</SelectItem>
                                   </SelectContent>
                               </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Síntomas</label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        value={currentSymptom} 
                                        onChange={(e) => setCurrentSymptom(e.target.value)}
                                        placeholder="Ej: Cólicos, Hinchazón..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSymptom();
                                            }
                                        }}
                                    />
                                    <Button type="button" size="icon" onClick={handleAddSymptom}><PlusCircle className="h-4 w-4"/></Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 min-h-[24px]">
                                    {symptoms.map(s => (
                                        <Badge key={s} variant="secondary">
                                            {s}
                                            <button onClick={() => handleRemoveSymptom(s)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="text-sm font-medium">Notas Adicionales</label>
                                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="¿Algo más que quieras anotar?" />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting || !selectedDate}>
                                    {isSubmitting ? "Guardando..." : "Guardar Registro del Día"}
                                </Button>
                            </div>
                        </form>
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
                            emptyMessage="No hay datos del ciclo menstrual registrados. Usa el formulario de arriba para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

