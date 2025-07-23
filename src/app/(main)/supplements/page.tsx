
"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, X, Coffee, Sun, Moon, Dumbbell } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";


type SupplementMoment = "desayuno" | "comida" | "cena" | "preEntreno" | "postEntreno";

type SupplementData = {
    [key in SupplementMoment]?: string[];
};

const supplementSections: { id: SupplementMoment, title: string, icon: React.ReactNode }[] = [
    { id: "desayuno", title: "Desayuno", icon: <Sun className="h-4 w-4" /> },
    { id: "comida", title: "Comida", icon: <Coffee className="h-4 w-4" /> },
    { id: "cena", title: "Cena", icon: <Moon className="h-4 w-4" /> },
    { id: "preEntreno", title: "Pre-Entreno", icon: <Dumbbell className="h-4 w-4" /> },
    { id: "postEntreno", title: "Post-Entreno", icon: <Pill className="h-4 w-4" /> },
];

export default function SupplementsPage() {
    const [supplements, setSupplements] = useState<SupplementData>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const userId = "user_test_id";
    const today = format(new Date(), "yyyy-MM-dd");

    useEffect(() => {
        const docRef = doc(db, "users", userId, "supplements", today);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setSupplements(doc.data() as SupplementData);
            } else {
                setSupplements({});
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading supplements:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, today]);
    
    const handleAddSupplement = async (moment: SupplementMoment, item: string) => {
        if (!item.trim()) return;
        const docRef = doc(db, "users", userId, "supplements", today);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    [moment]: arrayUnion(item)
                });
            } else {
                await setDoc(docRef, {
                    [moment]: [item]
                });
            }
            toast({
                title: "Suplemento añadido",
                description: `${item} ha sido añadido a ${moment}.`,
            });
        } catch (error) {
            console.error("Error adding supplement:", error);
            toast({
                variant: "destructive",
                title: "Error al añadir",
                description: "No se pudo añadir el suplemento.",
            });
        }
    };
    
    const handleRemoveSupplement = async (moment: SupplementMoment, item: string) => {
        const docRef = doc(db, "users", userId, "supplements", today);
        try {
            await updateDoc(docRef, {
                [moment]: arrayRemove(item)
            });
            toast({
                title: "Suplemento eliminado",
                description: `${item} ha sido eliminado de ${moment}.`,
                variant: "destructive"
            });
        } catch (error) {
            console.error("Error removing supplement:", error);
             toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar el suplemento.",
            });
        }
    };


    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Pill className="text-primary"/>
                        Registro de Suplementos para Hoy ({today})
                    </CardTitle>
                    <CardDescription>
                        Añade los suplementos que tomas en cada momento del día.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <p>Cargando suplementos...</p>
                    ) : (
                        supplementSections.map(({ id, title, icon }) => (
                            <SupplementCard 
                                key={id}
                                moment={id}
                                title={title}
                                icon={icon}
                                items={supplements[id] || []}
                                onAdd={handleAddSupplement}
                                onRemove={handleRemoveSupplement}
                            />
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

type SupplementCardProps = {
    moment: SupplementMoment;
    title: string;
    icon: React.ReactNode;
    items: string[];
    onAdd: (moment: SupplementMoment, item: string) => void;
    onRemove: (moment: SupplementMoment, item: string) => void;
}

function SupplementCard({ moment, title, icon, items, onAdd, onRemove }: SupplementCardProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleAddClick = () => {
        if (inputRef.current) {
            onAdd(moment, inputRef.current.value);
            inputRef.current.value = "";
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <Input ref={inputRef} placeholder="Añadir suplemento..." className="h-9" onKeyDown={(e) => e.key === 'Enter' && handleAddClick()} />
                    <Button size="icon" className="h-9 w-9" onClick={handleAddClick}><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[36px]">
                    {items.map((item, index) => (
                        <Badge key={index} variant="secondary" className="py-1 px-2 text-sm font-normal">
                           {item}
                           <button onClick={() => onRemove(moment, item)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5">
                            <X className="h-3 w-3" />
                           </button>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

    