
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserGoalsData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Target, Save, FileText, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const goalOptions = [
    "Mejorar la composición corporal (perder grasa / ganar músculo)",
    "Mejorar la energía y el bienestar general",
    "Mejorar el rendimiento deportivo",
    "Optimizar el sueño y la recuperación",
    "Gestionar el estrés y la salud mental",
    "Otro (especificar en notas)",
];

export default function GoalsPage() {
    const [goals, setGoals] = useState<Partial<UserGoalsData>>({ primaryGoals: [] });
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";
    
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');

    useEffect(() => {
        setIsLoading(true);
        if (!userId) {
            setIsLoading(false);
            return;
        }

        try {
            const docRef = doc(db, "users", userId, "goals", "main");

            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data() as UserGoalsData;
                    setGoals({
                        primaryGoals: data.primaryGoals || [],
                        specifics: data.specifics || ''
                    });
                } else {
                    setGoals({ primaryGoals: [] });
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error loading goals data:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                } else {
                    toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los objetivos." });
                }
                setIsLoading(false);
                setGoals({ primaryGoals: [] });
            });

            return () => unsubscribe();
        } catch (error) {
             console.error("Error setting up Firestore listener for goals:", error);
             toast({ variant: "destructive", title: "Error", description: "No se pudo configurar la carga de objetivos." });
             setIsLoading(false);
        }
    }, [userId, toast]);

    const handleSave = async () => {
        if (!userId) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no identificado." });
            return;
        }
        try {
            const docRef = doc(db, "users", userId, "goals", "main");
            await setDoc(docRef, goals, { merge: true });
            toast({ title: "¡Objetivos guardados!", description: "Tus metas han sido actualizadas." });
        } catch (error) {
            console.error("Error saving goals:", error);
            if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudieron guardar tus objetivos. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar tus objetivos." });
            }
        }
    };

    const handleGoalToggle = (goal: string) => {
        setGoals(prev => {
            const currentGoals = prev.primaryGoals || [];
            const newGoals = currentGoals.includes(goal)
                ? currentGoals.filter(g => g !== goal)
                : [...currentGoals, goal];
            return { ...prev, primaryGoals: newGoals };
        });
    };

    const handleChange = (field: keyof UserGoalsData, value: string) => {
        setGoals(prev => ({ ...prev, [field]: value }));
    };

    const generateReport = () => {
        let report = "Informe de Objetivos Personales\n";
        report += "==============================\n\n";

        if (!goals.primaryGoals || goals.primaryGoals.length === 0) {
            report += "No has definido ningún objetivo principal todavía.";
        } else {
            report += `**Objetivos Principales:**\n${goals.primaryGoals.map(g => `- ${g}`).join('\n')}\n\n`;
            report += `**Detalles y Notas Específicas:**\n${goals.specifics || 'No hay notas adicionales.'}\n`;
        }

        setReportContent(report);
        setIsReportOpen(true);
    };

    const handleCopyToClipboard = () => {
        if (!reportContent) return;
        navigator.clipboard.writeText(reportContent).then(() => {
            toast({ title: "¡Copiado!", description: "El informe ha sido copiado a tu portapapeles." });
        }, (err) => {
            console.error('Could not copy text: ', err);
            toast({ variant: "destructive", title: "Error", description: "No se pudo copiar el informe." });
        });
    };

    return (
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="text-primary"/>
                        Mis Objetivos de Bienestar
                    </CardTitle>
                    <CardDescription>
                        Define tu "norte". Esto ayudará a la IA a darte consejos más alineados con lo que quieres conseguir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <Label className="text-base font-medium">Objetivos Principales</Label>
                                <div className="space-y-2 mt-2">
                                    {goalOptions.map(option => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={option}
                                                checked={(goals.primaryGoals || []).includes(option)}
                                                onCheckedChange={() => handleGoalToggle(option)}
                                            />
                                            <label
                                                htmlFor={option}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {option}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="specifics" className="text-base font-medium">
                                    Detalles y Notas Específicas
                                </label>
                                <Textarea
                                    id="specifics"
                                    placeholder="Ej: Quiero bajar 5kg de grasa en 3 meses, o, quiero poder correr 10km sin parar."
                                    value={goals.specifics || ''}
                                    onChange={(e) => handleChange('specifics', e.target.value)}
                                    className="mt-1 min-h-[120px]"
                                />
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={generateReport}>
                        <FileText className="mr-2 h-4 w-4"/>
                        Exportar
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        <Save className="mr-2 h-4 w-4"/>
                        Guardar Objetivos
                    </Button>
                </CardFooter>
            </Card>

             <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Objetivos</DialogTitle>
                        <DialogDescription>
                          Copia este informe para analizarlo con una IA o guardarlo en tus notas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            readOnly
                            value={reportContent}
                            className="h-64 text-sm font-mono"
                        />
                    </div>
                    <DialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={handleCopyToClipboard}>
                           <Copy className="mr-2 h-4 w-4"/> Copiar
                        </Button>
                        <Button onClick={() => setIsReportOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    