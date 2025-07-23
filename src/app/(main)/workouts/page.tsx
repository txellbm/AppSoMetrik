
"use client";

import { useEffect, useState, useMemo } from "react";
import { Workout } from "@/ai/schemas";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Dumbbell } from "lucide-react";

export default function WorkoutsPage() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qWorkouts = query(collection(userRef, "workouts"));

        const unsubscribe = onSnapshot(qWorkouts, (snapshot) => {
            const workoutData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Workout[];
            setWorkouts(workoutData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading workouts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const sortedWorkouts = useMemo(() => {
        return [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [workouts]);
    
    const workoutDataRows = useMemo(() => {
        return sortedWorkouts.map((workout, i) => ({
                key: `${workout.date}-${i}`,
                cells: [
                  workout.date,
                  workout.tipo,
                  workout.duracion,
                  workout.calorias,
                  workout.frecuenciaCardiacaMedia || "-",
                  "N/A", // Placeholder for intensity
                ],
              }))
    }, [sortedWorkouts]);


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Dumbbell className="text-primary"/>
                        Historial de Entrenamientos
                    </CardTitle>
                    <CardDescription>
                        Todos tus entrenamientos registrados, ordenados por fecha.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Cargando entrenamientos...</p>
                    ) : (
                        <DataTable
                            headers={["Fecha", "Tipo", "Duración (min)", "Calorías", "FC Media", "Intensidad"]}
                            rows={workoutDataRows}
                            emptyMessage="No hay entrenamientos registrados. Sube un archivo para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
