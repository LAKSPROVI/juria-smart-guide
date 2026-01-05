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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Play,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const consultas: Consulta[] = [
  {
    id: "1",
    nome: "Márcia Gabriela - TJSP",
    tribunal: "TJSP",
    tipo: "Nome Advogado",
    termo: "Márcia Gabriela de Abreu",
    recorrencia: "Diária - 9h",
    ultimaExecucao: "25/12/2025 09:00",
    status: "ativo",
    resultados: 15,
  },
  {
    id: "2",
    nome: "OAB 123456 - TRF3",
    tribunal: "TRF3",
    tipo: "Número OAB",
    termo: "123456/SP",
    recorrencia: "Diária - 9h, 14h",
    ultimaExecucao: "25/12/2025 14:00",
    status: "ativo",
    resultados: 8,
  },
  {
    id: "3",
    nome: "Empresa XYZ",
    tribunal: "TRT2",
    tipo: "Nome Parte",
    termo: "Empresa XYZ Ltda",
    recorrencia: "Semanal - Segunda",
    ultimaExecucao: "23/12/2025 08:00",
    status: "inativo",
    resultados: 3,
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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleExecutar = (consulta: Consulta) => {
    toast({
      title: "Consulta executada",
      description: `A consulta "${consulta.nome}" foi iniciada com sucesso.`,
    });
  };

  const handleCriarConsulta = () => {
    setOpen(false);
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tribunal</Label>
                    <Select>
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
                    <Select>
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dataInicio">Data Inicial</Label>
                    <Input id="dataInicio" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dataFim">Data Final</Label>
                    <Input id="dataFim" type="date" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Recorrência</Label>
                  <Select>
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
                      >
                        <Play className="h-4 w-4" />
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
        </div>
      </div>
    </AppLayout>
  );
}
