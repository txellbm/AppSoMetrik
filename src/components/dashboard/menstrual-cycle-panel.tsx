
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MenstrualCycleData } from "@/ai/schemas";
import { Stethoscope, Droplet, CalendarDays, Shield, Zap, Wind } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

// Enhanced symptom to icon mapping
const symptomIcons: { [key: string]: React.ReactNode } = {
  cólicos: <Droplet className="h-4 w-4 text-red-500" />,
  dolor_de_cabeza: <Shield className="h-4 w-4 text-purple-500" />,
  fatiga: <Zap className="h-4 w-4 text-yellow-500 opacity-60" />,
  hinchazón: <Wind className="h-4 w-4 text-blue-400" />,
  // Add more symptom mappings as needed
};

// Function to get an icon for a symptom, with a fallback
const getSymptomIcon = (symptom: string) => {
  const normalizedSymptom = symptom.toLowerCase().replace(/ /g, '_');
  return symptomIcons[normalizedSymptom] || null; // Return null if no specific icon
};


export default function MenstrualCyclePanel({ data }: { data: MenstrualCycleData | null }) {
    
  if (!data || data.currentPhase === "No disponible" || data.currentDay === 0) {
    return (
        <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="text-primary" />
                    Ciclo Menstrual
                </CardTitle>
                <CardDescription>No hay datos disponibles para el ciclo menstrual.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-8">
                    Sube un archivo de Clue u otra app para ver tu información.
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Stethoscope className="text-primary" />
                Ciclo Menstrual
            </CardTitle>
            <CardDescription>Tu fase actual y síntomas registrados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex justify-around items-center p-4 bg-muted rounded-lg text-center">
                <div>
                    <p className="text-sm text-muted-foreground">Fase Actual</p>
                    <p className="text-xl font-bold text-primary">{data.currentPhase}</p>
                </div>
                <div className="border-l h-10"></div>
                <div>
                    <p className="text-sm text-muted-foreground">Día del Ciclo</p>
                    <p className="text-xl font-bold text-primary">{data.currentDay}</p>
                </div>
           </div>
           <div>
            <h4 className="font-medium mb-3 text-sm">Síntomas Registrados Hoy</h4>
            {data.symptoms && data.symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {data.symptoms.map((symptom, index) => {
                        const icon = getSymptomIcon(symptom);
                        return (
                            <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                                {icon}
                                <span className="font-normal">{symptom}</span>
                            </Badge>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic">No hay síntomas registrados para hoy.</p>
            )}
           </div>
        </CardContent>
    </Card>
  );
}

    