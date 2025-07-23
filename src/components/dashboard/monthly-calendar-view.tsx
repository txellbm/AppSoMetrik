
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";
import { format, isSameDay, isSameMonth, isToday, isSameDate } from "date-fns";
import { DayPicker, DayProps } from "react-day-picker";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const eventTypeColors: Record<string, string> = {
    entrenamiento: "bg-purple-500 text-white",
    trabajo: "bg-blue-500 text-white",
    nota: "bg-yellow-500 text-black",
    vacaciones: "bg-green-500 text-white",
    descanso: "bg-teal-500 text-white",
    default: "bg-gray-500 text-white",
};

type MonthlyCalendarViewProps = {
    month: Date;
    events: CalendarEvent[];
    selected: Date | undefined;
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: Date) => void;
};

export function MonthlyCalendarView({ month, events, selected, onEventClick, onDayClick }: MonthlyCalendarViewProps) {
    
    const getEventsForDay = (day: Date) => {
        return events
            .filter(e => isSameDay(new Date(e.date + "T00:00:00"), day))
            .sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    };
    
    function DayContent(props: DayProps) {
        const dayEvents = getEventsForDay(props.date);
        const dayNumber = format(props.date, 'd');
        const MAX_EVENTS_VISIBLE = 2;
        const hiddenEventsCount = dayEvents.length - MAX_EVENTS_VISIBLE;

        return (
            <div 
                className={cn(
                    "relative h-full w-full flex flex-col p-1 cursor-pointer border-t border-r",
                    !isSameMonth(props.date, month) && "opacity-50 bg-muted/50",
                    isSameDay(props.date, selected || new Date()) && "bg-accent",
                )}
                onClick={() => onDayClick(props.date)}
            >
                <span className={cn(
                    "self-start text-sm font-medium mb-1", // align left
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
                                onEventClick(event);
                            }}
                            className={cn(
                                "text-xs rounded-sm px-1.5 py-0.5 truncate shadow-sm text-left", 
                                eventTypeColors[event.type] || eventTypeColors.default
                            )}
                        >
                            {event.description}
                        </div>
                    ))}
                    {hiddenEventsCount > 0 && (
                         <Badge variant="secondary" className="text-xs w-full justify-center">+ {hiddenEventsCount} más</Badge>
                    )}
                </div>
            </div>
        );
    }

    return (
        <DayPicker
            locale={es}
            month={month}
            selected={selected}
            onDayClick={onDayClick}
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
                head_cell: 'w-[14.28%] text-muted-foreground font-normal text-sm pb-2 border-b border-l text-center',
                tbody: 'h-full',
                row: 'flex w-full h-[19%]', // Adjusted for more space
                cell: 'w-[14.28%] flex',
            }}
        />
    );
}

    