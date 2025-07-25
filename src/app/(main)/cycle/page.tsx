
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { DailyMetric } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc, getDoc, orderBy, deleteField, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, startOfDay, differenceInDays, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar as CalendarIcon, Droplet, Plus, X, FileText, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle > 5 && dayOfCycle < 13) return "Folicular";
    if (dayOfCycle >=13 && dayOfCycle <= 15) return "Ovulación";
    return "Lútea";
};


export default function CyclePage() {
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();
    
    const [isMarkingMode, setIsMarkingMode] = useState(false);
    const newSymptomRef = useRef<HTMLInputElement>(null);
    const notesRef = useRef<HTMLTextAreaElement>(null);
    const notesTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');

    useEffect(() => {
        setIsLoading(true);
        if (!userId) return;

        try {
            const userRef = doc(db, "users", userId);
            const qDailyMetrics = query(collection(userRef, "dailyMetrics"), orderBy("date", "desc"));

            const unsubscribe = onSnapshot(qDailyMetrics, (snapshot) => {
                const metrics = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.id })) as DailyMetric[];
                setDailyMetrics(metrics);
                setIsLoading(false);
            }, (error) => {
                console.error("Error loading daily metrics:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                } else {
                    toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las métricas." });
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up Firestore listener for cycle:", error);
            setIsLoading(false);
        }
    }, [userId, toast]);

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
    
    const selectedDayMetric = useMemo(() => {
        if (!selectedDate) return null;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return dailyMetrics.find(m => m.date === dateStr) || { date: dateStr, sintomas: [], notas: '' };
    }, [selectedDate, dailyMetrics]);
    
    const menstruationDays = useMemo(() => {
        return dailyMetrics
            .filter(m => m.estadoCiclo === 'menstruacion')
            .map(m => parseISO(m.date));
    }, [dailyMetrics]);


    const handleDayClick = async (day: Date | undefined) => {
        if (!day || !userId) return;
        setSelectedDate(day);

        if (!isMarkingMode) return;
        
        const dateStr = format(day, 'yyyy-MM-dd');
        const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);

        const existingMetric = dailyMetrics.find(m => m.date === dateStr);
        const isCurrentlyMarked = existingMetric?.estadoCiclo === 'menstruacion';

        try {
             if (isCurrentlyMarked) {
                // Unmark the day by removing the field
                await updateDoc(docRef, {
                    estadoCiclo: deleteField()
                });
            } else {
                // Mark the day by setting the field
                await setDoc(docRef, {
                    date: dateStr,
                    estadoCiclo: 'menstruacion'
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error toggling menstruation day:", error);
            if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo actualizar el día. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el día." });
            }
        }
    };
    
    const handleSymptomAction = async (action: 'add' | 'remove', symptom: string) => {
        if (!selectedDate || !symptom.trim() || !userId) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);
        
        try {
            await setDoc(docRef, { 
                date: dateStr, 
                sintomas: action === 'add' ? arrayUnion(symptom) : arrayRemove(symptom) 
            }, { merge: true });

            if(action === 'add' && newSymptomRef.current) {
                newSymptomRef.current.value = "";
            }

        } catch (error) {
             if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo actualizar el síntoma. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el síntoma." });
            }
        }
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if(notesTimerRef.current) clearTimeout(notesTimerRef.current);

        notesTimerRef.current = setTimeout(async () => {
            if (!selectedDate || !userId) return;
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const docRef = doc(db, "users", userId, "dailyMetrics", dateStr);
            try {
                await setDoc(docRef, { date: dateStr, notas: e.target.value }, { merge: true });
                toast({ title: "Nota guardada", description: `Tus notas para el ${dateStr} han sido guardadas.`});
            } catch (error) {
                 if ((error as any).code === 'unavailable') {
                    toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo guardar la nota. Revisa tu conexión a internet." });
                } else {
                    toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la nota." });
                }
            }
        }, 1000); // Save after 1 second of inactivity
    };


    const cycleDataRows = useMemo(() => {
        const formatDateForTable = (dateString: string) => {
            try {
                return format(parseISO(dateString), 'dd/MM/yyyy');
            } catch (e) {
                return dateString;
            }
        };

        const allRelevantMetrics = dailyMetrics
            .filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0) || m.notas)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return allRelevantMetrics.map(metric => {
                let dayOfCycle: number | null = null;
                if(cycleStartDay){
                    try {
                        const metricDate = startOfDay(parseISO(metric.date));
                        const diff = differenceInDays(metricDate, cycleStartDay) + 1;
                        if (diff > 0) dayOfCycle = diff;
                    } catch(e) {
                        dayOfCycle = null;
                    }
                }

                return {
                    key: metric.date,
                    cells: [
                        formatDateForTable(metric.date),
                        <div className="text-center">{dayOfCycle || "-"}</div>,
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
    
    const generateReport = () => {
        let report = "Informe de Historial del Ciclo\n";
        report += "===============================\n\n";

        if (cycleDataRows.length === 0) {
            report += "No hay datos del ciclo menstrual registrados.";
        } else {
            cycleDataRows.forEach(row => {
                const [date, day, phase, bleeding, symptoms, notes] = row.cells;
                report += `Fecha: ${date}\n`;
                report += `Día del Ciclo: ${(day as React.ReactElement)?.props.children || '-'}\n`;
                report += `Fase: ${phase}\n`;
                
                let bleedingText = "No";
                if (typeof bleeding === 'object' && bleeding !== null && 'props' in bleeding) {
                    bleedingText = (bleeding as React.ReactElement).props.children;
                }
                report += `Sangrado: ${bleedingText}\n`;
                
                let symptomsText = "Ninguno";
                if(typeof symptoms === 'object' && symptoms !== null && 'props' in symptoms) {
                   const symptomBadges = (symptoms as React.ReactElement).props.children;
                   if(Array.isArray(symptomBadges)) {
                       symptomsText = symptomBadges.map(b => b.props.children).join(', ');
                   }
                }
                report += `Síntomas: ${symptomsText}\n`;
                report += `Notas: ${notes}\n`;
                report += "-------------------------------\n";
            });
        }

        setReportContent(report);
        setIsReportOpen(true);
    };

    const handleCopyToClipboard = () => {
        if (!reportContent) return;
        navigator.clipboard.writeText(reportContent).then(() => {
            toast({ title: "¡Copiado!", description: "El informe ha sido copiado a tu portapapeles." });
        }, (err) => {
            console.error('Could not copy text: ', err);
            toast({ variant: "destructive", title: "Error", description: "No se pudo copiar el informe." });
        });
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <CalendarIcon className="text-primary"/> 
                           Calendario del Ciclo
                        </CardTitle>
                        <CardDescription>
                           Activa el modo sangrado para marcar los días en el calendario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                       <Button 
                         onClick={() => setIsMarkingMode(!isMarkingMode)}
                         variant={isMarkingMode ? 'destructive' : 'outline'}
                         className="w-full"
                        >
                            <Droplet className="mr-2 h-4 w-4" />
                         {isMarkingMode ? 'Desactivar Modo Marcado' : 'Marcar Sangrado'}
                       </Button>
                       <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDayClick}
                            locale={es}
                            className="rounded-md border"
                            disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                            modifiers={{ menstruation: menstruationDays }}
                            modifiersClassNames={{
                                menstruation: 'bg-destructive/80 text-destructive-foreground',
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado Actual</CardTitle>
                             <CardDescription>{selectedDate ? format(selectedDate, "PPP", { locale: es }) : 'Selecciona un día'}</CardDescription>
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
                            <CardTitle>Síntomas y Notas</CardTitle>
                            <CardDescription>Añade detalles sobre el día seleccionado.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Síntomas</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input ref={newSymptomRef} placeholder="Ej. Dolor de cabeza" onKeyDown={(e) => e.key === 'Enter' && newSymptomRef.current && handleSymptomAction('add', newSymptomRef.current.value)}/>
                                    <Button size="icon" onClick={() => newSymptomRef.current && handleSymptomAction('add', newSymptomRef.current.value)}><Plus className="h-4 w-4"/></Button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedDayMetric?.sintomas?.map(symptom => (
                                        <Badge key={symptom} variant="secondary">
                                            {symptom}
                                            <button onClick={() => handleSymptomAction('remove', symptom)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                                                <X className="h-3 w-3"/>
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="text-sm font-medium">Notas</label>
                                <Textarea 
                                    ref={notesRef}
                                    key={selectedDayMetric?.date} // Re-render textarea on day change
                                    defaultValue={selectedDayMetric?.notas || ''}
                                    onChange={handleNotesChange}
                                    placeholder="¿Cómo te sientes hoy?" 
                                    className="mt-1"
                                />
                             </div>
                        </CardContent>
                    </Card>
                 </div>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Stethoscope className="text-primary"/>
                                Historial del Ciclo
                            </CardTitle>
                            <CardDescription>
                                Un registro detallado de tu ciclo menstrual, síntomas y notas.
                            </CardDescription>
                        </div>
                        <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p>Cargando datos del ciclo...</p>
                        ) : (
                            <DataTable
                                headers={["Fecha", "Día del Ciclo", "Fase", "Sangrado", "Síntomas", "Notas"]}
                                rows={cycleDataRows}
                                emptyMessage="No hay datos del ciclo menstrual registrados. Usa el calendario de arriba para empezar."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Historial del Ciclo</DialogTitle>
                        <DialogDescription>
                          Copia este informe para analizarlo con una IA o guardarlo en tus notas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            readOnly
                            value={reportContent}
                            className="h-64 text-sm font-mono"
                        />
                    </div>
                    <DialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={handleCopyToClipboard}>
                           <Copy className="mr-2 h-4 w-4"/> Copiar
                        </Button>
                        <Button onClick={() => setIsReportOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

