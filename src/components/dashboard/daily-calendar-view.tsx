
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";

const eventTypeColors: Record<string, string> = {
    entrenamiento: "bg-purple-500 border-purple-700",
    trabajo: "bg-blue-500 border-blue-700",
    nota: "bg-yellow-500 border-yellow-700",
    vacaciones: "bg-green-500 border-green-700",
    descanso: "bg-teal-500 border-teal-700",
    default: "bg-gray-500 border-gray-700",
};

const hours = Array.from({ length: 24 }, (_, i) => i); // 0 (12 AM) to 23 (11 PM)

const parseTimeToMinutes = (time: string): number => {
    try {
        const [hour, minute] = time.split(':').map(Number);
        return hour * 60 + minute;
    } catch {
        return 0;
    }
};

type DailyCalendarViewProps = {
    day: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
};

export function DailyCalendarView({ day, events, onEventClick }: DailyCalendarViewProps) {
    const sortedEvents = events.sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));

    return (
        <div className="flex flex-col h-[75vh] overflow-y-auto border rounded-lg">
            <div className="flex sticky top-0 bg-background z-10">
                <div className="w-16 flex-shrink-0"></div>
                <div className="flex-grow text-center font-bold p-2 border-b">
                    {/* Header can be here if needed */}
                </div>
            </div>
            <div className="flex">
                {/* Time Gutter */}
                <div className="w-16 flex-shrink-0">
                    {hours.map(hour => (
                        <div key={hour} className="h-16 text-right pr-2 pt-1 border-r">
                            <span className="text-xs text-muted-foreground">{format(new Date(0, 0, 0, hour), 'h a')}</span>
                        </div>
                    ))}
                </div>

                {/* Events Column */}
                <div className="relative flex-grow">
                    {/* Hour lines */}
                    {hours.map(hour => (
                        <div key={hour} className="h-16 border-b"></div>
                    ))}

                    {/* All-day events */}
                    <div className="absolute top-0 left-0 right-0 p-1 space-y-1 z-10">
                        {sortedEvents.filter(e => !e.startTime || !e.endTime).map(event => (
                            <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className={cn(
                                    "p-1 rounded-md text-white text-xs cursor-pointer shadow",
                                    eventTypeColors[event.type] || eventTypeColors.default
                                )}
                            >
                                {event.description}
                            </div>
                        ))}
                    </div>

                    {/* Timed events */}
                    {sortedEvents.filter(e => e.startTime && e.endTime).map(event => {
                        const top = (parseTimeToMinutes(event.startTime!) / 60) * 64; // 64px per hour (h-16)
                        const height = ((parseTimeToMinutes(event.endTime!) - parseTimeToMinutes(event.startTime!)) / 60) * 64;

                        return (
                            <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className={cn(
                                    "absolute left-2 right-2 p-2 rounded-md text-white text-xs cursor-pointer shadow-md overflow-hidden border-l-4 z-10",
                                    eventTypeColors[event.type] || eventTypeColors.default
                                )}
                                style={{ top: `${top}px`, height: `${Math.max(height, 32)}px` }} // Min height
                                title={`${event.description} (${event.startTime} - ${event.endTime})`}
                            >
                                <p className="font-bold">{event.description}</p>
                                <p>{event.startTime} - {event.endTime}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
