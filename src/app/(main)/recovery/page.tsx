
"use client";

import { useEffect, useState, useMemo } from "react";
import { VitalsData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse, Wind, Moon, Dumbbell } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function RecoveryPage() {
    const [recoveryScore, setRecoveryScore] = useState(75); // Example static score
    const [isLoading, setIsLoading] = useState(false);
    const userId = "user_test_id";

    // This useEffect can be expanded later to fetch and calculate the recovery score
    useEffect(() => {
        // Placeholder for future logic to calculate recovery from sleep, workouts, etc.
        // For now, we'll just use a static value.
    }, [userId]);

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
                        Tu nivel de preparación para afrontar el día, calculado a partir de tu sueño, actividad y ciclo.
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
                    <p className="text-center text-muted-foreground max-w-md mx-auto mt-4">
                        Una recuperación {text.toLowerCase()} indica que tu cuerpo está listo para un mayor esfuerzo. Escucha a tu cuerpo y ajusta la intensidad de tus entrenamientos según sea necesario.
                    </p>
                </CardContent>
            </Card>

             <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Sugerencias del Día</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                        <Dumbbell className="h-6 w-6 text-orange-500 mt-1"/>
                        <div>
                            <h4 className="font-semibold">Entrenamiento</h4>
                            <p className="text-muted-foreground text-sm">Tu cuerpo está preparado. Es un buen día para un entrenamiento de alta intensidad o para intentar una nueva marca personal.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <Moon className="h-6 w-6 text-blue-500 mt-1"/>
                        <div>
                            <h4 className="font-semibold">Descanso</h4>
                            <p className="text-muted-foreground text-sm">Has descansado bien. Mantén una buena higiene del sueño esta noche para consolidar tu recuperación.</p>
                        </div>
                    </div>
                      <div className="flex items-start gap-4">
                        <Wind className="h-6 w-6 text-green-500 mt-1"/>
                        <div>
                            <h4 className="font-semibold">Mindfulness</h4>
                            <p className="text-muted-foreground text-sm">Aprovecha tu estado de alta recuperación para una sesión de meditación o mindfulness y empezar el día con claridad mental.</p>
                        </div>
                    </div>
                </CardContent>
             </Card>
        </div>
    );
}
