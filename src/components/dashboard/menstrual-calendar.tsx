

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyMetric } from "@/ai/schemas";
import { Calendar } from "@/components/ui/calendar";
import { Stethoscope, Droplet } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { parseISO, isValid } from "date-fns";

const flowColors: { [key: string]: string } = {
  spotting: 'text-red-300',
  light: 'text-red-400',
  medium: 'text-red-500',
  heavy: 'text-red-600',
};

// Helper function to safely parse dates that might be in different formats
const safeParseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    // If it's a Firestore Timestamp object
    if (typeof dateInput === 'object' && dateInput.seconds) {
        return new Date(dateInput.seconds * 1000);
    }
    // If it's already a Date object
    if (dateInput instanceof Date) {
        return isValid(dateInput) ? dateInput : null;
    }
    // If it's a string
    if (typeof dateInput === 'string') {
        const date = parseISO(dateInput);
        if (isValid(date)) return date;
        
        // Handle 'YYYY-MM-DD' strings by parsing them as local time
        const parts = dateInput.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            const localDate = new Date(year, month - 1, day, 12); // Use noon to avoid timezone shifts
            if (isValid(localDate)) return localDate;
        }
    }
    return null; // Return null if parsing fails
};


export default function MenstrualCalendar({ data }: { data: DailyMetric[] }) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="text-primary" />
            Calendario Menstrual
          </CardTitle>
          <CardDescription>No hay datos disponibles para el ciclo menstrual.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Sube un archivo de Clue u otra app para ver tu información.
          </div>
        </CardContent>
      </Card>
    );
  }

  const modifiers = data.reduce((acc, entry) => {
    const date = safeParseDate(entry.date);
    if (date && entry.menstrualCycle?.flow) {
      const flow = entry.menstrualCycle.flow;
      acc[flow] = [...(acc[flow] || []), date];
    }
    return acc;
  }, {} as Record<string, Date[]>);

  const modifiersStyles = {
    spotting: { color: 'hsl(var(--primary))', opacity: 0.3 },
    light: { color: 'hsl(var(--primary))', opacity: 0.5 },
    medium: { color: 'hsl(var(--primary))', opacity: 0.8 },
    heavy: { color: 'hsl(var(--primary))', opacity: 1.0 },
  };

  const DayWithFlow = ({ date }: { date: Date }) => {
    const entryForDay = data.find(d => {
        const entryDate = safeParseDate(d.date);
        return entryDate && entryDate.getDate() === date.getDate() &&
               entryDate.getMonth() === date.getMonth() &&
               entryDate.getFullYear() === date.getFullYear();
    });
    
    if (entryForDay && entryForDay.menstrualCycle?.flow) {
      const colorClass = flowColors[entryForDay.menstrualCycle.flow] || 'text-muted-foreground';
      return (
        <div className="relative flex items-center justify-center h-full w-full">
          {date.getDate()}
          <Droplet className={`absolute h-3 w-3 ${colorClass}`} style={{ bottom: '1px' }} />
        </div>
      );
    }
    return <>{date.getDate()}</>;
  };


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="text-primary" />
          Calendario Menstrual
        </CardTitle>
        <CardDescription>Tu ciclo menstrual a lo largo del mes.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md"
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          components={{
            Day: (props) => <DayWithFlow date={props.date} />
          }}
        />
      </CardContent>
    </Card>
  );
}
