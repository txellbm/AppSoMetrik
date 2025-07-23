
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, updateDoc, query } from "firebase/firestore";
import { format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, PlusCircle, Trash2, Edit, Save, X, Dumbbell, Star, Droplets } from 'lucide-react';
import { CalendarEvent } from "@/ai/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const workoutTypes = [
    { id: 'pilates', label: 'Pilates', icon: <Droplets className="h-4 w-4" /> },
    { id: 'flexibilidad', label: 'Flexibilidad/Contorsión', icon: <Star className="h-4 w-4" /> },
    { id: 'fuerza_funcional', label: 'Fuerza Funcional', icon: <Dumbbell className="h-4 w-4" /> }
];

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    const userId = "user_test_id";
    
    const [selectedWorkoutType, setSelectedWorkoutType] = useState<string | null>(null);

    const today = startOfDay(new Date());
    const selectedDateStr = date ? format(date, 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd');

    const [allEventDates, setAllEventDates] = useState<Set<string>>(new Set());
    useEffect(() => {
        const eventsColRef = collection(db, "users", userId, "calendar");
        const q = query(eventsColRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dates = new Set<string>();
            snapshot.forEach(doc => dates.add(doc.id));
            setAllEventDates(dates);
        });
        return () => unsubscribe();
    }, [userId]);
    
    useEffect(() => {
        if (!selectedDateStr) return;
        setIsLoading(true);
        const eventsColRef = collection(db, "users", userId, "calendar", selectedDateStr, "events");
        const q = query(eventsColRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CalendarEvent[];
            setEvents(fetchedEvents.sort((a,b) => (a.startTime || "23:59").localeCompare(b.startTime || "23:59")));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setIsLoading(false);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los eventos." });
        });

        return () => unsubscribe();
    }, [selectedDateStr, userId, toast]);
    
    const handleQuickAddWorkout = async (day: Date) => {
        if (!selectedWorkoutType) return;
        
        const workoutLabel = workoutTypes.find(w => w.id === selectedWorkoutType)?.label || selectedWorkoutType;
        const dayStr = format(day, 'yyyy-MM-dd');

        const eventData: Omit<CalendarEvent, 'id' | 'date'> = {
            type: 'entrenamiento',
            description: workoutLabel,
        };

        const eventId = doc(collection(db, 'users')).id;
        const docRef = doc(db, "users", userId, "calendar", dayStr, "events", eventId);
        const dateDocRef = doc(db, "users", userId, "calendar", dayStr);

        try {
            await setDoc(docRef, { date: dayStr, ...eventData });
            await setDoc(dateDocRef, { hasEvents: true }, { merge: true });
            
            toast({
                title: `Entrenamiento añadido`,
                description: `${workoutLabel} añadido para el ${dayStr}.`,
                duration: 2000
            });
        } catch (error) {
            console.error("Error adding quick workout:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo añadir el entrenamiento." });
        }
    };


    const handleDateSelect = (day: Date | undefined) => {
        if (!day) return;
        if (selectedWorkoutType) {
            handleQuickAddWorkout(day);
        } else {
            setDate(day);
        }
    };
    
    const handleUpdateEvent = async (eventData: Partial<CalendarEvent>) => {
        if (!editingEvent || !editingEvent.id) return;
        
        const docRef = doc(db, "users", userId, "calendar", editingEvent.date, "events", editingEvent.id);
        
        try {
            await updateDoc(docRef, eventData);
            toast({ title: "Evento actualizado" });
            setIsDialogOpen(false);
            setEditingEvent(null);
        } catch (error) {
            console.error("Error updating event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el evento." });
        }
    };

    const handleDeleteEvent = async (eventId: string, eventDate: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este evento?")) return;
        
        const docRef = doc(db, "users", userId, "calendar", eventDate, "events", eventId);
        try {
            await deleteDoc(docRef);
            toast({ title: "Evento eliminado", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el evento." });
        }
    };
    
    const startEditing = (event: CalendarEvent) => {
        setEditingEvent(event);
        setIsDialogOpen(true);
    };

    const eventDayModifier = useMemo(() => {
        return Array.from(allEventDates).map(dateStr => parseISO(dateStr));
    }, [allEventDates]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <CalendarIcon className="text-primary"/> 
                           Calendario Manual
                        </CardTitle>
                        <CardDescription>
                            {selectedWorkoutType 
                                ? `Añadiendo '${workoutTypes.find(w=>w.id === selectedWorkoutType)?.label}'. Haz clic en un día.`
                                : "Selecciona un día para ver sus eventos o un tipo de entreno para añadirlo rápidamente."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            locale={es}
                            modifiers={{ event: eventDayModifier }}
                            modifiersStyles={{
                                event: {
                                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                                    color: 'hsl(var(--primary))',
                                    fontWeight: 'bold',
                                }
                            }}
                            className="rounded-md border"
                        />
                        {selectedWorkoutType && (
                            <Button variant="outline" onClick={() => setSelectedWorkoutType(null)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar modo de añadir entreno
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Añadir Entrenamientos Rápidos</CardTitle>
                        <CardDescription>Selecciona un tipo de entreno y luego haz clic en el calendario para añadirlo.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {workoutTypes.map((workout) => (
                           <Button 
                                key={workout.id} 
                                variant={selectedWorkoutType === workout.id ? "default" : "outline"}
                                onClick={() => setSelectedWorkoutType(workout.id)}
                                className="flex items-center justify-center gap-2 h-12 text-base"
                            >
                                {workout.icon}
                                {workout.label}
                            </Button>
                        ))}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Eventos del Día</CardTitle>
                        <CardDescription>Eventos registrados para el {selectedDateStr}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <p>Cargando eventos...</p> : (
                            <div className="space-y-3">
                                {events.length > 0 ? events.map(event => (
                                    <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{event.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                <span className="capitalize font-medium">{event.type}</span>
                                                {event.startTime && ` a las ${event.startTime}`}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(event)}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEvent(event.id!, event.date)}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                )) : <p className="text-muted-foreground text-center py-4">No hay eventos para este día.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <EditEventDialog 
                    isOpen={isDialogOpen} 
                    setIsOpen={setIsDialogOpen} 
                    event={editingEvent} 
                    onSave={handleUpdateEvent}
                />
            </div>
        </div>
    );
}


type EditEventDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    event: CalendarEvent | null;
    onSave: (data: Partial<CalendarEvent>) => void;
}

function EditEventDialog({ isOpen, setIsOpen, event, onSave }: EditEventDialogProps) {
    const [formData, setFormData] = useState<Partial<CalendarEvent>>({});

    useEffect(() => {
        if (event) {
            setFormData({
                description: event.description,
                type: event.type,
                startTime: event.startTime,
                endTime: event.endTime,
            });
        }
    }, [event]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!event) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Evento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select 
                            name="type" 
                            value={formData.type}
                            onValueChange={(value) => setFormData(p => ({...p, type: value as CalendarEvent['type']}))}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tipo de evento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="entrenamiento">Entrenamiento</SelectItem>
                                <SelectItem value="trabajo">Trabajo</SelectItem>
                                <SelectItem value="descanso">Descanso</SelectItem>
                                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                                <SelectItem value="nota">Nota</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input 
                            name="description" 
                            placeholder="Descripción" 
                            value={formData.description || ''}
                            onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}
                            required 
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            name="startTime" 
                            type="time" 
                            placeholder="Hora de inicio" 
                            value={formData.startTime || ''}
                            onChange={(e) => setFormData(p => ({...p, startTime: e.target.value}))}
                        />
                        <Input 
                            name="endTime" 
                            type="time" 
                            placeholder="Hora de fin" 
                            value={formData.endTime || ''}
                            onChange={(e) => setFormData(p => ({...p, endTime: e.target.value}))}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button type="submit">
                            <Save className="mr-2 h-4 w-4"/> Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

    