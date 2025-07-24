
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, orderBy } from "firebase/firestore";
import { format, parse, parseISO, differenceInSeconds } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Edit, Flame, Heart, Timer, Footprints, ArrowRightLeft, Clock, Zap, Target, Video, FileText, Copy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";


export default function WorkoutsPage() {
    const [workouts, setWorkouts] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<CalendarEvent | null>(null);
    const userId = "user_test_id";
    const { toast } = useToast();
    
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');


    useEffect(() => {
        setIsLoading(true);
        const eventsColRef = collection(db, "users", userId, "events");
        const q = query(eventsColRef, where("type", "==", "entrenamiento"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let workoutData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CalendarEvent[];
            
            workoutData.sort((a, b) => {
                const dateA = a.date + (a.startTime || '00:00');
                const dateB = b.date + (b.startTime || '00:00');
                return dateB.localeCompare(dateA);
            });
            
            setWorkouts(workoutData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading workouts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);
    
    const handleSaveWorkoutDetails = async (id: string, details: CalendarEvent['workoutDetails']) => {
        try {
            const docRef = doc(db, "users", userId, "events", id);
            
            const cleanupUndefined = (obj: any): any => {
                if (obj === null || typeof obj !== 'object') {
                    return obj;
                }
                const newObj = { ...obj };
                for (const key in newObj) {
                    if (newObj[key] === undefined || newObj[key] === null || newObj[key] === '') {
                        delete newObj[key];
                    } else if (typeof newObj[key] === 'object') {
                        newObj[key] = cleanupUndefined(newObj[key]);
                         if (Object.keys(newObj[key]).length === 0) {
                            delete newObj[key];
                        }
                    }
                }
                return newObj;
            };

            const cleanedDetails = cleanupUndefined(details);

            await updateDoc(docRef, { workoutDetails: cleanedDetails });
            toast({ title: "Entrenamiento actualizado" });
            setIsDialogOpen(false);
            setEditingWorkout(null);
        } catch (error) {
            console.error("Error saving workout details:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los detalles." });
        }
    };

    const openDialog = (workout: CalendarEvent) => {
        setEditingWorkout(workout);
        setIsDialogOpen(true);
    };

    const formatDate = (dateString: string) => {
       try {
         return format(parseISO(dateString), "PPPP", { locale: es });
       } catch (error) {
         return "Fecha inválida";
       }
    };

    const groupedWorkouts = useMemo(() => {
        return workouts.reduce((acc, workout) => {
            (acc[workout.date] = acc[workout.date] || []).push(workout);
            return acc;
        }, {} as Record<string, CalendarEvent[]>);
    }, [workouts]);

    const formatZoneName = (zone: string) => {
        const names: Record<string, string> = {
            extremo: "Extremo",
            altaIntensidad: "Alta Intensidad",
            aptitudFisica: "Aptitud Física",
            quemaGrasa: "Quema Grasa",
            salud: "Salud"
        };
        return names[zone] || zone;
    };

    const generateReport = () => {
        let report = "Informe de Entrenamientos\n";
        report += "===========================\n\n";

        if (workouts.length === 0) {
            report += "No hay entrenamientos registrados.";
        } else {
             Object.keys(groupedWorkouts).sort((a, b) => b.localeCompare(a)).forEach(date => {
                report += `**${formatDate(date)}**\n`;
                groupedWorkouts[date].forEach(workout => {
                    report += `\n* ${workout.description} (${workout.startTime} - ${workout.endTime})\n`;
                    const details = workout.workoutDetails;
                    if(details) {
                        if(details.realStartTime && details.realEndTime) report += `  - Real: ${details.realStartTime} - ${details.realEndTime}\n`;
                        if(details.realDuration) report += `  - Duración: ${details.realDuration}\n`;
                        if(details.activeCalories) report += `  - Calorías Activas: ${details.activeCalories} kcal\n`;
                        if(details.totalCalories) report += `  - Calorías Totales: ${details.totalCalories} kcal\n`;
                        if(details.avgHeartRate) report += `  - FC: ${details.avgHeartRate} lpm (media) (${details.minHeartRate || '·'}/${details.maxHeartRate || '·'})\n`;
                        if(details.steps) report += `  - Pasos: ${details.steps}\n`;
                        if(details.distance) report += `  - Distancia: ${(details.distance / 1000).toFixed(2)} km\n`;
                        if(details.zones && Object.values(details.zones).some(z => z)) {
                            report += `  - Zonas de FC: ${Object.entries(details.zones).filter(([,v]) => v).map(([z,v]) => `${formatZoneName(z)}: ${v} min`).join(', ')}\n`;
                        }
                        if(details.notes) report += `  - Notas: "${details.notes}"\n`;
                    }
                });
                report += "\n---------------------------------\n";
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
                            <Dumbbell className="text-primary"/>
                            Mis Entrenamientos
                        </CardTitle>
                        <CardDescription>
                            Aquí se muestran tus entrenamientos programados en el calendario. Añade los detalles después de completarlos.
                        </CardDescription>
                    </div>
                     <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <p className="text-center py-8">Cargando entrenamientos...</p>
                    ) : Object.keys(groupedWorkouts).length > 0 ? (
                        <div className="space-y-6">
                            {Object.keys(groupedWorkouts).sort((a, b) => b.localeCompare(a)).map((date) => (
                                <div key={date}>
                                    <h3 className="font-semibold mb-2 border-b pb-1">{formatDate(date)}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groupedWorkouts[date].map((workout) => (
                                            <Card key={workout.id} className="flex flex-col">
                                                <CardHeader>
                                                    <CardTitle className="text-lg">{workout.description}</CardTitle>
                                                    <CardDescription>Planificado: {workout.startTime} - {workout.endTime}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-grow space-y-3 text-sm">
                                                    {workout.workoutDetails?.realStartTime && workout.workoutDetails?.realEndTime && (
                                                         <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground"/>
                                                            <span>Real: {workout.workoutDetails.realStartTime} - {workout.workoutDetails.realEndTime}</span>
                                                        </div>
                                                    )}
                                                     {workout.workoutDetails?.realDuration && (
                                                        <div className="flex items-center gap-2">
                                                            <Timer className="h-4 w-4 text-muted-foreground"/>
                                                            <span>Duración: {workout.workoutDetails.realDuration}</span>
                                                        </div>
                                                     )}
                                                     {workout.workoutDetails?.activeCalories && (
                                                        <div className="flex items-center gap-2">
                                                            <Flame className="h-4 w-4 text-muted-foreground"/>
                                                            <span>Calorías Activas: {workout.workoutDetails.activeCalories} kcal</span>
                                                        </div>
                                                     )}
                                                     {workout.workoutDetails?.totalCalories && (
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="h-4 w-4 text-muted-foreground"/>
                                                            <span>Calorías Totales: {workout.workoutDetails.totalCalories} kcal</span>
                                                        </div>
                                                     )}
                                                     {workout.workoutDetails?.avgHeartRate && (
                                                        <div className="flex items-center gap-2">
                                                            <Heart className="h-4 w-4 text-muted-foreground"/>
                                                            <span>FC: {workout.workoutDetails.avgHeartRate} lpm (media)</span>
                                                            {(workout.workoutDetails.minHeartRate || workout.workoutDetails.maxHeartRate) && (
                                                                <span className="text-muted-foreground text-xs">
                                                                    ({workout.workoutDetails.minHeartRate || '·'} / {workout.workoutDetails.maxHeartRate || '·'})
                                                                </span>
                                                            )}
                                                        </div>
                                                     )}
                                                     {workout.workoutDetails?.steps && (
                                                        <div className="flex items-center gap-2">
                                                            <Footprints className="h-4 w-4 text-muted-foreground"/>
                                                            <span>Pasos: {workout.workoutDetails.steps}</span>
                                                        </div>
                                                     )}
                                                     {workout.workoutDetails?.distance && (
                                                        <div className="flex items-center gap-2">
                                                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground"/>
                                                            <span>Distancia: {(workout.workoutDetails.distance / 1000).toFixed(2)} km</span>
                                                        </div>
                                                     )}

                                                    {workout.workoutDetails?.zones && Object.values(workout.workoutDetails.zones).some(z => z) && (
                                                        <div>
                                                            <h4 className="font-semibold flex items-center gap-2 mt-2"><Target className="h-4 w-4 text-muted-foreground"/> Zonas de FC</h4>
                                                            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                                                {Object.entries(workout.workoutDetails.zones).map(([zone, value]) => (
                                                                    value ? <Badge key={zone} variant="secondary">{formatZoneName(zone)}: {value} min</Badge> : null
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {workout.workoutDetails?.notes && (
                                                        <p className="pt-2 text-muted-foreground italic">"{workout.workoutDetails.notes}"</p>
                                                    )}
                                                </CardContent>
                                                <CardFooter className="flex-col items-stretch gap-2">
                                                    {workout.workoutDetails?.videoUrl && (
                                                         <Button variant="outline" asChild>
                                                            <a href={workout.workoutDetails.videoUrl} target="_blank" rel="noopener noreferrer">
                                                                <Video className="mr-2 h-4 w-4"/>
                                                                Ver vídeo
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button className="w-full" onClick={() => openDialog(workout)}>
                                                        <Edit className="mr-2 h-4 w-4"/>
                                                        Añadir/Editar Detalles
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center h-24 text-muted-foreground flex items-center justify-center">
                            <p>No tienes entrenamientos programados. Añádelos en el calendario.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {editingWorkout && (
                <WorkoutDetailsDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSave={handleSaveWorkoutDetails}
                    workout={editingWorkout}
                />
            )}
            
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Entrenamientos</DialogTitle>
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

type WorkoutDetailsDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, data: CalendarEvent['workoutDetails']) => void;
    workout: CalendarEvent;
};

function WorkoutDetailsDialog({ isOpen, onClose, onSave, workout }: WorkoutDetailsDialogProps) {
    const [details, setDetails] = useState<CalendarEvent['workoutDetails']>({});

    useEffect(() => {
        if (isOpen) {
            setDetails(workout.workoutDetails || {});
        }
    }, [isOpen, workout.workoutDetails]);


    useEffect(() => {
        if (details?.realStartTime && details.realEndTime && workout.date) {
            try {
                const start = parse(`${workout.date} ${details.realStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
                let end = parse(`${workout.date} ${details.realEndTime}`, 'yyyy-MM-dd HH:mm', new Date());

                if (end < start) {
                    end = new Date(end.getTime() + 24 * 60 * 60 * 1000); 
                }

                if(start < end) {
                    const diffSeconds = differenceInSeconds(end, start);
                    const hours = Math.floor(diffSeconds / 3600);
                    const minutes = Math.floor((diffSeconds % 3600) / 60);
                    const seconds = diffSeconds % 60;
                    
                    const pad = (num: number) => num.toString().padStart(2, '0');
                    
                    setDetails(prev => ({...prev, realDuration: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}));
                }
            } catch (e) {
                // Ignore invalid date errors during input
            }
        }
    }, [details?.realStartTime, details?.realEndTime, workout.date]);


    const handleChange = (field: keyof NonNullable<CalendarEvent['workoutDetails']>, value: any) => {
        const numValue = (typeof value === 'string' && value.trim() === '') ? undefined : Number(value);
        if (['realDuration', 'notes', 'realStartTime', 'realEndTime', 'videoUrl'].includes(field as string)) {
             setDetails(prev => ({ ...prev, [field]: value.trim() === '' ? undefined : value }));
        } else {
             setDetails(prev => ({ ...prev, [field]: numValue }));
        }
    };
    
    const handleZoneChange = (zone: keyof NonNullable<NonNullable<CalendarEvent['workoutDetails']>['zones']>, value: string) => {
        const numValue = value.trim() === '' ? undefined : Number(value);
        setDetails(prev => ({ 
            ...prev, 
            zones: {
                ...(prev?.zones || {}),
                [zone]: numValue
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(workout.id) {
            onSave(workout.id, details);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto pr-6">
                <DialogHeader>
                    <DialogTitle>Detalles de: {workout.description}</DialogTitle>
                    <DialogDescription>
                        {format(parseISO(workout.date), "PPP", { locale: es })} a las {workout.startTime}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="realStartTime">Hora Inicio Real</Label>
                            <Input id="realStartTime" type="time" value={details?.realStartTime ?? ''} onChange={e => handleChange('realStartTime', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="realEndTime">Hora Fin Real</Label>
                            <Input id="realEndTime" type="time" value={details?.realEndTime ?? ''} onChange={e => handleChange('realEndTime', e.target.value)} />
                        </div>
                         <div>
                            <Label htmlFor="realDuration">Duración Real</Label>
                            <Input id="realDuration" type="text" placeholder="hh:mm:ss" value={details?.realDuration ?? ''} onChange={e => handleChange('realDuration', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="activeCalories">Calorías activas (kcal)</Label>
                            <Input id="activeCalories" type="number" value={details?.activeCalories ?? ''} onChange={e => handleChange('activeCalories', e.target.value)} />
                        </div>
                        <div>
                           <Label htmlFor="totalCalories">Calorías totales (kcal)</Label>
                           <Input id="totalCalories" type="number" value={details?.totalCalories ?? ''} onChange={e => handleChange('totalCalories', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                           <Label htmlFor="avgHeartRate">FC Media (lpm)</Label>
                           <Input id="avgHeartRate" type="number" value={details?.avgHeartRate ?? ''} onChange={e => handleChange('avgHeartRate', e.target.value)} />
                        </div>
                        <div>
                           <Label htmlFor="minHeartRate">FC Mínima (lpm)</Label>
                           <Input id="minHeartRate" type="number" value={details?.minHeartRate ?? ''} onChange={e => handleChange('minHeartRate', e.target.value)} />
                        </div>
                        <div>
                           <Label htmlFor="maxHeartRate">FC Máxima (lpm)</Label>
                           <Input id="maxHeartRate" type="number" value={details?.maxHeartRate ?? ''} onChange={e => handleChange('maxHeartRate', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="steps">Pasos</Label>
                           <Input id="steps" type="number" value={details?.steps ?? ''} onChange={e => handleChange('steps', e.target.value)} />
                        </div>
                        <div>
                           <Label htmlFor="distance">Distancia (metros)</Label>
                           <Input id="distance" type="number" value={details?.distance ?? ''} onChange={e => handleChange('distance', e.target.value)} />
                        </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-sm font-medium">Zonas de entrenamiento</AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-2">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <Label htmlFor="zone-extremo" className="text-right">Zona Extremo (min)</Label>
                                    <Input id="zone-extremo" type="number" value={details?.zones?.extremo ?? ''} onChange={e => handleZoneChange('extremo', e.target.value)} />
                                    <Label htmlFor="zone-altaIntensidad" className="text-right">Zona Alta Intensidad (min)</Label>
                                    <Input id="zone-altaIntensidad" type="number" value={details?.zones?.altaIntensidad ?? ''} onChange={e => handleZoneChange('altaIntensidad', e.target.value)} />
                                    <Label htmlFor="zone-aptitudFisica" className="text-right">Zona Aptitud Física (min)</Label>
                                    <Input id="zone-aptitudFisica" type="number" value={details?.zones?.aptitudFisica ?? ''} onChange={e => handleZoneChange('aptitudFisica', e.target.value)} />
                                    <Label htmlFor="zone-quemaGrasa" className="text-right">Zona Quema Grasa (min)</Label>
                                    <Input id="zone-quemaGrasa" type="number" value={details?.zones?.quemaGrasa ?? ''} onChange={e => handleZoneChange('quemaGrasa', e.target.value)} />
                                    <Label htmlFor="zone-salud" className="text-right">Zona Salud (min)</Label>
                                    <Input id="zone-salud" type="number" value={details?.zones?.salud ?? ''} onChange={e => handleZoneChange('salud', e.target.value)} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                    {(workout.description === "Contorsión" || workout.description === "Flexibilidad") && (
                         <div>
                            <Label htmlFor="videoUrl">Enlace a vídeo (YouTube)</Label>
                            <Input id="videoUrl" type="url" placeholder="https://youtube.com/..." value={details?.videoUrl || ''} onChange={e => handleChange('videoUrl', e.target.value)} />
                        </div>
                    )}


                    <div>
                        <Label htmlFor="notes">Sensaciones / Notas</Label>
                        <Textarea id="notes" placeholder="Me sentí bien, sin molestias" value={details?.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar Detalles</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
