
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { DayPicker, DayProps } from "react-day-picker";
import { es } from "date-fns/locale";

const eventTypeColors: Record<string, string> = {
    entrenamiento: "bg-purple-200 text-purple-800 border-purple-300",
    trabajo: "bg-blue-200 text-blue-800 border-blue-300",
    nota: "bg-yellow-200 text-yellow-800 border-yellow-300",
    vacaciones: "bg-green-200 text-green-800 border-green-300",
    descanso: "bg-teal-200 text-teal-800 border-teal-300",
    default: "bg-gray-200 text-gray-800 border-gray-300",
};

type MonthlyCalendarViewProps = {
    month: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent, date: Date) => void;
    onDayClick: (date: Date) => void;
};

export function MonthlyCalendarView({ month, events, onEventClick, onDayClick }: MonthlyCalendarViewProps) {
    
    const getEventsForDay = (day: Date) => {
        return events
            .filter(e => isSameDay(new Date(e.date + "T00:00:00"), day))
            .sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    };
    
    function DayContent(props: DayProps) {
        const dayEvents = getEventsForDay(props.date);
        const dayNumber = format(props.date, 'd');
        const MAX_EVENTS_VISIBLE = 3;
        const hiddenEventsCount = dayEvents.length - MAX_EVENTS_VISIBLE;

        return (
            <div 
                className={cn(
                    "relative h-full w-full flex flex-col p-1 cursor-pointer",
                    !isSameMonth(props.date, month) && "opacity-50"
                )}
                onClick={() => onDayClick(props.date)}
            >
                <span className={cn(
                    "self-center text-sm font-medium mb-1", // Center the day number
                    isToday(props.date) && "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center"
                )}>
                    {dayNumber}
                </span>
                <div className="flex-grow space-y-1 overflow-hidden mt-1">
                    {dayEvents.slice(0, MAX_EVENTS_VISIBLE).map(event => (
                        <div 
                            key={event.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEventClick(event, props.date);
                            }}
                            className={cn(
                                "text-xs rounded-sm px-1 py-0.5 truncate shadow-sm", // Event card style
                                eventTypeColors[event.type] || eventTypeColors.default
                            )}
                        >
                            {event.description}
                        </div>
                    ))}
                    {hiddenEventsCount > 0 && (
                        <div className="text-xs text-muted-foreground text-center">+ {hiddenEventsCount} más</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <DayPicker
            locale={es}
            month={month}
            modifiers={{ today: new Date() }}
            onMonthChange={() => {}} // Controlled from parent
            components={{
                Day: DayContent,
            }}
            className="h-full w-full"
            classNames={{
                months: 'h-full',
                month: 'h-full flex flex-col',
                table: 'w-full h-full border-collapse',
                head_row: 'flex',
                head_cell: 'w-[14.28%] text-muted-foreground font-normal text-sm pb-2',
                tbody: 'h-full',
                row: 'flex w-full h-[16.66%]',
                cell: 'w-[14.28%] border-t border-r flex',
            }}
        />
    );
}
