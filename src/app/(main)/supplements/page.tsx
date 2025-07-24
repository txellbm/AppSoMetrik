
"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, addDoc, deleteDoc, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, X, Coffee, Sun, Moon, Dumbbell, Edit, Trash2, BookMarked, Info, Repeat } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SupplementMoment = "desayuno" | "comida" | "cena" | "preEntreno" | "postEntreno";

type DailySupplementData = {
    [key in SupplementMoment]?: string[];
};

type SupplementDefinition = {
    id: string;
    name: string;
    ingredients: string[];
    notes?: string;
    recommendedDose?: string;
}

const supplementSections: { id: SupplementMoment, title: string, icon: React.ReactNode }[] = [
    { id: "desayuno", title: "Desayuno", icon: <Sun className="h-4 w-4" /> },
    { id: "comida", title: "Comida", icon: <Coffee className="h-4 w-4" /> },
    { id: "cena", title: "Cena", icon: <Moon className="h-4 w-4" /> },
    { id: "preEntreno", title: "Pre-Entreno", icon: <Dumbbell className="h-4 w-4" /> },
    { id: "postEntreno", title: "Post-Entreno", icon: <Pill className="h-4 w-4" /> },
];

export default function SupplementsPage() {
    const [dailySupplements, setDailySupplements] = useState<DailySupplementData>({});
    const [supplementInventory, setSupplementInventory] = useState<SupplementDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplement, setEditingSupplement] = useState<SupplementDefinition | null>(null);

    const { toast } = useToast();
    const userId = "user_test_id";
    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch daily supplement intake
    useEffect(() => {
        const docRef = doc(db, "users", userId, "supplements", today);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                setDailySupplements(doc.data() as DailySupplementData);
            } else {
                setDailySupplements({});
            }
        }, (error) => {
            console.error("Error loading daily supplements:", error);
        });

        return () => unsubscribe();
    }, [userId, today]);

    // Fetch supplement inventory
    useEffect(() => {
        const inventoryColRef = collection(db, "users", userId, "user_supplements");
        const unsubscribe = onSnapshot(inventoryColRef, (snapshot) => {
            const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplementDefinition));
            setSupplementInventory(inventory);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading supplement inventory:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);
    
    const handleAddSupplementToDaily = async (moment: SupplementMoment, item: string) => {
        if (!item.trim()) return;
        const docRef = doc(db, "users", userId, "supplements", today);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, { [moment]: arrayUnion(item) });
            } else {
                await setDoc(docRef, { [moment]: [item] });
            }
            toast({
                title: "Suplemento añadido",
                description: `${item} ha sido añadido a ${moment}.`,
            });
        } catch (error) {
            console.error("Error adding supplement:", error);
            toast({ variant: "destructive", title: "Error al añadir", description: "No se pudo añadir el suplemento." });
        }
    };
    
    const handleRemoveSupplementFromDaily = async (moment: SupplementMoment, item: string) => {
        const docRef = doc(db, "users", userId, "supplements", today);
        try {
            await updateDoc(docRef, { [moment]: arrayRemove(item) });
            toast({
                title: "Suplemento eliminado",
                description: `${item} ha sido eliminado de ${moment}.`,
                variant: "destructive"
            });
        } catch (error) {
            console.error("Error removing supplement:", error);
             toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el suplemento." });
        }
    };

    const handleSaveSupplementToInventory = async (data: Omit<SupplementDefinition, 'id'>) => {
        try {
            if (editingSupplement) {
                // Update
                const docRef = doc(db, "users", userId, "user_supplements", editingSupplement.id);
                await updateDoc(docRef, data);
                toast({ title: "Suplemento actualizado" });
            } else {
                // Create
                const colRef = collection(db, "users", userId, "user_supplements");
                await addDoc(colRef, data);
                toast({ title: "Suplemento guardado" });
            }
            setIsDialogOpen(false);
            setEditingSupplement(null);
        } catch (error) {
            console.error("Error saving supplement to inventory:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el suplemento." });
        }
    };
    
    const handleDeleteSupplementFromInventory = async (supplementId: string) => {
        try {
            await deleteDoc(doc(db, "users", userId, "user_supplements", supplementId));
            toast({ title: "Suplemento eliminado del inventario", variant: 'destructive' });
        } catch(error) {
             console.error("Error deleting supplement from inventory:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el suplemento del inventario." });
        }
    };

    const openDialog = (supplement: SupplementDefinition | null) => {
        setEditingSupplement(supplement);
        setIsDialogOpen(true);
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
                        Añade los suplementos que tomas en cada momento del día, bien manualmente o desde tu inventario.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {supplementSections.map(({ id, title, icon }) => (
                        <DailySupplementCard 
                            key={id}
                            moment={id}
                            title={title}
                            icon={icon}
                            items={dailySupplements[id] || []}
                            onAdd={handleAddSupplementToDaily}
                            onRemove={handleRemoveSupplementFromDaily}
                        />
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookMarked className="text-primary"/>
                        Mis Suplementos
                    </CardTitle>
                     <CardDescription>
                        Tu inventario personal de suplementos. Añade, edita y gestiona tus productos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                        <p>Cargando inventario...</p>
                    ) : supplementInventory.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {supplementInventory.map(sup => (
                                <Card key={sup.id} className="flex flex-col">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">{sup.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-3">
                                        {sup.recommendedDose && (
                                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <Repeat className="h-4 w-4 mt-0.5 shrink-0" />
                                                <p>{sup.recommendedDose}</p>
                                            </div>
                                        )}
                                        <div>
                                            <Label className="text-xs font-semibold">Ingredientes</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {sup.ingredients.map((ing, i) => <Badge key={i} variant="secondary">{ing}</Badge>)}
                                            </div>
                                        </div>
                                        {sup.notes && (
                                            <div>
                                                <Label className="text-xs font-semibold">Notas</Label>
                                                <p className="text-sm text-muted-foreground mt-1">{sup.notes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-between bg-muted/50 p-2">
                                        <div className="flex gap-1">
                                            {supplementSections.map(sec => (
                                                <Button key={sec.id} size="icon" variant="ghost" className="h-7 w-7" title={`Añadir a ${sec.title}`} onClick={() => handleAddSupplementToDaily(sec.id, sup.name)}>
                                                    {React.cloneElement(sec.icon as React.ReactElement, { className: "h-4 w-4"})}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(sup)}><Edit className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteSupplementFromInventory(sup.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No has añadido ningún suplemento a tu inventario todavía.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={() => openDialog(null)}>
                        <Plus className="mr-2"/>
                        Añadir Nuevo Suplemento
                    </Button>
                </CardFooter>
            </Card>

            <SupplementDialog 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveSupplementToInventory}
                supplement={editingSupplement}
            />
        </div>
    );
}

type DailySupplementCardProps = {
    moment: SupplementMoment;
    title: string;
    icon: React.ReactNode;
    items: string[];
    onAdd: (moment: SupplementMoment, item: string) => void;
    onRemove: (moment: SupplementMoment, item: string) => void;
}

function DailySupplementCard({ moment, title, icon, items, onAdd, onRemove }: DailySupplementCardProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleAddClick = () => {
        if (inputRef.current?.value) {
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

type SupplementDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SupplementDefinition, 'id'>) => void;
    supplement: SupplementDefinition | null;
};

function SupplementDialog({ isOpen, onClose, onSave, supplement }: SupplementDialogProps) {
    const [name, setName] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [notes, setNotes] = useState('');
    const [recommendedDose, setRecommendedDose] = useState('');

    useEffect(() => {
        if (supplement) {
            setName(supplement.name);
            setIngredients(supplement.ingredients.join(', '));
            setNotes(supplement.notes || '');
            setRecommendedDose(supplement.recommendedDose || '');
        } else {
            setName('');
            setIngredients('');
            setNotes('');
            setRecommendedDose('');
        }
    }, [supplement]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ingredientsArray = ingredients.split(',').map(s => s.trim()).filter(Boolean);
        onSave({ name, ingredients: ingredientsArray, notes, recommendedDose });
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{supplement ? 'Editar Suplemento' : 'Añadir Suplemento al Inventario'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="sup-name">Nombre del Suplemento</Label>
                        <Input id="sup-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                     <div>
                        <Label htmlFor="sup-dose">Tomas diarias recomendadas</Label>
                        <Input id="sup-dose" value={recommendedDose} onChange={e => setRecommendedDose(e.target.value)} placeholder="Ej: 1 cápsula con la comida" />
                    </div>
                     <div>
                        <Label htmlFor="sup-ingredients">Ingredientes (separados por comas)</Label>
                        <Input id="sup-ingredients" value={ingredients} onChange={e => setIngredients(e.target.value)} />
                    </div>
                     <div>
                        <Label htmlFor="sup-notes">Notas / Descripción</Label>
                        <Textarea id="sup-notes" value={notes} onChange={e => setNotes(e.target.value)} />
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

    
