import { useState, useEffect, useCallback } from "react";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getDocumentos, getDocumentosStats, Documento } from "@/lib/database";

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
  pendente: {
    label: "Pendente",
    icon: Clock,
    class: "bg-warning/10 text-warning",
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
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [stats, setStats] = useState({ cadernos: 0, uploads: 0, favoritos: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docs, statsData] = await Promise.all([
        getDocumentos(),
        getDocumentosStats(),
      ]);
      setDocumentos(docs);
      setStats(statsData);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    toast({
      title: "Upload",
      description: "Funcionalidade de upload em desenvolvimento.",
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

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const filteredDocs = documentos.filter(d =>
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tribunal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pastas = [
    { nome: "Cadernos DJE", count: stats.cadernos, icon: Folder },
    { nome: "Uploads Manuais", count: stats.uploads, icon: Upload },
    { nome: "Favoritos", count: stats.favoritos, icon: Tag },
  ];

  if (loading) {
    return (
      <AppLayout
        title="Documentos"
        subtitle="Gerencie todos os documentos do sistema RAG"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

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
                    checked={selectedDocs.length === documentos.length && documentos.length > 0}
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
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {documentos.length === 0 
                        ? "Nenhum documento no sistema. Faça upload ou baixe cadernos do DJE."
                        : "Nenhum documento corresponde à busca."
                      }
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.pendente;
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
                              doc.origem === "dje"
                                ? "bg-primary/10"
                                : "bg-muted"
                            )}
                          >
                            {doc.origem === "dje" ? (
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
                          {doc.origem === "dje"
                            ? "Caderno DJE"
                            : doc.tipo.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBytes(doc.tamanho_bytes)}
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
                })
              )}
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
