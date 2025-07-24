
"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, doc, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { WorkoutData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Plus, Edit, Trash2 } from "lucide-react";

export default function WorkoutsPage() {
    const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<WorkoutData | null>(null);
    const userId = "user_test_id";
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const userRef = doc(db, "users", userId);
        const qWorkouts = query(collection(userRef, "workouts"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qWorkouts, (snapshot) => {
            const workoutData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as WorkoutData[];
            setWorkouts(workoutData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading workouts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);
    
    const handleSaveWorkout = async (data: Omit<WorkoutData, 'id'>) => {
        try {
            const collectionRef = collection(db, "users", userId, "workouts");
            if (editingWorkout?.id) {
                const docRef = doc(collectionRef, editingWorkout.id);
                await updateDoc(docRef, data);
                toast({ title: "Entrenamiento actualizado" });
            } else {
                await addDoc(collectionRef, data);
                toast({ title: "Entrenamiento registrado" });
            }
            setIsDialogOpen(false);
            setEditingWorkout(null);
        } catch (error) {
            console.error("Error saving workout:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el entrenamiento." });
        }
    };
    
    const handleDeleteWorkout = async (id: string) => {
        try {
            await deleteDoc(doc(db, "users", userId, "workouts", id));
            toast({ title: "Entrenamiento eliminado", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting workout:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el entrenamiento." });
        }
    }

    const openDialog = (workout: WorkoutData | null) => {
        setEditingWorkout(workout);
        setIsDialogOpen(true);
    };
    
    const formatDate = (dateString: string) => {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Dumbbell className="text-primary"/>
                        Historial de Entrenamientos
                    </CardTitle>
                    <CardDescription>
                        Registra manualmente tus entrenamientos y sigue tu progreso.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Duración (min)</TableHead>
                                <TableHead>Calorías</TableHead>
                                <TableHead>FC Media</TableHead>
                                <TableHead>FC Máx</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24">Cargando entrenamientos...</TableCell>
                                </TableRow>
                            ) : workouts.length > 0 ? (
                                workouts.map((workout) => (
                                    <TableRow key={workout.id}>
                                        <TableCell>{formatDate(workout.date)}</TableCell>
                                        <TableCell>{workout.type}</TableCell>
                                        <TableCell>{workout.startTime}</TableCell>
                                        <TableCell>{workout.duration}</TableCell>
                                        <TableCell>{workout.calories || "-"}</TableCell>
                                        <TableCell>{workout.avgHeartRate || "-"}</TableCell>
                                        <TableCell>{workout.maxHeartRate || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(workout)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => workout.id && handleDeleteWorkout(workout.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No hay entrenamientos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => openDialog(null)}>
                        <Plus className="mr-2"/>
                        Registrar Nuevo Entreno
                    </Button>
                </CardFooter>
            </Card>

            <WorkoutDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveWorkout}
                workout={editingWorkout}
            />
        </div>
    );
}

type WorkoutDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<WorkoutData, 'id'>) => void;
    workout: WorkoutData | null;
};

function WorkoutDialog({ isOpen, onClose, onSave, workout }: WorkoutDialogProps) {
    const [formData, setFormData] = useState<Partial<WorkoutData>>({});

    useEffect(() => {
        if (workout) {
            setFormData(workout);
        } else {
            setFormData({
                date: format(new Date(), "yyyy-MM-dd"),
                startTime: format(new Date(), "HH:mm"),
                duration: 60,
                type: "Fuerza",
            });
        }
    }, [workout]);
    
    const handleChange = (field: keyof WorkoutData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleZoneChange = (zone: 'z1' | 'z2' | 'z3' | 'z4' | 'z5', value: string) => {
        setFormData(prev => ({
            ...prev,
            zones: {
                ...prev.zones,
                [zone]: Number(value)
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Omit<WorkoutData, 'id'>);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{workout ? 'Editar Entrenamiento' : 'Registrar Entrenamiento'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">Tipo de Entrenamiento</Label>
                            <Input id="type" value={formData.type} onChange={e => handleChange('type', e.target.value)} required />
                        </div>
                         <div>
                            <Label htmlFor="date">Fecha</Label>
                            <Input id="date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} required />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="startTime">Hora de Inicio</Label>
                            <Input id="startTime" type="time" value={formData.startTime} onChange={e => handleChange('startTime', e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="duration">Duración (minutos)</Label>
                            <Input id="duration" type="number" value={formData.duration} onChange={e => handleChange('duration', Number(e.target.value))} required />
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="calories">Calorías</Label>
                            <Input id="calories" type="number" value={formData.calories} onChange={e => handleChange('calories', Number(e.target.value))} />
                        </div>
                        <div>
                           <Label htmlFor="avgHeartRate">FC Media</Label>
                           <Input id="avgHeartRate" type="number" value={formData.avgHeartRate} onChange={e => handleChange('avgHeartRate', Number(e.target.value))} />
                        </div>
                         <div>
                           <Label htmlFor="maxHeartRate">FC Máxima</Label>
                           <Input id="maxHeartRate" type="number" value={formData.maxHeartRate} onChange={e => handleChange('maxHeartRate', Number(e.target.value))} />
                        </div>
                    </div>
                     <div>
                        <Label>Zonas de Frecuencia Cardíaca (minutos)</Label>
                        <div className="grid grid-cols-5 gap-2 mt-1">
                            <Input type="number" placeholder="Z1" value={formData.zones?.z1 || ''} onChange={e => handleZoneChange('z1', e.target.value)} />
                            <Input type="number" placeholder="Z2" value={formData.zones?.z2 || ''} onChange={e => handleZoneChange('z2', e.target.value)} />
                            <Input type="number" placeholder="Z3" value={formData.zones?.z3 || ''} onChange={e => handleZoneChange('z3', e.target.value)} />
                            <Input type="number" placeholder="Z4" value={formData.zones?.z4 || ''} onChange={e => handleZoneChange('z4', e.target.value)} />
                            <Input type="number" placeholder="Z5" value={formData.zones?.z5 || ''} onChange={e => handleZoneChange('z5', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notes">Sensaciones / Notas</Label>
                        <Textarea id="notes" value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
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
