"use client";

import { useEffect, useState } from "react";
import { SleepData } from "@/ai/schemas";
import { collection, onSnapshot, query, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Moon, Clock, Heart, Wind, MessageSquare } from "lucide-react";
import FileUploadProcessor from "@/components/dashboard/file-upload-processor";
import { Badge } from "@/components/ui/badge";
import React from "react";

export default function SleepPage() {
    const [sleepData, setSleepData] = useState<SleepData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = "user_test_id";

    useEffect(() => {
        const userRef = doc(db, "users", userId);
        const qSleep = query(collection(userRef, "sleep"), orderBy("date", "desc"));

        const unsubscribe = onSnapshot(qSleep, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SleepData[];
            setSleepData(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error loading sleep data:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);
    
    // Helper to format date from YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateString: string) => {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="flex flex-col gap-6">
            <FileUploadProcessor 
                title="Subir Datos de Sueño de AutoSleep"
                description="Sube aquí tu archivo CSV exportado desde AutoSleep."
                dataType="sleepData"
                userId={userId}
            />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Moon className="text-primary"/>
                        Historial de Sueño
                    </CardTitle>
                    <CardDescription>
                        Un registro detallado de tus patrones de sueño. Haz clic en una noche para ver todos los detalles.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Cargando datos de sueño...</p>
                    ) : sleepData.length > 0 ? (
                        <div className="border rounded-md">
                        <Accordion type="single" collapsible className="w-full">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead> {/* For the accordion trigger */}
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Calidad (%)</TableHead>
                                        <TableHead>Eficiencia (%)</TableHead>
                                        <TableHead>Tiempo Dormido</TableHead>
                                        <TableHead>VFC (ms)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {sleepData.map(metric => (
                                    <AccordionItem value={metric.date} key={metric.date} asChild>
                                      <React.Fragment>
                                        <TableRow>
                                            <TableCell>
                                                <AccordionTrigger />
                                            </TableCell>
                                            <TableCell className="font-medium">{formatDate(metric.date)}</TableCell>
                                            <TableCell>{metric.quality || "-"}</TableCell>
                                            <TableCell>{metric.efficiency || "-"}</TableCell>
                                            <TableCell>{metric.sleepTime || "-"}</TableCell>
                                            <TableCell>{metric.hrv || "-"}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={6} className="p-0 border-none">
                                                <AccordionContent>
                                                    <div className="p-4 bg-muted/50 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                        <DetailSection icon={<Clock/>} title="Horarios">
                                                            <DetailItem label="Hora de Dormir" value={metric.bedtime} />
                                                            <DetailItem label="Hora de Despertar" value={metric.wakeUpTime} />
                                                            <DetailItem label="Tiempo en Cama" value={metric.inBedTime} unit="min" />
                                                            <DetailItem label="Tiempo Despierto" value={metric.awakeTime} unit="min" />
                                                            <DetailItem label="Para Dormirse" value={metric.timeToFallAsleep} unit="min" />
                                                        </DetailSection>

                                                        <DetailSection icon={<Wind/>} title="Salud Respiratoria">
                                                        <DetailItem label="SpO2 Media" value={metric.SPO2?.avg} unit="%" />
                                                        <DetailItem label="SpO2 Mín" value={metric.SPO2?.min} unit="%" />
                                                        <DetailItem label="SpO2 Máx" value={metric.SPO2?.max} unit="%" />
                                                        <DetailItem label="Frec. Resp. Media" value={metric.respiratoryRate} unit="rpm"/>
                                                        <DetailItem label="Frec. Resp. Mín" value={metric.respiratoryRateMin} unit="rpm"/>
                                                        <DetailItem label="Frec. Resp. Máx" value={metric.respiratoryRateMax} unit="rpm"/>
                                                        <DetailItem label="Apnea Detectada" value={metric.apnea} />
                                                        </DetailSection>

                                                        <DetailSection icon={<Heart/>} title="Salud Cardíaca">
                                                            <DetailItem label="VFC (ms)" value={metric.hrv} />
                                                            <DetailItem label="VFC 7 días (ms)" value={metric.hrv7DayAvg} />
                                                        </DetailSection>

                                                        { (metric.notes || metric.tags) &&
                                                            <DetailSection icon={<MessageSquare/>} title="Notas y Etiquetas">
                                                                {metric.tags && <div className="flex flex-wrap gap-1">{metric.tags.split(',').map(tag => <Badge key={tag} variant="secondary">{tag.trim()}</Badge>)}</div>}
                                                                {metric.notes && <p className="text-sm text-muted-foreground mt-2">{metric.notes}</p>}
                                                            </DetailSection>
                                                        }
                                                    </div>
                                                </AccordionContent>
                                            </TableCell>
                                        </TableRow>
                                      </React.Fragment>
                                    </AccordionItem>
                                ))}
                                </TableBody>
                            </Table>
                        </Accordion>
                        </div>
                    ) : (
                        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                            No hay datos de sueño registrados. Sube un archivo para empezar.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const DetailSection = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="space-y-2 rounded-lg border bg-background p-4">
        <h4 className="flex items-center gap-2 font-semibold text-sm text-primary">{icon}{title}</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6">
            {children}
        </div>
    </div>
)

const DetailItem = ({ label, value, unit }: { label: string, value?: string | number | null, unit?: string }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
        <>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value} {unit}</dd>
        </>
    )
}
