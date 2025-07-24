
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, writeBatch, doc, deleteDoc, runTransaction, getDocs } from "firebase/firestore";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { addDays, addMonths, endOfMonth, format, startOfMonth, subDays, subMonths, getDay, addWeeks, startOfWeek, isSameDay, parse, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, Edit, Settings, FileText, Copy } from "lucide-react";
import { MonthlyCalendarView } from "@/components/dashboard/monthly-calendar-view";
import { WeeklyCalendarView } from "@/components/dashboard/weekly-calendar-view";
import { DailyCalendarView } from "@/components/dashboard/daily-calendar-view";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";


type View = "day" | "week" | "month";
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

const eventColors: Record<string, string> = {
    "Trabajo": "bg-blue-500 text-white",
    "Pilates": "bg-purple-500 text-white",
    "Flexibilidad": "bg-pink-500 text-white",
    "Fuerza": "bg-orange-500 text-white",
    "default_entrenamiento": "bg-green-500 text-white",
    "nota": "bg-yellow-500 text-black",
    "vacaciones": "bg-teal-500 text-white",
    "descanso": "bg-indigo-500 text-white",
    "default": "bg-gray-400 text-white",
};

const getEventColorClass = (event: CalendarEvent): string => {
    // Check for specific workout descriptions first
    if (eventColors[event.description]) {
        return eventColors[event.description];
    }
    // Then check for event type
    if (event.type === 'entrenamiento' && eventColors[`default_${event.type}`]) {
        return eventColors[`default_${event.type}`];
    }
    if (eventColors[event.type]) {
        return eventColors[event.type];
    }

    // Default fallback
    return eventColors.default;
};


export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<View>("month");
    
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
        "Nota rápida": { name: "Nota rápida", duration: 0, startTime: "12:00", defaultDaysOfWeek: [], type: "nota"}
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsFilter, setSettingsFilter] = useState<CalendarEvent['type'] | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');


    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    const { viewStart, viewEnd } = useMemo(() => {
        switch (view) {
            case "month":
                return { viewStart: startOfMonth(currentDate), viewEnd: endOfMonth(currentDate) };
            case "week":
                 const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                return { viewStart: weekStart, viewEnd: endOfWeek(currentDate, { weekStartsOn: 1 }) };
            case "day":
                return { viewStart: currentDate, viewEnd: currentDate };
        }
    }, [currentDate, view]);

    useEffect(() => {
        setIsLoading(true);
        if (!userId) return;

        const eventsColRef = collection(db, "users", userId, "events");
        const q = query(eventsColRef, 
            where("date", ">=", format(viewStart, "yyyy-MM-dd")),
            where("date", "<=", format(viewEnd, "yyyy-MM-dd"))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CalendarEvent[];
            setEvents(fetchedEvents.sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00")));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setIsLoading(false);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los eventos." });
        });

        return () => unsubscribe();
    }, [viewStart, viewEnd, userId, toast]);

    const handlePrev = () => {
        switch (view) {
            case "month": setCurrentDate(subMonths(currentDate, 1)); break;
            case "week": setCurrentDate(subDays(currentDate, 7)); break;
            case "day": setCurrentDate(subDays(currentDate, 1)); break;
        }
    };
    
    const handleNext = () => {
        switch (view) {
            case "month": setCurrentDate(addMonths(currentDate, 1)); break;
            case "week": setCurrentDate(addDays(currentDate, 7)); break;
            case "day": setCurrentDate(addDays(currentDate, 1)); break;
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };
    
     const viewTitle = useMemo(() => {
        switch (view) {
            case "month": return format(currentDate, "LLLL yyyy", { locale: es });
            case "week": 
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
                return `${format(weekStart, 'd LLL', { locale: es })} - ${format(weekEnd, 'd LLL yyyy', { locale: es })}`;
            case "day": return format(currentDate, "PPPP", { locale: es });
        }
    }, [currentDate, view]);


    const openDialog = useCallback((event?: CalendarEvent, date?: Date) => {
        setSelectedEvent(event || null);
        const targetDate = date || (event ? new Date(event.date + "T00:00:00") : new Date());
        setDialogDate(targetDate);
        setIsDialogOpen(true);
    }, []);
    
    const handleDateSelect = async (day: Date) => {
        setCurrentDate(day);
    
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
        } else {
            // If not quick-adding, clicking a day in month/week view should switch to day view
            if(view !== 'day') {
                setView('day');
            }
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

                if (data.startTime && data.endTime) {
                    const newEventStart = parse(`${data.date} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                    const newEventEnd = parse(`${data.date} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

                    for (const existing of existingEvents) {
                        if (selectedEvent?.id && existing.id === selectedEvent.id) continue;
                        if (!existing.startTime || !existing.endTime) continue;

                        const existingStart = parse(`${existing.date} ${existing.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                        const existingEnd = parse(`${existing.date} ${existing.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
                        
                        if (newEventStart < existingEnd && newEventEnd > existingStart) {
                            throw new Error(`Conflicto de horario con el evento: ${existing.description}`);
                        }
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
            // Also update the color mapping if it exists
            if (eventColors[oldName]) {
                eventColors[newName] = eventColors[oldName];
                delete eventColors[oldName];
            }
            return newQuickEvents;
        });
    }

    const handleAddNewQuickEvent = () => {
        const newName = `Evento #${Object.keys(quickEventTypes).length + 1}`;
        setQuickEventTypes(prev => ({
            ...prev,
            [newName]: { name: newName, duration: 60, startTime: "12:00", defaultDaysOfWeek: [], type: settingsFilter || 'nota' }
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
    
    const quickEventGroups = useMemo(() => {
        const groups: Record<CalendarEvent['type'], QuickEventType[]> = {
            'entrenamiento': [],
            'trabajo': [],
            'nota': [],
            'descanso': [],
            'vacaciones': []
        };
        (Object.keys(quickEventTypes) as QuickEventType[]).forEach(key => {
            const type = quickEventTypes[key].type;
            if (groups[type]) {
                groups[type].push(key);
            }
        });
        // This is to ensure consistent ordering
        const orderedGroups: {name: CalendarEvent['type'], events: QuickEventType[]}[] = [
            { name: 'entrenamiento', events: groups.entrenamiento},
            { name: 'trabajo', events: groups.trabajo},
            { name: 'nota', events: groups.nota},
            { name: 'descanso', events: groups.descanso},
            { name: 'vacaciones', events: groups.vacaciones},
        ];

        return orderedGroups;

    }, [quickEventTypes]);
    
    const openSettingsDialog = (filter: CalendarEvent['type']) => {
        setSettingsFilter(filter);
        setIsSettingsOpen(true);
    }
    
    const filteredQuickEventKeys = useMemo(() => {
        if (!settingsFilter) return Object.keys(quickEventTypes);
        return Object.keys(quickEventTypes).filter(key => quickEventTypes[key].type === settingsFilter);
    }, [quickEventTypes, settingsFilter]);
    
    const generateReport = () => {
        let report = `Informe de Calendario - ${viewTitle}\n`;
        report += "========================================\n\n";

        if (events.length === 0) {
            report += "No hay eventos en este período.";
            setReportContent(report);
            setIsReportOpen(true);
            return;
        }

        switch (view) {
            case 'day':
                events.forEach(event => {
                    report += `- ${event.startTime || ''}-${event.endTime || ''}: ${event.description} [${event.type}]\n`;
                });
                break;
            case 'week':
            case 'month':
                const groupedEvents = events.reduce((acc, event) => {
                    const date = event.date;
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(event);
                    return acc;
                }, {} as Record<string, CalendarEvent[]>);

                Object.keys(groupedEvents).sort().forEach(date => {
                    report += `**${format(parse(date, "yyyy-MM-dd", new Date()), "EEEE, d 'de' LLLL", { locale: es })}**\n`;
                    groupedEvents[date].forEach(event => {
                        report += `- ${event.startTime || ''}-${event.endTime || ''}: ${event.description} [${event.type}]\n`;
                    });
                    report += "\n";
                });
                break;
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
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <Button onClick={handleToday} variant="outline">Hoy</Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handlePrev}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    <h2 className="text-xl font-semibold capitalize min-w-[280px]">
                        {viewTitle}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')}>Mes</Button>
                    <Button variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Semana</Button>
                    <Button variant={view === 'day' ? 'default' : 'outline'} onClick={() => setView('day')}>Día</Button>
                    <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-auto">
                <div className="lg:col-span-2">
                       {view === 'month' && (
                            <MonthlyCalendarView
                                month={currentDate}
                                onMonthChange={setCurrentDate}
                                events={events}
                                selected={currentDate}
                                onEventClick={(event) => openDialog(event)}
                                onDayClick={handleDateSelect}
                                getEventColorClass={getEventColorClass}
                            />
                       )}
                       {view === 'week' && (
                           <WeeklyCalendarView
                                week={currentDate}
                                events={events}
                                onEventClick={(event) => openDialog(event)}
                                onDayClick={handleDateSelect}
                                getEventColorClass={getEventColorClass}
                           />
                       )}
                       {view === 'day' && (
                            <DailyCalendarView
                                day={currentDate}
                                events={events}
                                onEventClick={(event) => openDialog(event)}
                                getEventColorClass={getEventColorClass}
                            />
                       )}
                </div>
                
                <aside className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                           <div>
                             <CardTitle className="text-base">Eventos Rápidos</CardTitle>
                             <CardDescription className="text-xs">Selecciona un tipo y haz clic en el calendario para añadirlo.</CardDescription>
                           </div>
                        </CardHeader>
                         <CardContent className="space-y-6">
                            {quickEventGroups.map(({name, events}) => {
                                if (events.length === 0) return null;
                                return (
                                <div key={name} className="space-y-2">
                                     <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm capitalize">{name === 'nota' ? 'Otros' : name}</h4>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openSettingsDialog(name)}>
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {events.map((type) => {
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
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                                )
                            })}
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
                        <DialogTitle>Configurar Eventos Rápidos: <span className="capitalize">{settingsFilter === 'nota' ? 'Otros' : settingsFilter}</span></DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        {filteredQuickEventKeys.map(key => (
                           <div key={key} className="p-2 border rounded-md space-y-3">
                                <div className="flex items-center gap-2">
                                   <Input 
                                       defaultValue={key}
                                       onBlur={(e) => handleQuickEventNameChange(key, e.target.value)}
                                       className="h-9 font-semibold"
                                   />
                                   <Button variant="ghost" size="icon" onClick={() => handleDeleteQuickEvent(key)}>
                                       <Trash2 className="h-4 w-4 text-destructive" />
                                   </Button>
                               </div>
                               <div className="flex items-center gap-2">
                                    <Select value={quickEventTypes[key].type} onValueChange={(v) => handleQuickEventConfigChange(key, 'type', v as CalendarEvent['type'])}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="entrenamiento">Entrenamiento</SelectItem>
                                            <SelectItem value="trabajo">Trabajo</SelectItem>
                                            <SelectItem value="descanso">Descanso</SelectItem>
                                            <SelectItem value="vacaciones">Vacaciones</SelectItem>
                                            <SelectItem value="nota">Nota</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {quickEventTypes[key].type === 'trabajo' ? (
                                        <>
                                            <Input type="time" value={quickEventTypes[key].startTime} onChange={(e) => handleQuickEventConfigChange(key, 'startTime', e.target.value)} className="h-9 w-[90px] text-xs px-1"/>
                                            <Input type="time" value={quickEventTypes[key].endTime || ''} onChange={(e) => handleQuickEventConfigChange(key, 'endTime', e.target.value)} className="h-9 w-[90px] text-xs px-1"/>
                                        </>
                                    ) : (
                                        <>
                                            <Input type="time" value={quickEventTypes[key].startTime} onChange={(e) => handleQuickEventConfigChange(key, 'startTime', e.target.value)} className="h-9 w-[90px] text-xs px-1"/>
                                            <Input type="number" value={quickEventTypes[key].duration || 0} onChange={(e) => handleQuickEventConfigChange(key, 'duration', parseInt(e.target.value))} className="h-9 w-[60px] text-xs px-1"/>
                                            <span className="text-xs text-muted-foreground">min</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-between items-center gap-1">
                                    <div className="flex justify-around gap-1">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                                            const dayIndex = (i + 1) % 7; // L=1...D=0
                                            return (
                                                <Button key={day} size="icon" variant={quickEventTypes[key].defaultDaysOfWeek.includes(dayIndex) ? 'default' : 'outline'} className="h-6 w-6 text-xs" onClick={() => handleDayToggle(key, dayIndex)}>
                                                    {day}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                    {quickEventTypes[key].defaultDaysOfWeek.length > 0 && (
                                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleScheduleEvent(key)}>
                                            <PlusCircle className="h-4 w-4 mr-2 text-primary"/> Programar
                                        </Button>
                                    )}
                                </div>
                           </div>
                        ))}
                    </div>
                    <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
                         <Button variant="outline" onClick={handleAddNewQuickEvent}>Añadir nuevo evento</Button>
                        <Button onClick={() => setIsSettingsOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe del Calendario</DialogTitle>
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


type QuickEventCardProps = {
    type: QuickEventType;
    config: QuickEventTypeInfo;
    isSelected: boolean;
    onSelect: (type: QuickEventType | null) => void;
};

const QuickEventCard = ({ type, config, isSelected, onSelect }: QuickEventCardProps) => (
    <Badge
        className={cn(
            "p-2 cursor-pointer transition-all w-full justify-start", 
            isSelected ? "ring-2 ring-primary bg-primary/10 text-primary" : "hover:bg-muted/50",
            getEventColorClass({ type: config.type, description: type } as CalendarEvent)
        )}
        variant={isSelected ? 'default' : 'outline'}
        onClick={() => onSelect(isSelected ? null : type)}
    >
        <Label className="font-semibold text-sm cursor-pointer">{type}</Label>
    </Badge>
);
