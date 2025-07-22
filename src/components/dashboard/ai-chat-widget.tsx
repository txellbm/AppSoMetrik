"use client";

import { useState, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { aiAssistantChat, AiAssistantChatInput } from "@/ai/flows/ai-assistant-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
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
          AI Wellness Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <ScrollArea className="flex-grow pr-4 h-80" ref={scrollAreaRef}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 border-2 border-primary">
                <AvatarFallback><Bot size={18}/></AvatarFallback>
              </Avatar>
              <div className="bg-muted p-3 rounded-lg max-w-xs">
                <p className="text-sm">
                  Hello! I'm your SoMetrik assistant. How can I help you understand your wellness data today?
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

  const formAction = async (prevState: any, formData: FormData) => {
    const message = formData.get("message") as string;
    if (!message.trim()) return;

    onNewMessage({ role: "user", content: message });
    formRef.current?.reset();

    const input: AiAssistantChatInput = { message };
    try {
      const { response } = await aiAssistantChat(input);
      onNewMessage({ role: "assistant", content: response });
    } catch (e) {
      onNewMessage({ role: "assistant", content: "Sorry, I encountered an error. Please try again." });
    }
  };
  
  const [state, dispatch] = useFormState(formAction, null);

  return (
    <form ref={formRef} action={dispatch} className="flex items-center gap-2">
      <Input
        name="message"
        placeholder="Ask about your health data..."
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
