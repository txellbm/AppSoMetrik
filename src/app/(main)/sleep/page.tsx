
"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, doc, orderBy, addDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { format, parse, parseISO, differenceInMinutes, intervalToDuration, addDays, subDays } from "date-fns";
import { es } from 'date-fns/locale';
import { db } from "@/lib/firebase";
import { SleepData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Plus, Edit, Trash2, BedDouble, Clock, Timer, Percent, Heart, BrainCircuit, FileText, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const formatMinutesToHHMM = (minutes: number | undefined | null) => {
    if (minutes === undefined || minutes === null) return "-";
    const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
    const hours = duration.hours || 0;
    const mins = duration.minutes || 0;
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

const InfoPill = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | undefined | null }) => (
    value !== undefined && value !== null && value !== '' && value !== '-' &&
    <div className="flex flex-col items-center justify-center p-2 bg-muted rounded-lg text-center">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {icon}
            <span>{label}</span>
        </div>
        <span className="text-base font-bold text-primary">{value}</span>
    </div>
);


export default function SleepPage() {
    const [sleepData, setSleepData] = useState<SleepData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSleep, setEditingSleep] = useState<SleepData | null>(null);
    const userId = "user_test_id";
    const { toast } = useToast();
    
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');


    useEffect(() => {
        setIsLoading(true);
        const userRef = doc(db, "users", userId);
        const qSleep = query(collection(userRef, "sleep_manual"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qSleep, (snapshot) => {
            let data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SleepData[];
            
            data.sort((a, b) => {
                const dateComparison = b.date.localeCompare(a.date);
                if (dateComparison !== 0) return dateComparison;
                return (a.bedtime || "00:00").localeCompare(b.bedtime || "00:00");
            });

            setSleepData(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading sleep data:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleSaveSleep = async (data: Omit<SleepData, 'id'> & { id?: string }) => {
        try {
            const collectionRef = collection(db, "users", userId, "sleep_manual");
            
             const dataToSave = {
                id: data.id,
                date: data.date,
                type: data.type,
                bedtime: data.bedtime,
                wakeUpTime: data.wakeUpTime,
                sleepTime: data.sleepTime,
                timeToFallAsleep: data.timeToFallAsleep,
                timeAwake: data.timeAwake,
                efficiency: data.efficiency,
                avgHeartRate: data.avgHeartRate,
                minHeartRate: data.minHeartRate,
                maxHeartRate: data.maxHeartRate,
                lpmAlDespertar: data.lpmAlDespertar,
                vfcAlDormir: data.vfcAlDormir,
                vfcAlDespertar: data.vfcAlDespertar,
                phases: {
                    rem: data.phases?.rem,
                    light: data.phases?.light,
                    deep: data.phases?.deep,
                },
                notes: data.notes
            };

            const finalData: { [key: string]: any } = {};
            for (const key in dataToSave) {
                const value = (dataToSave as any)[key];
                if (value !== undefined) {
                    finalData[key] = value;
                }
            }


            if (data.id) {
                const docRef = doc(collectionRef, data.id);
                await setDoc(docRef, finalData, { merge: true });
                toast({ title: "Sesión de sueño actualizada" });
            } else {
                const docRef = await addDoc(collectionRef, finalData);
                await updateDoc(docRef, { id: docRef.id });
                toast({ title: "Sesión de sueño registrada" });
            }
            setIsDialogOpen(false);
            setEditingSleep(null);
        } catch (error) {
            console.error("Error saving sleep session:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la sesión de sueño." });
        }
    };
    
    const handleDeleteSleep = async (id: string) => {
        try {
            await deleteDoc(doc(db, "users", userId, "sleep_manual", id));
            toast({ title: "Sesión de sueño eliminada", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting sleep session:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la sesión." });
        }
    }
    
    const openDialog = (sleep: SleepData | null) => {
        setEditingSleep(sleep);
        setIsDialogOpen(true);
    };
    
    const formatSleepDate = (session: SleepData) => {
        if (!session.date || !session.bedtime || !session.wakeUpTime) {
            return format(parseISO(session.date), "EEEE, d 'de' LLLL", { locale: es });
        }
    
        if (session.type === 'noche') {
            let startDate = parseISO(session.date);
            const bedtime = parse(session.bedtime, 'HH:mm', new Date());
            
            // Si la hora de dormir es antes de las 4 AM, se considera de la noche anterior.
            if (bedtime.getHours() < 4) {
                startDate = subDays(startDate, 1);
            }
    
            const wakeUpTime = parse(session.wakeUpTime, 'HH:mm', new Date());
            const endDate = addDays(startDate, 1);
            
            // Si la hora de despertarse es antes que la de dormir (abarca medianoche)
            // O si la hora de dormir es de madrugada (ya se ajustó startDate)
            if (wakeUpTime < bedtime || bedtime.getHours() < 4) {
                 return `${format(startDate, 'eeee d', {locale: es})} al ${format(endDate, 'eeee d \'de\' LLLL', {locale: es})}`;
            }
        }
        
        // Para siestas o noches que no cruzan la medianoche
        return format(parseISO(session.date), "EEEE, d 'de' LLLL", { locale: es });
    };

    const generateReport = () => {
        let report = `Informe de Sueño\n`;
        report += "===================\n\n";

        if (sleepData.length === 0) {
            report += "No hay sesiones de sueño registradas.";
        } else {
            sleepData.forEach(session => {
                report += `Tipo: ${session.type?.charAt(0).toUpperCase() + session.type?.slice(1)}\n`;
                report += `Fecha: ${formatSleepDate(session)}\n`;
                report += `Horario: ${session.bedtime} - ${session.wakeUpTime}\n`;
                report += `Duración Total: ${formatMinutesToHHMM(session.sleepTime)}\n`;
                report += `Eficiencia: ${session.efficiency ? `${session.efficiency}%` : '-'}\n`;
                report += `Tiempo para dormir: ${session.timeToFallAsleep ? `${session.timeToFallAsleep} min` : '-'}\n`;
                report += `Tiempo despierto: ${formatMinutesToHHMM(session.timeAwake)}\n`;
                report += `Fases:\n`;
                report += `  - REM: ${formatMinutesToHHMM(session.phases?.rem)}\n`;
                report += `  - Ligero: ${formatMinutesToHHMM(session.phases?.light)}\n`;
                report += `  - Profundo: ${formatMinutesToHHMM(session.phases?.deep)}\n`;
                report += `Datos Fisiológicos:\n`;
                report += `  - FC Media: ${session.avgHeartRate ? `${session.avgHeartRate} lpm` : '-'}\n`;
                report += `  - FC Mín-Máx: ${session.minHeartRate || '-'}/${session.maxHeartRate || '-'} lpm\n`;
                report += `  - LPM al despertar: ${session.lpmAlDespertar ? `${session.lpmAlDespertar} lpm` : '-'}\n`;
                report += `  - VFC al dormir: ${session.vfcAlDormir ? `${session.vfcAlDormir} ms` : '-'}\n`;
                report += `  - VFC al despertar: ${session.vfcAlDespertar ? `${session.vfcAlDespertar} ms` : '-'}\n`;
                if(session.notes) {
                    report += `Notas: ${session.notes}\n`;
                }
                report += "---------------------------------\n\n";
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
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Moon className="text-primary"/>
                            Registro de Sueño
                        </CardTitle>
                        <CardDescription>
                            Registra y analiza tus sesiones de sueño para entender tus patrones de descanso.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                        <Button onClick={() => openDialog(null)}>
                           <Plus className="mr-2"/>
                           Añadir Sesión
                       </Button>
                     </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                        <div className="text-center py-8">Cargando datos de sueño...</div>
                    ) : sleepData.length > 0 ? (
                        sleepData.map((session) => (
                           <Card key={session.id} className="overflow-hidden">
                             <CardHeader className="p-4 bg-muted/50 flex flex-row items-center justify-between">
                                 <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Badge variant={session.type === 'noche' ? "default" : "secondary"} className="capitalize text-base">{session.type}</Badge>
                                        <span className="capitalize">{formatSleepDate(session)}</span>
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {session.bedtime} - {session.wakeUpTime}
                                    </CardDescription>
                                 </div>
                                 <div className="flex gap-2">
                                     <Button variant="ghost" size="icon" onClick={() => openDialog(session)}><Edit className="h-4 w-4"/></Button>
                                     <Button variant="ghost" size="icon" onClick={() => session.id && handleDeleteSleep(session.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                 </div>
                             </CardHeader>
                             <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <h4 className="font-semibold flex items-center gap-2"><BedDouble className="text-primary"/>Sueño</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <InfoPill icon={<Timer className="h-4 w-4"/>} label="Duración Total" value={formatMinutesToHHMM(session.sleepTime)} />
                                        <InfoPill icon={<Percent className="h-4 w-4"/>} label="Eficiencia" value={session.efficiency ? `${session.efficiency}%` : '-'} />
                                        <InfoPill icon={<Clock className="h-4 w-4"/>} label="Me dormí en" value={session.timeToFallAsleep !== undefined ? `${session.timeToFallAsleep} min` : '-'} />
                                        <InfoPill icon={<Clock className="h-4 w-4"/>} label="Tiempo despierto" value={formatMinutesToHHMM(session.timeAwake)} />
                                    </div>
                                    <div className="space-y-1 pt-2">
                                        <Label className="text-xs">Fases</Label>
                                        <div className="flex justify-around bg-muted p-2 rounded-lg">
                                            <div className="text-center">
                                                <p className="font-bold">{formatMinutesToHHMM(session.phases?.rem)}</p>
                                                <p className="text-xs text-muted-foreground">REM</p>
                                            </div>
                                             <div className="text-center">
                                                <p className="font-bold">{formatMinutesToHHMM(session.phases?.light)}</p>
                                                <p className="text-xs text-muted-foreground">Ligero</p>
                                            </div>
                                             <div className="text-center">
                                                <p className="font-bold">{formatMinutesToHHMM(session.phases?.deep)}</p>
                                                <p className="text-xs text-muted-foreground">Profundo</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                     <h4 className="font-semibold flex items-center gap-2"><Heart className="text-destructive"/>Datos Fisiológicos</h4>
                                     <div className="grid grid-cols-2 gap-2">
                                        <InfoPill icon={<Heart className="h-4 w-4"/>} label="FC Media" value={session.avgHeartRate ? `${session.avgHeartRate} lpm` : '-'} />
                                        <InfoPill icon={<Heart className="h-4 w-4"/>} label="FC Mín-Máx" value={`${session.minHeartRate || '·'}-${session.maxHeartRate || '·'}`} />
                                        <InfoPill icon={<Heart className="h-4 w-4"/>} label="LPM al despertar" value={session.lpmAlDespertar ? `${session.lpmAlDespertar} lpm` : '-'} />
                                        <InfoPill icon={<BrainCircuit className="h-4 w-4"/>} label="VFC al despertar" value={session.vfcAlDespertar ? `${session.vfcAlDespertar} ms` : '-'} />
                                        <InfoPill icon={<BrainCircuit className="h-4 w-4"/>} label="VFC al dormir" value={session.vfcAlDormir ? `${session.vfcAlDormir} ms` : '-'} />
                                     </div>
                                </div>
                                {session.notes && (
                                    <div className="space-y-3">
                                         <h4 className="font-semibold flex items-center gap-2"><FileText className="text-primary"/>Notas</h4>
                                         <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg italic">"{session.notes}"</p>
                                    </div>
                                )}
                             </CardContent>
                           </Card>
                        ))
                    ) : (
                         <div className="text-center h-24 text-muted-foreground flex items-center justify-center">
                            No hay datos de sueño registrados.
                        </div>
                    )}
                </CardContent>
            </Card>

            <SleepDialog 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveSleep}
                sleep={editingSleep}
            />
            
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Sueño</DialogTitle>
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

type SleepDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SleepData, 'id'> & { id?: string }) => void;
    sleep: SleepData | null;
};

function SleepDialog({ isOpen, onClose, onSave, sleep }: SleepDialogProps) {
    const [formData, setFormData] = useState<Partial<SleepData>>({});

    useEffect(() => {
        if (isOpen) {
            if (sleep) {
                setFormData(sleep);
            } else {
                setFormData({
                    date: format(new Date(), "yyyy-MM-dd"),
                    type: "noche",
                });
            }
        }
    }, [sleep, isOpen]);

     useEffect(() => {
        if (formData.bedtime && formData.wakeUpTime && formData.date) {
            try {
                const start = parse(`${formData.date} ${formData.bedtime}`, 'yyyy-MM-dd HH:mm', new Date());
                let end = parse(`${formData.date} ${formData.wakeUpTime}`, 'yyyy-MM-dd HH:mm', new Date());

                if (end <= start) {
                    end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add a day if wake up is next day
                }

                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const sleepTime = differenceInMinutes(end, start);
                    setFormData(prev => ({...prev, sleepTime}));
                }
            } catch (error) {
                // Ignore parsing errors while user is typing
            }
        }
    }, [formData.date, formData.bedtime, formData.wakeUpTime]);


    const handleChange = (field: keyof Omit<SleepData, 'phases'>, value: string | number | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePhaseChange = (phase: 'deep' | 'light' | 'rem', value: number | undefined) => {
        setFormData(prev => ({
            ...prev,
            phases: {
                ...(prev.phases || {}),
                [phase]: value
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const dataToSave = {
            id: formData.id,
            date: formData.date,
            type: formData.type,
            bedtime: formData.bedtime,
            wakeUpTime: formData.wakeUpTime,
            sleepTime: formData.sleepTime,
            timeToFallAsleep: formData.timeToFallAsleep,
            timeAwake: formData.timeAwake,
            efficiency: formData.efficiency,
            avgHeartRate: formData.avgHeartRate,
            minHeartRate: formData.minHeartRate,
            maxHeartRate: formData.maxHeartRate,
            lpmAlDespertar: formData.lpmAlDespertar,
            vfcAlDormir: formData.vfcAlDormir,
            vfcAlDespertar: formData.vfcAlDespertar,
            phases: {
                rem: formData.phases?.rem,
                light: formData.phases?.light,
                deep: formData.phases?.deep,
            },
            notes: formData.notes
        };

        onSave(dataToSave as Omit<SleepData, 'id'> & { id?: string });
    };
    
    const formatMinutesToHHMMInput = (minutes: number | undefined) => {
        if (minutes === undefined || minutes === null) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const handleDurationChange = (field: 'timeAwake' | 'phases.deep' | 'phases.light' | 'phases.rem', value: string) => {
        const [hours, minutes] = value.split(':').map(Number);
        const totalMinutes = (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
        const finalValue = totalMinutes >= 0 ? totalMinutes : undefined;

        if (field.startsWith('phases.')) {
            const phase = field.split('.')[1] as 'deep' | 'light' | 'rem';
            handlePhaseChange(phase, finalValue);
        } else if (field === 'timeAwake') {
            handleChange('timeAwake', finalValue);
        }
    }

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{sleep ? 'Editar Sesión de Sueño' : 'Registrar Sesión de Sueño'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                    
                    <h4 className="font-semibold text-primary">💤 Sueño</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="type">Tipo</Label>
                             <Select value={formData.type || 'noche'} onValueChange={(v) => handleChange('type', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="noche">Noche</SelectItem>
                                    <SelectItem value="siesta">Siesta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="date">Fecha</Label>
                            <Input id="date" type="date" value={formData.date || ''} onChange={(e) => handleChange('date', e.target.value)} required/>
                        </div>
                         <div>
                            <Label htmlFor="bedtime">Hora de inicio</Label>
                            <Input id="bedtime" type="time" value={formData.bedtime || ''} onChange={(e) => handleChange('bedtime', e.target.value)} required/>
                        </div>
                        <div>
                           <Label htmlFor="wakeUpTime">Hora de fin</Label>
                           <Input id="wakeUpTime" type="time" value={formData.wakeUpTime || ''} onChange={(e) => handleChange('wakeUpTime', e.target.value)} required/>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div>
                            <Label htmlFor="sleepTime">Duración total</Label>
                            <Input id="sleepTime" type="text" placeholder="hh:mm" value={formatMinutesToHHMM(formData.sleepTime)} disabled />
                        </div>
                         <div>
                           <Label htmlFor="efficiency">Eficiencia (%)</Label>
                           <Input id="efficiency" type="number" value={formData.efficiency ?? ''} onChange={(e) => handleChange('efficiency', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                    </div>
                    <div>
                        <Label>Fases y tiempos del sueño</Label>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-1">
                            <div>
                                <Label htmlFor="timeToFallAsleep" className="text-xs text-muted-foreground">Me dormí en (min)</Label>
                                <Input id="timeToFallAsleep" type="number" placeholder="min" value={formData.timeToFallAsleep ?? ''} onChange={(e) => handleChange('timeToFallAsleep', e.target.value === '' ? undefined : Number(e.target.value))}/>
                            </div>
                             <div>
                                <Label htmlFor="timeAwake" className="text-xs text-muted-foreground">Tiempo despierto</Label>
                                <Input id="timeAwake" type="time" placeholder="hh:mm" value={formatMinutesToHHMMInput(formData.timeAwake)} onChange={(e) => handleDurationChange('timeAwake', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="rem" className="text-xs text-muted-foreground">REM</Label>
                                <Input id="rem" type="time" placeholder="hh:mm" value={formatMinutesToHHMMInput(formData.phases?.rem)} onChange={(e) => handleDurationChange('phases.rem', e.target.value)}/>
                            </div>
                             <div>
                                <Label htmlFor="light" className="text-xs text-muted-foreground">Sueño ligero</Label>
                                <Input id="light" type="time" placeholder="hh:mm" value={formatMinutesToHHMMInput(formData.phases?.light)} onChange={(e) => handleDurationChange('phases.light', e.target.value)}/>
                            </div>
                            <div>
                                <Label htmlFor="deep" className="text-xs text-muted-foreground">Sueño profundo</Label>
                                <Input id="deep" type="time" placeholder="hh:mm" value={formatMinutesToHHMMInput(formData.phases?.deep)} onChange={(e) => handleDurationChange('phases.deep', e.target.value)}/>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-6"/>
                    <h4 className="font-semibold text-primary">❤️‍🩹 Datos fisiológicos</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>FC Media</Label>
                            <Input id="avgHeartRate" type="number" placeholder="lpm" value={formData.avgHeartRate ?? ''} onChange={(e) => handleChange('avgHeartRate', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                        <div>
                             <Label>FC Mínima</Label>
                             <Input id="minHeartRate" type="number" placeholder="lpm" value={formData.minHeartRate ?? ''} onChange={(e) => handleChange('minHeartRate', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                        <div>
                              <Label>FC Máxima</Label>
                              <Input id="maxHeartRate" type="number" placeholder="lpm" value={formData.maxHeartRate ?? ''} onChange={(e) => handleChange('maxHeartRate', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <Label>LPM al despertar</Label>
                            <Input id="lpmAlDespertar" type="number" placeholder="lpm" value={formData.lpmAlDespertar ?? ''} onChange={(e) => handleChange('lpmAlDespertar', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                        <div>
                             <Label>VFC al dormir</Label>
                             <Input id="vfcAlDormir" type="number" placeholder="ms" value={formData.vfcAlDormir ?? ''} onChange={(e) => handleChange('vfcAlDormir', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                        <div>
                              <Label>VFC al despertar</Label>
                              <Input id="vfcAlDespertar" type="number" placeholder="ms" value={formData.vfcAlDespertar ?? ''} onChange={(e) => handleChange('vfcAlDespertar', e.target.value === '' ? undefined : Number(e.target.value))}/>
                        </div>
                    </div>

                    <Separator className="my-6"/>
                     <div>
                        <Label htmlFor="notes" className="font-semibold text-primary">✍️ Notas / Sensaciones</Label>
                        <Textarea id="notes" value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
