
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MenstrualCycleData } from "@/ai/schemas";
import { Stethoscope, Droplet, Calendar, Shield, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const symptomIcons: { [key: string]: React.ReactNode } = {
  cólicos: <Droplet className="h-4 w-4" />,
  dolor_cabeza: <Shield className="h-4 w-4" />,
  fatiga: <Zap className="h-4 w-4 opacity-50" />,
  // Añadir más mapeos de síntomas a iconos según sea necesario
};

const getSymptomIcon = (symptom: string) => {
  const normalizedSymptom = symptom.toLowerCase().replace(/ /g, '_');
  return symptomIcons[normalizedSymptom] || <Badge variant="outline" className="text-xs">{symptom}</Badge>;
};


export default function MenstrualCyclePanel({ data }: { data: MenstrualCycleData }) {
    
  if (!data || data.currentPhase === "No disponible") {
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
        <CardContent className="space-y-4">
           <div className="flex justify-around items-center p-4 bg-muted rounded-lg">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Fase Actual</p>
                    <p className="text-xl font-bold text-primary">{data.currentPhase}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Día del Ciclo</p>
                    <p className="text-xl font-bold text-primary">{data.currentDay}</p>
                </div>
           </div>
           <div>
            <h4 className="font-medium mb-2">Síntomas Registrados</h4>
            {data.symptoms && data.symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {data.symptoms.map((symptom, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1 px-3">
                            {getSymptomIcon(symptom)}
                            <span>{symptom}</span>
                        </Badge>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No hay síntomas registrados para hoy.</p>
            )}
           </div>

        </CardContent>
    </Card>
  );
}
