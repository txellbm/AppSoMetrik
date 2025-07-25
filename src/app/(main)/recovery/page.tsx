
"use client";

import { useEffect, useState, useMemo } from "react";
import { RecoveryData, SleepData, DailyMetric, CalendarEvent, MindfulnessData, UserGoalsData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc, getDocs, orderBy, limit, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { HeartPulse, Wind, Moon, Dumbbell, Plus, Edit, Brain, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { format, startOfDay, differenceInDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { generateRecoverySuggestions } from "@/ai/flows/recovery-suggestions";

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};


export default function RecoveryPage() {
    const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const userId = "user_test_id";
    const today = format(new Date(), "yyyy-MM-dd");
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        if (!userId || !today) return;
        try {
            const docRef = doc(db, "users", userId, "recovery", today);
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    setRecoveryData({ id: doc.id, ...doc.data() } as RecoveryData);
                } else {
                    setRecoveryData(null);
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error loading recovery data:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                }
                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up Firestore listener for recovery:", error);
            setIsLoading(false);
        }
    }, [userId, today]);

    const handleSaveRecovery = async (data: Omit<RecoveryData, 'id' | 'date'>) => {
        if (!userId) return;
        try {
            const userRef = doc(db, "users", userId);
            const qSleep = query(collection(userRef, "sleep_manual"), where("date", "==", today));
            const sleepSnap = await getDocs(qSleep);
            
            let morningHrv: number | undefined = undefined;

            if (!sleepSnap.empty) {
                 const sleepSessions = sleepSnap.docs
                    .map(doc => doc.data() as SleepData)
                    .filter(s => s.vfcAlDespertar !== undefined)
                    .sort((a, b) => (b.wakeUpTime || "00:00").localeCompare(a.wakeUpTime || "00:00"));
                
                if (sleepSessions.length > 0) {
                     morningHrv = sleepSessions[0].vfcAlDespertar;
                }
            }

            const docRef = doc(db, "users", userId, "recovery", today);
            
            const dataToSave: Partial<RecoveryData> = {
                ...data,
                date: today
            };

            if (morningHrv !== undefined) {
                dataToSave.morningHrv = morningHrv;
            }

            await setDoc(docRef, dataToSave, { merge: true });
            toast({ title: "Datos de recuperación guardados" });
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving recovery data:", error);
            if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudieron guardar los datos. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
            }
        }
    };
    
    const recoveryScore = recoveryData?.perceivedRecovery ? recoveryData.perceivedRecovery * 10 : 75;

    const getRecoveryQualifiers = (score: number) => {
        if (score > 80) return { text: "Excelente", color: "text-green-500", bgColor: "bg-green-500" };
        if (score > 60) return { text: "Buena", color: "text-blue-500", bgColor: "bg-blue-500" };
        if (score > 40) return { text: "Regular", color: "text-yellow-500", bgColor: "bg-yellow-500" };
        return { text: "Baja", color: "text-red-500", bgColor: "bg-red-500" };
    }

    const { text, color, bgColor } = getRecoveryQualifiers(recoveryScore);

    return (
        <div className="flex flex-col gap-6 items-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="text-primary"/>
                        Puntuación de Recuperación
                    </CardTitle>
                    <CardDescription>
                        Tu nivel de preparación para afrontar el día, basado en tus métricas y percepciones.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="relative w-48 h-48">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                                className="text-muted/50"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                strokeWidth="3"
                            />
                            <path
                                className={color}
                                strokeDasharray={`${recoveryScore}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                strokeWidth="3"
                                strokeLinecap="round"
                                transform="rotate(90 18 18)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-bold">{recoveryScore}</span>
                            <span className="text-sm font-medium text-muted-foreground">%</span>
                        </div>
                    </div>
                     <div className={`text-lg font-semibold px-4 py-1 rounded-full ${bgColor} bg-opacity-10 ${color}`}>
                        Recuperación {text}
                    </div>
                    {recoveryData ? (
                         <div className="text-center text-sm mt-4 space-y-2">
                             <p><strong>VFC Matutina:</strong> {recoveryData.morningHrv ? `${recoveryData.morningHrv} ms` : 'No registrado'}</p>
                            {recoveryData.symptoms && recoveryData.symptoms.length > 0 && <p><strong>Síntomas:</strong> {recoveryData.symptoms.join(', ')}</p>}
                             {recoveryData.notes && <p className="text-muted-foreground italic">"{recoveryData.notes}"</p>}
                         </div>
                    ) : (
                         <p className="text-center text-muted-foreground max-w-md mx-auto mt-4">
                            No has registrado tus datos de recuperación de hoy.
                        </p>
                    )}
                </CardContent>
                <CardFooter className="justify-center">
                     <Button onClick={() => setIsDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4"/>
                        {recoveryData ? 'Editar Recuperación de Hoy' : 'Registrar Recuperación de Hoy'}
                    </Button>
                </CardFooter>
            </Card>
            
            <RecoveryDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveRecovery}
                recovery={recoveryData}
            />

            <SuggestionsCard recoveryScore={recoveryScore} userId={userId} today={today} />
        </div>
    );
}

type RecoveryDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<RecoveryData, 'id' | 'date' | 'morningHrv'>) => void;
    recovery: RecoveryData | null;
}

function RecoveryDialog({ isOpen, onClose, onSave, recovery }: RecoveryDialogProps) {
    const [formData, setFormData] = useState<Partial<Omit<RecoveryData, 'id' | 'date' | 'morningHrv'>>>({});
    
    useEffect(() => {
        if(isOpen) {
            if(recovery) {
                setFormData({
                    perceivedRecovery: recovery.perceivedRecovery,
                    symptoms: recovery.symptoms || [],
                    notes: recovery.notes
                });
            } else {
                 setFormData({
                    perceivedRecovery: 7.5,
                    symptoms: []
                });
            }
        }
    }, [isOpen, recovery]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSymptomToggle = (symptom: string) => {
        const currentSymptoms = formData.symptoms || [];
        const newSymptoms = currentSymptoms.includes(symptom)
            ? currentSymptoms.filter(s => s !== symptom)
            : [...currentSymptoms, symptom];
        handleChange('symptoms', newSymptoms);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Omit<RecoveryData, 'id' | 'date' | 'morningHrv'>);
    }
    
    if(!isOpen) return null;

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registro de Recuperación</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                     <div>
                        <Label htmlFor="perceivedRecovery">Recuperación Percibida: {formData.perceivedRecovery || 7.5}/10</Label>
                        <Slider
                            id="perceivedRecovery"
                            min={1} max={10} step={0.5}
                            defaultValue={[formData.perceivedRecovery || 7.5]}
                            onValueChange={(value) => handleChange('perceivedRecovery', value[0])}
                        />
                    </div>
                    <div>
                        <Label>Síntomas</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                           {['Fatiga', 'Tensión muscular', 'Dolor articular', 'Estrés mental'].map(symptom => (
                               <Button key={symptom} type="button" variant={(formData.symptoms || []).includes(symptom) ? 'default' : 'outline'} onClick={() => handleSymptomToggle(symptom)}>
                                   {symptom}
                                </Button>
                           ))}
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="notes">Observaciones</Label>
                        <Textarea id="notes" placeholder="Ej: Me siento con energía a pesar de la tensión en las piernas..." value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

type Suggestion = {
    category: "Entrenamiento" | "Descanso" | "Mindfulness" | "Nutrición";
    suggestion: string;
};

const iconMap: { [key in Suggestion['category']]: React.ReactNode } = {
    Entrenamiento: <Dumbbell className="h-6 w-6 text-orange-500 mt-1"/>,
    Descanso: <Moon className="h-6 w-6 text-blue-500 mt-1"/>,
    Mindfulness: <Brain className="h-6 w-6 text-purple-500 mt-1"/>,
    Nutrición: <Utensils className="h-6 w-6 text-green-500 mt-1"/>
};

function SuggestionsCard({ recoveryScore, userId, today }: { recoveryScore: number, userId: string, today: string }) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndGenerate = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const userRef = doc(db, "users", userId);

                const sleepQuery = query(collection(userRef, "sleep_manual"), where("date", "==", today));
                const dailyMetricsQuery = query(collection(userRef, "dailyMetrics"), orderBy("date", "desc"));
                const eventsQuery = query(collection(userRef, "events"), where("date", "==", today));
                const mindfulnessQuery = query(collection(userRef, "mindfulness"), where("date", "==", today));
                const goalsDocRef = doc(userRef, "goals", "main");
                
                const [sleepSnap, dailyMetricsSnap, eventsSnap, mindfulnessSnap, goalsSnap] = await Promise.all([
                    getDocs(sleepQuery),
                    getDocs(dailyMetricsQuery),
                    getDocs(eventsQuery),
                    getDocs(mindfulnessQuery),
                    getDoc(goalsDocRef),
                ]);

                const lastSleep = !sleepSnap.empty ? sleepSnap.docs[0].data() as SleepData : null;
                const dailyMetrics = dailyMetricsSnap.docs.map(d => ({...d.data(), id: d.id})) as DailyMetric[];
                const todayEvents = eventsSnap.docs.map(d => d.data()) as CalendarEvent[];
                const todayMindfulness = !mindfulnessSnap.empty ? mindfulnessSnap.docs[0].data() as MindfulnessData : null;
                const userGoals = goalsSnap.exists() ? goalsSnap.data() as UserGoalsData : null;

                const sortedMenstruationDays = dailyMetrics
                    .filter(m => m.estadoCiclo === 'menstruacion')
                    .map(m => startOfDay(parseISO(m.date)))
                    .sort((a, b) => b.getTime() - a.getTime());

                let cycleStartDay = null;
                if (sortedMenstruationDays.length > 0) {
                    cycleStartDay = sortedMenstruationDays[0];
                    for (let i = 1; i < sortedMenstruationDays.length; i++) {
                        if (differenceInDays(sortedMenstruationDays[i - 1], sortedMenstruationDays[i]) > 1) break;
                        cycleStartDay = sortedMenstruationDays[i];
                    }
                }
                const dayOfCycle = cycleStartDay ? differenceInDays(startOfDay(new Date()), cycleStartDay) + 1 : null;
                const currentPhase = getCyclePhase(dayOfCycle);

                const input = {
                    recoveryScore,
                    currentTime: format(new Date(), "HH:mm"),
                    lastSleep: lastSleep ? `Duración: ${lastSleep.sleepTime} min, Eficiencia: ${lastSleep.efficiency}%, VFC al despertar: ${lastSleep.vfcAlDespertar} ms` : 'No hay datos de sueño.',
                    cycleStatus: `Fase: ${currentPhase}, Día: ${dayOfCycle || 'N/A'}.`,
                    todayEvents: todayEvents.length > 0 ? todayEvents.map(e => `${e.description} de ${e.startTime} a ${e.endTime}`).join('; ') : 'No hay eventos programados.',
                    stressAndMood: todayMindfulness ? `Estrés: ${todayMindfulness.stressLevel}/10, Ánimo: ${todayMindfulness.mood}.` : 'No hay datos de ánimo/estrés.',
                    userGoals: userGoals ? `Objetivos: ${(userGoals.primaryGoals || []).join(', ')}. Detalles: ${userGoals.specifics}.` : 'No hay objetivos definidos.'
                };

                const result = await generateRecoverySuggestions(input);
                setSuggestions(result.suggestions);

            } catch (err) {
                console.error("Error generating suggestions:", err);
                if ((err as any).code === 'unavailable') {
                    toast({ variant: "destructive", title: "Sin conexión", description: "No se pudieron generar las sugerencias. Revisa tu conexión a internet." });
                } else {
                    toast({ variant: "destructive", title: "Error", description: "No se pudieron generar las sugerencias." });
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndGenerate();
    }, [recoveryScore, userId, today, toast]);

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Sugerencias del Día</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="w-full space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))
                ) : (
                    suggestions.map((item, index) => (
                        <div key={index} className="flex items-start gap-4">
                            {iconMap[item.category] || <Dumbbell className="h-6 w-6 text-orange-500 mt-1"/>}
                            <div>
                                <h4 className="font-semibold">{item.category}</h4>
                                <p className="text-muted-foreground text-sm">{item.suggestion}</p>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
