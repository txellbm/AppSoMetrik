
"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, doc, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, parseISO, differenceInMinutes, formatDuration, intervalToDuration } from "date-fns";
import { es } from 'date-fns/locale';
import { db } from "@/lib/firebase";
import { SleepData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SleepPage() {
    const [sleepData, setSleepData] = useState<SleepData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSleep, setEditingSleep] = useState<SleepData | null>(null);
    const userId = "user_test_id";
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const userRef = doc(db, "users", userId);
        const qSleep = query(collection(userRef, "sleep"), orderBy("date", "desc"), orderBy("bedtime", "asc"));

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

    const handleSaveSleep = async (data: Omit<SleepData, 'id'>) => {
        try {
            const collectionRef = collection(db, "users", userId, "sleep");
            if (editingSleep?.id) {
                const docRef = doc(collectionRef, editingSleep.id);
                await updateDoc(docRef, data);
                toast({ title: "Sesión de sueño actualizada" });
            } else {
                await addDoc(collectionRef, data);
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
            await deleteDoc(doc(db, "users", userId, "sleep", id));
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
    
    const formatSleepDuration = (minutes: number | undefined) => {
        if(minutes === undefined || minutes === null) return "-";
        const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
        return `${duration.hours || 0}h ${duration.minutes || 0}m`;
    }

    const formatDate = (dateString: string) => {
       try {
         return format(parseISO(dateString), "PPP", { locale: es });
       } catch (error) {
         return "Fecha inválida";
       }
    };
    
    const groupedSleepData = sleepData.reduce((acc, curr) => {
        (acc[curr.date] = acc[curr.date] || []).push(curr);
        return acc;
    }, {} as Record<string, SleepData[]>);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Moon className="text-primary"/>
                        Registro de Sueño
                    </CardTitle>
                    <CardDescription>
                        Registra manualmente tus sesiones de sueño para analizar tus patrones de descanso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center py-8">Cargando datos de sueño...</p>
                    ) : Object.keys(groupedSleepData).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(groupedSleepData).map(([date, sessions]) => (
                                <div key={date}>
                                    <h3 className="font-semibold mb-2 border-b pb-1">{formatDate(date)}</h3>
                                    <div className="space-y-4">
                                        {sessions.map(metric => (
                                            <Card key={metric.id} className="bg-muted/50">
                                                <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-center">
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {metric.type === 'noche' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                                        <Badge variant={metric.type === 'noche' ? "default" : "secondary"} className="capitalize">{metric.type}</Badge>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Horario</Label>
                                                        <p className="font-mono text-sm">{metric.bedtime} - {metric.wakeUpTime}</p>
                                                    </div>
                                                     <div>
                                                        <Label className="text-xs">Duración</Label>
                                                        <p className="font-mono text-sm">{formatSleepDuration(Number(metric.sleepTime))}</p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Eficiencia</Label>
                                                        <p className="font-mono text-sm">{metric.efficiency ? `${metric.efficiency}%` : "-"}</p>
                                                    </div>
                                                      <div>
                                                        <Label className="text-xs">VFC (ms)</Label>
                                                        <p className="font-mono text-sm">{metric.hrv || "-"}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => openDialog(metric)}><Edit className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => metric.id && handleDeleteSleep(metric.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                    </div>
                                                </CardContent>
                                                {(metric.notes || metric.phases) && (
                                                    <CardFooter className="flex-col items-start gap-2 text-sm pt-0 pb-4">
                                                        {metric.phases && (
                                                            <div className="flex gap-4">
                                                                <p><span className="font-semibold">Profundo:</span> {formatSleepDuration(metric.phases.deep)}</p>
                                                                <p><span className="font-semibold">Ligero:</span> {formatSleepDuration(metric.phases.light)}</p>
                                                                <p><span className="font-semibold">REM:</span> {formatSleepDuration(metric.phases.rem)}</p>
                                                            </div>
                                                        )}
                                                        {metric.notes && (
                                                            <p className="text-muted-foreground italic">"{metric.notes}"</p>
                                                        )}
                                                    </CardFooter>
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center h-24 text-muted-foreground flex items-center justify-center">
                            <p>No hay datos de sueño registrados.</p>
                        </div>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => openDialog(null)}>
                        <Plus className="mr-2"/>
                        Añadir Sesión de Sueño
                    </Button>
                </CardFooter>
            </Card>

            <SleepDialog 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveSleep}
                sleep={editingSleep}
            />
        </div>
    );
}

type SleepDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SleepData, 'id'>) => void;
    sleep: SleepData | null;
};

function SleepDialog({ isOpen, onClose, onSave, sleep }: SleepDialogProps) {
    const [formData, setFormData] = useState<Partial<SleepData>>({});

    useEffect(() => {
        if (sleep) {
            setFormData(sleep);
        } else {
            setFormData({
                date: format(new Date(), "yyyy-MM-dd"),
                type: "noche",
                bedtime: "23:00",
                wakeUpTime: "07:00",
            });
        }
    }, [sleep]);

    const handleChange = (field: keyof SleepData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handlePhaseChange = (phase: 'deep' | 'light' | 'rem', value: string) => {
        setFormData(prev => ({
            ...prev,
            phases: {
                ...prev.phases,
                [phase]: Number(value)
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let sleepTime: number | undefined = undefined;
        if(formData.bedtime && formData.wakeUpTime && formData.date){
            const start = parseISO(`${formData.date}T${formData.bedtime}`);
            let end = parseISO(`${formData.date}T${formData.wakeUpTime}`);
            if (end < start) {
                end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add a day if wake up is next day
            }
            sleepTime = differenceInMinutes(end, start);
        }

        const dataToSave: Omit<SleepData, 'id'> = {
            date: formData.date!,
            type: formData.type!,
            bedtime: formData.bedtime!,
            wakeUpTime: formData.wakeUpTime!,
            sleepTime: formData.sleepTime || String(sleepTime),
            efficiency: formData.efficiency,
            hrv: formData.hrv,
            phases: formData.phases,
            notes: formData.notes
        };

        onSave(dataToSave);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{sleep ? 'Editar Sesión de Sueño' : 'Registrar Sesión de Sueño'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date">Fecha</Label>
                            <Input id="date" type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} required/>
                        </div>
                        <div>
                            <Label htmlFor="type">Tipo</Label>
                             <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="noche">Noche</SelectItem>
                                    <SelectItem value="siesta">Siesta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bedtime">Hora de dormir</Label>
                            <Input id="bedtime" type="time" value={formData.bedtime} onChange={(e) => handleChange('bedtime', e.target.value)} required/>
                        </div>
                        <div>
                           <Label htmlFor="wakeUpTime">Hora de despertar</Label>
                           <Input id="wakeUpTime" type="time" value={formData.wakeUpTime} onChange={(e) => handleChange('wakeUpTime', e.target.value)} required/>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="sleepTime">Tiempo total dormido (min)</Label>
                            <Input id="sleepTime" type="number" placeholder="Se calcula solo si se deja vacío" value={formData.sleepTime} onChange={(e) => handleChange('sleepTime', e.target.value)}/>
                        </div>
                        <div>
                           <Label htmlFor="efficiency">Eficiencia (%)</Label>
                           <Input id="efficiency" type="number" value={formData.efficiency} onChange={(e) => handleChange('efficiency', Number(e.target.value))}/>
                        </div>
                    </div>
                    <div>
                        <Label>Fases del sueño (minutos)</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            <Input type="number" placeholder="Profundo" value={formData.phases?.deep || ''} onChange={(e) => handlePhaseChange('deep', e.target.value)}/>
                            <Input type="number" placeholder="Ligero" value={formData.phases?.light || ''} onChange={(e) => handlePhaseChange('light', e.target.value)}/>
                            <Input type="number" placeholder="REM" value={formData.phases?.rem || ''} onChange={(e) => handlePhaseChange('rem', e.target.value)}/>
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="hrv">VFC (ms)</Label>
                        <Input id="hrv" type="number" value={formData.hrv} onChange={(e) => handleChange('hrv', Number(e.target.value))}/>
                    </div>
                    <div>
                        <Label htmlFor="notes">Notas / Sensaciones</Label>
                        <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} />
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

const Sun = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 101.06-1.06l-1.59-1.59zM5.25 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 015.25 12zM6.166 7.166a.75.75 0 00-1.06 1.06l1.591 1.59a.75.75 0 101.06-1.061L6.166 7.166z" />
    </svg>
);
