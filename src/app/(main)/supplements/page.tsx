
"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, addDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, X, Coffee, Sun, Moon, Dumbbell, Edit, Trash2, BookMarked, Info, Repeat, Briefcase, CalendarClock, FileText, Copy } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarEvent } from "@/ai/schemas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type SupplementMoment = "desayuno" | "comida" | "cena" | "preEntreno" | "postEntreno";

type TakenSupplement = {
    name: string;
    dose: number;
};

type DailySupplementData = {
    [key in SupplementMoment]?: TakenSupplement[];
};

type Ingredient = {
    name: string;
    amount: string;
}

type SupplementDefinition = {
    id: string;
    name: string;
    ingredients: Ingredient[];
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
    const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplement, setEditingSupplement] = useState<SupplementDefinition | null>(null);

    const { toast } = useToast();
    const userId = "user_test_id";
    const today = format(new Date(), "yyyy-MM-dd");

    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');


    // Fetch daily supplement intake
    useEffect(() => {
        if(!userId || !today) return;
        try {
            const docRef = doc(db, "users", userId, "supplements", today);
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    setDailySupplements(doc.data() as DailySupplementData);
                } else {
                    setDailySupplements({});
                }
            }, (error) => {
                console.error("Error loading daily supplements:", error);
                if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                }
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up Firestore listener for daily supplements:", error);
        }
    }, [userId, today]);

    // Fetch supplement inventory
    useEffect(() => {
        setIsLoading(true);
        if(!userId) return;
        try {
            const inventoryColRef = collection(db, "users", userId, "user_supplements");
            const unsubscribe = onSnapshot(inventoryColRef, (snapshot) => {
                const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplementDefinition));
                setSupplementInventory(inventory);
                setIsLoading(false);
            }, (error) => {
                console.error("Error loading supplement inventory:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Data will be loaded from cache if available.");
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up Firestore listener for supplement inventory:", error);
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch today's events
    useEffect(() => {
        const fetchTodaysEvents = async () => {
            if(!userId || !today) return;
            try {
                const eventsColRef = collection(db, "users", userId, "events");
                const q = query(eventsColRef, where("date", "==", today));
                const querySnapshot = await getDocs(q);
                const events = querySnapshot.docs.map(doc => doc.data() as CalendarEvent).sort((a,b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
                setTodaysEvents(events);
            } catch(error) {
                console.error("Error fetching today's events:", error);
                 if ((error as any).code === 'unavailable') {
                    console.warn("Firestore is offline. Events will not be loaded.");
                }
            }
        };
        fetchTodaysEvents();
    }, [userId, today]);
    
    const handleAddSupplementToDaily = async (moment: SupplementMoment, item: TakenSupplement) => {
        if (!item.name.trim() || item.dose <= 0) {
            toast({ variant: "destructive", title: "Datos inválidos", description: "Selecciona un suplemento y una dosis válida." });
            return;
        }
        if (!userId) return;
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
                description: `${item.name} (${item.dose}) ha sido añadido a ${moment}.`,
            });
        } catch (error) {
            console.error("Error adding supplement:", error);
             if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo añadir el suplemento. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error al añadir", description: "No se pudo añadir el suplemento." });
            }
        }
    };
    
    const handleRemoveSupplementFromDaily = async (moment: SupplementMoment, item: TakenSupplement) => {
        if (!userId) return;
        const docRef = doc(db, "users", userId, "supplements", today);
        try {
            await updateDoc(docRef, { [moment]: arrayRemove(item) });
            toast({
                title: "Suplemento eliminado",
                description: `${item.name} ha sido eliminado de ${moment}.`,
                variant: "destructive"
            });
        } catch (error) {
            console.error("Error removing supplement:", error);
            if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo eliminar el suplemento. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el suplemento." });
            }
        }
    };

    const handleSaveSupplementToInventory = async (data: Omit<SupplementDefinition, 'id'>) => {
        if (!userId) return;
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
            if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo guardar el suplemento. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el suplemento." });
            }
        }
    };
    
    const handleDeleteSupplementFromInventory = async (supplementId: string) => {
        if (!userId) return;
        try {
            await deleteDoc(doc(db, "users", userId, "user_supplements", supplementId));
            toast({ title: "Suplemento eliminado del inventario", variant: 'destructive' });
        } catch(error) {
             console.error("Error deleting supplement from inventory:", error);
            if ((error as any).code === 'unavailable') {
                toast({ variant: "destructive", title: "Sin conexión", description: "No se pudo eliminar el suplemento. Revisa tu conexión a internet." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el suplemento del inventario." });
            }
        }
    };

    const openDialog = (supplement: SupplementDefinition | null) => {
        setEditingSupplement(supplement);
        setIsDialogOpen(true);
    };

    const generateReport = () => {
        let report = `Informe de Suplementos (Hoy: ${today})\n`;
        report += "========================================\n\n";

        report += `**Consumo Diario**\n`;
        const hasDailyIntake = Object.values(dailySupplements).some(arr => arr.length > 0);
        if(!hasDailyIntake) {
            report += "No hay suplementos registrados para hoy.\n";
        } else {
            supplementSections.forEach(section => {
                if(dailySupplements[section.id] && dailySupplements[section.id]!.length > 0) {
                    report += `\n*${section.title}*\n`;
                    dailySupplements[section.id]!.forEach(item => {
                        report += `  - ${item.name} (${item.dose})\n`;
                    });
                }
            });
        }
        
        report += "\n\n**Inventario de Suplementos**\n";
        if(supplementInventory.length === 0) {
            report += "No hay suplementos en el inventario.\n";
        } else {
            supplementInventory.forEach(sup => {
                report += `\n* ${sup.name}\n`;
                if(sup.recommendedDose) report += `  - Dosis: ${sup.recommendedDose}\n`;
                if(sup.ingredients?.length > 0) {
                    report += `  - Ingredientes: ${sup.ingredients.map(i => `${i.name} (${i.amount})`).join(', ')}\n`;
                }
                if(sup.notes) report += `  - Notas: ${sup.notes}\n`;
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Pill className="text-primary"/>
                                Registro de Suplementos para Hoy ({today})
                            </CardTitle>
                            <CardDescription>
                                Añade los suplementos que tomas en cada momento del día desde tu inventario.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {supplementSections.map(({ id, title, icon }) => (
                                <DailySupplementCard 
                                    key={id}
                                    moment={id}
                                    title={title}
                                    icon={icon}
                                    items={dailySupplements[id] || []}
                                    inventory={supplementInventory}
                                    onAdd={handleAddSupplementToDaily}
                                    onRemove={handleRemoveSupplementFromDaily}
                                />
                            ))}
                        </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                               <CalendarClock className="text-primary"/>
                               Agenda de Hoy
                            </CardTitle>
                             <CardDescription>
                                Tus entrenamientos y trabajo de hoy.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             {todaysEvents.length > 0 ? (
                                todaysEvents.map(event => {
                                    if (event.type === 'entrenamiento' || event.type === 'trabajo') {
                                        return (
                                            <div key={event.id} className="flex items-center gap-3 bg-muted p-2 rounded-lg">
                                                {event.type === 'entrenamiento' ? <Dumbbell className="h-5 w-5 text-blue-500"/> : <Briefcase className="h-5 w-5 text-purple-500"/>}
                                                <div>
                                                    <p className="font-semibold text-sm">{event.description}</p>
                                                    <p className="text-xs text-muted-foreground">{event.startTime} - {event.endTime}</p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                })
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay entrenamientos o trabajo programado para hoy.</p>
                            )}
                        </CardContent>
                    </Card>
                 </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BookMarked className="text-primary"/>
                            Mis Suplementos
                        </CardTitle>
                         <CardDescription>
                            Tu inventario personal de suplementos. Añade, edita y gestiona tus productos.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={generateReport}><FileText className="mr-2 h-4 w-4"/>Exportar</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                        <p>Cargando inventario...</p>
                    ) : supplementInventory.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                                {sup.ingredients?.map((ing, i) => <Badge key={i} variant="secondary">{ing.name}: {ing.amount}</Badge>)}
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
                                                <Button key={sec.id} size="icon" variant="ghost" className="h-7 w-7" title={`Añadir a ${sec.title}`} onClick={() => handleAddSupplementToDaily(sec.id, { name: sup.name, dose: 1 })}>
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

            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Informe de Suplementos</DialogTitle>
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

type DailySupplementCardProps = {
    moment: SupplementMoment;
    title: string;
    icon: React.ReactNode;
    items: TakenSupplement[];
    inventory: SupplementDefinition[];
    onAdd: (moment: SupplementMoment, item: TakenSupplement) => void;
    onRemove: (moment: SupplementMoment, item: TakenSupplement) => void;
}

function DailySupplementCard({ moment, title, icon, items, inventory, onAdd, onRemove }: DailySupplementCardProps) {
    const [selectedSupplement, setSelectedSupplement] = useState('');
    const [dose, setDose] = useState(1);
    
    const handleAddClick = () => {
        if (selectedSupplement) {
            onAdd(moment, { name: selectedSupplement, dose: dose });
            setSelectedSupplement('');
            setDose(1);
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
                    <Select value={selectedSupplement} onValueChange={setSelectedSupplement}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar suplemento..." />
                        </SelectTrigger>
                        <SelectContent>
                            {inventory.map(sup => (
                                <SelectItem key={sup.id} value={sup.name}>{sup.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input 
                        type="number"
                        value={dose}
                        onChange={(e) => setDose(Number(e.target.value))}
                        className="h-9 w-20"
                        min="0"
                        step="0.5"
                    />
                    <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleAddClick}><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[36px]">
                    {items.map((item, index) => (
                        <Badge key={index} variant="secondary" className="py-1 px-2 text-sm font-normal">
                           {item.name} ({item.dose})
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
    const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '' }]);
    const [notes, setNotes] = useState('');
    const [recommendedDose, setRecommendedDose] = useState('');

    useEffect(() => {
        if (supplement) {
            setName(supplement.name);
            setIngredients(supplement.ingredients?.length > 0 ? supplement.ingredients : [{ name: '', amount: '' }]);
            setNotes(supplement.notes || '');
            setRecommendedDose(supplement.recommendedDose || '');
        } else {
            setName('');
            setIngredients([{ name: '', amount: '' }]);
            setNotes('');
            setRecommendedDose('');
        }
    }, [supplement]);

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const addIngredientField = () => {
        setIngredients([...ingredients, { name: '', amount: '' }]);
    };

    const removeIngredientField = (index: number) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalIngredients = ingredients.filter(ing => ing.name.trim() !== '');
        onSave({ name, ingredients: finalIngredients, notes, recommendedDose });
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                     
                    <div className="space-y-2">
                        <Label>Ingredientes</Label>
                        {ingredients.map((ing, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input 
                                    value={ing.name} 
                                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                    placeholder="Nombre del ingrediente"
                                    className="flex-grow"
                                />
                                <Input 
                                    value={ing.amount} 
                                    onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                                    placeholder="Cantidad (ej: 500mg)"
                                    className="w-32"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredientField(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addIngredientField}>
                            <Plus className="mr-2 h-4 w-4" /> Añadir Ingrediente
                        </Button>
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
