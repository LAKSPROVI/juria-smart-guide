import { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { consultarIntimacoes, IntimacaoResult } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Consulta {
  id: string;
  nome: string;
  tribunal: string;
  tipo: string;
  termo: string;
  recorrencia: string;
  ultimaExecucao: string;
  status: "ativo" | "inativo";
  resultados: number;
}

const consultasIniciais: Consulta[] = [
  {
    id: "1",
    nome: "Márcia Gabriela - TJSP",
    tribunal: "TJSP",
    tipo: "Nome Advogado",
    termo: "Márcia Gabriela de Abreu",
    recorrencia: "Diária - 9h",
    ultimaExecucao: "25/12/2025 09:00",
    status: "ativo",
    resultados: 0,
  },
];

const tribunais = [
  "TJSP",
  "TJRJ",
  "TJMG",
  "TRF1",
  "TRF2",
  "TRF3",
  "TRF4",
  "TRF5",
  "TRT1",
  "TRT2",
  "TST",
  "STJ",
  "STF",
];

export default function Consultas() {
  const [open, setOpen] = useState(false);
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<IntimacaoResult[]>([]);
  const [consultaAtual, setConsultaAtual] = useState<Consulta | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>(consultasIniciais);
  const { toast } = useToast();

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formTribunal, setFormTribunal] = useState("");
  const [formTipo, setFormTipo] = useState("");
  const [formTermo, setFormTermo] = useState("");
  const [formDataInicio, setFormDataInicio] = useState("");
  const [formDataFim, setFormDataFim] = useState("");
  const [formRecorrencia, setFormRecorrencia] = useState("");

  const handleExecutar = async (consulta: Consulta) => {
    setLoading(true);
    setConsultaAtual(consulta);
    
    try {
      toast({
        title: "Executando consulta...",
        description: `Buscando intimações para "${consulta.termo}"`,
      });

      const response = await consultarIntimacoes({
        termo: consulta.termo,
        siglaTribunal: consulta.tribunal,
        dataInicial: "2025-12-20",
        dataFinal: "2025-12-25",
      });

      console.log("Resposta da API:", response);

      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [response.data];
        setResultados(data);
        setResultadosOpen(true);
        
        // Atualizar número de resultados na consulta
        setConsultas(prev => 
          prev.map(c => 
            c.id === consulta.id 
              ? { ...c, resultados: data.length, ultimaExecucao: new Date().toLocaleString('pt-BR') }
              : c
          )
        );

        toast({
          title: "Consulta executada com sucesso!",
          description: `${data.length} intimação(ões) encontrada(s).`,
        });
      } else {
        toast({
          title: "Nenhum resultado",
          description: response.error || "A consulta não retornou resultados.",
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

  const handleCriarConsulta = () => {
    const novaConsulta: Consulta = {
      id: Date.now().toString(),
      nome: formNome || `${formTermo} - ${formTribunal}`,
      tribunal: formTribunal,
      tipo: formTipo === "nome_advogado" ? "Nome Advogado" : 
            formTipo === "oab" ? "Número OAB" :
            formTipo === "processo" ? "Número Processo" : "Nome Parte",
      termo: formTermo,
      recorrencia: formRecorrencia === "diaria" ? "Diária - 9h" :
                   formRecorrencia === "semanal" ? "Semanal" : "Manual",
      ultimaExecucao: "-",
      status: "ativo",
      resultados: 0,
    };

    setConsultas(prev => [...prev, novaConsulta]);
    setOpen(false);
    
    // Reset form
    setFormNome("");
    setFormTribunal("");
    setFormTipo("");
    setFormTermo("");
    setFormDataInicio("");
    setFormDataFim("");
    setFormRecorrencia("");
    
    toast({
      title: "Consulta criada",
      description: "A nova consulta foi configurada com sucesso.",
    });
  };

  return (
    <AppLayout
      title="Consultas"
      subtitle="Configure e gerencie suas buscas automatizadas na ComunicaAPI"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar consultas..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova Consulta</DialogTitle>
                <DialogDescription>
                  Configure uma nova busca automatizada na ComunicaAPI.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome da Consulta</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Márcia Gabriela - TJSP"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tribunal</Label>
                    <Select value={formTribunal} onValueChange={setFormTribunal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tribunais.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Busca</Label>
                    <Select value={formTipo} onValueChange={setFormTipo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nome_advogado">
                          Nome Advogado
                        </SelectItem>
                        <SelectItem value="oab">Número OAB</SelectItem>
                        <SelectItem value="processo">
                          Número Processo
                        </SelectItem>
                        <SelectItem value="parte">Nome Parte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="grid gap-2">
                  <Label>Recorrência</Label>
                  <Select value={formRecorrencia} onValueChange={setFormRecorrencia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="personalizada">
                        Personalizada
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCriarConsulta}>Criar Consulta</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tribunal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Termo</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Última Execução</TableHead>
                <TableHead>Resultados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultas.map((consulta) => (
                <TableRow key={consulta.id}>
                  <TableCell className="font-medium">{consulta.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{consulta.tribunal}</Badge>
                  </TableCell>
                  <TableCell>{consulta.tipo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {consulta.termo}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {consulta.recorrencia}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {consulta.ultimaExecucao}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{consulta.resultados}</Badge>
                  </TableCell>
                  <TableCell>
                    {consulta.status === "ativo" ? (
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
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExecutar(consulta)}
                        disabled={loading}
                      >
                        {loading && consultaAtual?.id === consulta.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              <Button onClick={() => {
                toast({
                  title: "Funcionalidade em desenvolvimento",
                  description: "O processamento RAG será implementado em breve.",
                });
              }}>
                Processar no RAG
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-2">
            Sobre as Consultas por Termo
          </h3>
          <p className="text-sm text-muted-foreground">
            As consultas utilizam a ComunicaAPI do PJe para buscar intimações e
            comunicações nos Diários de Justiça Eletrônicos. Você pode
            configurar buscas por nome de advogado, número da OAB, número de
            processo ou nome de parte. Os resultados são processados
            automaticamente e ficam disponíveis para análise no sistema RAG.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium text-primary">
              ✨ Teste Pré-configurado: Clique em "Play" na consulta "Márcia Gabriela - TJSP" para executar uma busca real na ComunicaAPI (20-25/12/2025).
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
