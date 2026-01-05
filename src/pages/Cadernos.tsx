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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Caderno {
  id: string;
  tribunal: string;
  data: string;
  tipo: string;
  status: "sucesso" | "processando" | "erro" | "pendente";
  tamanho: string;
  publicacoes: number;
}

const cadernos: Caderno[] = [
  {
    id: "1",
    tribunal: "TJSP",
    data: "25/12/2025",
    tipo: "Judicial",
    status: "sucesso",
    tamanho: "45.2 MB",
    publicacoes: 1245,
  },
  {
    id: "2",
    tribunal: "TRF3",
    data: "25/12/2025",
    tipo: "Judicial",
    status: "processando",
    tamanho: "32.1 MB",
    publicacoes: 0,
  },
  {
    id: "3",
    tribunal: "TRT2",
    data: "24/12/2025",
    tipo: "Administrativo",
    status: "sucesso",
    tamanho: "18.7 MB",
    publicacoes: 456,
  },
  {
    id: "4",
    tribunal: "TJSP",
    data: "24/12/2025",
    tipo: "Judicial",
    status: "erro",
    tamanho: "-",
    publicacoes: 0,
  },
  {
    id: "5",
    tribunal: "STJ",
    data: "23/12/2025",
    tipo: "Judicial",
    status: "sucesso",
    tamanho: "28.3 MB",
    publicacoes: 892,
  },
];

const configsTribunal = [
  {
    tribunal: "TJSP",
    ativo: true,
    horario: "19:00",
    tipo: "Judicial",
    ultimoDownload: "25/12/2025 19:15",
  },
  {
    tribunal: "TRF3",
    ativo: true,
    horario: "19:30",
    tipo: "Judicial",
    ultimoDownload: "25/12/2025 19:45",
  },
  {
    tribunal: "TRT2",
    ativo: true,
    horario: "20:00",
    tipo: "Ambos",
    ultimoDownload: "24/12/2025 20:20",
  },
  {
    tribunal: "STJ",
    ativo: false,
    horario: "21:00",
    tipo: "Judicial",
    ultimoDownload: "23/12/2025 21:10",
  },
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
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDownload = () => {
    setOpen(false);
    toast({
      title: "Download iniciado",
      description: "O caderno está sendo baixado e será processado automaticamente.",
    });
  };

  return (
    <AppLayout
      title="Cadernos DJE"
      subtitle="Gerencie o download e processamento dos Diários de Justiça Eletrônicos"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Config Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {configsTribunal.map((config) => (
            <Card key={config.tribunal} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{config.tribunal}</CardTitle>
                  <Switch checked={config.ativo} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horário:</span>
                    <span>{config.horario}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="secondary">{config.tipo}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último:</span>
                    <span className="text-xs">{config.ultimoDownload}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Downloads Recentes</h3>
          <Dialog open={open} onOpenChange={setOpen}>
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tribunal..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TJSP">TJSP</SelectItem>
                      <SelectItem value="TRF3">TRF3</SelectItem>
                      <SelectItem value="TRT2">TRT2</SelectItem>
                      <SelectItem value="STJ">STJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="data">Data</Label>
                  <Input id="data" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de Caderno</Label>
                  <Select>
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
                  <Switch id="processar" defaultChecked />
                  <Label htmlFor="processar">
                    Processar automaticamente para RAG
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Iniciar Download
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Downloads Table */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cadernos.map((caderno) => {
            const status = statusConfig[caderno.status];
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
                          {caderno.data}
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
                      <p className="font-medium">{caderno.tipo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tamanho</p>
                      <p className="font-medium">{caderno.tamanho}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Publicações</p>
                      <p className="font-medium">
                        {caderno.publicacoes > 0
                          ? caderno.publicacoes.toLocaleString()
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
          })}
        </div>
      </div>
    </AppLayout>
  );
}
