import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  FileText,
  File,
  Folder,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Tag,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Documento {
  id: string;
  nome: string;
  tipo: "pdf" | "docx" | "caderno";
  tribunal?: string;
  data: string;
  tamanho: string;
  status: "processado" | "processando" | "erro";
  tags: string[];
  origem: "upload" | "dje";
}

const documentos: Documento[] = [
  {
    id: "1",
    nome: "TJSP_25-12-2025_Judicial.pdf",
    tipo: "caderno",
    tribunal: "TJSP",
    data: "25/12/2025",
    tamanho: "45.2 MB",
    status: "processado",
    tags: ["judicial", "dezembro-2025"],
    origem: "dje",
  },
  {
    id: "2",
    nome: "Petição Inicial - Processo 1234567.pdf",
    tipo: "pdf",
    data: "24/12/2025",
    tamanho: "2.3 MB",
    status: "processado",
    tags: ["petição", "cliente-abc"],
    origem: "upload",
  },
  {
    id: "3",
    nome: "Sentença - Caso XYZ.docx",
    tipo: "docx",
    data: "23/12/2025",
    tamanho: "1.1 MB",
    status: "processando",
    tags: ["sentença"],
    origem: "upload",
  },
  {
    id: "4",
    nome: "TRF3_24-12-2025_Judicial.pdf",
    tipo: "caderno",
    tribunal: "TRF3",
    data: "24/12/2025",
    tamanho: "32.1 MB",
    status: "processado",
    tags: ["judicial", "dezembro-2025"],
    origem: "dje",
  },
  {
    id: "5",
    nome: "Recurso Ordinário.pdf",
    tipo: "pdf",
    data: "22/12/2025",
    tamanho: "5.4 MB",
    status: "erro",
    tags: ["recurso"],
    origem: "upload",
  },
];

const pastas = [
  { nome: "Cadernos DJE", count: 847, icon: Folder },
  { nome: "Uploads Manuais", count: 156, icon: Upload },
  { nome: "Favoritos", count: 23, icon: Tag },
];

const statusConfig = {
  processado: {
    label: "Processado",
    icon: CheckCircle,
    class: "bg-success/10 text-success",
  },
  processando: {
    label: "Processando",
    icon: Clock,
    class: "bg-primary/10 text-primary",
  },
  erro: {
    label: "Erro",
    icon: AlertCircle,
    class: "bg-destructive/10 text-destructive",
  },
};

export default function Documentos() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const handleUpload = () => {
    toast({
      title: "Upload iniciado",
      description: "Selecione os arquivos para fazer upload.",
    });
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === documentos.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documentos.map((d) => d.id));
    }
  };

  return (
    <AppLayout
      title="Documentos"
      subtitle="Gerencie todos os documentos do sistema RAG"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {pastas.map((pasta) => (
            <button
              key={pasta.nome}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="rounded-lg bg-primary/10 p-3">
                <pasta.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">{pasta.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {pasta.count.toLocaleString()} arquivos
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Selected Actions */}
        {selectedDocs.length > 0 && (
          <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <span className="text-sm font-medium">
              {selectedDocs.length} selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Tag className="mr-2 h-4 w-4" />
                Adicionar Tags
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reprocessar
              </Button>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        )}

        {/* Documents Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDocs.length === documentos.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((doc) => {
                const status = statusConfig[doc.status];
                const StatusIcon = status.icon;
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={() => toggleSelectDoc(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "rounded-lg p-2",
                            doc.tipo === "caderno"
                              ? "bg-primary/10"
                              : "bg-muted"
                          )}
                        >
                          {doc.tipo === "caderno" ? (
                            <FileText className="h-4 w-4 text-primary" />
                          ) : (
                            <File className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.nome}</p>
                          {doc.tribunal && (
                            <p className="text-xs text-muted-foreground">
                              {doc.tribunal}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {doc.tipo === "caderno"
                          ? "Caderno DJE"
                          : doc.tipo.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.data}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.tamanho}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.class}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{doc.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reprocessar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Upload Area */}
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            Arraste arquivos aqui para fazer upload
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Suporta PDF, DOCX e TXT. Máximo 50MB por arquivo.
          </p>
          <Button className="mt-4" onClick={handleUpload}>
            Selecionar Arquivos
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
