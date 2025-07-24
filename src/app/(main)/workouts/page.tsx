
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, orderBy } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Edit, Flame, Heart, Timer, Footprints, ArrowRightLeft } from "lucide-react";

export default function WorkoutsPage() {
    const [workouts, setWorkouts] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<CalendarEvent | null>(null);
    const userId = "user_test_id";
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const eventsColRef = collection(db, "users", userId, "events");
        const q = query(eventsColRef, where("type", "==", "entrenamiento"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const workoutData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CalendarEvent[];
            
            workoutData.sort((a, b) => {
                const dateComparison = b.date.localeCompare(a.date);
                if (dateComparison !== 0) return dateComparison;
                return (a.startTime || "00:00").localeCompare(b.startTime || "00:00");
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
            await updateDoc(docRef, { workoutDetails: details });
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

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Dumbbell className="text-primary"/>
                        Mis Entrenamientos
                    </CardTitle>
                    <CardDescription>
                        Aquí se muestran tus entrenamientos programados en el calendario. Añade los detalles después de completarlos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <p className="text-center py-8">Cargando entrenamientos...</p>
                    ) : Object.keys(groupedWorkouts).length > 0 ? (
                        <div className="space-y-6">
                            {Object.keys(groupedWorkouts).map((date) => (
                                <div key={date}>
                                    <h3 className="font-semibold mb-2 border-b pb-1">{formatDate(date)}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groupedWorkouts[date].map((workout) => (
                                            <Card key={workout.id} className="flex flex-col">
                                                <CardHeader>
                                                    <CardTitle className="text-lg">{workout.description}</CardTitle>
                                                    <CardDescription>{workout.startTime} - {workout.endTime}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-grow space-y-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Timer className="h-4 w-4 text-muted-foreground"/>
                                                        <span>Duración: {workout.workoutDetails?.duration || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Flame className="h-4 w-4 text-muted-foreground"/>
                                                        <span>Calorías: {workout.workoutDetails?.activeCalories || '-'} kcal</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Heart className="h-4 w-4 text-muted-foreground"/>
                                                        <span>FC Media: {workout.workoutDetails?.avgHeartRate || '-'} bpm</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Footprints className="h-4 w-4 text-muted-foreground"/>
                                                        <span>Pasos: {workout.workoutDetails?.steps || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground"/>
                                                        <span>Distancia: {workout.workoutDetails?.distance ? `${(workout.workoutDetails.distance / 1000).toFixed(2)} km` : '-'}</span>
                                                    </div>
                                                    {workout.workoutDetails?.notes && (
                                                        <p className="pt-2 text-muted-foreground italic">"{workout.workoutDetails.notes}"</p>
                                                    )}
                                                </CardContent>
                                                <CardFooter>
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
    const [formData, setFormData] = useState<CalendarEvent['workoutDetails']>({});

    useEffect(() => {
        if (workout) {
            setFormData(workout.workoutDetails || {});
        }
    }, [workout]);
    
    const handleChange = (field: keyof NonNullable<CalendarEvent['workoutDetails']>, value: string | number) => {
        const numValue = (typeof value === 'string' && value.trim() === '') ? undefined : Number(value);
        if (['duration', 'notes'].includes(field)) {
             setFormData(prev => ({ ...prev, [field]: value }));
        } else {
             setFormData(prev => ({ ...prev, [field]: numValue }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(workout.id) {
            onSave(workout.id, formData);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalles de: {workout.description}</DialogTitle>
                    <DialogDescription>
                        {format(parseISO(workout.date), "PPP", { locale: es })} a las {workout.startTime}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="duration">Duración real (hh:mm:ss)</Label>
                            <Input id="duration" type="text" placeholder="01:07:23" value={formData?.duration || ''} onChange={e => handleChange('duration', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="activeCalories">Calorías activas (kcal)</Label>
                            <Input id="activeCalories" type="number" placeholder="194" value={formData?.activeCalories || ''} onChange={e => handleChange('activeCalories', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="totalCalories">Calorías totales (kcal)</Label>
                           <Input id="totalCalories" type="number" placeholder="278 (opcional)" value={formData?.totalCalories || ''} onChange={e => handleChange('totalCalories', e.target.value)} />
                        </div>
                         <div>
                           <Label htmlFor="avgHeartRate">FC Media (lpm)</Label>
                           <Input id="avgHeartRate" type="number" placeholder="104" value={formData?.avgHeartRate || ''} onChange={e => handleChange('avgHeartRate', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="maxHeartRate">FC Máxima (lpm)</Label>
                           <Input id="maxHeartRate" type="number" placeholder="158" value={formData?.maxHeartRate || ''} onChange={e => handleChange('maxHeartRate', e.target.value)} />
                        </div>
                        <div>
                           <Label htmlFor="minHeartRate">FC Mínima (lpm)</Label>
                           <Input id="minHeartRate" type="number" placeholder="71 (opcional)" value={formData?.minHeartRate || ''} onChange={e => handleChange('minHeartRate', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="steps">Pasos</Label>
                           <Input id="steps" type="number" placeholder="2078 (opcional)" value={formData?.steps || ''} onChange={e => handleChange('steps', e.target.value)} />
                        </div>
                        <div>
                           <Label htmlFor="distance">Distancia (metros)</Label>
                           <Input id="distance" type="number" placeholder="420 (opcional)" value={formData?.distance || ''} onChange={e => handleChange('distance', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notes">Sensaciones / Notas</Label>
                        <Textarea id="notes" placeholder="Me sentí bien, sin molestias" value={formData?.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
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
