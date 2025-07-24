
"use client";

import { useState } from "react";
import { generateHealthSummary, HealthSummaryInput } from "@/ai/flows/ai-health-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, Clipboard, Loader2, FileDown } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, orderBy, getDoc } from "firebase/firestore";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ActivityData, CalendarEvent, DailyMetric, SleepData, FoodIntakeData } from "@/ai/schemas";

type Period = 'Diario' | 'Semanal' | 'Mensual';

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "No disponible";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};

const formatMinutesToHHMM = (minutes: number | undefined | null) => {
    if (minutes === undefined || minutes === null) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};


export default function HealthSummaryWidget() {
    const [period, setPeriod] = useState<Period>('Semanal');
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const userId = "user_test_id";
    
    const fetchAllDataForPeriod = async (period: Period) => {
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

        const userRef = doc(db, "users", userId);

        const fetchDataInPeriodByDate = async (colName: string) => {
             const q = query(collection(userRef, colName), where('date', '>=', startDateStr), where('date', '<=', endDateStr));
             const snapshot = await getDocs(q);
             return snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        }
        
        const fetchSupplementsInPeriod = async () => {
             const dates: string[] = [];
            for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
                dates.push(format(d, 'yyyy-MM-dd'));
            }
            const results: any[] = [];
            for (const date of dates) {
                try {
                    const docRef = doc(userRef, 'supplements', date);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        results.push({ id: docSnap.id, ...docSnap.data() });
                    }
                } catch (e) {
                    console.error(`Error fetching doc supplements/${date}`, e);
                }
            }
            return results;
        }

        const [
            allDailyMetrics,
            sleepData,
            eventData,
            activityData,
            supplementData,
            foodData
        ] = await Promise.all([
            getDocs(query(collection(userRef, "dailyMetrics"), orderBy('date', 'desc'))).then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id }) as DailyMetric[])),
            fetchDataInPeriodByDate('sleep_manual'),
            fetchDataInPeriodByDate('events'),
            fetchDataInPeriodByDate('activity'),
            fetchSupplementsInPeriod(),
            fetchDataInPeriodByDate('food_intake'),
        ]);

        return { allDailyMetrics, sleepData, eventData, activityData, supplementData, foodData, startDate, endDate, now };
    };

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setSummary('');

        try {
            const { allDailyMetrics, sleepData, eventData, activityData, supplementData, foodData, startDate, endDate, now } = await fetchAllDataForPeriod(period);
            
            const formatForAI = (title: string, data: any[]) => {
                if(data.length === 0) return `No hay datos de ${title} para este período.`;
                return `${title}:\n${data.map(d => `- ${JSON.stringify(d)}`).join('\n')}\n`;
            }

            // 1. Cycle Data
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
            const cycleDataInPeriod = allDailyMetrics.filter(m => {
                 try {
                    const metricDate = parseISO(m.date);
                    return metricDate >= startDate && metricDate <= endDate;
                } catch { return false; }
            });
            const menstruationSummary = `Fase actual: ${currentPhase}, Día del ciclo: ${dayOfCycle || 'N/A'}. Historial del período: \n${formatForAI('Datos del ciclo', cycleDataInPeriod)}`;
            
            // 2. Heart Rate and Vitals Data
            let heartRateSummaryLines: string[] = [];
            (sleepData as SleepData[]).forEach(s => {
                let sleepSummary = `Del sueño (${s.date}):`;
                const parts = [];
                if (s.avgHeartRate) parts.push(`FC media ${s.avgHeartRate} lpm`);
                if (s.vfcAlDespertar) parts.push(`VFC al despertar ${s.vfcAlDespertar} ms`);
                if (s.respiratoryRate) parts.push(`Frec. Resp. ${s.respiratoryRate} rpm`);
                if (parts.length > 0) heartRateSummaryLines.push(`${sleepSummary} ${parts.join(', ')}.`);
            });
            (activityData as ActivityData[]).forEach(a => {
                let activitySummary = `De la actividad (${a.date}):`;
                const parts = [];
                if (a.avgDayHeartRate) parts.push(`FC media diaria ${a.avgDayHeartRate} lpm`);
                if (a.restingHeartRate) parts.push(`FC en reposo ${a.restingHeartRate} lpm`);
                if (parts.length > 0) heartRateSummaryLines.push(`${activitySummary} ${parts.join(', ')}.`);
            });
            const heartRateSummary = heartRateSummaryLines.length > 0 ? heartRateSummaryLines.join('\n') : "No hay datos de frecuencia cardíaca o VFC registrados.";

            // 3. Calendar and Workout Data
            const allCalendarEvents = (eventData as CalendarEvent[]).sort((a,b) => a.date.localeCompare(b.date));
            const workouts = allCalendarEvents.filter(e => e.type === 'entrenamiento');
            const otherEvents = allCalendarEvents.filter(e => e.type !== 'entrenamiento');
           
            const aiInput: HealthSummaryInput = {
                periodo: period,
                sleepData: formatForAI('Sueño', sleepData as SleepData[]),
                exerciseData: formatForAI('Entrenamientos', workouts),
                activityData: formatForAI('Actividad Diaria', activityData as ActivityData[]),
                heartRateData: heartRateSummary,
                menstruationData: menstruationSummary,
                supplementData: formatForAI('Suplementos', supplementData),
                foodIntakeData: formatForAI('Alimentación e Hidratación', foodData as FoodIntakeData[]),
                calendarData: formatForAI('Otros Eventos del Calendario', otherEvents),
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
    
    const handleExportAllData = async () => {
        setIsLoading(true);
        setSummary('');

        try {
            const { sleepData, eventData, activityData, allDailyMetrics, supplementData, foodData, startDate, endDate, now } = await fetchAllDataForPeriod(period);
            
            let report = `INFORME DE DATOS - Período: ${format(startDate, 'P', {locale: es})} - ${format(endDate, 'P', {locale: es})}\n`;
            report += "========================================\n\n";

            // Sleep Data
            report += "### Sueño\n";
            if (sleepData.length > 0) {
                (sleepData as SleepData[]).forEach(s => {
                    report += `- Fecha: ${s.date}, Tipo: ${s.type}, Horario: ${s.bedtime}-${s.wakeUpTime}\n`;
                    report += `  - Métricas: Duración ${formatMinutesToHHMM(s.sleepTime)}, Eficiencia ${s.efficiency || '-'}%, conciliación ${s.timeToFallAsleep || '-'}min, despierta ${formatMinutesToHHMM(s.timeAwake)}\n`;
                    report += `  - Fases: Profundo ${formatMinutesToHHMM(s.phases?.deep)}, Ligero ${formatMinutesToHHMM(s.phases?.light)}, REM ${formatMinutesToHHMM(s.phases?.rem)}\n`;
                    report += `  - Fisio: FC media ${s.avgHeartRate || '-'} lpm, FC al despertar ${s.lpmAlDespertar || '-'} lpm, VFC dormir ${s.vfcAlDormir || '-'}ms, VFC despertar ${s.vfcAlDespertar || '-'}ms, Frec. Resp ${s.respiratoryRate || '-'}rpm\n`;
                });
            } else {
                report += "No hay datos de sueño registrados para este período.\n";
            }
            report += "\n";

            // Workouts Data
            const workouts = (eventData as CalendarEvent[]).filter(e => e.type === 'entrenamiento');
            report += "### Entrenamientos\n";
            if (workouts.length > 0) {
                workouts.forEach(w => {
                    const details = w.workoutDetails;
                    report += `- Fecha: ${w.date}, Desc: ${w.description}, Plan: ${w.startTime}-${w.endTime}\n`;
                    if (details) {
                        report += `  - Real: ${details.realStartTime || '-'}-${details.realEndTime || '-'}, Duración: ${details.realDuration || '-'}\n`;
                        report += `  - Fisio: Cal Activas ${details.activeCalories || '-'}kcal, Cal Totales ${details.totalCalories || '-'}kcal, FC media ${details.avgHeartRate || '-'} (${details.minHeartRate || '·'}/${details.maxHeartRate || '·'}), Pasos ${details.steps || '-'}, Distancia ${(details.distance || 0 / 1000).toFixed(2)}km\n`;
                        if (details.zones && Object.values(details.zones).some(z => z)) {
                            const zonesStr = Object.entries(details.zones).filter(([, v]) => v).map(([z, v]) => `${z}: ${v}m`).join(', ');
                            report += `  - Zonas FC: ${zonesStr}\n`;
                        }
                        if (details.notes) report += `  - Notas: "${details.notes}"\n`;
                        if (details.videoUrl) report += `  - Video: ${details.videoUrl}\n`;
                    }
                });
            } else {
                report += "No hay entrenamientos registrados para este período.\n";
            }
            report += "\n";
            
            // Activity Data
            report += "### Actividad Diaria\n";
            if (activityData.length > 0) {
                (activityData as ActivityData[]).forEach(a => {
                    report += `- Fecha: ${a.date}, Pasos: ${a.steps}, Calorías: ${a.totalCalories}, Distancia: ${a.distance || '-'}km, Tiempo Activo: ${a.activeTime || '-'}min, Horas de pie: ${a.standHours || '-'}h\n`;
                    report += `  - Fisio: FC media diaria ${a.avgDayHeartRate || '-'} lpm, FC en reposo ${a.restingHeartRate || '-'} lpm\n`;
                });
            } else {
                report += "No hay datos de actividad diaria para este período.\n";
            }
            report += "\n";

            // Cycle Data
            const allMenstruationDays = allDailyMetrics.filter(m => m.estadoCiclo === 'menstruacion').map(m => startOfDay(parseISO(m.date))).sort((a, b) => b.getTime() - a.getTime());
            let cycleStartDay: Date | null = null;
            if (allMenstruationDays.length > 0) {
                cycleStartDay = allMenstruationDays[0];
                for (let i = 1; i < allMenstruationDays.length; i++) {
                    if (differenceInDays(allMenstruationDays[i - 1], allMenstruationDays[i]) > 1) break;
                    cycleStartDay = allMenstruationDays[i];
                }
            }
            const cycleDataInPeriod = allDailyMetrics.filter(m => {
                 try {
                    const metricDate = parseISO(m.date);
                    return metricDate >= startDate && metricDate <= endDate;
                } catch { return false; }
            });

            report += "### Ciclo Menstrual\n";
            if (cycleDataInPeriod.length > 0) {
                cycleDataInPeriod.forEach(m => {
                    const dayOfCycle = cycleStartDay ? differenceInDays(parseISO(m.date), cycleStartDay) + 1 : null;
                    const phase = getCyclePhase(dayOfCycle);
                    report += `- Fecha: ${m.date}, Día del ciclo: ${dayOfCycle || '-'}, Fase: ${phase}, Sangrado: ${m.estadoCiclo === 'menstruacion' ? 'Sí' : 'No'}\n`;
                    if ((m.sintomas || []).length > 0) report += `  - Síntomas: ${(m.sintomas || []).join(', ')}\n`;
                    if (m.notas) report += `  - Notas: ${m.notas}\n`;
                });
            } else {
                report += "No hay datos del ciclo registrados para este período.\n";
            }
            report += "\n";

            // Supplements Data
            report += "### Suplementos\n";
            if (supplementData.length > 0) {
                 supplementData.forEach(day => {
                    report += `- ${day.id}:\n`;
                    Object.entries(day).forEach(([key, value]) => {
                        if (key !== 'id' && Array.isArray(value) && value.length > 0) {
                            report += `  - ${key}: ${value.map(sup => `${sup.name} (${sup.dose})`).join(', ')}\n`;
                        }
                    });
                });
            } else {
                report += "No hay suplementos registrados para este período.\n";
            }
            report += "\n";

            // Diet Data
            report += "### Dieta y Nutrición\n";
            if (foodData.length > 0) {
                (foodData as FoodIntakeData[]).forEach(f => {
                    report += `- Fecha: ${f.date}\n`;
                    report += `  - Hidratación: Agua ${f.waterIntake || 0}ml, Otras Bebidas: ${f.otherDrinks || 'ninguna'}\n`;
                    report += `  - Comidas: Desayuno: ${f.breakfast || 'ninguno'}; Comida: ${f.lunch || 'ninguna'}; Cena: ${f.dinner || 'ninguna'}; Snacks: ${f.snacks || 'ninguno'}\n`;
                    if (f.notes) report += `  - Notas: ${f.notes}\n`;
                });
            } else {
                report += "No hay datos de dieta registrados para este período.\n";
            }

            setSummary(report);
        } catch (error) {
            console.error("Error exportando los datos:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron exportar los datos. Inténtalo de nuevo." });
        } finally {
            setIsLoading(false);
        }
    };


    const handleCopyToClipboard = () => {
        if (!summary) return;
        navigator.clipboard.writeText(summary).then(() => {
            toast({ title: "¡Copiado!", description: "El informe ha sido copiado a tu portapapeles." });
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
                    Análisis y Exportación
                </CardTitle>
                <CardDescription>
                    Genera un resumen de salud con IA o exporta todos tus datos brutos para analizarlos donde quieras.
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
                    <div className="flex items-center gap-2">
                        <Button onClick={handleExportAllData} disabled={isLoading} variant="outline">
                            {isLoading && !summary ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                               <FileDown className="mr-2 h-4 w-4"/>
                            )}
                            Exportar Datos
                        </Button>
                        <Button onClick={handleGenerateSummary} disabled={isLoading}>
                            {isLoading && summary ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                               <Bot className="mr-2 h-4 w-4"/>
                            )}
                            Generar Resumen IA
                        </Button>
                    </div>
                </div>

                {(isLoading || summary) && (
                     <div className="space-y-2">
                        <Textarea
                            readOnly
                            value={isLoading ? "Procesando tus datos, por favor espera..." : summary}
                            className="h-64 text-sm font-mono"
                            placeholder="Tu resumen o exportación de datos aparecerá aquí..."
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
