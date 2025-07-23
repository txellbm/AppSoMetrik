
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarEvent } from "@/ai/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type EventFormData = Omit<CalendarEvent, 'id'>;

type EditEventDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: EventFormData) => void;
    onDelete: (event: CalendarEvent) => void;
    event: CalendarEvent | null;
    defaultDate: Date | null;
};

export default function EditEventDialog({ isOpen, onClose, onSave, onDelete, event, defaultDate }: EditEventDialogProps) {
    const [formData, setFormData] = useState<Partial<EventFormData>>({});
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        if (event) {
            setFormData({
                description: event.description,
                type: event.type,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime,
            });
        } else if (defaultDate) {
            setFormData({
                description: "",
                type: "entrenamiento",
                date: format(defaultDate, 'yyyy-MM-dd'),
                startTime: format(new Date(), 'HH:mm'),
                endTime: format(new Date(new Date().getTime() + 60*60*1000), 'HH:mm'),
            });
        }
    }, [event, defaultDate, isOpen]);

    const handleChange = (field: keyof EventFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.date || !formData.description || !formData.type) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, completa todos los campos requeridos." });
            return;
        }
        onSave(formData as EventFormData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{event?.id ? "Editar Evento" : "Añadir Evento"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            name="description"
                            placeholder="Descripción"
                            value={formData.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            required
                        />
                        <Select
                            name="type"
                            value={formData.type}
                            onValueChange={(value) => handleChange('type', value as CalendarEvent['type'])}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tipo de evento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="entrenamiento">Entrenamiento</SelectItem>
                                <SelectItem value="trabajo">Trabajo</SelectItem>
                                <SelectItem value="descanso">Descanso</SelectItem>
                                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                                <SelectItem value="nota">Nota</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            name="date"
                            type="date"
                            value={formData.date || ''}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                        />
                        <Input
                            name="startTime"
                            type="time"
                            value={formData.startTime || ''}
                            onChange={(e) => handleChange('startTime', e.target.value)}
                        />
                        <Input
                            name="endTime"
                            type="time"
                            value={formData.endTime || ''}
                            onChange={(e) => handleChange('endTime', e.target.value)}
                        />
                    </div>

                    <DialogFooter className="flex justify-between w-full pt-4">
                        <div>
                            {event?.id && (
                                <Button type="button" variant="destructive" onClick={() => onDelete(event)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                             <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" /> Guardar
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

    