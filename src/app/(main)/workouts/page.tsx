
"use client";

import { useEffect, useState, useMemo } from "react";
import { WorkoutData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Dumbbell } from "lucide-react";
import FileUploadProcessor from "@/components/dashboard/file-upload-processor";

export default function WorkoutsPage() {
    const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qWorkouts = query(collection(userRef, "workouts"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qWorkouts, (snapshot) => {
            const workoutData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as (WorkoutData & { id: string })[];
            setWorkouts(workoutData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading workouts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const workoutDataRows = useMemo(() => {
        return workouts.map((workout) => ({
                key: (workout as any).id, // Use the unique Firestore document ID as the key
                cells: [
                  workout.date,
                  workout.type,
                  workout.startTime,
                  workout.duration,
                  workout.avgHeartRate,
                  workout.maxHeartRate,
                  `${workout.zone1Percent || '0%'} / ${workout.zone2Percent || '0%'} / ${workout.zone3Percent || '0%'} / ${workout.zone4Percent || '0%'}`,
                  workout.rpe,
                  workout.load,
                  workout.calories,
                  workout.distance,
                ],
              }))
    }, [workouts]);


    return (
        <div className="flex flex-col gap-6">
            <FileUploadProcessor 
                title="Subir Datos de Entrenamientos"
                description="Sube aquí tus archivos CSV de Entrenamientos de HeartWatch."
                dataType="workouts"
                userId={userId}
            />
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
                            headers={[
                                "Fecha", "Tipo", "Hora", "Duración", "FC Media", "FC Máx",
                                "Zonas Cardíacas (%)", "RPE", "Carga", "Calorías", "Distancia (km)"
                            ]}
                            rows={workoutDataRows}
                            emptyMessage="No hay entrenamientos registrados. Sube un archivo para empezar."
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

