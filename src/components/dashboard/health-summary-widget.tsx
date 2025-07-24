
"use client";

import { useState } from "react";
import { generateHealthSummary, HealthSummaryInput } from "@/ai/flows/ai-health-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, Clipboard, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, orderBy } from "firebase/firestore";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, parseISO, differenceInDays } from 'date-fns';
import { ActivityData, CalendarEvent, DailyMetric, SleepData, FoodIntakeData } from "@/ai/schemas";

type Period = 'Diario' | 'Semanal' | 'Mensual';

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "No disponible";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};


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
            
            const fetchDataInPeriod = async (colName: string) => {
                 const q = query(collection(userRef, colName), where('date', '>=', startDateStr), where('date', '<=', endDateStr));
                 return (await getDocs(q)).docs.map(d => ({id: d.id, ...d.data()}));
            }
            
            const fetchCollectionInPeriod = async (colName: string) => {
                const dates: string[] = [];
                for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
                    dates.push(format(d, 'yyyy-MM-dd'));
                }
                
                if (dates.length === 0) return [];

                const results: any[] = [];
                // Firestore 'in' query limit is 30, so batch if necessary
                for (let i = 0; i < dates.length; i += 30) {
                    const dateChunk = dates.slice(i, i + 30);
                    if (dateChunk.length > 0) {
                        const q = query(collection(userRef, colName), where('date', 'in', dateChunk));
                        const snapshot = await getDocs(q);
                        results.push(...snapshot.docs.map(d => ({id: d.id, ...d.data()})));
                    }
                }
                return results;
            }
            
            // Fetch all daily metrics to calculate cycle phase correctly
            const allDailyMetricsQuery = query(collection(userRef, "dailyMetrics"), orderBy('date', 'desc'));
            const allDailyMetricsSnap = await getDocs(allDailyMetricsQuery);
            const allDailyMetrics = allDailyMetricsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as DailyMetric[];

            const allMenstruationDays = allDailyMetrics
                .filter(m => m.estadoCiclo === 'menstruacion')
                .map(m => startOfDay(parseISO(m.date)))
                .sort((a,b) => b.getTime() - a.getTime());

            let cycleStartDay: Date | null = null;
            if (allMenstruationDays.length > 0) {
                cycleStartDay = allMenstruationDays[0];
                for (let i = 1; i < allMenstruationDays.length; i++) {
                    if (differenceInDays(allMenstruationDays[i-1], allMenstruationDays[i]) > 1) {
                        break;
                    }
                    cycleStartDay = allMenstruationDays[i];
                }
            }
            
            const dayOfCycle = cycleStartDay ? differenceInDays(startOfDay(now), cycleStartDay) + 1 : null;
            const currentPhase = getCyclePhase(dayOfCycle);

            const [sleepData, eventData, supplementData, activityData, foodData] = await Promise.all([
                fetchDataInPeriod('sleep_manual'),
                fetchDataInPeriod('events'), // Also includes workouts
                fetchCollectionInPeriod('supplements'),
                fetchDataInPeriod('activity'),
                fetchCollectionInPeriod('food_intake'),
            ]);

            const cycleDataInPeriod = allDailyMetrics.filter(m => {
                try {
                    const metricDate = parseISO(m.date);
                    return metricDate >= startDate && metricDate <= endDate;
                } catch {
                    return false;
                }
            });
            
            // Format data for AI
            const formatForAI = (title: string, data: any[]) => {
                if(data.length === 0) return `No hay datos de ${title} para este período.`;
                return `${title}:\n${data.map(d => `- ${JSON.stringify(d)}`).join('\n')}\n`;
            }

            const allSleepData = sleepData as SleepData[];
            const allActivityData = activityData as ActivityData[];

            let heartRateSummaryLines: string[] = [];
            allSleepData.forEach(s => {
                let sleepSummary = `Sueño (${s.date}):`;
                const parts = [];
                if (s.avgHeartRate) parts.push(`FC media ${s.avgHeartRate} lpm`);
                if (s.vfcAlDespertar) parts.push(`VFC al despertar ${s.vfcAlDespertar} ms`);
                if (s.respiratoryRate) parts.push(`Frec. Resp. ${s.respiratoryRate} rpm`);
                if (parts.length > 0) {
                    heartRateSummaryLines.push(`${sleepSummary} ${parts.join(', ')}.`);
                }
            });

            allActivityData.forEach(a => {
                let activitySummary = `Actividad (${a.date}):`;
                const parts = [];
                if (a.avgDayHeartRate) parts.push(`FC media ${a.avgDayHeartRate} lpm`);
                if (a.restingHeartRate) parts.push(`FC en reposo ${a.restingHeartRate} lpm`);
                if (parts.length > 0) {
                    heartRateSummaryLines.push(`${activitySummary} ${parts.join(', ')}.`);
                }
            });

            const heartRateSummary = heartRateSummaryLines.length > 0 ? heartRateSummaryLines.join('\n') : "No hay datos de frecuencia cardíaca o VFC registrados.";
            
            const menstruationSummary = `Fase actual: ${currentPhase}, Día del ciclo: ${dayOfCycle || 'N/A'}. Síntomas y notas del período: \n${formatForAI('Datos del ciclo', cycleDataInPeriod as DailyMetric[])}`;

            const allCalendarEvents = (eventData as CalendarEvent[]).sort((a,b) => a.date.localeCompare(b.date));
            const workouts = allCalendarEvents.filter(e => e.type === 'entrenamiento');

            const aiInput: HealthSummaryInput = {
                periodo: period,
                sleepData: formatForAI('Sueño', allSleepData),
                exerciseData: formatForAI('Entrenamientos', workouts),
                activityData: formatForAI('Actividad Diaria', allActivityData),
                heartRateData: heartRateSummary,
                menstruationData: menstruationSummary,
                supplementData: formatForAI('Suplementos', supplementData),
                foodIntakeData: formatForAI('Alimentación e Hidratación', foodData as FoodIntakeData[]),
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
