
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDocs, query } from "firebase/firestore";
import { format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { CalendarEvent } from "@/ai/schemas";

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const { toast } = useToast();
    const userId = "user_test_id";
    const formRef = useRef<HTMLFormElement>(null);

    const today = startOfDay(new Date());
    const selectedDateStr = date ? format(date, 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd');

    // Fetch all events to mark the calendar
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
    
    // Fetch events for the selected day
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

    const handleAddOrUpdateEvent = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const eventData: Omit<CalendarEvent, 'id' | 'date'> = {
            type: formData.get('type') as CalendarEvent['type'],
            description: formData.get('description') as string,
            startTime: formData.get('startTime') as string,
            endTime: formData.get('endTime') as string,
        };

        if (!eventData.description) {
            toast({ variant: "destructive", title: "Error", description: "La descripción no puede estar vacía." });
            return;
        }

        const eventId = editingEventId || doc(collection(db, 'users')).id;
        const docRef = doc(db, "users", userId, "calendar", selectedDateStr, "events", eventId);
        
        // Also create the parent date document if it doesn't exist, to mark it on the calendar
        const dateDocRef = doc(db, "users", userId, "calendar", selectedDateStr);

        try {
            await setDoc(docRef, { date: selectedDateStr, ...eventData }, { merge: true });
            await setDoc(dateDocRef, { hasEvents: true }); // Mark this date as having events
            
            toast({
                title: `Evento ${editingEventId ? 'actualizado' : 'añadido'}`,
                description: `El evento se ha guardado para el ${selectedDateStr}.`,
            });
            formRef.current?.reset();
            setEditingEventId(null);
        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el evento." });
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este evento?")) return;
        
        const docRef = doc(db, "users", userId, "calendar", selectedDateStr, "events", eventId);
        try {
            await deleteDoc(docRef);
            toast({ title: "Evento eliminado", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el evento." });
        }
    };
    
    const startEditing = (event: CalendarEvent) => {
        setEditingEventId(event.id!);
        // This is a bit of a hack to pre-fill the form. In a real app, you'd use a state manager or controlled components.
        setTimeout(() => {
            if (formRef.current) {
                (formRef.current.elements.namedItem('type') as HTMLInputElement).value = event.type;
                (formRef.current.elements.namedItem('description') as HTMLInputElement).value = event.description;
                (formRef.current.elements.namedItem('startTime') as HTMLInputElement).value = event.startTime || '';
                (formRef.current.elements.namedItem('endTime') as HTMLInputElement).value = event.endTime || '';
            }
        }, 0);
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
                            Selecciona un día para ver o añadir eventos como trabajo o entrenamientos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
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
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Añadir / Editar Evento</CardTitle>
                        <CardDescription>
                            {editingEventId ? "Editando evento para el " : "Añadiendo evento para el "} 
                            <span className="font-semibold text-primary">{selectedDateStr}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form ref={formRef} onSubmit={handleAddOrUpdateEvent} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select name="type" defaultValue="entrenamiento" required>
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
                                 <Input name="description" placeholder="Descripción (ej. 'Entreno de pierna')" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <Input name="startTime" type="time" placeholder="Hora de inicio" />
                               <Input name="endTime" type="time" placeholder="Hora de fin" />
                            </div>
                            <div className="flex gap-2 justify-end">
                                {editingEventId && (
                                    <Button type="button" variant="outline" onClick={() => { setEditingEventId(null); formRef.current?.reset(); }}>
                                        <X className="mr-2 h-4 w-4"/> Cancelar
                                    </Button>
                                )}
                                <Button type="submit">
                                    {editingEventId ? <Save className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                                    {editingEventId ? 'Guardar Cambios' : 'Añadir Evento'}
                                </Button>
                            </div>
                        </form>
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
                                                {event.startTime && ` de ${event.startTime}`}
                                                {event.endTime && ` a ${event.endTime}`}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(event)}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEvent(event.id!)}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                )) : <p className="text-muted-foreground text-center py-4">No hay eventos para este día.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    