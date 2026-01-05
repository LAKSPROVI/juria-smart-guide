import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  Filter,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Loader2,
  Eye,
  Database,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buscarLogs, buscarEstatisticasLogs, SystemLog, LogTipo, LogStatus } from "@/lib/logging";

const tipoIcons: Record<string, React.ElementType> = {
  consulta: Search,
  chat: MessageSquare,
  caderno: FileText,
  documento: FileText,
  admin: Settings,
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  sucesso: { label: "Sucesso", variant: "default", icon: CheckCircle },
  erro: { label: "Erro", variant: "destructive", icon: XCircle },
  cache: { label: "Cache", variant: "secondary", icon: Database },
};

export default function Registros() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [estatisticas, setEstatisticas] = useState<{
    total: number;
    sucesso: number;
    erro: number;
    porTipo: Record<string, number>;
  }>({ total: 0, sucesso: 0, erro: 0, porTipo: {} });
  const [logSelecionado, setLogSelecionado] = useState<SystemLog | null>(null);

  useEffect(() => {
    carregarDados();
  }, [filtroTipo, filtroStatus]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [logsData, stats] = await Promise.all([
        buscarLogs({
          tipo: filtroTipo !== "todos" ? filtroTipo as LogTipo : undefined,
          status: filtroStatus !== "todos" ? filtroStatus as LogStatus : undefined,
          limite: 200,
        }),
        buscarEstatisticasLogs(),
      ]);
      setLogs(logsData);
      setEstatisticas(stats);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatarDuracao = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      log.tipo.toLowerCase().includes(termo) ||
      log.acao.toLowerCase().includes(termo) ||
      log.entidade_tipo?.toLowerCase().includes(termo) ||
      JSON.stringify(log.detalhes).toLowerCase().includes(termo)
    );
  });

  return (
    <AppLayout
      title="Registros do Sistema"
      subtitle="Histórico completo de todas as operações e interações"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total (24h)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
              <p className="text-xs text-muted-foreground">operações registradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{estatisticas.sucesso}</div>
              <p className="text-xs text-muted-foreground">
                {estatisticas.total > 0 ? ((estatisticas.sucesso / estatisticas.total) * 100).toFixed(1) : 0}% de sucesso
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Erros</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{estatisticas.erro}</div>
              <p className="text-xs text-muted-foreground">falhas detectadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipos</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {Object.entries(estatisticas.porTipo).slice(0, 3).map(([tipo, count]) => (
                  <Badge key={tipo} variant="outline" className="text-xs">
                    {tipo}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar nos logs..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="consulta">Consultas</SelectItem>
              <SelectItem value="chat">Chat IA</SelectItem>
              <SelectItem value="caderno">Cadernos</SelectItem>
              <SelectItem value="documento">Documentos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="sucesso">Sucesso</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
              <SelectItem value="cache">Cache</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={carregarDados} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Data/Hora</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[120px]">Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Duração</TableHead>
                  <TableHead className="w-[80px]">Origem</TableHead>
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const TipoIcon = tipoIcons[log.tipo] || Activity;
                    const statusInfo = statusConfig[log.status] || statusConfig.sucesso;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatarData(log.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TipoIcon className="h-4 w-4 text-primary" />
                            <span className="capitalize text-sm">{log.tipo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{log.acao}</span>
                        </TableCell>
                        <TableCell>
                          {log.entidade_tipo ? (
                            <span className="text-sm text-muted-foreground">
                              {log.entidade_tipo}
                              {log.entidade_id && (
                                <span className="ml-1 font-mono text-xs">
                                  ({log.entidade_id.slice(0, 8)}...)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatarDuracao(log.duracao_ms)}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">
                            {log.origem}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLogSelecionado(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Log Details Dialog */}
        <Dialog open={!!logSelecionado} onOpenChange={() => setLogSelecionado(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Registro</DialogTitle>
            </DialogHeader>
            {logSelecionado && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID</p>
                    <p className="font-mono text-sm">{logSelecionado.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                    <p className="text-sm">{formatarData(logSelecionado.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                    <p className="text-sm capitalize">{logSelecionado.tipo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ação</p>
                    <p className="text-sm capitalize">{logSelecionado.acao}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[logSelecionado.status]?.variant || "default"}>
                      {logSelecionado.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duração</p>
                    <p className="text-sm">{formatarDuracao(logSelecionado.duracao_ms)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Origem</p>
                    <p className="text-sm capitalize">{logSelecionado.origem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Entidade</p>
                    <p className="text-sm">
                      {logSelecionado.entidade_tipo || "-"}
                      {logSelecionado.entidade_id && ` (${logSelecionado.entidade_id})`}
                    </p>
                  </div>
                </div>

                {logSelecionado.erro_mensagem && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Erro</p>
                    <div className="mt-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {logSelecionado.erro_mensagem}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Detalhes (JSON)</p>
                  <ScrollArea className="h-48">
                    <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto">
                      {JSON.stringify(logSelecionado.detalhes, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                {logSelecionado.user_agent && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {logSelecionado.user_agent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
