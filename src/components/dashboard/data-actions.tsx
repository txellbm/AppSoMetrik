"use client";

import { useState } from "react";
import { generateHealthSummary } from "@/ai/flows/ai-health-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Apple, Loader2 } from "lucide-react";

export default function DataActions() {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummary("");
    try {
      const result = await generateHealthSummary({
        sleepData: "El usuario promedió 7.2 horas de sueño esta semana, con algunas inconsistencias el viernes y sábado.",
        exerciseData: "El usuario completó 3 sesiones de Pilates y 2 entrenamientos de cardio.",
        heartRateData: "La frecuencia cardíaca en reposo es estable a 62 lpm.",
        menstruationData: "Actualmente en la fase folicular.",
        supplementData: "Ingesta diaria de Vitamina D y Magnesio.",
        foodIntakeData: "Dieta generalmente equilibrada, con mayor ingesta de carbohidratos en los días de entrenamiento.",
        calendarData: "Semana pesada de trabajo con dos eventos sociales por la noche.",
      });
      setSummary(result.summary);
    } catch (error) {
      console.error("No se pudo generar el resumen:", error);
      setSummary("Lo sentimos, hubo un error al generar tu resumen de salud.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Datos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border-2 border-dashed rounded-lg text-center space-y-2">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arrastra y suelta archivos CSV/PDF o</p>
            <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" /> Subir Archivos</Button>
        </div>
        <Button variant="secondary" className="w-full" disabled>
          <Apple className="mr-2 h-4 w-4" /> Conectar a Apple Health
        </Button>
        <div className="space-y-2">
          <Button onClick={handleGenerateSummary} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Resumen de Salud
          </Button>
          {summary && (
            <Textarea
              readOnly
              value={summary}
              className="mt-2 h-32 text-sm"
              placeholder="Tu resumen de salud aparecerá aquí..."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
