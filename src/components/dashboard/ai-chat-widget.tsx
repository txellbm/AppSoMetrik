
"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { aiAssistantChat, AiAssistantChatInput } from "@/ai/flows/ai-assistant-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, orderBy, limit } from "firebase/firestore";
import { format, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { DailyMetric, SleepData, CalendarEvent } from "@/ai/schemas";


type Message = {
  role: "user" | "assistant";
  content: string;
};

const getCyclePhase = (dayOfCycle: number | null): string => {
    if (dayOfCycle === null || dayOfCycle < 1) return "N/A";
    if (dayOfCycle <= 5) return "Menstrual";
    if (dayOfCycle <= 14) return "Folicular";
    return "Lútea";
};


export default function AIChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleNewMessage = (newMessage: Message) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-primary" />
          Asistente de Bienestar IA
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <ScrollArea className="flex-grow pr-4 h-[26rem]" ref={scrollAreaRef}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 border-2 border-primary">
                <AvatarFallback><Bot size={18}/></AvatarFallback>
              </Avatar>
              <div className="bg-muted p-3 rounded-lg max-w-xs">
                <p className="text-sm">
                  ¡Hola! Soy tu asistente SoMetrik. ¿Cómo puedo ayudarte a entender tus datos de bienestar hoy?
                </p>
              </div>
            </div>
            {messages.map((message, index) => (
              <div key={index} className={cn("flex items-start gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                  </Avatar>
                )}
                 <div className={cn("p-3 rounded-lg max-w-xs", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{message.content}</p>
                </div>
                 {message.role === "user" && (
                  <Avatar className="w-8 h-8 border-2 border-accent">
                    <AvatarFallback><User size={18}/></AvatarFallback>
                  </Avatar>
                 )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <ChatForm onNewMessage={handleNewMessage} />
      </CardContent>
    </Card>
  );
}

function ChatForm({ onNewMessage }: { onNewMessage: (message: Message) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const userId = "user_test_id";

  const formAction = async (prevState: any, formData: FormData) => {
    const message = formData.get("message") as string;
    if (!message.trim()) return;

    onNewMessage({ role: "user", content: message });
    formRef.current?.reset();
    
    // --- Data Fetching & Context Building ---
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const userRef = doc(db, "users", userId);
    
    const dailyMetricsQuery = query(collection(userRef, "dailyMetrics"), orderBy("date", "desc"));
    const sleepQuery = query(collection(userRef, "sleep_manual"), orderBy("date", "desc"), limit(1));
    const eventsQuery = query(collection(userRef, "events"), where("date", "==", todayStr));
    const recentWorkoutsQuery = query(collection(userRef, "events"), where("type", "==", "entrenamiento"), orderBy("date", "desc"), limit(5));


    const [dailyMetricsSnap, sleepSnap, eventsSnap, recentWorkoutsSnap] = await Promise.all([
        getDocs(dailyMetricsQuery),
        getDocs(sleepQuery),
        getDocs(eventsQuery),
        getDocs(recentWorkoutsQuery)
    ]);

    const dailyMetrics = dailyMetricsSnap.docs.map(d => ({...d.data(), date: d.id})) as DailyMetric[];
    const lastSleep = sleepSnap.docs.length > 0 ? sleepSnap.docs[0].data() as SleepData : null;
    const todayEvents = eventsSnap.docs.map(d => d.data()) as CalendarEvent[];
    const recentWorkouts = recentWorkoutsSnap.docs.map(d => d.data()) as CalendarEvent[];

    const sortedMenstruationDays = dailyMetrics
        .filter(m => m.estadoCiclo === 'menstruacion')
        .map(m => startOfDay(parseISO(m.date)))
        .sort((a, b) => b.getTime() - a.getTime());

    let cycleStartDay = null;
    if (sortedMenstruationDays.length > 0) {
        cycleStartDay = sortedMenstruationDays[0];
        for (let i = 1; i < sortedMenstruationDays.length; i++) {
            if (differenceInDays(sortedMenstruationDays[i - 1], sortedMenstruationDays[i]) > 1) break;
            cycleStartDay = sortedMenstruationDays[i];
        }
    }
    const dayOfCycle = cycleStartDay ? differenceInDays(startOfDay(new Date()), cycleStartDay) + 1 : null;
    const currentPhase = getCyclePhase(dayOfCycle);

    let summaryLines : string[] = [];
    if(currentPhase !== "N/A" && dayOfCycle) {
        summaryLines.push(`Ciclo: Día ${dayOfCycle}, fase ${currentPhase}.`);
    }
    if (lastSleep) {
        summaryLines.push(`Sueño de anoche: Duración de ${lastSleep.sleepTime} minutos con una eficiencia del ${lastSleep.efficiency}%.`);
    }
    if (recentWorkouts.length > 0) {
        summaryLines.push(`Entrenamientos recientes: ${recentWorkouts.map(w => `${w.description} (${w.date})`).join(', ')}.`);
    }
     if (todayEvents.length > 0) {
         summaryLines.push(`Agenda de hoy: ${todayEvents.map(e => `${e.description} de ${e.startTime} a ${e.endTime}`).join('; ')}.`);
    }
    
    const userContext = summaryLines.join(' ');
    // --- End Data Fetching ---

    const input: AiAssistantChatInput = { message, userContext: userContext || undefined };
    try {
      const { response } = await aiAssistantChat(input);
      onNewMessage({ role: "assistant", content: response });
    } catch (e) {
      onNewMessage({ role: "assistant", content: "Lo siento, encontré un error. Por favor, inténtalo de nuevo." });
    }
  };
  
  const [state, dispatch] = useActionState(formAction, null);

  return (
    <form ref={formRef} action={dispatch} className="flex items-center gap-2">
      <Input
        name="message"
        placeholder="Pregunta sobre tus datos de salud..."
        className="flex-grow"
        autoComplete="off"
      />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="icon">
      {pending ? (
        <Bot className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}
