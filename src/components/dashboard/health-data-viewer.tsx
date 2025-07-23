
"use client";

import { useMemo } from "react";
import { DailyMetric, Workout } from "@/ai/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database, Moon, Dumbbell, HeartPulse, Stethoscope } from "lucide-react";

type HealthDataViewerProps = {
  dailyMetrics: DailyMetric[];
  workouts: Workout[];
};

export default function HealthDataViewer({ dailyMetrics, workouts }: HealthDataViewerProps) {
    const sortedMetrics = useMemo(() => {
        return [...dailyMetrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyMetrics]);
    
    const sortedWorkouts = useMemo(() => {
        return [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [workouts]);
    
    const hasHydrationData = useMemo(() => sortedMetrics.some(m => m.hidratacion && m.hidratacion > 0), [sortedMetrics]);


    if (sortedMetrics.length === 0 && sortedWorkouts.length === 0) {
        return null; // Don't render anything if there's no data
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Database className="text-primary" />
            Visor de Datos de Salud
        </CardTitle>
        <CardDescription>
          Aquí puedes ver todos los datos procesados y guardados en tu base de datos, organizados por categoría.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sleep">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="sleep"><Moon className="mr-2 h-4 w-4"/>Sueño</TabsTrigger>
            <TabsTrigger value="workouts"><Dumbbell className="mr-2 h-4 w-4"/>Entrenamientos</TabsTrigger>
            <TabsTrigger value="recovery"><HeartPulse className="mr-2 h-4 w-4"/>Recuperación</TabsTrigger>
            <TabsTrigger value="cycle"><Stethoscope className="mr-2 h-4 w-4"/>Ciclo</TabsTrigger>
          </TabsList>

          <TabsContent value="sleep">
            <DataTable
              headers={["Fecha", "Total (min)", "Profundo", "Ligero", "REM"]}
              rows={sortedMetrics.filter(m => m.sueño_total && m.sueño_total > 0).map(metric => ({
                key: metric.date,
                cells: [
                  metric.date,
                  metric.sueño_total || "-",
                  metric.sueño_profundo || "-",
                  metric.sueño_ligero || "-",
                  metric.sueño_rem || "-",
                ],
              }))}
              emptyMessage="No hay datos de sueño registrados."
            />
          </TabsContent>

          <TabsContent value="workouts">
             <DataTable
              headers={["Fecha", "Tipo", "Duración (min)", "Calorías", "FC Media (bpm)"]}
              rows={sortedWorkouts.map((workout, i) => ({
                key: `${workout.date}-${i}`,
                cells: [
                  workout.date,
                  workout.tipo,
                  workout.duracion,
                  workout.calorias,
                  workout.frecuenciaCardiacaMedia || "-",
                ],
              }))}
              emptyMessage="No hay entrenamientos registrados."
            />
          </TabsContent>

          <TabsContent value="recovery">
             <DataTable
              headers={["Fecha", "VFC (ms)", "FC Reposo (bpm)", "Respiración (rpm)", "Calorías Activas", "Pasos", "Min. Movimiento"]}
              rows={sortedMetrics.map(metric => ({
                key: metric.date,
                cells: [
                  metric.date,
                  metric.hrv || "-",
                  metric.restingHeartRate || "-",
                  metric.respiracion || "-",
                  metric.caloriasActivas || "-",
                  metric.pasos || "-",
                  metric.minutosEnMovimiento || "-",
                ],
              }))}
              emptyMessage="No hay datos de recuperación registrados."
            />
          </TabsContent>

          <TabsContent value="cycle">
             <DataTable
              headers={["Fecha", "Estado del Ciclo", "Síntomas"]}
              rows={sortedMetrics.filter(m => m.estadoCiclo || (m.sintomas && m.sintomas.length > 0)).map(metric => ({
                key: metric.date,
                cells: [
                  metric.date,
                  metric.estadoCiclo || "No registrado",
                  metric.sintomas && metric.sintomas.length > 0
                    ? <div className="flex flex-wrap gap-1">{metric.sintomas.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}</div>
                    : "Ninguno",
                ],
              }))}
              emptyMessage="No hay datos del ciclo menstrual registrados."
            />
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}


function DataTable({ headers, rows, emptyMessage }: { headers: string[], rows: {key: string, cells: (string | number | React.ReactNode)[]}[], emptyMessage: string }) {
    return (
        <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length > 0 ? (
                        rows.map(row => (
                            <TableRow key={row.key}>
                                {row.cells.map((cell, i) => <TableCell key={i} className={typeof cell === 'number' ? 'text-right' : ''}>{cell}</TableCell>)}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={headers.length} className="text-center h-24 text-muted-foreground">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
