
"use client";

import { CalendarEvent } from "@/ai/schemas";
import { cn } from "@/lib/utils";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { DayPicker, DayProps } from "react-day-picker";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

type MonthlyCalendarViewProps = {
    month: Date;
    onMonthChange: (date: Date) => void;
    events: CalendarEvent[];
    selected: Date | undefined;
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: Date) => void;
    getEventColorClass: (event: CalendarEvent) => string;
};

export function MonthlyCalendarView({ month, onMonthChange, events, selected, onEventClick, onDayClick, getEventColorClass }: MonthlyCalendarViewProps) {
    
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
                    "relative h-full w-full flex flex-col p-1 cursor-pointer",
                    !isSameMonth(props.date, month) && "opacity-50 bg-muted/50",
                    isSameDay(props.date, selected || new Date()) && "bg-accent",
                )}
                onClick={() => onDayClick(props.date)}
            >
                <span className={cn(
                    "self-end text-sm font-medium mb-1",
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
                                getEventColorClass(event)
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
            onMonthChange={onMonthChange}
            selected={selected}
            onDayClick={onDayClick}
            modifiers={{ today: new Date() }}
            components={{
                Day: DayContent,
            }}
            captionLayout="dropdown-buttons"
            fromYear={2020}
            toYear={2030}
            styles={{ caption: { display: 'none' } }}
            className="h-full w-full"
            classNames={{
                root: 'h-full flex flex-col',
                months: 'h-full',
                month: 'h-full flex flex-col',
                table: 'w-full h-full border-collapse',
                head_row: 'flex',
                head_cell: 'w-[14.28%] text-muted-foreground font-normal text-sm pb-2 text-center',
                tbody: 'h-full flex flex-col',
                row: 'flex w-full flex-grow', 
                cell: 'w-[14.28%] flex flex-col border',
            }}
        />
    );
}
