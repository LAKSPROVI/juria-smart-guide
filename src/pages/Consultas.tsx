import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Play,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  History,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { consultarIntimacoes, forcarAtualizacaoConsulta, IntimacaoResult } from "@/lib/api";
import { 
  getConsultas, 
  createConsulta, 
  updateConsulta, 
  deleteConsulta,
  saveResultados,
  Consulta 
} from "@/lib/database";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { TribunalSelector } from "@/components/TribunalSelector";

// Lista completa de horários disponíveis (todas as horas)
const horariosDisponiveis = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

export default function Consultas() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConsultas, setLoadingConsultas] = useState(true);
  const [resultados, setResultados] = useState<IntimacaoResult[]>([]);
  const [consultaAtual, setConsultaAtual] = useState<Consulta | null>(null);
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formTribunais, setFormTribunais] = useState<string[]>([]);
  const [formTribunal, setFormTribunal] = useState("");
  const [formTipo, setFormTipo] = useState("");
  const [formTermo, setFormTermo] = useState("");
  const [formNumeroOab, setFormNumeroOab] = useState("");
  const [formUfOab, setFormUfOab] = useState("");
  const [formDataInicio, setFormDataInicio] = useState("");
  const [formDataFim, setFormDataFim] = useState("");
  const [formRecorrencia, setFormRecorrencia] = useState("manual");
  const [formHorarios, setFormHorarios] = useState<string[]>(["09:00"]);
  const [formModoBusca, setFormModoBusca] = useState<"diaria" | "periodo">("diaria");

  useEffect(() => {
    loadConsultas();
  }, []);

  const loadConsultas = async () => {
    try {
      const data = await getConsultas();
      setConsultas(data);
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      toast({
        title: "Erro ao carregar consultas",
        description: "Não foi possível carregar as consultas salvas.",
        variant: "destructive",
      });
    } finally {
      setLoadingConsultas(false);
    }
  };

  // Verificar se já existe uma consulta similar
  const verificarDuplicata = (tribunais: string[], termo: string, tipo: string) => {
    return consultas.find(c => 
      tribunais.includes(c.tribunal) && 
      c.termo.toLowerCase() === termo.toLowerCase() &&
      c.tipo === tipo
    );
  };

  const handleExecutar = async (consulta: Consulta, forcarAtualizacao = false) => {
    setLoading(true);
    setConsultaAtual(consulta);
    
    try {
      toast({
        title: forcarAtualizacao ? "Forçando atualização..." : "Executando consulta...",
        description: `Buscando intimações para "${consulta.termo}"`,
      });

      const consultaFn = forcarAtualizacao ? forcarAtualizacaoConsulta : consultarIntimacoes;
      const response = await consultaFn({
        termo: consulta.termo,
        numeroOab: consulta.numero_oab,
        ufOab: consulta.uf_oab,
        siglaTribunal: consulta.tribunal,
        dataInicial: consulta.data_inicial,
        dataFinal: consulta.data_final,
      }, consulta.id);

      console.log("Resposta da API:", response);

      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        setResultados(data);
        setResultadosOpen(true);
        
        // Salvar resultados no banco apenas se houver dados e não for do cache
        if (data.length > 0 && !response.fromCache) {
          await saveResultados(consulta.id, data);
        }
        
        // Atualizar última execução
        await updateConsulta(consulta.id, { 
          ultima_execucao: new Date().toISOString() 
        });
        
        await loadConsultas();

        if (data.length > 0) {
          const cacheInfo = response.fromCache ? " (do cache)" : "";
          toast({
            title: `Consulta executada com sucesso!${cacheInfo}`,
            description: response.message || `${data.length} intimação(ões) encontrada(s).`,
          });
        } else {
          toast({
            title: "Consulta executada",
            description: response.message || "Nenhuma intimação encontrada para os critérios informados.",
          });
        }
      } else {
        toast({
          title: "Erro na consulta",
          description: response.error || "Não foi possível executar a consulta.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro na consulta:", error);
      toast({
        title: "Erro ao executar consulta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (consulta: Consulta) => {
    try {
      await updateConsulta(consulta.id, { ativo: !consulta.ativo });
      await loadConsultas();
      toast({
        title: consulta.ativo ? "Consulta desativada" : "Consulta ativada",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar consulta",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (consulta: Consulta) => {
    if (!confirm(`Tem certeza que deseja excluir a consulta "${consulta.nome}"?`)) {
      return;
    }
    
    try {
      await deleteConsulta(consulta.id);
      await loadConsultas();
      toast({
        title: "Consulta excluída",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir consulta",
        variant: "destructive",
      });
    }
  };

  const toggleHorario = (horario: string) => {
    setFormHorarios(prev => 
      prev.includes(horario) 
        ? prev.filter(h => h !== horario)
        : [...prev, horario].sort()
    );
  };

  const handleCriarConsulta = async () => {
    try {
      const tribunaisParaCriar = formTribunais.length > 0 ? formTribunais : [formTribunal];
      
      // Verificar duplicatas
      const duplicata = verificarDuplicata(tribunaisParaCriar, formTermo, formTipo);
      if (duplicata) {
        toast({
          title: "Consulta já existe",
          description: `Já existe uma consulta para "${formTermo}" no tribunal ${duplicata.tribunal}.`,
          variant: "destructive",
        });
        return;
      }

      // Criar UMA única consulta com todos os tribunais no campo tribunal (separados por vírgula)
      // Isso evita criar múltiplos eventos para a mesma busca
      const tribunaisStr = tribunaisParaCriar.join(",");
      
      await createConsulta({
        nome: formNome || `${formTermo} - ${tribunaisParaCriar.length > 1 ? `${tribunaisParaCriar.length} tribunais` : tribunaisParaCriar[0]}`,
        tribunal: tribunaisStr,
        tipo: formTipo,
        termo: formTermo,
        numero_oab: formNumeroOab || undefined,
        uf_oab: formUfOab || undefined,
        // Se modo busca for diária automatizada, não usar datas
        data_inicial: formModoBusca === "diaria" ? undefined : formDataInicio || undefined,
        data_final: formModoBusca === "diaria" ? undefined : formDataFim || undefined,
        recorrencia: formRecorrencia,
        horarios: formHorarios,
        ativo: true,
      });

      setOpen(false);
      await loadConsultas();
      
      resetForm();
      
      toast({
        title: "Consulta criada",
        description: tribunaisParaCriar.length > 1 
          ? `Consulta configurada para ${tribunaisParaCriar.length} tribunais.`
          : "A nova consulta foi configurada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao criar consulta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleEditConsulta = (consulta: Consulta) => {
    setEditingConsulta(consulta);
    setFormNome(consulta.nome);
    setFormTribunal(consulta.tribunal);
    setFormTipo(consulta.tipo);
    setFormTermo(consulta.termo);
    setFormNumeroOab(consulta.numero_oab || "");
    setFormUfOab(consulta.uf_oab || "");
    setFormDataInicio(consulta.data_inicial || "");
    setFormDataFim(consulta.data_final || "");
    setFormRecorrencia(consulta.recorrencia);
    setFormHorarios(consulta.horarios || ["09:00"]);
    setFormModoBusca(consulta.data_inicial ? "periodo" : "diaria");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingConsulta) return;
    
    try {
      await updateConsulta(editingConsulta.id, {
        nome: formNome || `${formTermo} - ${formTribunal}`,
        tribunal: formTribunal,
        tipo: formTipo,
        termo: formTermo,
        numero_oab: formNumeroOab || undefined,
        uf_oab: formUfOab || undefined,
        data_inicial: formModoBusca === "diaria" ? null : formDataInicio || undefined,
        data_final: formModoBusca === "diaria" ? null : formDataFim || undefined,
        recorrencia: formRecorrencia,
        horarios: formHorarios,
      });

      setEditOpen(false);
      setEditingConsulta(null);
      await loadConsultas();
      resetForm();
      
      toast({
        title: "Consulta atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar consulta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormNome("");
    setFormTribunal("");
    setFormTribunais([]);
    setFormTipo("");
    setFormTermo("");
    setFormNumeroOab("");
    setFormUfOab("");
    setFormDataInicio("");
    setFormDataFim("");
    setFormRecorrencia("manual");
    setFormHorarios(["09:00"]);
    setFormModoBusca("diaria");
  };

  const formatRecorrencia = (consulta: Consulta) => {
    if (consulta.recorrencia === "manual") return "Manual";
    if (consulta.recorrencia === "diaria") {
      const modoBusca = consulta.data_inicial ? "Período" : "Diária";
      return `${modoBusca} - ${consulta.horarios?.join(", ") || "09:00"}`;
    }
    if (consulta.recorrencia === "semanal") return "Semanal";
    return consulta.recorrencia;
  };

  const formatUltimaExecucao = (data?: string) => {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  };

  const filteredConsultas = consultas.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.termo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tribunal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout
      title="Consultas"
      subtitle="Configure e gerencie suas buscas automatizadas na ComunicaAPI"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar consultas..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => navigate("/resultados")}>
              <History className="mr-2 h-4 w-4" />
              Ver Histórico
            </Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nova Consulta</DialogTitle>
                <DialogDescription>
                  Configure uma nova busca automatizada na ComunicaAPI.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome da Consulta</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Márcia Gabriela - TJSP"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tribunais</Label>
                  <TribunalSelector
                    value={formTribunais}
                    onChange={setFormTribunais}
                    placeholder="Selecione um ou mais tribunais..."
                    multiple={true}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecione múltiplos tribunais - será criada UMA consulta para todos
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de Busca</Label>
                  <Select value={formTipo} onValueChange={setFormTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nome_advogado">Nome Advogado</SelectItem>
                      <SelectItem value="oab">Número OAB</SelectItem>
                      <SelectItem value="processo">Número Processo</SelectItem>
                      <SelectItem value="parte">Nome Parte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="termo">Termo de Busca</Label>
                  <Input
                    id="termo"
                    placeholder="Ex: Márcia Gabriela de Abreu"
                    value={formTermo}
                    onChange={(e) => setFormTermo(e.target.value)}
                  />
                </div>

                {formTipo === "oab" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="numeroOab">Número OAB</Label>
                      <Input
                        id="numeroOab"
                        placeholder="Ex: 123456"
                        value={formNumeroOab}
                        onChange={(e) => setFormNumeroOab(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ufOab">UF OAB</Label>
                      <Input
                        id="ufOab"
                        placeholder="Ex: SP"
                        value={formUfOab}
                        onChange={(e) => setFormUfOab(e.target.value.toUpperCase())}
                        maxLength={2}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Modo de Busca</Label>
                  <Select value={formModoBusca} onValueChange={(v) => setFormModoBusca(v as "diaria" | "periodo")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Busca Diária Automática (sempre últimos 30 dias)</SelectItem>
                      <SelectItem value="periodo">Período Específico (escolher datas)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formModoBusca === "diaria" 
                      ? "A busca sempre considerará os últimos 30 dias automaticamente" 
                      : "Defina um período específico para a consulta"}
                  </p>
                </div>

                {formModoBusca === "periodo" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dataInicio">Data Inicial</Label>
                      <Input 
                        id="dataInicio" 
                        type="date" 
                        value={formDataInicio}
                        onChange={(e) => setFormDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dataFim">Data Final</Label>
                      <Input 
                        id="dataFim" 
                        type="date"
                        value={formDataFim}
                        onChange={(e) => setFormDataFim(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label>Recorrência</Label>
                  <Select value={formRecorrencia} onValueChange={setFormRecorrencia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="diaria">Diária (Automática)</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formRecorrencia !== "manual" && (
                  <div className="grid gap-2">
                    <Label>Horários de Execução</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                      {horariosDisponiveis.map((h) => (
                        <Badge
                          key={h}
                          variant={formHorarios.includes(h) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleHorario(h)}
                        >
                          {h}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clique para selecionar múltiplos horários
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCriarConsulta} disabled={(formTribunais.length === 0 && !formTribunal) || !formTipo || !formTermo}>
                  Criar Consulta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {loadingConsultas ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tribunal(is)</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Termo</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Última Execução</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsultas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma consulta configurada. Clique em "Nova Consulta" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsultas.map((consulta) => {
                    const tribunais = consulta.tribunal.split(",");
                    return (
                      <TableRow key={consulta.id}>
                        <TableCell className="font-medium">{consulta.nome}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tribunais.slice(0, 2).map(t => (
                              <Badge key={t} variant="secondary" className="text-xs">{t.trim()}</Badge>
                            ))}
                            {tribunais.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{tribunais.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{consulta.tipo.replace("_", " ")}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {consulta.termo}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatRecorrencia(consulta)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatUltimaExecucao(consulta.ultima_execucao)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={consulta.ativo}
                              onCheckedChange={() => handleToggleAtivo(consulta)}
                            />
                            {consulta.ativo ? (
                              <Badge className="bg-success/10 text-success hover:bg-success/20">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="mr-1 h-3 w-3" />
                                Inativo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExecutar(consulta, false)}
                              disabled={loading}
                              title="Executar consulta (usa cache)"
                            >
                              {loading && consultaAtual?.id === consulta.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExecutar(consulta, true)}
                              disabled={loading}
                              title="Forçar atualização (ignora cache)"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Editar"
                              onClick={() => handleEditConsulta(consulta)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(consulta)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Resultados Dialog */}
        <Dialog open={resultadosOpen} onOpenChange={setResultadosOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resultados da Consulta
              </DialogTitle>
              <DialogDescription>
                {consultaAtual?.nome} - {resultados.length} intimação(ões) encontrada(s)
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] pr-4">
              {resultados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma intimação encontrada para os critérios informados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resultados.map((intimacao, index) => (
                    <div key={intimacao.id || index} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">
                            Processo: {intimacao.numeroProcesso || "N/A"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {intimacao.siglaTribunal} • {intimacao.nomeOrgao}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {intimacao.tipoComunicacao || "Intimação"}
                        </Badge>
                      </div>
                      
                      {intimacao.destinatarios && intimacao.destinatarios.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Destinatário(s):</span>
                          {intimacao.destinatarios.map((dest, i) => (
                            <span key={i} className="ml-2">
                              {dest.nome} {dest.numeroOab && `(OAB ${dest.numeroOab}/${dest.ufOab})`}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Data:</span>{" "}
                        {intimacao.dataDisponibilizacao || intimacao.dataPublicacao || "N/A"}
                      </div>
                      
                      {intimacao.textoMensagem && (
                        <div className="text-sm bg-background rounded p-3 border">
                          <p className="whitespace-pre-wrap line-clamp-4">
                            {intimacao.textoMensagem}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResultadosOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => navigate("/resultados")}>
                Ver Todo Histórico
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingConsulta(null);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Consulta</DialogTitle>
              <DialogDescription>
                Altere as configurações da consulta "{editingConsulta?.nome}".
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome da Consulta</Label>
                <Input
                  id="edit-nome"
                  placeholder="Ex: Márcia Gabriela - TJSP"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tribunal</Label>
                <TribunalSelector
                  value={formTribunal ? formTribunal.split(",").map(t => t.trim()) : []}
                  onChange={(vals) => setFormTribunal(vals.join(","))}
                  placeholder="Selecione o(s) tribunal(is)..."
                  multiple={true}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Busca</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome_advogado">Nome Advogado</SelectItem>
                    <SelectItem value="oab">Número OAB</SelectItem>
                    <SelectItem value="processo">Número Processo</SelectItem>
                    <SelectItem value="parte">Nome Parte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-termo">Termo de Busca</Label>
                <Input
                  id="edit-termo"
                  placeholder="Ex: Márcia Gabriela de Abreu"
                  value={formTermo}
                  onChange={(e) => setFormTermo(e.target.value)}
                />
              </div>

              {formTipo === "oab" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-numeroOab">Número OAB</Label>
                    <Input
                      id="edit-numeroOab"
                      placeholder="Ex: 123456"
                      value={formNumeroOab}
                      onChange={(e) => setFormNumeroOab(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-ufOab">UF OAB</Label>
                    <Input
                      id="edit-ufOab"
                      placeholder="Ex: SP"
                      value={formUfOab}
                      onChange={(e) => setFormUfOab(e.target.value.toUpperCase())}
                      maxLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Modo de Busca</Label>
                <Select value={formModoBusca} onValueChange={(v) => setFormModoBusca(v as "diaria" | "periodo")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Busca Diária Automática (sempre últimos 30 dias)</SelectItem>
                    <SelectItem value="periodo">Período Específico (escolher datas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formModoBusca === "periodo" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-dataInicio">Data Inicial</Label>
                    <Input 
                      id="edit-dataInicio" 
                      type="date" 
                      value={formDataInicio}
                      onChange={(e) => setFormDataInicio(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-dataFim">Data Final</Label>
                    <Input 
                      id="edit-dataFim" 
                      type="date"
                      value={formDataFim}
                      onChange={(e) => setFormDataFim(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label>Recorrência</Label>
                <Select value={formRecorrencia} onValueChange={setFormRecorrencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="diaria">Diária (Automática)</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formRecorrencia !== "manual" && (
                <div className="grid gap-2">
                  <Label>Horários de Execução</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {horariosDisponiveis.map((h) => (
                      <Badge
                        key={h}
                        variant={formHorarios.includes(h) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleHorario(h)}
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique para selecionar múltiplos horários
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditOpen(false);
                setEditingConsulta(null);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={!formTribunal || !formTipo || !formTermo}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
