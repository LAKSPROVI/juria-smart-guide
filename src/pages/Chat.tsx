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
  Image,
  Pencil,
  Check,
  X,
  Archive,
  MoreVertical,
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
import { registrarLog } from "@/lib/logging";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatSource {
  id?: string;
  numero_processo?: string;
  secao?: string;
  score?: number;
  documento_id?: string;
  tribunal?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
  hasContext?: boolean;
  imageUrl?: string;
}

// Função para obter data/hora atual de Brasília
const getDataHoraBrasilia = () => {
  const now = new Date();
  return now.toLocaleString("pt-BR", { 
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getDataBrasilia = () => {
  const now = new Date();
  return now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const suggestedPrompts = [
  {
    icon: Calendar,
    title: "Resumir intimações do dia",
    prompt: `Considerando que hoje é ${getDataBrasilia()}, resuma todas as intimações publicadas hoje para meus clientes`,
  },
  {
    icon: Clock,
    title: "Extrair prazos",
    prompt: `Considerando a data de hoje (${getDataBrasilia()}), identifique todos os prazos processuais nos documentos recentes`,
  },
  {
    icon: Search,
    title: "Buscar por processo",
    prompt: "Busque informações sobre o processo",
  },
  {
    icon: AlertCircle,
    title: "Verificar urgências",
    prompt: `Considerando que hoje é ${getDataBrasilia()}, há alguma intimação urgente ou prazo próximo do vencimento?`,
  },
];

// Função para formatar a resposta do assistente com markdown
const formatAssistantMessage = (content: string) => {
  let formatted = content;
  
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
  formatted = formatted.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-4 my-2">$&</ul>');
  formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/\n\n/g, '</p><p class="mt-2">');
  formatted = formatted.replace(/^### (.+)$/gm, '<h4 class="font-semibold mt-3 mb-1">$1</h4>');
  formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="font-bold mt-4 mb-2">$1</h3>');
  formatted = formatted.replace(/^# (.+)$/gm, '<h2 class="font-bold text-lg mt-4 mb-2">$1</h2>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>');
  
  return formatted;
};

export default function Chat() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversas, setLoadingConversas] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
      const { data } = await supabase
        .from('conversas')
        .select('*')
        .eq('arquivado', false)
        .is('excluido_em', null)
        .order('updated_at', { ascending: false });
      
      setConversas(data || []);
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
        content: `Olá! Sou seu assistente jurídico com acesso ao sistema RAG. Hoje é **${getDataHoraBrasilia()}**. Posso ajudar a analisar intimações, extrair prazos, comparar decisões e muito mais. Como posso ajudar?`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      toast({
        title: "Erro ao criar conversa",
        variant: "destructive",
      });
    }
  };

  const handleRenameConversa = async (conversaId: string) => {
    if (!newTitle.trim()) return;
    
    try {
      await supabase
        .from('conversas')
        .update({ titulo: newTitle.trim() })
        .eq('id', conversaId);
      
      setConversas(prev => prev.map(c => 
        c.id === conversaId ? { ...c, titulo: newTitle.trim() } : c
      ));
      
      setEditingTitle(null);
      setNewTitle("");
      
      toast({
        title: "Conversa renomeada",
      });
    } catch (error) {
      toast({
        title: "Erro ao renomear conversa",
        variant: "destructive",
      });
    }
  };

  const handleArchiveConversa = async (conversaId: string) => {
    try {
      await supabase
        .from('conversas')
        .update({ arquivado: true })
        .eq('id', conversaId);
      
      if (conversaAtual === conversaId) {
        setConversaAtual(null);
        setMessages([]);
      }
      
      await loadConversas();
      
      toast({
        title: "Conversa arquivada",
      });
    } catch (error) {
      toast({
        title: "Erro ao arquivar conversa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversa = async (conversaId: string) => {
    try {
      await supabase
        .from('conversas')
        .update({ excluido_em: new Date().toISOString() })
        .eq('id', conversaId);
      
      if (conversaAtual === conversaId) {
        setConversaAtual(null);
        setMessages([]);
      }
      
      await loadConversas();
      
      toast({
        title: "Conversa movida para lixeira",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir conversa",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Envie arquivos PDF, TXT ou DOC/DOCX",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);

    try {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: `📎 Arquivo anexado: ${file.name}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      if (file.type === 'text/plain') {
        const text = await file.text();
        setInput(`Analise o seguinte documento "${file.name}":\n\n${text.substring(0, 5000)}${text.length > 5000 ? '...(texto truncado)' : ''}`);
      } else {
        setInput(`Recebi o arquivo "${file.name}". Por favor, descreva o que você gostaria que eu fizesse com este documento.`);
      }

      toast({
        title: "Arquivo anexado",
        description: `${file.name} foi adicionado à conversa`,
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast({
        title: "Erro ao processar arquivo",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Envie apenas imagens (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);

    try {
      // Converter imagem para base64 para exibir no chat
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: `📷 Imagem enviada: ${file.name}`,
          timestamp: new Date(),
          imageUrl,
        };
        setMessages(prev => [...prev, userMessage]);
        
        setInput(`Analise esta imagem "${file.name}" e descreva o que você vê. Se for um documento jurídico, extraia as informações relevantes.`);
        
        toast({
          title: "Imagem anexada",
          description: `${file.name} foi adicionada à conversa`,
        });
        
        setUploadingFile(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast({
        title: "Erro ao processar imagem",
        variant: "destructive",
      });
      setUploadingFile(false);
    } finally {
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const inicio = Date.now();
    const dataHoraAtual = getDataHoraBrasilia();

    let currentConversaId = conversaAtual;
    if (!currentConversaId) {
      try {
        const titulo = input.substring(0, 50) + (input.length > 50 ? "..." : "");
        const conversa = await createConversa(titulo);
        setConversas(prev => [conversa, ...prev]);
        currentConversaId = conversa.id;
        setConversaAtual(conversa.id);
        
        await registrarLog({
          tipo: 'chat',
          acao: 'criar',
          entidade_tipo: 'conversa',
          entidade_id: conversa.id,
          detalhes: { titulo },
        });
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
      await addMensagem(currentConversaId, "user", input);

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          messages: [...messages, userMessage].filter(m => m.id !== "welcome").map(m => ({
            role: m.role,
            content: m.content,
          })),
          context: `INFORMAÇÃO IMPORTANTE: A data e hora atual (horário de Brasília) é: ${dataHoraAtual}. Use essa informação para responder perguntas sobre prazos, urgências e datas.`,
        },
      });

      if (error) throw error;

      const assistantContent = data.success 
        ? data.message 
        : "Desculpe, ocorreu um erro ao processar sua solicitação.";

      const fontes = data.fontes || [];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
        sources: fontes,
        hasContext: data.hasContext,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      await addMensagem(currentConversaId, "assistant", assistantContent, fontes.length > 0 ? fontes : null);
      
      await registrarLog({
        tipo: 'chat',
        acao: 'enviar',
        entidade_tipo: 'conversa',
        entidade_id: currentConversaId,
        detalhes: { 
          pergunta_length: input.length, 
          resposta_length: assistantContent.length,
        },
        duracao_ms: Date.now() - inicio,
      });
      
      await loadConversas();

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      await registrarLog({
        tipo: 'chat',
        acao: 'erro',
        entidade_tipo: 'conversa',
        entidade_id: currentConversaId,
        status: 'erro',
        erro_mensagem: error instanceof Error ? error.message : String(error),
        duracao_ms: Date.now() - inicio,
      });
      
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
                <div
                  key={conv.id}
                  className={cn(
                    "w-full rounded-lg p-3 transition-colors hover:bg-muted group",
                    conversaAtual === conv.id && "bg-muted"
                  )}
                >
                  {editingTitle === conv.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameConversa(conv.id);
                          if (e.key === 'Escape') setEditingTitle(null);
                        }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleRenameConversa(conv.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditingTitle(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSelectConversa(conv)}
                        className="flex-1 text-left"
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTitle(conv.id);
                              setNewTitle(conv.titulo);
                            }}
                          >
                            <Pencil className="mr-2 h-3 w-3" />
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchiveConversa(conv.id)}>
                            <Archive className="mr-2 h-3 w-3" />
                            Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteConversa(conv.id)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
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
                      <p 
                        className="text-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: formatAssistantMessage(`Olá! Sou seu assistente jurídico com acesso ao sistema RAG. Hoje é **${getDataHoraBrasilia()}**. Posso ajudar a analisar intimações, extrair prazos, comparar decisões e muito mais. Como posso ajudar?`)
                        }}
                      />
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
                    {message.imageUrl && (
                      <img 
                        src={message.imageUrl} 
                        alt="Imagem enviada" 
                        className="max-w-full rounded-lg max-h-64 object-contain"
                      />
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        message.role === "assistant"
                          ? "bg-muted text-foreground rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div 
                          className="text-sm prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ 
                            __html: formatAssistantMessage(message.content)
                          }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Fontes:</span>
                        {message.sources.slice(0, 5).map((source, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs font-normal"
                            title={source.score ? `Score: ${(source.score * 100).toFixed(0)}%` : undefined}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            {source.numero_processo || source.secao || `Doc ${i + 1}`}
                          </Badge>
                        ))}
                        {message.sources.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{message.sources.length - 5} mais
                          </Badge>
                        )}
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
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
              />
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingFile}
                title="Enviar imagem"
              >
                {uploadingFile ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Image className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                title="Anexar arquivo (PDF, TXT, DOC)"
              >
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
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                <span>Powered by Google Gemini • Sistema RAG Jurídico</span>
              </div>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getDataBrasilia()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
