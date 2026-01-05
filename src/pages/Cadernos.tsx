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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getConfigCadernos, 
  getCadernos,
  updateConfigCaderno,
  createConfigCaderno,
  ConfigCaderno,
  Caderno 
} from "@/lib/database";
import { TribunalSelector, tribunaisDisponiveis as tribunaisLista } from "@/components/TribunalSelector";
import { baixarCadernoDJE, getCadernosEmProcessamento } from "@/lib/cadernos-api";

const horariosDisponiveis = [
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", 
  "21:00", "21:30", "22:00", "22:30", "23:00",
];

const statusConfig = {
  sucesso: {
    label: "Processado",
    icon: CheckCircle,
    class: "bg-success/10 text-success",
  },
  processando: {
    label: "Processando",
    icon: RefreshCw,
    class: "bg-primary/10 text-primary",
  },
  erro: {
    label: "Erro",
    icon: AlertCircle,
    class: "bg-destructive/10 text-destructive",
  },
  pendente: {
    label: "Pendente",
    icon: Clock,
    class: "bg-warning/10 text-warning",
  },
};

export default function Cadernos() {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ConfigCaderno | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [configs, setConfigs] = useState<ConfigCaderno[]>([]);
  const [cadernos, setCadernos] = useState<Caderno[]>([]);
  const [cadernosProcessando, setCadernosProcessando] = useState<Caderno[]>([]);
  const { toast } = useToast();

  // Form state for new config
  const [newTribunais, setNewTribunais] = useState<string[]>([]);
  const [newHorarios, setNewHorarios] = useState<string[]>(["19:00"]);
  const [newTipos, setNewTipos] = useState<string[]>(["D"]);

  // Form state for download
  const [downloadTribunal, setDownloadTribunal] = useState("");
  const [downloadData, setDownloadData] = useState("");
  const [downloadTipo, setDownloadTipo] = useState("D");
  const [downloadProcessar, setDownloadProcessar] = useState(true);

  useEffect(() => {
    loadData();
    // Polling para cadernos em processamento
    const interval = setInterval(loadCadernosProcessando, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadCadernosProcessando = async () => {
    try {
      const data = await getCadernosEmProcessamento();
      setCadernosProcessando(data);
    } catch (error) {
      console.error("Erro ao carregar cadernos em processamento:", error);
    }
  };

  const loadData = async () => {
    try {
      const [configsData, cadernosData] = await Promise.all([
        getConfigCadernos(),
        getCadernos(),
      ]);
      setConfigs(configsData);
      setCadernos(cadernosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (config: ConfigCaderno) => {
    try {
      await updateConfigCaderno(config.id, { ativo: !config.ativo });
      await loadData();
      toast({
        title: config.ativo ? "Tribunal desativado" : "Tribunal ativado",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar configuração",
        variant: "destructive",
      });
    }
  };

  const handleUpdateHorarios = async (config: ConfigCaderno, horarios: string[]) => {
    try {
      await updateConfigCaderno(config.id, { horarios });
      await loadData();
      toast({
        title: "Horários atualizados",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar horários",
        variant: "destructive",
      });
    }
  };

  const handleAddConfig = async () => {
    if (newTribunais.length === 0) return;
    
    try {
      // Criar configuração para cada tribunal selecionado
      for (const tribunal of newTribunais) {
        await createConfigCaderno({
          tribunal: tribunal,
          ativo: true,
          horarios: newHorarios,
          tipos: newTipos,
          processar_automaticamente: true,
        });
      }
      setConfigOpen(false);
      setNewTribunais([]);
      setNewHorarios(["19:00"]);
      setNewTipos(["D"]);
      await loadData();
      toast({
        title: newTribunais.length > 1 
          ? `${newTribunais.length} tribunais configurados` 
          : "Configuração adicionada",
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar configuração",
        description: "Um ou mais tribunais já podem estar configurados.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!downloadTribunal || !downloadData) {
      toast({
        title: "Dados incompletos",
        description: "Selecione o tribunal e a data.",
        variant: "destructive",
      });
      return;
    }
    
    setDownloading(true);
    setDownloadOpen(false);
    
    toast({
      title: "Download iniciado",
      description: `Baixando caderno ${downloadTribunal} de ${downloadData}...`,
    });
    
    try {
      const result = await baixarCadernoDJE({
        tribunal: downloadTribunal,
        data: downloadData,
        tipo: downloadTipo,
        processarRag: downloadProcessar,
      });
      
      if (result.success) {
        toast({
          title: "Caderno baixado com sucesso!",
          description: result.message,
        });
      } else {
        toast({
          title: "Erro ao baixar caderno",
          description: result.error,
          variant: "destructive",
        });
      }
      
      // Recarregar dados
      await loadData();
      await loadCadernosProcessando();
      
    } catch (error) {
      console.error("Erro ao baixar caderno:", error);
      toast({
        title: "Erro ao baixar caderno",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
      setDownloadTribunal("");
      setDownloadData("");
    }
  };

  const toggleHorario = (horario: string, current: string[], setter: (h: string[]) => void) => {
    setter(
      current.includes(horario)
        ? current.filter(h => h !== horario)
        : [...current, horario].sort()
    );
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const tribunaisNaoConfigurados = tribunaisLista
    .map(t => t.value)
    .filter(t => !configs.find(c => c.tribunal === t));

  if (loading) {
    return (
      <AppLayout
        title="Cadernos DJE"
        subtitle="Gerencie o download e processamento dos Diários de Justiça Eletrônicos"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Cadernos DJE"
      subtitle="Gerencie o download e processamento dos Diários de Justiça Eletrônicos"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Config Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {configs.map((config) => (
            <Card key={config.id} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{config.tribunal}</CardTitle>
                  <Switch 
                    checked={config.ativo} 
                    onCheckedChange={() => handleToggleAtivo(config)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Horários:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.horarios.map(h => (
                        <Badge key={h} variant="secondary" className="text-xs">
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipos:</span>
                    <div className="flex gap-1">
                      {config.tipos.map(t => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t === "D" ? "Judicial" : "Admin"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedConfig(config)}
                  >
                    <Settings className="mr-2 h-3 w-3" />
                    Configurar Horários
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add new config card */}
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Card className="shadow-card border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px]">
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Adicionar Tribunal</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Configuração de Tribunal</DialogTitle>
                <DialogDescription>
                  Configure um novo tribunal para download automático de cadernos.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Tribunais</Label>
                  <TribunalSelector
                    value={newTribunais}
                    onChange={setNewTribunais}
                    placeholder="Selecione um ou mais tribunais..."
                    multiple={true}
                    excludeTribunais={configs.map(c => c.tribunal)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecione múltiplos tribunais para configurar em lote
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Horários de Download</Label>
                  <div className="flex flex-wrap gap-2">
                    {horariosDisponiveis.map(h => (
                      <Badge
                        key={h}
                        variant={newHorarios.includes(h) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleHorario(h, newHorarios, setNewHorarios)}
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Tipos de Caderno</Label>
                  <div className="flex gap-2">
                    <Badge
                      variant={newTipos.includes("D") ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleHorario("D", newTipos, setNewTipos)}
                    >
                      Judicial (D)
                    </Badge>
                    <Badge
                      variant={newTipos.includes("A") ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleHorario("A", newTipos, setNewTipos)}
                    >
                      Administrativo (A)
                    </Badge>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfigOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddConfig} disabled={newTribunais.length === 0}>
                  {newTribunais.length > 1 ? `Adicionar ${newTribunais.length} tribunais` : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit horarios dialog */}
        <Dialog open={!!selectedConfig} onOpenChange={() => setSelectedConfig(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Horários - {selectedConfig?.tribunal}</DialogTitle>
              <DialogDescription>
                Selecione os horários para download automático do caderno.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="mb-3 block">Horários de Download</Label>
              <div className="flex flex-wrap gap-2">
                {horariosDisponiveis.map(h => (
                  <Badge
                    key={h}
                    variant={selectedConfig?.horarios.includes(h) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedConfig) {
                        const newHorarios = selectedConfig.horarios.includes(h)
                          ? selectedConfig.horarios.filter(x => x !== h)
                          : [...selectedConfig.horarios, h].sort();
                        handleUpdateHorarios(selectedConfig, newHorarios);
                        setSelectedConfig({ ...selectedConfig, horarios: newHorarios });
                      }
                    }}
                  >
                    {h}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Clique nos horários para adicionar ou remover. Os cadernos serão baixados automaticamente nos horários selecionados.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedConfig(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Downloads Recentes</h3>
          <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Download de Caderno</DialogTitle>
                <DialogDescription>
                  Baixe um caderno específico do DJE manualmente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Tribunal</Label>
                  <TribunalSelector
                    value={downloadTribunal ? [downloadTribunal] : []}
                    onChange={(vals) => setDownloadTribunal(vals[0] || "")}
                    placeholder="Selecione o tribunal..."
                    multiple={false}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="data">Data</Label>
                  <Input 
                    id="data" 
                    type="date" 
                    value={downloadData}
                    onChange={(e) => setDownloadData(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de Caderno</Label>
                  <Select value={downloadTipo} onValueChange={setDownloadTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D">Judicial</SelectItem>
                      <SelectItem value="A">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="processar" 
                    checked={downloadProcessar}
                    onCheckedChange={setDownloadProcessar}
                  />
                  <Label htmlFor="processar">
                    Processar automaticamente para RAG
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDownloadOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleDownload} disabled={!downloadTribunal || !downloadData || downloading}>
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloading ? "Baixando..." : "Iniciar Download"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Downloads em Processamento */}
        {(cadernosProcessando.length > 0 || downloading) && (
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Downloads em Processamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {downloading && (
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <div>
                        <p className="font-medium">{downloadTribunal || "Preparando..."}</p>
                        <p className="text-sm text-muted-foreground">{downloadData}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      Baixando...
                    </Badge>
                  </div>
                )}
                {cadernosProcessando.map((caderno) => (
                  <div key={caderno.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <div>
                        <p className="font-medium">{caderno.tribunal}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(caderno.data)}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      Processando...
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Downloads Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cadernos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum caderno baixado ainda.</p>
              <p className="text-sm">Configure os tribunais acima ou faça um download manual.</p>
            </div>
          ) : (
            cadernos.map((caderno) => {
              const status = statusConfig[caderno.status as keyof typeof statusConfig] || statusConfig.pendente;
              const StatusIcon = status.icon;
              return (
                <Card key={caderno.id} className="shadow-card card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{caderno.tribunal}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(caderno.data)}
                          </p>
                        </div>
                      </div>
                      <Badge className={status.class}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p className="font-medium">
                          {caderno.tipo === "D" ? "Judicial" : "Admin"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tamanho</p>
                        <p className="font-medium">{formatBytes(caderno.tamanho_bytes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Publicações</p>
                        <p className="font-medium">
                          {caderno.total_publicacoes > 0
                            ? caderno.total_publicacoes.toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Ver Conteúdo
                      </Button>
                      {caderno.status === "erro" && (
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
