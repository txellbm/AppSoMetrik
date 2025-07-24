
"use client";

import { useEffect, useState } from "react";
import { RecoveryData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { HeartPulse, Wind, Moon, Dumbbell, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";

export default function RecoveryPage() {
    const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const userId = "user_test_id";
    const today = format(new Date(), "yyyy-MM-dd");

    useEffect(() => {
        setIsLoading(true);
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
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, today]);

    const handleSaveRecovery = async (data: Omit<RecoveryData, 'id'>) => {
        try {
            const docRef = doc(db, "users", userId, "recovery", today);
            await setDoc(docRef, { ...data, date: today }, { merge: true });
             useToast().toast({ title: "Datos de recuperación guardados" });
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving recovery data:", error);
            useToast().toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
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

             <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Sugerencias del Día</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                        <Dumbbell className="h-6 w-6 text-orange-500 mt-1"/>
                        <div>
                            <h4 className="font-semibold">Entrenamiento</h4>
                            <p className="text-muted-foreground text-sm">
                                { recoveryScore > 60 
                                ? "Tu cuerpo está preparado. Es un buen día para un entrenamiento de alta intensidad o para intentar una nueva marca personal."
                                : "Tu recuperación es baja. Considera un entrenamiento ligero, una sesión de movilidad o un día de descanso activo."}
                            </p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <Moon className="h-6 w-6 text-blue-500 mt-1"/>
                        <div>
                            <h4 className="font-semibold">Descanso</h4>
                            <p className="text-muted-foreground text-sm">
                               { recoveryScore > 60
                                ? "Has descansado bien. Mantén una buena higiene del sueño esta noche para consolidar tu recuperación."
                                : "Prioriza el descanso hoy. Una siesta corta podría ayudarte. Asegúrate de tener una rutina relajante antes de dormir."
                               }
                            </p>
                        </div>
                    </div>
                      <div className="flex items-start gap-4">
                        <Wind className="h-6 w-6 text-green-500 mt-1"/>
                        <div>
                            <h4 className="font-semibold">Mindfulness</h4>
                            <p className="text-muted-foreground text-sm">
                                { recoveryScore > 60
                                ? "Aprovecha tu estado de alta recuperación para una sesión de meditación o mindfulness y empezar el día con claridad mental."
                                : "Una sesión de respiración o meditación guiada puede ayudar a tu sistema nervioso a recuperarse más eficazmente."
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
             </Card>
        </div>
    );
}

type RecoveryDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<RecoveryData, 'id'>) => void;
    recovery: RecoveryData | null;
}

function RecoveryDialog({ isOpen, onClose, onSave, recovery }: RecoveryDialogProps) {
    const [formData, setFormData] = useState<Partial<RecoveryData>>({});
    
    useEffect(() => {
        if(recovery) {
            setFormData(recovery);
        } else {
            setFormData({ symptoms: [] });
        }
    }, [recovery]);

    const handleChange = (field: keyof RecoveryData, value: any) => {
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
        onSave(formData as Omit<RecoveryData, 'id'>);
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
                        <Label htmlFor="morningHrv">VFC Matutina (ms)</Label>
                        <Input id="morningHrv" type="number" value={formData.morningHrv ?? ''} onChange={e => handleChange('morningHrv', e.target.value === '' ? undefined : Number(e.target.value))} />
                    </div>
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
