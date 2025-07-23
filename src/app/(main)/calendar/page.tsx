
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, writeBatch, doc, deleteDoc, runTransaction } from "firebase/firestore";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { addMonths, endOfMonth, format, startOfMonth, subMonths, getDay, addWeeks, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Edit } from "lucide-react";
import { MonthlyCalendarView } from "@/components/dashboard/monthly-calendar-view";
import EditEventDialog from "@/components/dashboard/event-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type QuickEventType = "Pilates" | "Flexibilidad" | "Fuerza" | "Trabajo";
type QuickEventTypeInfo = {
    duration: number; // in minutes
    startTime: string; // HH:mm
    defaultDaysOfWeek: number[]; // 0 for Sunday, 1 for Monday, etc.
    type: CalendarEvent['type'];
};
type QuickEventTypes = Record<QuickEventType, QuickEventTypeInfo>;


export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [dialogDate, setDialogDate] = useState<Date | null>(null);
    
    const [selectedQuickEventType, setSelectedQuickEventType] = useState<QuickEventType | null>(null);
    const [quickEventTypes, setQuickEventTypes] = useState<QuickEventTypes>({
        "Trabajo": { duration: 480, startTime: "09:00", defaultDaysOfWeek: [], type: "trabajo" },
        "Pilates": { duration: 60, startTime: "09:00", defaultDaysOfWeek: [], type: "entrenamiento" },
        "Flexibilidad": { duration: 45, startTime: "18:00", defaultDaysOfWeek: [], type: "entrenamiento" },
        "Fuerza": { duration: 75, startTime: "19:00", defaultDaysOfWeek: [], type: "entrenamiento" },
    });

    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
    const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

    useEffect(() => {
        // Set initial date on client to avoid hydration errors
        if (typeof window !== 'undefined' && !date) {
            setDate(new Date());
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        if (!userId) return;

        const eventsColRef = collection(db, "users", userId, "events");
        const q = query(eventsColRef, 
            where("date", ">=", format(monthStart, "yyyy-MM-dd")),
            where("date", "<=", format(monthEnd, "yyyy-MM-dd"))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CalendarEvent[];
            setEvents(fetchedEvents);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setIsLoading(false);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los eventos." });
        });

        return () => unsubscribe();
    }, [monthStart, monthEnd, userId, toast]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleToday = () => setCurrentMonth(new Date());

    const openDialog = useCallback((event?: CalendarEvent, date?: Date) => {
        setSelectedEvent(event || null);
        const targetDate = date || (event ? new Date(event.date + "T00:00:00") : new Date());
        setDialogDate(targetDate);
        setIsDialogOpen(true);
    }, []);
    
    const handleDateSelect = async (day: Date) => {
        setDate(day);
    
        if (selectedQuickEventType) {
            const config = quickEventTypes[selectedQuickEventType];
            
            const newEvent: Omit<CalendarEvent, 'id'> = {
                description: selectedQuickEventType,
                type: config.type,
                date: format(day, "yyyy-MM-dd"),
                startTime: config.startTime,
                endTime: format(new Date(new Date(`1970-01-01T${config.startTime}`).getTime() + config.duration * 60000), "HH:mm"),
            };
            openDialog(newEvent as CalendarEvent, day);
        }
    };

    const handleSaveEvent = async (data: Omit<CalendarEvent, 'id'>) => {
        try {
            await runTransaction(db, async (transaction) => {
                const userEventsRef = collection(db, "users", userId, "events");
                const docRef = selectedEvent?.id ? doc(userEventsRef, selectedEvent.id) : doc(userEventsRef);
                const eventData: CalendarEvent = { ...data, id: docRef.id };
                transaction.set(docRef, eventData, { merge: true });
            });
            toast({ title: "Éxito", description: `Evento ${selectedEvent ? 'actualizado' : 'creado'} correctamente.` });
            setIsDialogOpen(false);
            setSelectedEvent(null);
            setSelectedQuickEventType(null);
        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el evento." });
        }
    };

    const confirmDelete = (eventId: string) => {
        setIsDialogOpen(false); // Close the edit dialog
        setEventToDelete(eventId);
    }

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        
        try {
            await deleteDoc(doc(db, "users", userId, "events", eventToDelete));
            toast({ title: "Evento eliminado" });
            setEventToDelete(null);
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error deleting event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el evento." });
        }
    };

    const handleQuickEventConfigChange = (type: QuickEventType, field: keyof QuickEventTypeInfo, value: any) => {
        setQuickEventTypes(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    const handleDayToggle = (type: QuickEventType, day: number) => {
        const currentDays = quickEventTypes[type].defaultDaysOfWeek;
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        handleQuickEventConfigChange(type, 'defaultDaysOfWeek', newDays.sort());
    };

    const handleScheduleEvent = async (type: QuickEventType) => {
        const config = quickEventTypes[type];
        if (config.defaultDaysOfWeek.length === 0) {
            toast({ variant: "destructive", title: "Error", description: "Selecciona al menos un día fijo para programar." });
            return;
        }

        const eventsToAdd: Omit<CalendarEvent, 'id'>[] = [];
        const today = new Date();
        const weekStartsOn = 1;

        for (let week = 0; week < 4; week++) {
            const weekStart = startOfWeek(addWeeks(today, week), { weekStartsOn });
            for (const dayOfWeek of config.defaultDaysOfWeek) {
                const targetDay = new Date(weekStart);
                targetDay.setDate(weekStart.getDate() + (dayOfWeek - weekStartsOn + 7) % 7);
                
                if (targetDay < today && !isSameDay(targetDay, today)) continue;

                const endTime = new Date(new Date(`1970-01-01T${config.startTime}`).getTime() + config.duration * 60000);
                eventsToAdd.push({
                    description: type,
                    type: config.type,
                    date: format(targetDay, 'yyyy-MM-dd'),
                    startTime: config.startTime,
                    endTime: format(endTime, 'HH:mm'),
                });
            }
        }

        if (eventsToAdd.length === 0) {
            toast({ title: "Nada que añadir", description: "No hay fechas futuras para programar en las próximas 4 semanas." });
            return;
        }
        
        try {
            const batch = writeBatch(db);
            const eventsColRef = collection(db, "users", userId, "events");
            eventsToAdd.forEach(eventData => {
                const docRef = doc(eventsColRef);
                batch.set(docRef, { ...eventData, id: docRef.id });
            });
            await batch.commit();

            toast({ title: "Éxito", description: `${eventsToAdd.length} eventos de ${type} han sido añadidos al calendario.` });
        } catch (error) {
            console.error("Error scheduling events:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron programar los eventos." });
        }
    };
    
    const eventsForSelectedDay = useMemo(() => {
        if (!date) return [];
        return events.filter(e => e.date === format(date, "yyyy-MM-dd")).sort((a,b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    }, [date, events]);

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <Button onClick={handleToday} variant="outline">Hoy</Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    <h2 className="text-xl font-semibold capitalize">
                        {format(currentMonth, "LLLL yyyy", { locale: es })}
                    </h2>
                </div>
                <Button onClick={() => openDialog(undefined, date || new Date())}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Evento
                </Button>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-auto">
                <div className="lg:col-span-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <p>Cargando eventos...</p>
                        </div>
                    ) : (
                        <MonthlyCalendarView
                            month={currentMonth}
                            events={events}
                            selected={date}
                            onEventClick={(event) => openDialog(event)}
                            onDayClick={handleDateSelect}
                        />
                    )}
                </div>
                
                <aside className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Eventos Rápidos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.keys(quickEventTypes).map((key) => {
                                const type = key as QuickEventType;
                                const config = quickEventTypes[type];
                                return (
                                    <Card key={type} className="p-2">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <Button variant="link" className="p-0 h-auto text-sm font-semibold" onClick={() => setSelectedQuickEventType(st => st === type ? null : type)}>{type}</Button>
                                             <div className="flex items-center gap-2">
                                                <InputWithLabel small label="Hora" type="time" value={config.startTime} onChange={(e) => handleQuickEventConfigChange(type, 'startTime', e.target.value)} />
                                                <InputWithLabel small label="Min" type="number" value={config.duration} onChange={(e) => handleQuickEventConfigChange(type, 'duration', parseInt(e.target.value))} />
                                                {config.defaultDaysOfWeek.length > 0 && (
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleScheduleEvent(type)}>
                                                        <PlusCircle className="h-5 w-5 text-primary"/>
                                                    </Button>
                                                )}
                                             </div>
                                        </div>
                                        <div className="flex justify-between gap-1">
                                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                                                const dayIndex = (i + 1) % 7; // L=1, S=6, D=0
                                                return (
                                                    <Button key={day} size="icon" variant={config.defaultDaysOfWeek.includes(dayIndex) ? 'default' : 'outline'} className="h-6 w-6 text-xs" onClick={() => handleDayToggle(type, dayIndex)}>
                                                        {day}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    </Card>
                                )
                            })}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Eventos del día</CardTitle>
                            <CardDescription>{date ? format(date, "PPP", { locale: es }) : 'Selecciona un día'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {eventsForSelectedDay.length > 0 ? (
                                <ul className="space-y-2">
                                {eventsForSelectedDay.map(event => (
                                    <li key={event.id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{event.description}</p>
                                            <p className="text-sm text-muted-foreground">{event.startTime} - {event.endTime}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(event)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => event.id && confirmDelete(event.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    </li>
                                ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay eventos para este día.</p>
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </main>
            
            <EditEventDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveEvent}
                onConfirmDelete={(eventId) => confirmDelete(eventId)}
                event={selectedEvent}
                defaultDate={dialogDate}
            />

            <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el evento
                        de tus registros.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEvent}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Helper for inline label input
const InputWithLabel = ({ label, small = false, ...props }: { label: string, small?: boolean } & React.ComponentProps<typeof Input>) => (
    <div className="space-y-0.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        <Input {...props} className={small ? 'h-7 w-16 text-xs' : ''}/>
    </div>
);

    

    