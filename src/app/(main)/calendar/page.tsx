
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, writeBatch, doc, deleteDoc, getDocs, runTransaction } from "firebase/firestore";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { MonthlyCalendarView } from "@/components/dashboard/monthly-calendar-view";
import EventDialog, { EventFormData } from "@/components/dashboard/event-dialog";

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [dialogDate, setDialogDate] = useState<Date | null>(null);

    const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
    const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

    useEffect(() => {
        setIsLoading(true);
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

    const handleOpenDialog = (event?: CalendarEvent, date?: Date) => {
        setSelectedEvent(event || null);
        setDialogDate(date || (event ? new Date(event.date + "T00:00:00") : new Date()));
        setIsDialogOpen(true);
    };
    
    const handleSaveEvent = async (data: EventFormData) => {
        const batch = writeBatch(db);
        const userEventsRef = collection(db, "users", userId, "events");
        let docRef;

        if (selectedEvent && selectedEvent.id) {
            docRef = doc(userEventsRef, selectedEvent.id);
        } else {
            docRef = doc(userEventsRef);
        }
        
        batch.set(docRef, { ...data, id: docRef.id });

        try {
            await batch.commit();
            toast({ title: "Éxito", description: `Evento ${selectedEvent ? 'actualizado' : 'creado'} correctamente.` });
            setIsDialogOpen(false);
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el evento." });
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent || !selectedEvent.id) return;
        if (!window.confirm("¿Estás seguro de que quieres eliminar este evento?")) return;

        const docRef = doc(db, "users", userId, "events", selectedEvent.id);
        try {
            await deleteDoc(docRef);
            toast({ title: "Evento eliminado" });
            setIsDialogOpen(false);
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error deleting event:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el evento." });
        }
    };

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
                <Button onClick={() => handleOpenDialog(undefined, new Date())}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Evento
                </Button>
            </header>

            <main className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <p>Cargando eventos...</p>
                    </div>
                ) : (
                    <MonthlyCalendarView
                        month={currentMonth}
                        events={events}
                        onEventClick={handleOpenDialog}
                        onDayClick={(date) => handleOpenDialog(undefined, date)}
                    />
                )}
            </main>
            
            <EventDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                event={selectedEvent}
                defaultDate={dialogDate}
            />
        </div>
    );
}
