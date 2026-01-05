import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Activity,
  Cpu,
  Play,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilaItem {
  id: string;
  documento_id: string | null;
  caderno_id: string | null;
  status: string;
  progresso: number;
  total_chunks: number;
  chunks_processados: number;
  erro_mensagem: string | null;
  prioridade: number;
  created_at: string;
  iniciado_em: string | null;
  finalizado_em: string | null;
  documento?: { nome: string; tipo: string; status: string } | null;
  caderno?: { tribunal: string; data: string; status: string } | null;
}

interface LogItem {
  id: string;
  tipo: string;
  acao: string;
  status: string;
  erro_mensagem: string | null;
  duracao_ms: number | null;
  created_at: string;
  detalhes: Record<string, unknown>;
  entidade_tipo: string | null;
  entidade_id: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; class: string; animate?: boolean }> = {
  pendente: { label: "Pendente", icon: Clock, class: "bg-warning/10 text-warning" },
  processando: { label: "Processando", icon: Loader2, class: "bg-primary/10 text-primary", animate: true },
  concluido: { label: "Concluído", icon: CheckCircle, class: "bg-success/10 text-success" },
  erro: { label: "Erro", icon: AlertCircle, class: "bg-destructive/10 text-destructive" },
};

export default function MonitorProcessamento() {
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("fila");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [stats, setStats] = useState({ pendente: 0, processando: 0, concluido: 0, erro: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [filaResult, logsResult] = await Promise.all([
        supabase
          .from("fila_processamento_rag")
          .select(`
            *,
            documento:documentos(nome, tipo, status),
            caderno:cadernos(tribunal, data, status)
          `)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("system_logs")
          .select("*")
          .in("tipo", ["documento", "caderno", "chat"])
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (filaResult.data) {
        setFila(filaResult.data as unknown as FilaItem[]);
        
        const statsCalc = filaResult.data.reduce(
          (acc, item) => {
            const s = item.status as keyof typeof acc;
            if (acc[s] !== undefined) acc[s]++;
            return acc;
          },
          { pendente: 0, processando: 0, concluido: 0, erro: 0 }
        );
        setStats(statsCalc);
      }

      if (logsResult.data) {
        setLogs(logsResult.data as unknown as LogItem[]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const reprocessar = async (item: FilaItem) => {
    try {
      await supabase
        .from("fila_processamento_rag")
        .update({ status: "pendente", erro_mensagem: null, progresso: 0, chunks_processados: 0 })
        .eq("id", item.id);

      if (item.documento_id) {
        await supabase.from("documentos").update({ status: "processando" }).eq("id", item.documento_id);

        await supabase.functions.invoke("processar-documento-rag", {
          body: { documento_id: item.documento_id },
        });
      }

      toast({ title: "Reprocessamento iniciado" });
      loadData();
    } catch (error) {
      console.error("Erro ao reprocessar:", error);
      toast({ variant: "destructive", title: "Erro ao reprocessar" });
    }
  };

  const cancelar = async (item: FilaItem) => {
    try {
      await supabase
        .from("fila_processamento_rag")
        .update({ status: "erro", erro_mensagem: "Cancelado pelo usuário" })
        .eq("id", item.id);

      if (item.documento_id) {
        await supabase.from("documentos").update({ status: "erro", erro_mensagem: "Processamento cancelado" }).eq("id", item.documento_id);
      }

      toast({ title: "Processamento cancelado" });
      loadData();
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast({ variant: "destructive", title: "Erro ao cancelar" });
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const filteredFila = fila.filter((item) => {
    const nome = item.documento?.nome || item.caderno?.tribunal || "";
    return nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredLogs = logs.filter((log) => {
    const searchStr = `${log.tipo} ${log.acao} ${log.erro_mensagem || ""}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <AppLayout title="Monitor de Processamento" subtitle="Acompanhe o processamento de documentos e cadernos">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Monitor de Processamento" subtitle="Acompanhe o processamento de documentos e cadernos">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-warning/10 p-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendente}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Cpu className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.processando}</p>
                <p className="text-sm text-muted-foreground">Processando</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-success/10 p-3">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.concluido}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-destructive/10 p-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.erro}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="fila">
              <Cpu className="mr-2 h-4 w-4" />
              Fila RAG ({fila.length})
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="mr-2 h-4 w-4" />
              Logs ({logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fila" className="space-y-4">
            <div className="rounded-xl border border-border bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Documento/Caderno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFila.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Cpu className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">Nenhum item na fila</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFila.map((item) => {
                      const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pendente;
                      const StatusIcon = status.icon;
                      const nome = item.documento?.nome || (item.caderno ? `Caderno ${item.caderno.tribunal} - ${item.caderno.data}` : "Desconhecido");
                      const isExpanded = expandedItem === item.id;

                      return (
                        <>
                          <TableRow key={item.id} className="cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                            <TableCell>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-muted p-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm truncate max-w-[200px]">{nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.documento?.tipo || "caderno"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.class}>
                                <StatusIcon className={cn("mr-1 h-3 w-3", status.animate && "animate-spin")} />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Progress value={item.progresso} className="h-2 w-24" />
                                <p className="text-xs text-muted-foreground">
                                  {item.chunks_processados}/{item.total_chunks} chunks
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(item.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {item.status === "erro" && (
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); reprocessar(item); }}>
                                    <Play className="mr-1 h-3 w-3" />
                                    Reprocessar
                                  </Button>
                                )}
                                {item.status === "processando" && (
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); cancelar(item); }}>
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${item.id}-details`}>
                              <TableCell colSpan={6} className="bg-muted/30">
                                <div className="p-4 space-y-3">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Prioridade</p>
                                      <p className="font-medium">{item.prioridade}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Iniciado em</p>
                                      <p className="font-medium">{item.iniciado_em ? formatDate(item.iniciado_em) : "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Finalizado em</p>
                                      <p className="font-medium">{item.finalizado_em ? formatDate(item.finalizado_em) : "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">ID do Documento</p>
                                      <p className="font-medium font-mono text-xs">{item.documento_id || item.caderno_id || "-"}</p>
                                    </div>
                                  </div>
                                  {item.erro_mensagem && (
                                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                                      <p className="text-sm font-medium text-destructive mb-1">Erro:</p>
                                      <p className="text-sm text-destructive/80">{item.erro_mensagem}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <ScrollArea className="h-[600px] rounded-xl border border-border bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">Nenhum log encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.acao}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs",
                              log.status === "sucesso" && "bg-success/10 text-success",
                              log.status === "erro" && "bg-destructive/10 text-destructive",
                              log.status === "cache" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(log.duracao_ms)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {log.erro_mensagem ? (
                            <span className="text-xs text-destructive truncate block">{log.erro_mensagem}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground truncate block">
                              {log.detalhes ? JSON.stringify(log.detalhes).substring(0, 50) : "-"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
