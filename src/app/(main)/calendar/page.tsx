
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, writeBatch, doc, deleteDoc, runTransaction, getDocs } from "firebase/firestore";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { addMonths, endOfMonth, format, startOfMonth, subMonths, getDay, addWeeks, startOfWeek, isSameDay, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Edit, Settings } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type QuickEventType = string;
type QuickEventTypeInfo = {
    name: string;
    startTime: string; 
    endTime?: string; 
    duration?: number; 
    defaultDaysOfWeek: number[]; 
    type: CalendarEvent['type'];
};

type QuickEventTypes = Record<QuickEventType, QuickEventTypeInfo>;


export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [dialogDate, setDialogDate] = useState<Date | null>(null);
    
    const [selectedQuickEventType, setSelectedQuickEventType] = useState<QuickEventType | null>(null);
    const [quickEventTypes, setQuickEventTypes] = useState<QuickEventTypes>({
        "Trabajo": { name: "Trabajo", startTime: "09:00", endTime: "17:00", defaultDaysOfWeek: [], type: "trabajo" },
        "Pilates": { name: "Pilates", duration: 60, startTime: "09:00", defaultDaysOfWeek: [], type: "entrenamiento" },
        "Flexibilidad": { name: "Flexibilidad", duration: 45, startTime: "18:00", defaultDaysOfWeek: [], type: "entrenamiento" },
        "Fuerza": { name: "Fuerza", duration: 75, startTime: "19:00", defaultDaysOfWeek: [], type: "entrenamiento" },
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
    const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

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
    const handleToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setDate(today);
    };

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
            let endTime: string;

            if (config.endTime) {
                endTime = config.endTime;
            } else if (config.duration) {
                endTime = format(new Date(new Date(`1970-01-01T${config.startTime}`).getTime() + config.duration * 60000), "HH:mm");
            } else {
                endTime = config.startTime; // Fallback
            }
            
            const newEvent: Omit<CalendarEvent, 'id'> = {
                description: selectedQuickEventType,
                type: config.type,
                date: format(day, "yyyy-MM-dd"),
                startTime: config.startTime,
                endTime: endTime,
            };
            openDialog(newEvent as CalendarEvent, day);
        }
    };

    const handleSaveEvent = async (data: Omit<CalendarEvent, 'id'>) => {
        try {
            await runTransaction(db, async (transaction) => {
                const userEventsRef = collection(db, "users", userId, "events");
                const docRef = selectedEvent?.id ? doc(userEventsRef, selectedEvent.id) : doc(userEventsRef);
                
                const q = query(userEventsRef, where("date", "==", data.date));
                const existingEventsSnap = await getDocs(q);
                const existingEvents = existingEventsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

                const newEventStart = parse(`${data.date} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                const newEventEnd = parse(`${data.date} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

                for (const existing of existingEvents) {
                    if (selectedEvent?.id && existing.id === selectedEvent.id) continue;

                    const existingStart = parse(`${existing.date} ${existing.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                    const existingEnd = parse(`${existing.date} ${existing.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
                    
                    if (newEventStart < existingEnd && newEventEnd > existingStart) {
                        throw new Error(`Conflicto de horario con el evento: ${existing.description}`);
                    }
                }

                const eventData: CalendarEvent = { ...data, id: docRef.id };
                transaction.set(docRef, eventData, { merge: true });
            });
            toast({ title: "Éxito", description: `Evento ${selectedEvent ? 'actualizado' : 'creado'} correctamente.` });
            setIsDialogOpen(false);
            setSelectedEvent(null);
            setSelectedQuickEventType(null);
        } catch (error: any) {
            console.error("Error saving event:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo guardar el evento." });
        }
    };

    const confirmDelete = (eventId: string) => {
        setIsDialogOpen(false);
        setTimeout(() => setEventToDelete(eventId), 100); 
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
    
    const handleQuickEventNameChange = (oldName: QuickEventType, newName: string) => {
        if (!newName.trim() || newName === oldName) return;

        setQuickEventTypes(prev => {
            const newQuickEvents: QuickEventTypes = {};
            for (const key in prev) {
                if(key === oldName) {
                    newQuickEvents[newName] = { ...prev[oldName], name: newName };
                } else {
                    newQuickEvents[key] = prev[key];
                }
            }
            return newQuickEvents;
        });
    }

    const handleAddNewWorkout = () => {
        const newName = `Entreno #${Object.keys(quickEventTypes).length}`;
        setQuickEventTypes(prev => ({
            ...prev,
            [newName]: { name: newName, duration: 60, startTime: "12:00", defaultDaysOfWeek: [], type: 'entrenamiento' }
        }));
    }

    const handleDeleteQuickEvent = (name: QuickEventType) => {
        setQuickEventTypes(prev => {
            const newQuickEvents = {...prev};
            delete newQuickEvents[name];
            return newQuickEvents;
        });
    }


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
        const today = startOfWeek(new Date(), { weekStartsOn: 1 });

        let endTime: string;
        if(config.endTime) {
            endTime = config.endTime;
        } else if (config.duration) {
            endTime = format(new Date(new Date(`1970-01-01T${config.startTime}`).getTime() + config.duration * 60000), "HH:mm");
        } else {
            endTime = config.startTime;
        }

        for (let week = 0; week < 4; week++) {
            const weekStart = addWeeks(today, week);
            for (const dayOfWeek of config.defaultDaysOfWeek) {
                const targetDay = new Date(weekStart);
                targetDay.setDate(weekStart.getDate() + (dayOfWeek - getDay(weekStart) + 7) % 7);
                
                eventsToAdd.push({
                    description: type,
                    type: config.type,
                    date: format(targetDay, 'yyyy-MM-dd'),
                    startTime: config.startTime,
                    endTime: endTime,
                });
            }
        }

        if (eventsToAdd.length === 0) {
            toast({ title: "Nada que añadir", description: "No hay fechas futuras para programar." });
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
        return events.filter(e => isSameDay(new Date(e.date + 'T00:00:00'), date)).sort((a,b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    }, [date, events]);
    
    const { workouts, work } = useMemo(() => {
        const workouts: QuickEventType[] = [];
        const work: QuickEventType[] = [];
        (Object.keys(quickEventTypes) as QuickEventType[]).forEach(key => {
            if (quickEventTypes[key].type === 'entrenamiento') {
                workouts.push(key);
            } else {
                work.push(key);
            }
        });
        return { workouts, work };
    }, [quickEventTypes]);


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
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-auto">
                <div className="lg:col-span-2">
                        <MonthlyCalendarView
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            events={events}
                            selected={date}
                            onEventClick={(event) => openDialog(event)}
                            onDayClick={handleDateSelect}
                        />
                </div>
                
                <aside className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                           <div>
                             <CardTitle className="text-base">Eventos Rápidos</CardTitle>
                             <CardDescription className="text-xs">Selecciona un tipo y haz clic en el calendario para añadirlo.</CardDescription>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                                <Settings className="h-4 w-4" />
                           </Button>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-2">Entrenos</h4>
                                {workouts.map((type) => {
                                    const config = quickEventTypes[type];
                                    if (!config) return null;
                                    const isSelected = selectedQuickEventType === type;
                                    return (
                                        <QuickEventCard 
                                            key={type}
                                            type={type}
                                            config={config}
                                            isSelected={isSelected}
                                            onSelect={setSelectedQuickEventType}
                                            onConfigChange={handleQuickEventConfigChange}
                                            onSchedule={handleScheduleEvent}
                                            onDayToggle={handleDayToggle}
                                        />
                                    )
                                })}
                            </div>
                            <div className="space-y-2">
                                 <h4 className="font-semibold text-sm mb-2">Trabajo</h4>
                                 {work.map((type) => {
                                    const config = quickEventTypes[type];
                                     if (!config) return null;
                                    const isSelected = selectedQuickEventType === type;
                                    return (
                                        <QuickEventCard 
                                            key={type}
                                            type={type}
                                            config={config}
                                            isSelected={isSelected}
                                            onSelect={setSelectedQuickEventType}
                                            onConfigChange={handleQuickEventConfigChange}
                                            onSchedule={handleScheduleEvent}
                                            onDayToggle={handleDayToggle}
                                        />
                                    )
                                })}
                            </div>
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

            <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el evento
                        de tus registros.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEvent}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurar Eventos Rápidos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        {Object.keys(quickEventTypes).map(key => (
                           <div key={key} className="flex items-center gap-2">
                               <Input 
                                   defaultValue={key}
                                   onBlur={(e) => handleQuickEventNameChange(key, e.target.value)}
                                   className="h-9"
                                   disabled={quickEventTypes[key].type === 'trabajo'}
                               />
                               {quickEventTypes[key].type !== 'trabajo' && (
                                   <Button variant="ghost" size="icon" onClick={() => handleDeleteQuickEvent(key)}>
                                       <Trash2 className="h-4 w-4 text-destructive" />
                                   </Button>
                               )}
                           </div>
                        ))}
                    </div>
                    <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
                         <Button variant="outline" onClick={handleAddNewWorkout}>Añadir nuevo entreno</Button>
                        <Button onClick={() => setIsSettingsOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}


type QuickEventCardProps = {
    type: QuickEventType;
    config: QuickEventTypeInfo;
    isSelected: boolean;
    onSelect: (type: QuickEventType | null) => void;
    onConfigChange: (type: QuickEventType, field: keyof QuickEventTypeInfo, value: any) => void;
    onSchedule: (type: QuickEventType) => void;
    onDayToggle: (type: QuickEventType, day: number) => void;
};

const QuickEventCard = ({ type, config, isSelected, onSelect, onConfigChange, onSchedule, onDayToggle }: QuickEventCardProps) => (
    <Card 
        className={cn(
            "p-2 cursor-pointer transition-all", 
            isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
        )}
        onClick={() => onSelect(isSelected ? null : type)}
    >
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center gap-2">
                 <Label className="font-semibold text-sm cursor-pointer" onClick={() => onSelect(isSelected ? null : type)}>{type}</Label>
                 <div className="flex items-center gap-1">
                     {config.type === 'trabajo' ? (
                        <>
                            <Input type="time" value={config.startTime} onChange={(e) => onConfigChange(type, 'startTime', e.target.value)} className="h-7 w-[75px] text-xs px-1"/>
                            <Input type="time" value={config.endTime || ''} onChange={(e) => onConfigChange(type, 'endTime', e.target.value)} className="h-7 w-[75px] text-xs px-1"/>
                        </>
                    ) : (
                        <>
                            <Input type="time" value={config.startTime} onChange={(e) => onConfigChange(type, 'startTime', e.target.value)} className="h-7 w-[75px] text-xs px-1"/>
                            <Input type="number" value={config.duration || 0} onChange={(e) => onConfigChange(type, 'duration', parseInt(e.target.value))} className="h-7 w-[50px] text-xs px-1"/>
                            <span className="text-xs text-muted-foreground">min</span>
                        </>
                    )}
                    {config.defaultDaysOfWeek.length > 0 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => onSchedule(type)}>
                            <PlusCircle className="h-4 w-4 text-primary"/>
                        </Button>
                    )}
                 </div>
            </div>
             <div className="flex justify-around gap-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                    const dayIndex = (i + 1) % 7; // L=1...D=0
                    return (
                        <Button key={day} size="icon" variant={config.defaultDaysOfWeek.includes(dayIndex) ? 'default' : 'outline'} className="h-5 w-5 text-xs" onClick={() => onDayToggle(type, dayIndex)}>
                            {day}
                        </Button>
                    )
                })}
            </div>
        </div>
    </Card>
);

    