
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

type WeeklyCalendarViewProps = {
    week: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: Date) => void;
    getEventColorClass: (event: CalendarEvent) => string;
};

export function WeeklyCalendarView({ week, events, onEventClick, onDayClick, getEventColorClass }: WeeklyCalendarViewProps) {
    const weekStart = startOfWeek(week, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const getEventsForDay = (day: Date) => {
        return events
            .filter(e => isSameDay(new Date(e.date + "T00:00:00"), day))
            .sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    };
    
    return (
        <div className="grid grid-cols-7 h-full border rounded-lg overflow-hidden">
            {days.map((day, dayIndex) => (
                <div key={day.toISOString()} className={cn("border-r", dayIndex === 6 && "border-r-0")}>
                    {/* Day Header */}
                    <div
                      className="sticky top-0 z-10 p-2 text-center border-b bg-background h-20 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50"
                      onClick={() => onDayClick(day)}
                    >
                        <span className="text-sm font-medium text-muted-foreground">{format(day, 'eee', { locale: es })}</span>
                        <span className={cn("text-2xl font-bold", isToday(day) && "text-primary")}>
                            {format(day, 'd')}
                        </span>
                    </div>
                    {/* Day Column */}
                    <div className="p-2 space-y-2 overflow-y-auto h-[calc(100%-5rem)]">
                        {getEventsForDay(day).map(event => (
                            <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className={cn(
                                    "p-1.5 rounded-md text-white text-xs cursor-pointer shadow-md overflow-hidden",
                                    getEventColorClass(event)
                                )}
                                title={`${event.description} (${event.startTime} - ${event.endTime})`}
                            >
                                <p className="font-semibold truncate">{event.description}</p>
                                <p className="truncate opacity-80">{event.startTime} - {event.endTime}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
