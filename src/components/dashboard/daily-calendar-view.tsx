
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";

type DailyCalendarViewProps = {
    day: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    getEventColorClass: (event: CalendarEvent) => string;
};

export function DailyCalendarView({ events, onEventClick, getEventColorClass }: DailyCalendarViewProps) {
    const sortedEvents = events.sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));

    return (
        <div className="h-full border rounded-lg p-4 space-y-4 overflow-y-auto">
            {sortedEvents.length > 0 ? (
                sortedEvents.map(event => (
                    <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={cn(
                            "p-3 rounded-lg text-white cursor-pointer shadow-md flex items-start gap-4",
                            getEventColorClass(event)
                        )}
                    >
                        <div className="w-20 text-right shrink-0">
                            <p className="font-semibold">{event.startTime}</p>
                            <p className="text-xs opacity-80">{event.endTime}</p>
                        </div>
                        <div className="border-l-2 border-white/50 pl-4">
                            <p className="font-bold">{event.description}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No hay eventos para este día.</p>
                </div>
            )}
        </div>
    );
}
