
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { format, addDays, subDays } from "date-fns";
import { es } from 'date-fns/locale';
import { db } from "@/lib/firebase";
import { FoodIntakeData } from "@/ai/schemas";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Salad, GlassWater, Coffee, Sun, Soup, Utensils, Apple, ChevronLeft, ChevronRight, FileText, Copy, Tags } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { debounce } from "lodash";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DietPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [foodData, setFoodData] = useState<Partial<FoodIntakeData>>({});
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();

    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');

    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    useEffect(() => {
        setIsLoading(true);
        if (!userId || !formattedDate) return;
        
        try {
            const docRef = doc(db, "users", userId, "food_intake", formattedDate);
            
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    setFoodData(doc.data());
                } else {
                    setFoodData({ date: formattedDate });
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error loading food intake data:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                } else {
                     toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la dieta." });
                }
                setIsLoading(false);
                setFoodData({ date: formattedDate });
            });

            return () => unsubscribe();
        } catch(error) {
            console.error("Error setting up Firestore listener for diet:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo configurar la carga de la dieta." });
            setIsLoading(false);
        }
    }, [userId, formattedDate, toast]);

    const debouncedSave = useCallback(
        debounce(async (dataToSave: Partial<FoodIntakeData>) => {
            if (!userId) return;
            try {
                const docRef = doc(db, "users", userId, "food_intake", formattedDate);
                await setDoc(docRef, dataToSave, { merge: true });
                toast({ title: "Guardado", description: "Tus datos de alimentación se han guardado." });
            } catch (error) {
                console.error("Error saving food intake data:", error);
                if ((error as any).code === 'unavailable') {
                    toast({ variant: "destructive", title: "Sin conexión", description: "Los cambios se guardarán cuando recuperes la conexión." });
                } else {
                    toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
                }
            }
        }, 1500),
        [formattedDate, userId, toast]
    );

    const handleChange = (field: keyof FoodIntakeData, value: string | number) => {
        const updatedFoodData = { ...foodData, date: formattedDate, [field]: value };
        setFoodData(updatedFoodData);
        debouncedSave(updatedFoodData);
    };

    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    };

    const generateReport = () => {
        let report = `Informe de Dieta y Nutrición - ${format(selectedDate, 'PPP', { locale: es })}\n`;
        report += "===============================================\n\n";

        if (Object.keys(foodData).length <= 1) { // Only contains date
            report += "No hay datos de alimentación registrados para este día.";
        } else {
            report += `**Hidratación**\n`;
            report += `- Agua: ${foodData.waterIntake || 'No registrado'} ml\n`;
            report += `- Otras bebidas: ${foodData.otherDrinks || 'No registrado'}\n\n`;
            
            report += `**Comidas**\n`;
            report += `- Desayuno: ${foodData.breakfast || 'No registrado'}\n`;
            if (foodData.breakfastTags) report += `  - Etiquetas: ${foodData.breakfastTags}\n`;
            report += `- Comida: ${foodData.lunch || 'No registrado'}\n`;
            if (foodData.lunchTags) report += `  - Etiquetas: ${foodData.lunchTags}\n`;
            report += `- Cena: ${foodData.dinner || 'No registrado'}\n`;
            if (foodData.dinnerTags) report += `  - Etiquetas: ${foodData.dinnerTags}\n`;
            report += `- Snacks: ${foodData.snacks || 'No registrado'}\n\n`;
            if (foodData.snacksTags) report += `  - Etiquetas: ${foodData.snacksTags}\n`;

            report += `**Notas Generales**\n`;
            report += `${foodData.notes || 'No se han añadido notas.'}\n`;
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
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Salad className="text-primary"/>
                                Registro de Dieta e Hidratación
                            </CardTitle>
                            <CardDescription>
                                Selecciona un día y anota tu consumo. Los cambios se guardan automáticamente.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold text-lg w-48 text-center">{format(selectedDate, 'd MMMM yyyy', {locale: es})}</span>
                            <Button variant="outline" size="icon" onClick={() => handleDateChange(addDays(selectedDate, 1))} disabled={selectedDate > new Date()}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                             <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateChange}
                            disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                            initialFocus
                            locale={es}
                            className="rounded-md border"
                        />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                    {isLoading ? <DietSkeleton /> : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2"><GlassWater className="text-blue-500" /> Hidratación</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="waterIntake">Agua bebida (ml)</Label>
                                            <Input
                                                id="waterIntake"
                                                type="number"
                                                placeholder="Ej: 1500"
                                                value={foodData.waterIntake ?? ''}
                                                onChange={(e) => handleChange('waterIntake', e.target.value === '' ? 0 : Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="otherDrinks">Infusiones, cafés, otras bebidas</Label>
                                            <Textarea
                                                id="otherDrinks"
                                                placeholder="Ej: 1 café con leche por la mañana, 1 té verde por la tarde."
                                                value={foodData.otherDrinks || ''}
                                                onChange={(e) => handleChange('otherDrinks', e.target.value)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2"><Coffee className="text-orange-500"/> Notas Generales</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Label htmlFor="notes">Notas sobre tu alimentación hoy</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Ej: Hoy he tenido más hambre de lo normal, he evitado los ultraprocesados."
                                            value={foodData.notes || ''}
                                            onChange={(e) => handleChange('notes', e.target.value)}
                                            className="h-40"
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-center">Comidas del Día</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                                <MealCard icon={<Sun size={20}/>} title="Desayuno" description={foodData.breakfast || ''} tags={foodData.breakfastTags || ''} onDescriptionChange={(v) => handleChange('breakfast', v)} onTagsChange={(v) => handleChange('breakfastTags', v)} />
                                <MealCard icon={<Soup size={20}/>} title="Comida" description={foodData.lunch || ''} tags={foodData.lunchTags || ''} onDescriptionChange={(v) => handleChange('lunch', v)} onTagsChange={(v) => handleChange('lunchTags', v)} />
                                <MealCard icon={<Utensils size={20}/>} title="Cena" description={foodData.dinner || ''} tags={foodData.dinnerTags || ''} onDescriptionChange={(v) => handleChange('dinner', v)} onTagsChange={(v) => handleChange('dinnerTags', v)} />
                                <MealCard icon={<Apple size={20}/>} title="Snacks / Otros" description={foodData.snacks || ''} tags={foodData.snacksTags || ''} onDescriptionChange={(v) => handleChange('snacks', v)} onTagsChange={(v) => handleChange('snacksTags', v)} />
                                </div>
                            </div>
                        </>
                    )}
                    </div>
                </CardContent>
            </Card>
            
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Dieta y Nutrición</DialogTitle>
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


type MealCardProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    tags: string;
    onDescriptionChange: (value: string) => void;
    onTagsChange: (value: string) => void;
};

function MealCard({ icon, title, description, tags, onDescriptionChange, onTagsChange }: MealCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    {icon} {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-2">
                <Textarea
                    placeholder={`¿Qué has comido para ${title.toLowerCase()}? Puedes pegar recetas aquí.`}
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    className="h-full min-h-[150px] resize-none"
                />
                 <div className="relative">
                    <Tags className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Etiquetas (ej: casero, rápido)"
                        value={tags}
                        onChange={(e) => onTagsChange(e.target.value)}
                        className="pl-8 text-xs"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function DietSkeleton() {
    return (
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
             </div>
        </div>
    )
}

    