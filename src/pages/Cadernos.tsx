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

// Lista completa de horários (todas as horas)
const horariosDisponiveis = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
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
  const [downloadTribunais, setDownloadTribunais] = useState<string[]>([]);
  const [downloadDataInicio, setDownloadDataInicio] = useState("");
  const [downloadDataFim, setDownloadDataFim] = useState("");
  const [downloadTipo, setDownloadTipo] = useState("D");
  const [downloadProcessar, setDownloadProcessar] = useState(true);
  const [downloadModo, setDownloadModo] = useState<"unico" | "periodo">("unico");

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

  // Verificar se configuração já existe
  const verificarDuplicataConfig = (tribunais: string[]) => {
    return configs.find(c => tribunais.includes(c.tribunal));
  };

  const handleAddConfig = async () => {
    if (newTribunais.length === 0) return;
    
    // Verificar duplicatas
    const duplicata = verificarDuplicataConfig(newTribunais);
    if (duplicata) {
      toast({
        title: "Configuração já existe",
        description: `O tribunal ${duplicata.tribunal} já está configurado.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Criar UMA única configuração com todos os tribunais
      const tribunaisStr = newTribunais.join(",");
      
      await createConfigCaderno({
        tribunal: tribunaisStr,
        ativo: true,
        horarios: newHorarios,
        tipos: newTipos,
        processar_automaticamente: true,
      });

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

  // Gerar lista de datas entre início e fim
  const gerarListaDatas = (dataInicio: string, dataFim: string): string[] => {
    const datas: string[] = [];
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    while (inicio <= fim) {
      datas.push(inicio.toISOString().split('T')[0]);
      inicio.setDate(inicio.getDate() + 1);
    }
    
    return datas;
  };

  const handleDownload = async () => {
    if (downloadTribunais.length === 0 || !downloadDataInicio) {
      toast({
        title: "Dados incompletos",
        description: "Selecione ao menos um tribunal e a data.",
        variant: "destructive",
      });
      return;
    }
    
    setDownloading(true);
    setDownloadOpen(false);
    
    // Se for período, gerar lista de datas
    const datas = downloadModo === "periodo" && downloadDataFim
      ? gerarListaDatas(downloadDataInicio, downloadDataFim)
      : [downloadDataInicio];
    
    const totalDownloads = downloadTribunais.length * datas.length;
    
    toast({
      title: "Downloads iniciados",
      description: `Baixando ${totalDownloads} caderno(s) de ${downloadTribunais.length} tribunal(is)...`,
    });
    
    let sucessos = 0;
    let erros = 0;
    
    try {
      // Fazer downloads em paralelo (limitado a 3 por vez)
      const downloadPromises: Promise<void>[] = [];
      
      for (const tribunal of downloadTribunais) {
        for (const data of datas) {
          downloadPromises.push(
            baixarCadernoDJE({
              tribunal,
              data,
              tipo: downloadTipo,
              processarRag: downloadProcessar,
            }).then(result => {
              if (result.success) {
                sucessos++;
              } else {
                erros++;
                console.error(`Erro ao baixar ${tribunal} - ${data}:`, result.error);
              }
            }).catch(err => {
              erros++;
              console.error(`Erro ao baixar ${tribunal} - ${data}:`, err);
            })
          );
        }
      }
      
      await Promise.all(downloadPromises);
      
      toast({
        title: "Downloads concluídos",
        description: `${sucessos} sucesso(s), ${erros} erro(s)`,
        variant: erros > 0 ? "destructive" : "default",
      });
      
      // Recarregar dados
      await loadData();
      await loadCadernosProcessando();
      
    } catch (error) {
      console.error("Erro ao baixar cadernos:", error);
      toast({
        title: "Erro ao baixar cadernos",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
      setDownloadTribunais([]);
      setDownloadDataInicio("");
      setDownloadDataFim("");
      setDownloadModo("unico");
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
    .filter(t => !configs.find(c => c.tribunal.split(",").includes(t)));

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
          {configs.map((config) => {
            const tribunais = config.tribunal.split(",");
            return (
              <Card key={config.id} className="shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {tribunais.length > 1 ? `${tribunais.length} Tribunais` : tribunais[0]}
                    </CardTitle>
                    <Switch 
                      checked={config.ativo} 
                      onCheckedChange={() => handleToggleAtivo(config)}
                    />
                  </div>
                  {tribunais.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tribunais.slice(0, 3).map(t => (
                        <Badge key={t} variant="outline" className="text-xs">{t.trim()}</Badge>
                      ))}
                      {tribunais.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{tribunais.length - 3}</Badge>
                      )}
                    </div>
                  )}
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
            );
          })}
          
          {/* Add new config card */}
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Card className="shadow-card border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px]">
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Adicionar Tribunal(is)</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Configuração de Tribunal</DialogTitle>
                <DialogDescription>
                  Configure tribunais para download automático de cadernos.
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
                    excludeTribunais={configs.flatMap(c => c.tribunal.split(",").map(t => t.trim()))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecione múltiplos tribunais - será criada UMA configuração para todos
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Horários de Download</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
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
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
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
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Download de Caderno(s)</DialogTitle>
                <DialogDescription>
                  Baixe cadernos específicos do DJE manualmente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Tribunais</Label>
                  <TribunalSelector
                    value={downloadTribunais}
                    onChange={setDownloadTribunais}
                    placeholder="Selecione um ou mais tribunais..."
                    multiple={true}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecione múltiplos tribunais para baixar de todos de uma vez
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label>Modo de Download</Label>
                  <Select value={downloadModo} onValueChange={(v) => setDownloadModo(v as "unico" | "periodo")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unico">Data Única</SelectItem>
                      <SelectItem value="periodo">Período (múltiplas datas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {downloadModo === "unico" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="data">Data</Label>
                    <Input 
                      id="data" 
                      type="date" 
                      value={downloadDataInicio}
                      onChange={(e) => setDownloadDataInicio(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dataInicio">Data Inicial</Label>
                      <Input 
                        id="dataInicio" 
                        type="date" 
                        value={downloadDataInicio}
                        onChange={(e) => setDownloadDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dataFim">Data Final</Label>
                      <Input 
                        id="dataFim" 
                        type="date" 
                        value={downloadDataFim}
                        onChange={(e) => setDownloadDataFim(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                
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
                <Button 
                  onClick={handleDownload} 
                  disabled={downloadTribunais.length === 0 || !downloadDataInicio || downloading}
                >
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
                        <p className="font-medium">
                          {downloadTribunais.length > 1 
                            ? `${downloadTribunais.length} tribunais` 
                            : downloadTribunais[0] || "Preparando..."}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {downloadDataInicio} {downloadDataFim && `até ${downloadDataFim}`}
                        </p>
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
