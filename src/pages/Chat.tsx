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
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  getConversas, 
  createConversa, 
  getMensagens, 
  addMensagem,
  Conversa,
  Mensagem 
} from "@/lib/database";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; processo: string }[];
}

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
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversas, setLoadingConversas] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadConversas();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversas = async () => {
    try {
      const data = await getConversas();
      setConversas(data);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoadingConversas(false);
    }
  };

  const loadMensagens = async (conversaId: string) => {
    try {
      const data = await getMensagens(conversaId);
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
        sources: m.fontes as ChatMessage["sources"],
      })));
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const handleSelectConversa = async (conversa: Conversa) => {
    setConversaAtual(conversa.id);
    await loadMensagens(conversa.id);
  };

  const handleNovaConversa = async () => {
    try {
      const conversa = await createConversa("Nova conversa");
      setConversas(prev => [conversa, ...prev]);
      setConversaAtual(conversa.id);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Olá! Sou seu assistente jurídico com acesso ao sistema RAG. Posso ajudar a analisar intimações, extrair prazos, comparar decisões e muito mais. Como posso ajudar?",
        timestamp: new Date(),
      }]);
    } catch (error) {
      toast({
        title: "Erro ao criar conversa",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Se não há conversa selecionada, criar uma nova
    let currentConversaId = conversaAtual;
    if (!currentConversaId) {
      try {
        const titulo = input.substring(0, 50) + (input.length > 50 ? "..." : "");
        const conversa = await createConversa(titulo);
        setConversas(prev => [conversa, ...prev]);
        currentConversaId = conversa.id;
        setConversaAtual(conversa.id);
      } catch (error) {
        toast({
          title: "Erro ao criar conversa",
          variant: "destructive",
        });
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Salvar mensagem do usuário no banco
      await addMensagem(currentConversaId, "user", input);

      // Chamar a edge function de chat
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: [...messages, userMessage].filter(m => m.id !== "welcome").map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      const assistantContent = data.success 
        ? data.message 
        : "Desculpe, ocorreu um erro ao processar sua solicitação.";

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Salvar resposta no banco
      await addMensagem(currentConversaId, "assistant", assistantContent);
      
      // Atualizar lista de conversas
      await loadConversas();

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const showWelcome = messages.length === 0 || (messages.length === 1 && messages[0].id === "welcome");

  return (
    <AppLayout title="Chat IA" subtitle="Converse com o assistente jurídico inteligente">
      <div className="flex h-[calc(100vh-12rem)] gap-6 animate-fade-in">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 rounded-xl border border-border bg-card shadow-card">
          <div className="p-4 border-b border-border">
            <Button className="w-full justify-start gap-2" onClick={handleNovaConversa}>
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-5rem)] p-2">
            {loadingConversas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversas.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </div>
            ) : (
              conversas.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversa(conv)}
                  className={cn(
                    "w-full rounded-lg p-3 text-left transition-colors hover:bg-muted",
                    conversaAtual === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {conv.titulo}
                    </span>
                  </div>
                  {conv.ultima_mensagem && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {conv.ultima_mensagem}
                    </p>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card shadow-card">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {showWelcome && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[70%] space-y-2">
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                      <p className="text-sm">
                        Olá! Sou seu assistente jurídico com acesso ao sistema RAG. Posso ajudar a analisar intimações, extrair prazos, comparar decisões e muito mais. Como posso ajudar?
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {messages.filter(m => m.id !== "welcome").map((message) => (
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
          {showWelcome && (
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
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>Powered by Google Gemini • Sistema RAG Jurídico</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
