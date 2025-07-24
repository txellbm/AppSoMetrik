
"use client";

import { useState } from "react";
import { generateHealthSummary, HealthSummaryInput } from "@/ai/flows/ai-health-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, Clipboard, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, documentId } from "firebase/firestore";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { ActivityData, CalendarEvent, DailyMetric, SleepData } from "@/ai/schemas";

type Period = 'Diario' | 'Semanal' | 'Mensual';

export default function HealthSummaryWidget() {
    const [period, setPeriod] = useState<Period>('Diario');
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const userId = "user_test_id";

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setSummary('');

        try {
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            switch (period) {
                case 'Diario':
                    startDate = startOfDay(now);
                    endDate = endOfDay(now);
                    break;
                case 'Semanal':
                    startDate = startOfWeek(now, { weekStartsOn: 1 });
                    endDate = endOfWeek(now, { weekStartsOn: 1 });
                    break;
                case 'Mensual':
                    startDate = startOfMonth(now);
                    endDate = endOfMonth(now);
                    break;
            }
            
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            // Fetch data
            const userRef = doc(db, "users", userId);
            
            const fetchData = async (colName: string) => {
                 const q = query(collection(userRef, colName), where('date', '>=', startDateStr), where('date', '<=', endDateStr));
                 return (await getDocs(q)).docs.map(d => ({id: d.id, ...d.data()}));
            }
            
            const fetchSupplements = async () => {
                const dates = [];
                 for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
                    dates.push(format(d, 'yyyy-MM-dd'));
                 }
                if(dates.length === 0) return [];
                const q = query(collection(userRef, 'supplements'), where(documentId(), 'in', dates));
                return (await getDocs(q)).docs.map(d => ({id: d.id, ...d.data()}));
            }

            const [sleepData, exerciseData, cycleData, supplementData, activityData] = await Promise.all([
                fetchData('sleep_manual'),
                fetchData('events'), // Also includes workouts
                fetchData('dailyMetrics'),
                fetchSupplements(),
                fetchData('activity'),
            ]);
            
            // Format data for AI
            const formatForAI = (title: string, data: any[]) => {
                if(data.length === 0) return `No hay datos de ${title} para este período.`;
                return `${title}:\n${data.map(d => `- ${JSON.stringify(d)}`).join('\n')}\n`;
            }
            
            const allCalendarEvents = (exerciseData as CalendarEvent[]).sort((a,b) => a.date.localeCompare(b.date));
            const workouts = allCalendarEvents.filter(e => e.type === 'entrenamiento');

            const aiInput: HealthSummaryInput = {
                periodo: period,
                sleepData: formatForAI('Sueño', sleepData as SleepData[]),
                exerciseData: formatForAI('Entrenamientos y Actividad', [...workouts, ...(activityData as ActivityData[])]),
                heartRateData: "Faltan datos de Frecuencia Cardíaca y VFC. El usuario aún no los registra.",
                menstruationData: formatForAI('Ciclo Menstrual', cycleData as DailyMetric[]),
                supplementData: formatForAI('Suplementos', supplementData),
                foodIntakeData: "Faltan datos de Alimentación. El usuario aún no los registra.",
                calendarData: formatForAI('Eventos del Calendario', allCalendarEvents),
            };

            const result = await generateHealthSummary(aiInput);
            setSummary(result.summary);

        } catch (error) {
            console.error("Error generando el resumen:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el resumen. Inténtalo de nuevo." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (!summary) return;
        navigator.clipboard.writeText(summary).then(() => {
            toast({ title: "¡Copiado!", description: "El resumen ha sido copiado a tu portapapeles." });
        }).catch(err => {
            console.error('No se pudo copiar el texto: ', err);
            toast({ variant: "destructive", title: "Error", description: "No se pudo copiar el resumen." });
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="text-primary"/>
                    Generador de Resumen de Salud
                </CardTitle>
                <CardDescription>
                    Selecciona un período y la IA generará un resumen consolidado de tus datos de salud, listo para analizar o compartir.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        {(['Diario', 'Semanal', 'Mensual'] as Period[]).map(p => (
                            <Button key={p} variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}>
                                {p}
                            </Button>
                        ))}
                    </div>
                    <Button onClick={handleGenerateSummary} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                           <Bot className="mr-2 h-4 w-4"/>
                        )}
                        Generar Resumen
                    </Button>
                </div>

                {(isLoading || summary) && (
                     <div className="space-y-2">
                        <Textarea
                            readOnly
                            value={isLoading ? "Generando tu resumen, por favor espera..." : summary}
                            className="h-64 text-sm font-mono"
                            placeholder="Tu resumen aparecerá aquí..."
                        />
                         <Button variant="outline" onClick={handleCopyToClipboard} disabled={!summary}>
                            <Clipboard className="mr-2 h-4 w-4" />
                            Copiar
                        </Button>
                     </div>
                )}
            </CardContent>
        </Card>
    );
}
