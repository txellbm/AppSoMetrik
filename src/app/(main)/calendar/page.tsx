
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, updateDoc, query, runTransaction, increment } from "firebase/firestore";
import { format, parseISO, startOfDay, addMinutes, isSameDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Calendar, DayProps } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, PlusCircle, Trash2, Edit, Save, X, Dumbbell, Star, Droplets, Clock, CalendarDays } from 'lucide-react';
import { CalendarEvent } from "@/ai/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type WorkoutTypeInfo = {
    id: string;
    label: string;
    icon: React.ReactNode;
    defaultStartTime?: string;
    defaultDuration?: number;
    defaultDaysOfWeek?: number[];
};

type DailyEventSummary = {
    count: number;
    types: Record<string, number>;
};

const eventTypeColors: Record<string, string> = {
    entrenamiento: "bg-primary",
    trabajo: "bg-blue-500",
    nota: "bg-yellow-500",
    vacaciones: "bg-green-500",
    descanso: "bg-teal-500",
};

const weekDays = [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'X' },
    { value: 4, label: 'J' },
    { value: 5, label: 'V' },
    { value: 6, label: 'S' },
    { value: 0, label: 'D' },
];

const initialWorkoutTypes: WorkoutTypeInfo[] = [
    { id: 'pilates', label: 'Pilates', icon: <Droplets className="h-4 w-4" />, defaultDaysOfWeek: [] },
    { id: 'flexibilidad', label: 'Flexibilidad/Contorsión', icon: <Star className="h-4 w-4" />, defaultDaysOfWeek: [] },
    { id: 'fuerza_funcional', label: 'Fuerza Funcional', icon: <Dumbbell className="h-4 w-4" />, defaultDaysOfWeek: [] }
];

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    const userId = "user_test_id";
    
    const [workoutTypes, setWorkoutTypes] = useState<WorkoutTypeInfo[]>(initialWorkoutTypes);
    const [selectedWorkoutType, setSelectedWorkoutType] = useState<string | null>(null);

    const today = startOfDay(new Date());
    const selectedDateStr = date ? format(date, 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd');

    const [eventSummaries, setEventSummaries] = useState<Map<string, DailyEventSummary>>(new Map());

    useEffect(() => {
        const eventsColRef = collection(db, "users", userId, "calendar");
        const q = query(eventsColRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newSummaries = new Map<string, DailyEventSummary>();
            snapshot.forEach(doc => {
                 const data = doc.data();
                 newSummaries.set(doc.id, {
                    count: data.count || 0,
                    types: data.types || {},
                 });
            });
            setEventSummaries(newSummaries);
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
        const workoutInfo = workoutTypes.find(w => w.id === selectedWorkoutType);
        if (!workoutInfo) return;
        
        const dayStr = format(day, 'yyyy-MM-dd');

        const newEventData: Omit<CalendarEvent, 'id'> = {
            type: 'entrenamiento',
            description: workoutInfo.label,
            date: dayStr,
        };

        if (workoutInfo.defaultStartTime && workoutInfo.defaultDuration) {
            newEventData.startTime = workoutInfo.defaultStartTime;
            const [hours, minutes] = workoutInfo.defaultStartTime.split(':').map(Number);
            const startDate = new Date(day);
            startDate.setHours(hours, minutes, 0, 0);
            const endDate = addMinutes(startDate, workoutInfo.defaultDuration);
            newEventData.endTime = format(endDate, 'HH:mm');
        }
        
        await handleAddEvent(newEventData);
        toast({
            title: `Entrenamiento añadido`,
            description: `${workoutInfo.label} añadido para el ${dayStr}.`,
            duration: 2000
        });
    };
    
    const handleAddEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
        const eventId = doc(collection(db, 'users')).id;
        const docRef = doc(db, "users", userId, "calendar", eventData.date, "events", eventId);
        const dateDocRef = doc(db, "users", userId, "calendar", eventData.date);
    
        try {
            await runTransaction(db, async (transaction) => {
                transaction.set(docRef, eventData);
                transaction.set(dateDocRef, {
                    count: increment(1),
                    [`types.${eventData.type}`]: increment(1)
                }, { merge: true });
            });
        } catch (error) {
            console.error("Error adding event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo añadir el evento." });
        }
    };


    const handleDateSelect = (day: Date | undefined) => {
        if (!day) return;
        if (selectedWorkoutType) {
            const workoutInfo = workoutTypes.find(w => w.id === selectedWorkoutType);
            if (workoutInfo?.defaultDaysOfWeek && workoutInfo.defaultDaysOfWeek.length > 0) {
                const clickedDay = getDay(day);
                if (!workoutInfo.defaultDaysOfWeek.includes(clickedDay)) {
                    toast({
                        variant: "destructive",
                        title: "Día incorrecto",
                        description: `El entrenamiento '${workoutInfo.label}' solo puede ser añadido a los días configurados.`,
                    });
                    return;
                }
            }
            handleQuickAddWorkout(day);
        } else {
            setDate(day);
        }
    };
    
    const handleUpdateEvent = async (eventData: Partial<CalendarEvent>) => {
        if (!editingEvent || !editingEvent.id) return;
        
        const docRef = doc(db, "users", userId, "calendar", editingEvent.date, "events", editingEvent.id);
        const dateDocRef = doc(db, "users", userId, "calendar", editingEvent.date);

        try {
             await runTransaction(db, async (transaction) => {
                const oldEventDoc = await transaction.get(docRef);
                const oldEventData = oldEventDoc.data() as CalendarEvent;
                
                transaction.update(docRef, eventData);

                // If event type changed, update the counts
                if (eventData.type && eventData.type !== oldEventData.type) {
                     transaction.set(dateDocRef, {
                        [`types.${oldEventData.type}`]: increment(-1),
                        [`types.${eventData.type}`]: increment(1)
                    }, { merge: true });
                }
            });

            toast({ title: "Evento actualizado" });
            setIsDialogOpen(false);
            setEditingEvent(null);
        } catch (error) {
            console.error("Error updating event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el evento." });
        }
    };

    const handleDeleteEvent = async (event: CalendarEvent) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este evento?")) return;
        
        const eventDocRef = doc(db, "users", userId, "calendar", event.date, "events", event.id!);
        const dateDocRef = doc(db, "users", userId, "calendar", event.date);

        try {
            await runTransaction(db, async (transaction) => {
                const dateDoc = await transaction.get(dateDocRef);
                const currentCount = dateDoc.exists() ? dateDoc.data()?.count || 0 : 0;
                
                transaction.delete(eventDocRef);

                if (currentCount > 1) {
                    transaction.set(dateDocRef, {
                        count: increment(-1),
                        [`types.${event.type}`]: increment(-1)
                    }, { merge: true });
                } else {
                    transaction.delete(dateDocRef);
                }
            });
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

    const handleWorkoutConfigChange = (id: string, field: keyof WorkoutTypeInfo, value: any) => {
        setWorkoutTypes(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
    };

    const handleDayToggle = (workoutId: string, dayValue: number) => {
        setWorkoutTypes(prev => prev.map(w => {
            if (w.id === workoutId) {
                const currentDays = w.defaultDaysOfWeek || [];
                const newDays = currentDays.includes(dayValue)
                    ? currentDays.filter(d => d !== dayValue)
                    : [...currentDays, dayValue];
                return { ...w, defaultDaysOfWeek: newDays };
            }
            return w;
        }));
    };
    
    const DayContent = useCallback((props: DayProps) => {
        const dayStr = format(props.date, 'yyyy-MM-dd');
        const summary = eventSummaries.get(dayStr);
        const dots = summary?.types ? Object.keys(summary.types).filter(type => summary.types[type] > 0) : [];
        
        return (
            <div className="relative h-full w-full flex items-center justify-center">
                <span>{format(props.date, 'd')}</span>
                {dots.length > 0 && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                        {dots.slice(0, 4).map(type => (
                            <div key={type} className={cn("h-1.5 w-1.5 rounded-full", eventTypeColors[type] || 'bg-gray-400')} />
                        ))}
                    </div>
                )}
            </div>
        );
    }, [eventSummaries]);

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
                            components={{ Day: DayContent }}
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
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {workoutTypes.map((workout) => (
                           <Card key={workout.id} className={cn("flex flex-col", selectedWorkoutType === workout.id && "ring-2 ring-primary")}>
                               <CardHeader className="p-4">
                                   <Button 
                                        variant={"outline"}
                                        onClick={() => setSelectedWorkoutType(prev => prev === workout.id ? null : workout.id)}
                                        className="w-full flex items-center justify-center gap-2 text-base h-12"
                                    >
                                        {workout.icon}
                                        {workout.label}
                                    </Button>
                               </CardHeader>
                               <CardContent className="p-4 pt-0 space-y-3">
                                   <div className="flex items-center gap-3">
                                        <Label htmlFor={`${workout.id}-start-time`} className="min-w-fit flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3"/>
                                            Hora Inicio
                                        </Label>
                                        <Input
                                            id={`${workout.id}-start-time`}
                                            type="time"
                                            value={workout.defaultStartTime || ''}
                                            onChange={(e) => handleWorkoutConfigChange(workout.id, 'defaultStartTime', e.target.value)}
                                            className="h-8"
                                        />
                                   </div>
                                    <div className="flex items-center gap-3">
                                        <Label htmlFor={`${workout.id}-duration`} className="min-w-fit flex items-center gap-1 text-xs text-muted-foreground">
                                           <Clock className="h-3 w-3"/>
                                            Duración (min)
                                        </Label>
                                        <Input
                                            id={`${workout.id}-duration`}
                                            type="number"
                                            value={workout.defaultDuration || ''}
                                            onChange={(e) => handleWorkoutConfigChange(workout.id, 'defaultDuration', Number(e.target.value))}
                                            className="h-8"
                                            placeholder="e.g., 60"
                                        />
                                   </div>
                               </CardContent>
                               <CardFooter className="p-4 pt-0">
                                   <div className="w-full">
                                        <Label className="min-w-fit flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                            <CalendarDays className="h-3 w-3"/>
                                            Días Fijos
                                        </Label>
                                        <div className="flex justify-between gap-1">
                                            {weekDays.map(day => (
                                                <Button 
                                                    key={day.value}
                                                    variant={workout.defaultDaysOfWeek?.includes(day.value) ? "default" : "outline"}
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => handleDayToggle(workout.id, day.value)}
                                                >
                                                    {day.label}
                                                </Button>
                                            ))}
                                        </div>
                                   </div>
                                </CardFooter>
                           </Card>
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
                                        <div className="flex-grow flex items-center gap-3">
                                            <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", eventTypeColors[event.type] || "bg-gray-400")} />
                                            <div>
                                                <p className="font-semibold">{event.description}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="capitalize font-medium">{event.type}</span>
                                                    {event.startTime && ` a las ${event.startTime}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(event)}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEvent(event)}>
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

    