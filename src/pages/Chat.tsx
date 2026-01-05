import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  Bot,
  User,
  FileText,
  Sparkles,
  Clock,
  MessageSquare,
  Plus,
  Search,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; processo: string }[];
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  date: Date;
}

const conversations: Conversation[] = [
  {
    id: "1",
    title: "Análise de intimações do dia",
    lastMessage: "Encontrei 15 novas intimações para os clientes...",
    date: new Date(),
  },
  {
    id: "2",
    title: "Prazos da semana",
    lastMessage: "Os prazos processuais identificados são...",
    date: new Date(Date.now() - 86400000),
  },
  {
    id: "3",
    title: "Processo 1234567-89",
    lastMessage: "O último andamento registrado foi...",
    date: new Date(Date.now() - 172800000),
  },
];

const suggestedPrompts = [
  {
    icon: Calendar,
    title: "Resumir intimações do dia",
    prompt: "Resuma todas as intimações publicadas hoje para meus clientes",
  },
  {
    icon: Clock,
    title: "Extrair prazos",
    prompt: "Identifique todos os prazos processuais nos documentos recentes",
  },
  {
    icon: Search,
    title: "Buscar por processo",
    prompt: "Busque informações sobre o processo",
  },
  {
    icon: AlertCircle,
    title: "Verificar urgências",
    prompt: "Há alguma intimação urgente ou prazo próximo do vencimento?",
  },
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Olá! Sou seu assistente jurídico com acesso ao sistema RAG. Posso ajudar a analisar intimações, extrair prazos, comparar decisões e muito mais. Como posso ajudar?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Analisei os documentos disponíveis no sistema RAG. Com base nas publicações dos últimos dias, encontrei informações relevantes sobre sua consulta. Os dados mostram que há 3 novas intimações relacionadas aos processos monitorados, sendo que uma delas possui prazo de 15 dias corridos para manifestação.",
        timestamp: new Date(),
        sources: [
          { title: "DJE TJSP 25/12/2025", processo: "1234567-89.2024.8.26.0100" },
          { title: "DJE TJSP 24/12/2025", processo: "9876543-21.2024.8.26.0050" },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <AppLayout title="Chat IA" subtitle="Converse com o assistente jurídico inteligente">
      <div className="flex h-[calc(100vh-12rem)] gap-6 animate-fade-in">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 rounded-xl border border-border bg-card shadow-card">
          <div className="p-4 border-b border-border">
            <Button className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-5rem)] p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-colors hover:bg-muted",
                  conv.id === "1" && "bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {conv.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {conv.lastMessage}
                </p>
              </button>
            ))}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card shadow-card">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={cn(
                        message.role === "assistant"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[70%] space-y-2",
                      message.role === "user" && "text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        message.role === "assistant"
                          ? "bg-muted text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            {source.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]"></span>
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Suggested Prompts */}
          {messages.length === 1 && (
            <div className="border-t border-border p-4">
              <p className="text-sm text-muted-foreground mb-3">
                Sugestões de consulta:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptClick(prompt.prompt)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <prompt.icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{prompt.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Input
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>Powered by Google Gemini • RAG com 2.4k documentos</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
