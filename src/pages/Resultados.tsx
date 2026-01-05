import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  Eye,
  Calendar,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getAllResultados, ResultadoConsulta } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";

interface ResultadoComConsulta extends ResultadoConsulta {
  consultas?: {
    nome: string;
    tribunal: string;
  };
}

export default function Resultados() {
  const [resultados, setResultados] = useState<ResultadoComConsulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTribunal, setFilterTribunal] = useState<string>("todos");
  const [selectedResultado, setSelectedResultado] = useState<ResultadoComConsulta | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadResultados();
  }, []);

  const loadResultados = async () => {
    try {
      const data = await getAllResultados();
      setResultados(data as ResultadoComConsulta[]);
    } catch (error) {
      console.error("Erro ao carregar resultados:", error);
      toast({
        title: "Erro ao carregar resultados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoVisualizado = async (resultado: ResultadoComConsulta) => {
    if (resultado.visualizado) return;
    
    try {
      await supabase
        .from('resultados_consultas')
        .update({ visualizado: true })
        .eq('id', resultado.id);
      
      setResultados(prev => 
        prev.map(r => r.id === resultado.id ? { ...r, visualizado: true } : r)
      );
    } catch (error) {
      console.error("Erro ao marcar como visualizado:", error);
    }
  };

  const handleVerDetalhes = (resultado: ResultadoComConsulta) => {
    setSelectedResultado(resultado);
    marcarComoVisualizado(resultado);
  };

  const tribunaisUnicos = [...new Set(resultados.map(r => r.sigla_tribunal).filter(Boolean))];

  const filteredResultados = resultados.filter(r => {
    const matchSearch = 
      r.numero_processo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.texto_mensagem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.consultas?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchTribunal = filterTribunal === "todos" || r.sigla_tribunal === filterTribunal;
    
    return matchSearch && matchTribunal;
  });

  const naoVisualizados = resultados.filter(r => !r.visualizado).length;

  return (
    <AppLayout
      title="Histórico de Resultados"
      subtitle="Visualize todas as intimações encontradas nas suas consultas"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/consultas")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            {naoVisualizados > 0 && (
              <Badge className="bg-primary/10 text-primary">
                {naoVisualizados} não visualizado(s)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por processo, texto..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterTribunal} onValueChange={setFilterTribunal}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tribunal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tribunaisUnicos.map(t => (
                  <SelectItem key={t} value={t!}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Total de Resultados</div>
            <div className="text-2xl font-bold">{resultados.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Não Visualizados</div>
            <div className="text-2xl font-bold text-primary">{naoVisualizados}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Visualizados</div>
            <div className="text-2xl font-bold text-success">{resultados.length - naoVisualizados}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">Tribunais</div>
            <div className="text-2xl font-bold">{tribunaisUnicos.length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Consulta</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Órgão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResultados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {resultados.length === 0 
                        ? "Nenhum resultado encontrado. Execute uma consulta para ver os resultados aqui."
                        : "Nenhum resultado corresponde aos filtros aplicados."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResultados.map((resultado) => (
                    <TableRow 
                      key={resultado.id}
                      className={!resultado.visualizado ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        {resultado.visualizado ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {resultado.numero_processo || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {resultado.consultas?.nome || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {resultado.sigla_tribunal || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{resultado.tipo_comunicacao || "Intimação"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {resultado.data_disponibilizacao 
                            ? new Date(resultado.data_disponibilizacao).toLocaleDateString("pt-BR")
                            : "—"
                          }
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {resultado.nome_orgao || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalhes(resultado)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detalhes Dialog */}
        <Dialog open={!!selectedResultado} onOpenChange={() => setSelectedResultado(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes da Intimação
              </DialogTitle>
              <DialogDescription>
                Processo: {selectedResultado?.numero_processo || "N/A"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              {selectedResultado && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Tribunal</div>
                      <div className="font-medium">{selectedResultado.sigla_tribunal || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tipo</div>
                      <div className="font-medium">{selectedResultado.tipo_comunicacao || "Intimação"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Data de Disponibilização</div>
                      <div className="font-medium">
                        {selectedResultado.data_disponibilizacao 
                          ? new Date(selectedResultado.data_disponibilizacao).toLocaleDateString("pt-BR")
                          : "—"
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Data de Publicação</div>
                      <div className="font-medium">
                        {selectedResultado.data_publicacao 
                          ? new Date(selectedResultado.data_publicacao).toLocaleDateString("pt-BR")
                          : "—"
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Órgão Julgador</div>
                    <div className="font-medium">{selectedResultado.nome_orgao || "—"}</div>
                  </div>

                  {selectedResultado.destinatarios && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Destinatários</div>
                      <div className="space-y-1">
                        {(selectedResultado.destinatarios as any[]).map((dest, i) => (
                          <div key={i} className="text-sm">
                            {dest.nome} {dest.numeroOab && `(OAB ${dest.numeroOab}/${dest.ufOab})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Texto da Mensagem</div>
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                      {selectedResultado.texto_mensagem || "Texto não disponível"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Consulta de Origem</div>
                    <Badge>{selectedResultado.consultas?.nome || "—"}</Badge>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
