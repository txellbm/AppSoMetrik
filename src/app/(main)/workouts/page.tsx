
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Edit, Flame, Heart, Timer } from "lucide-react";

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
        const q = query(eventsColRef, where("type", "==", "entrenamiento"), where("date", ">=", format(new Date(), "yyyy-MM-dd")));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const workoutData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CalendarEvent[];
            // Sort client-side
            workoutData.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA > dateB) return 1;
                if (dateA < dateB) return -1;
                return (a.startTime || "").localeCompare(b.startTime || "");
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
                                                        <span>Duración: {workout.workoutDetails?.duration || '-'} min</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Flame className="h-4 w-4 text-muted-foreground"/>
                                                        <span>Calorías: {workout.workoutDetails?.calories || '-'} kcal</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Heart className="h-4 w-4 text-muted-foreground"/>
                                                        <span>FC Media: {workout.workoutDetails?.avgHeartRate || '-'} bpm</span>
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
        setFormData(prev => ({ ...prev, [field]: value }));
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detalles de: {workout.description}</DialogTitle>
                    <DialogDescription>
                        {format(parseISO(workout.date), "PPP", { locale: es })} a las {workout.startTime}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <Label htmlFor="duration">Duración Real (min)</Label>
                            <Input id="duration" type="number" value={formData?.duration || ''} onChange={e => handleChange('duration', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="calories">Calorías</Label>
                            <Input id="calories" type="number" value={formData?.calories || ''} onChange={e => handleChange('calories', Number(e.target.value))} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label htmlFor="avgHeartRate">FC Media</Label>
                           <Input id="avgHeartRate" type="number" value={formData?.avgHeartRate || ''} onChange={e => handleChange('avgHeartRate', Number(e.target.value))} />
                        </div>
                         <div>
                           <Label htmlFor="maxHeartRate">FC Máxima</Label>
                           <Input id="maxHeartRate" type="number" value={formData?.maxHeartRate || ''} onChange={e => handleChange('maxHeartRate', Number(e.target.value))} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notes">Sensaciones / Notas</Label>
                        <Textarea id="notes" value={formData?.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
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
