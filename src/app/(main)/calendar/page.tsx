
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, writeBatch, doc, deleteDoc } from "firebase/firestore";
import { CalendarEvent } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { addDays, endOfWeek, format, startOfWeek, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { CalendarGrid } from "@/components/dashboard/calendar-view";
import EventDialog, { EventFormData } from "@/components/dashboard/event-dialog";

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [dialogDate, setDialogDate] = useState<Date | null>(null);

    const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

    useEffect(() => {
        setIsLoading(true);
        const eventsColRef = collection(db, "users", userId, "events");
        const q = query(eventsColRef, 
            where("date", ">=", format(weekStart, "yyyy-MM-dd")),
            where("date", "<=", format(weekEnd, "yyyy-MM-dd"))
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
    }, [weekStart, weekEnd, userId, toast]);

    const handlePrevWeek = () => setCurrentDate(subDays(currentDate, 7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    const handleOpenDialog = (event?: CalendarEvent, date?: Date) => {
        setSelectedEvent(event || null);
        setDialogDate(date || (event ? new Date(event.date + "T00:00:00") : new Date()));
        setIsDialogOpen(true);
    };

    const handleSaveEvent = async (data: EventFormData) => {
        const batch = writeBatch(db);
        const userEventsRef = collection(db, "users", userId, "events");
        let docRef;

        if (selectedEvent) {
            // Updating existing event
            docRef = doc(userEventsRef, selectedEvent.id);
        } else {
            // Creating new event
            docRef = doc(userEventsRef);
        }
        
        batch.set(docRef, { ...data, id: docRef.id });

        try {
            await batch.commit();
            toast({ title: "Éxito", description: `Evento ${selectedEvent ? 'actualizado' : 'creado'} correctamente.` });
            setIsDialogOpen(false);
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
                        <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    <h2 className="text-xl font-semibold">
                        {format(weekStart, "d 'de' LLLL", { locale: es })} - {format(weekEnd, "d 'de' LLLL 'de' yyyy", { locale: es })}
                    </h2>
                </div>
                <Button onClick={() => handleOpenDialog(undefined, currentDate)}>
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
                    <CalendarGrid 
                        weekStart={weekStart} 
                        events={events} 
                        onEventClick={handleOpenDialog}
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
