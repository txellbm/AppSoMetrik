
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, isToday, startOfWeek, parse } from "date-fns";
import { es } from "date-fns/locale";

const eventTypeColors: Record<string, string> = {
    entrenamiento: "bg-purple-500/90 border-purple-700",
    trabajo: "bg-blue-500/90 border-blue-700",
    nota: "bg-yellow-500/90 border-yellow-700",
    vacaciones: "bg-green-500/90 border-green-700",
    descanso: "bg-teal-500/90 border-teal-700",
    default: "bg-gray-500/90 border-gray-700",
};

const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

const parseTimeToMinutes = (time: string): number => {
    try {
        const [hour, minute] = time.split(':').map(Number);
        return hour * 60 + minute;
    } catch {
        return 0;
    }
};

type WeeklyCalendarViewProps = {
    week: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: Date) => void;
};

export function WeeklyCalendarView({ week, events, onEventClick, onDayClick }: WeeklyCalendarViewProps) {
    const weekStart = startOfWeek(week, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const getEventsForDay = (day: Date) => {
        return events
            .filter(e => isSameDay(new Date(e.date + "T00:00:00"), day))
            .sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    };
    
    return (
        <div className="grid grid-cols-[auto_1fr] h-[75vh] overflow-y-auto border rounded-lg">
            {/* Time Gutter */}
            <div className="flex flex-col border-r">
                <div className="h-20"></div> {/* Header space */}
                {hours.map(hour => (
                    <div key={hour} className="h-16 flex-shrink-0 flex items-start justify-end pr-2 pt-1">
                        <span className="text-xs text-muted-foreground">{format(new Date(0, 0, 0, hour), 'h a')}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7">
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
                        <div className="relative">
                            {/* Hour lines */}
                            {hours.map(hour => (
                                <div key={hour} className="h-16 border-b"></div>
                            ))}
                            {/* Events */}
                            {getEventsForDay(day).map(event => {
                                 if (!event.startTime || !event.endTime) {
                                    return ( // Render as an all-day event at the top if no time
                                        <div 
                                            key={event.id}
                                            onClick={() => onEventClick(event)}
                                            className={cn("absolute left-1 right-1 p-1 rounded-md text-white text-xs cursor-pointer shadow-md z-10", eventTypeColors[event.type] || eventTypeColors.default)}
                                            style={{ top: '2px' }}
                                            title={event.description}
                                        >
                                           <p className="font-semibold truncate">{event.description}</p>
                                        </div>
                                    )
                                 }

                                const top = ((parseTimeToMinutes(event.startTime) - (6 * 60)) / 60) * 64; // 64px per hour (h-16)
                                const height = ((parseTimeToMinutes(event.endTime) - parseTimeToMinutes(event.startTime)) / 60) * 64;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className={cn(
                                            "absolute left-1 right-1 p-1 rounded-md text-white text-xs cursor-pointer shadow-md overflow-hidden border-l-2 z-10",
                                            eventTypeColors[event.type] || eventTypeColors.default
                                        )}
                                        style={{ top: `${top}px`, height: `${Math.max(height, 24)}px` }}
                                        title={`${event.description} (${event.startTime} - ${event.endTime})`}
                                    >
                                        <p className="font-semibold truncate">{event.description}</p>
                                        <p className="truncate">{event.startTime} - {event.endTime}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

