
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
import { Salad, GlassWater, Coffee, Sun, Soup, Utensils, Apple, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { debounce } from "lodash";
import { Skeleton } from "@/components/ui/skeleton";

export default function DietPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [foodData, setFoodData] = useState<Partial<FoodIntakeData>>({});
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";
    const { toast } = useToast();

    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    useEffect(() => {
        setIsLoading(true);
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
            setIsLoading(false);
            setFoodData({ date: formattedDate });
        });

        return () => unsubscribe();
    }, [userId, formattedDate]);

    const debouncedSave = useCallback(
        debounce(async (dataToSave: Partial<FoodIntakeData>) => {
            try {
                const docRef = doc(db, "users", userId, "food_intake", formattedDate);
                await setDoc(docRef, dataToSave, { merge: true });
                toast({ title: "Guardado", description: "Tus datos de alimentación se han guardado." });
            } catch (error) {
                console.error("Error saving food intake data:", error);
                toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
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
                                <MealCard icon={<Sun size={20}/>} title="Desayuno" value={foodData.breakfast || ''} onChange={(v) => handleChange('breakfast', v)} />
                                <MealCard icon={<Soup size={20}/>} title="Comida" value={foodData.lunch || ''} onChange={(v) => handleChange('lunch', v)} />
                                <MealCard icon={<Utensils size={20}/>} title="Cena" value={foodData.dinner || ''} onChange={(v) => handleChange('dinner', v)} />
                                <MealCard icon={<Apple size={20}/>} title="Snacks / Otros" value={foodData.snacks || ''} onChange={(v) => handleChange('snacks', v)} />
                                </div>
                            </div>
                        </>
                    )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


type MealCardProps = {
    icon: React.ReactNode;
    title: string;
    value: string;
    onChange: (value: string) => void;
};

function MealCard({ icon, title, value, onChange }: MealCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    {icon} {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <Textarea
                    placeholder={`¿Qué has comido para ${title.toLowerCase()}? Puedes pegar recetas aquí.`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-full min-h-[150px] resize-none"
                />
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
