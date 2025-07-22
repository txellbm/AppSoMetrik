
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MenstrualCycleData } from "@/ai/schemas";
import { Calendar } from "@/components/ui/calendar";
import { Stethoscope, Droplet } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { parseISO } from "date-fns";

const flowColors: { [key: string]: string } = {
  spotting: 'text-red-300',
  light: 'text-red-400',
  medium: 'text-red-500',
  heavy: 'text-red-600',
};

// Helper function to treat date string as local time, not UTC
const parseDateAsLocal = (dateStr: string): Date => {
  return new Date(`${dateStr}T00:00:00`);
};


export default function MenstrualCalendar({ data }: { data: MenstrualCycleData[] }) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  if (!data || data.length === 0) {
    return (
      <Card className="md:col-span-2 lg:col-span-2">
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
    // Dates from firestore are strings, so we need to parse them locally.
    const date = parseDateAsLocal(entry.date);
    if (entry.flow) {
      acc[entry.flow] = [...(acc[entry.flow] || []), date];
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
        const entryDate = parseDateAsLocal(d.date);
        return entryDate.getDate() === date.getDate() &&
               entryDate.getMonth() === date.getMonth() &&
               entryDate.getFullYear() === date.getFullYear();
    });
    
    if (entryForDay && entryForDay.flow) {
      const colorClass = flowColors[entryForDay.flow] || 'text-muted-foreground';
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
    <Card className="md:col-span-2 lg:col-span-2">
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
