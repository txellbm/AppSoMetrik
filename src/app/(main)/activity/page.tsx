
"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, doc, orderBy, setDoc, deleteDoc } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { ActivityData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Flame, Plus, Edit, Trash2, FileText, Copy } from "lucide-react";

export default function ActivityPage() {
    const [activityData, setActivityData] = useState<ActivityData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
    const userId = "user_test_id";
    const { toast } = useToast();

    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');


    useEffect(() => {
        setIsLoading(true);
        const userRef = doc(db, "users", userId);
        const qActivity = query(collection(userRef, "activity"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qActivity, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ActivityData[];
            setActivityData(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading activity data:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleSaveActivity = async (data: Omit<ActivityData, 'id'>) => {
        try {
            const docRef = doc(db, "users", userId, "activity", data.date); // Use date as ID for uniqueness
            await setDoc(docRef, data, { merge: true });
            
            toast({ title: editingActivity ? "Actividad actualizada" : "Actividad registrada" });

            setIsDialogOpen(false);
            setEditingActivity(null);
        } catch (error) {
            console.error("Error saving activity:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la actividad." });
        }
    };

    const handleDeleteActivity = async (id: string) => {
        try {
            await deleteDoc(doc(db, "users", userId, "activity", id));
            toast({ title: "Registro de actividad eliminado", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting activity:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el registro." });
        }
    };

    const openDialog = (activity: ActivityData | null) => {
        setEditingActivity(activity);
        setIsDialogOpen(true);
    };

    const formatDate = (dateString: string) => {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const generateReport = () => {
        let report = `Informe de Actividad Diaria\n`;
        report += "===============================\n\n";

        if (activityData.length === 0) {
            report += "No hay actividad registrada.";
        } else {
            activityData.forEach(activity => {
                report += `Fecha: ${formatDate(activity.date)}\n`;
                report += `Calorías Totales: ${activity.totalCalories || '-'}\n`;
                report += `Pasos: ${activity.steps || '-'}\n`;
                report += `Tiempo Activo: ${activity.activeTime || '-'} min\n`;
                report += `FC Media Diaria: ${activity.avgDayHeartRate || '-'} lpm\n`;
                report += "-------------------------------\n";
            });
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
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="text-primary"/>
                            Actividad Diaria
                        </CardTitle>
                        <CardDescription>
                            Registra tu actividad diaria para tener una visión completa de tu gasto energético.
                        </CardDescription>
                    </div>
                     <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Calorías Totales</TableHead>
                                <TableHead>Pasos</TableHead>
                                <TableHead>Tiempo Activo (min)</TableHead>
                                <TableHead>FC Media Diaria</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Cargando actividad...</TableCell>
                                </TableRow>
                            ) : activityData.length > 0 ? (
                                activityData.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell>{formatDate(activity.date)}</TableCell>
                                        <TableCell>{activity.totalCalories || "-"}</TableCell>
                                        <TableCell>{activity.steps || "-"}</TableCell>
                                        <TableCell>{activity.activeTime || "-"}</TableCell>
                                        <TableCell>{activity.avgDayHeartRate || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(activity)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => activity.id && handleDeleteActivity(activity.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No hay actividad registrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => openDialog(null)}>
                        <Plus className="mr-2"/>
                        Registrar Actividad del Día
                    </Button>
                </CardFooter>
            </Card>

            <ActivityDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveActivity}
                activity={editingActivity}
            />

            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Actividad</DialogTitle>
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

type ActivityDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<ActivityData, 'id'>) => void;
    activity: ActivityData | null;
};

function ActivityDialog({ isOpen, onClose, onSave, activity }: ActivityDialogProps) {
    const [formData, setFormData] = useState<Partial<ActivityData>>({});

    useEffect(() => {
        if (activity) {
            setFormData(activity);
        } else {
            setFormData({
                date: format(new Date(), "yyyy-MM-dd"),
            });
        }
    }, [activity]);
    
    const handleChange = (field: keyof ActivityData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Omit<ActivityData, 'id'>);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{activity ? 'Editar Actividad' : 'Registrar Actividad'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                     <div>
                        <Label htmlFor="date">Fecha</Label>
                        <Input id="date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} required disabled={!!activity}/>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="totalCalories">Calorías Totales</Label>
                            <Input id="totalCalories" type="number" value={formData.totalCalories} onChange={e => handleChange('totalCalories', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="steps">Pasos</Label>
                            <Input id="steps" type="number" value={formData.steps} onChange={e => handleChange('steps', Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="activeTime">Tiempo Activo (min)</Label>
                            <Input id="activeTime" type="number" value={formData.activeTime} onChange={e => handleChange('activeTime', Number(e.target.value))} />
                        </div>
                         <div>
                           <Label htmlFor="avgDayHeartRate">FC Media del Día</Label>
                           <Input id="avgDayHeartRate" type="number" value={formData.avgDayHeartRate} onChange={e => handleChange('avgDayHeartRate', Number(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
