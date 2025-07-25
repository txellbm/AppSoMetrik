
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, setDoc, collection, query, orderBy } from "firebase/firestore";
import { format, parseISO } from "date-fns";
import { db } from "@/lib/firebase";
import { MindfulnessData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Smile, Brain, FileText, Copy } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/dashboard/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { es } from "date-fns/locale";

const moodOptions = ["😊 Contenta", "🙂 Normal", "🥱 Cansada", "😠 Irritable", "😥 Triste"];

export default function MindfulnessPage() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [dailyData, setDailyData] = useState<Partial<MindfulnessData>>({});
    const [history, setHistory] = useState<MindfulnessData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";

    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');

    const formattedDate = useMemo(() => selectedDate ? format(selectedDate, "yyyy-MM-dd") : '', [selectedDate]);

    // Fetch data for selected day
    useEffect(() => {
        if (!formattedDate || !userId) return;
        try {
            const docRef = doc(db, "users", userId, "mindfulness", formattedDate);
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    setDailyData(doc.data());
                } else {
                    setDailyData({ stressLevel: 5, mood: "🙂 Normal", notes: "" });
                }
            }, (error) => {
                console.error("Error fetching daily mindfulness data:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up Firestore listener for daily mindfulness:", error);
        }
    }, [formattedDate, userId]);

    // Fetch history
    useEffect(() => {
        setIsLoading(true);
        if(!userId) return;
        try {
            const colRef = collection(db, "users", userId, "mindfulness");
            const q = query(colRef, orderBy("date", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as MindfulnessData[];
                setHistory(data);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching mindfulness history:", error);
                if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up Firestore listener for mindfulness history:", error);
            setIsLoading(false);
        }
    }, [userId]);

    const handleSave = async () => {
        if (!formattedDate) return;
        try {
            const docRef = doc(db, "users", userId, "mindfulness", formattedDate);
            await setDoc(docRef, { date: formattedDate, ...dailyData }, { merge: true });
            toast({ title: "¡Guardado!", description: `Tu estado para el ${formattedDate} ha sido guardado.` });
        } catch (error) {
            console.error("Error saving mindfulness data:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la información." });
        }
    };

    const handleChange = (field: keyof MindfulnessData, value: string | number | undefined) => {
        setDailyData(prev => ({ ...prev, [field]: value }));
    };

    const historyRows = useMemo(() => {
        if (isLoading) return [];
        return history.map(item => ({
            key: item.id || item.date,
            cells: [
                format(parseISO(item.date), 'dd/MM/yyyy'),
                item.mood || '-',
                <Badge key={`${item.id}-stress`} variant={item.stressLevel && item.stressLevel > 7 ? 'destructive' : 'secondary'}>{item.stressLevel || '-'}/10</Badge>,
                item.notes || '-'
            ]
        }));
    }, [history, isLoading]);
    
    const generateReport = () => {
        let report = `Informe de Bienestar Mental\n`;
        report += "===============================\n\n";

        if (history.length === 0) {
            report += "No hay datos de bienestar mental registrados.";
        } else {
            history.forEach(item => {
                report += `Fecha: ${format(parseISO(item.date), 'PPP', { locale: 'es' })}\n`;
                report += ` - Estado de Ánimo: ${item.mood || 'No registrado'}\n`;
                report += ` - Nivel de Estrés: ${item.stressLevel || 'No registrado'}/10\n`;
                if(item.notes) report += ` - Notas: "${item.notes}"\n`;
                report += "---------------------------------\n";
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Seleccionar Día</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Smile className="text-primary" />
                           Registro del Día: {formattedDate && format(parseISO(formattedDate), 'PPP', { locale: es })}
                        </CardTitle>
                        <CardDescription>
                            ¿Cómo te sientes hoy? Tus respuestas se guardan al cambiar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <label className="text-sm font-medium">Estado de Ánimo</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {moodOptions.map(mood => (
                                    <Button
                                        key={mood}
                                        variant={dailyData.mood === mood ? "default" : "outline"}
                                        onClick={() => handleChange('mood', mood)}
                                    >
                                        {mood}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="stressLevel" className="text-sm font-medium">Nivel de Estrés: {dailyData.stressLevel || 5}/10</label>
                            <Slider
                                id="stressLevel"
                                min={1} max={10} step={1}
                                value={[dailyData.stressLevel || 5]}
                                onValueChange={(value) => handleChange('stressLevel', value[0])}
                                onBlur={handleSave}
                                className="mt-2"
                            />
                        </div>
                         <div>
                            <label htmlFor="notes" className="text-sm font-medium">Notas sobre tu día</label>
                            <Textarea
                                id="notes"
                                placeholder="Ej: Un día tranquilo en el trabajo, pero me siento algo dispersa..."
                                value={dailyData.notes || ''}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                onBlur={handleSave}
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={handleSave}>Guardar Registro del Día</Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="flex items-center gap-2">
                               <Brain className="text-primary"/>
                               Historial de Bienestar Mental
                            </CardTitle>
                            <CardDescription>
                                Un registro de tu estado de ánimo y niveles de estrés a lo largo del tiempo.
                            </CardDescription>
                         </div>
                         <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p>Cargando historial...</p>
                        ) : (
                            <DataTable
                                headers={["Fecha", "Ánimo", "Estrés", "Notas"]}
                                rows={historyRows}
                                emptyMessage="No hay datos registrados todavía."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Bienestar Mental</DialogTitle>
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
