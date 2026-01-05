import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createDocumento } from "@/lib/database";

interface FileUpload {
  file: File;
  id: string;
  status: "pending" | "uploading" | "extracting" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  metodoOcr?: string;
}

interface UploadDocumentosProps {
  onUploadComplete?: () => void;
}

type MetodoOCR = "pdf-parse" | "document-ai" | "tesseract";

const metodosOCR = [
  {
    value: "pdf-parse" as MetodoOCR,
    label: "PDF Digital (Grátis)",
    description: "Para PDFs com texto selecionável. Rápido e gratuito.",
    icon: "📄",
  },
  {
    value: "document-ai" as MetodoOCR,
    label: "Google Document AI (OCR)",
    description: "Para PDFs digitalizados/escaneados. Requer API key.",
    icon: "🔍",
  },
  {
    value: "tesseract" as MetodoOCR,
    label: "Tesseract OCR (Offline)",
    description: "OCR offline. Mais lento, menor precisão.",
    icon: "🖼️",
    disabled: true,
  },
];

export function UploadDocumentos({ onUploadComplete }: UploadDocumentosProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [metodoOcr, setMetodoOcr] = useState<MetodoOCR>("pdf-parse");
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "text/plain" ||
          file.name.endsWith(".txt") ||
          file.type.startsWith("image/")
      );

      addFiles(droppedFiles);
    },
    [metodoOcr]
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = "";
  }, [metodoOcr]);

  const addFiles = (newFiles: File[]) => {
    const fileUploads: FileUpload[] = newFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending",
      progress: 0,
      metodoOcr: file.type === "application/pdf" ? metodoOcr : undefined,
    }));

    setFiles((prev) => [...prev, ...fileUploads]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (id: string, updates: Partial<FileUpload>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const setFileMetodo = (id: string, metodo: MetodoOCR) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, metodoOcr: metodo } : f)));
  };

  const processFile = async (fileUpload: FileUpload) => {
    const { file, id, metodoOcr: fileMetodo } = fileUpload;

    try {
      updateFileStatus(id, { status: "uploading", progress: 10 });

      // Obter user_id para organizar no storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar registro do documento (inclui user_id via helper)
      const documento = await createDocumento({
        nome: file.name,
        tipo: file.name.split(".").pop() || "txt",
        origem: "upload",
        tamanho_bytes: file.size,
        status: "processando",
        tags: [],
        embedding_processado: false,
      });

      updateFileStatus(id, { progress: 20 });

      let texto = "";
      let urlArquivo: string | null = null;

      // Upload do arquivo para o Storage (organizado por user_id/documento_id)
      const storagePath = `${user.id}/${documento.id}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Erro no upload para storage:", uploadError);
        throw new Error(`Erro ao enviar arquivo: ${uploadError.message}`);
      }

      updateFileStatus(id, { progress: 40 });

      // Gerar URL assinada para acesso
      const { data: signedUrlData } = await supabase.storage
        .from("documentos")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 dias

      urlArquivo = signedUrlData?.signedUrl || null;

      // Atualizar documento com a URL
      await supabase
        .from("documentos")
        .update({ url_arquivo: urlArquivo })
        .eq("id", documento.id);

      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        // Arquivos de texto: extrair diretamente
        texto = await file.text();

        await supabase.from("documentos").update({ conteudo_texto: texto }).eq("id", documento.id);
      } else if (file.type === "application/pdf") {
        const metodo = fileMetodo || "pdf-parse";

        updateFileStatus(id, { status: "extracting", progress: 50 });

        toast({
          title: `Extraindo texto (${metodo})`,
          description: `Processando ${file.name}...`,
        });

        // Chamar edge function passando a URL do arquivo (não base64)
        const { data: extracaoResult, error: extracaoError } = await supabase.functions.invoke(
          "extrair-texto-pdf",
          {
            body: {
              documento_id: documento.id,
              url_arquivo: urlArquivo,
              metodo,
              processar_rag: true,
            },
          }
        );

        if (extracaoError) {
          console.error("Erro na extração:", extracaoError);

          if (extracaoResult?.precisa_ocr) {
            toast({
              variant: "destructive",
              title: "PDF digitalizado detectado",
              description:
                "Este PDF requer OCR. Selecione 'Google Document AI' e configure a API key.",
            });
          }
        }

        texto = extracaoResult?.texto || "";
      }

      updateFileStatus(id, { status: "processing", progress: 70 });

      // Se extraiu texto suficiente, adiciona na fila + dispara processamento
      if (texto.length > 100) {
        await supabase.from("fila_processamento_rag").insert({
          documento_id: documento.id,
          prioridade: 5,
          status: "pendente",
        });

        const { error: procError } = await supabase.functions.invoke("processar-documento-rag", {
          body: {
            documento_id: documento.id,
            texto,
            titulo: file.name,
          },
        });

        if (procError) {
          console.error("Erro ao processar RAG:", procError);
        }
      }

      updateFileStatus(id, { status: "done", progress: 100 });

      toast({
        title: "Upload concluído",
        description: `${file.name} enviado e processado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      updateFileStatus(id, {
        status: "error",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });

      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: `Falha ao processar ${file.name}`,
      });
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await processFile(file);
    }
    
    onUploadComplete?.();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => ['uploading', 'extracting', 'processing'].includes(f.status)).length;
  const hasPdfs = files.some(f => f.file.type === 'application/pdf' && f.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Método OCR para PDFs */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <Label className="font-medium">Método de Extração de Texto para PDFs</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Escolha como extrair texto dos PDFs. Para cadernos DJE, recomendamos "PDF Digital".
            </p>
            <Select value={metodoOcr} onValueChange={(v) => setMetodoOcr(v as MetodoOCR)}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metodosOCR.map((m) => (
                  <SelectItem key={m.value} value={m.value} disabled={m.disabled}>
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-all",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border bg-muted/30 hover:border-primary/50"
        )}
      >
        <Upload className={cn(
          "mx-auto h-10 w-10 transition-colors",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />
        <h3 className="mt-3 font-semibold">
          Arraste arquivos aqui
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          ou clique para selecionar
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.txt,image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button className="mt-4 cursor-pointer" asChild>
            <span>Selecionar Arquivos</span>
          </Button>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          PDF, TXT e imagens. Máximo 50MB por arquivo.
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Arquivos ({files.length})
            </h4>
            {pendingCount > 0 && (
              <Button 
                onClick={uploadAll}
                disabled={processingCount > 0}
              >
                {processingCount > 0 ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Processar Todos ({pendingCount})
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map(file => (
              <div 
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className={cn(
                  "rounded-lg p-2",
                  file.status === 'done' ? "bg-success/10" :
                  file.status === 'error' ? "bg-destructive/10" :
                  "bg-muted"
                )}>
                  <FileText className={cn(
                    "h-4 w-4",
                    file.status === 'done' ? "text-success" :
                    file.status === 'error' ? "text-destructive" :
                    "text-muted-foreground"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.file.size)}
                    </span>
                    {file.status === 'pending' && (
                      <Badge variant="secondary" className="text-xs">Pendente</Badge>
                    )}
                    {file.status === 'uploading' && (
                      <Badge className="text-xs bg-primary/10 text-primary">Enviando...</Badge>
                    )}
                    {file.status === 'extracting' && (
                      <Badge className="text-xs bg-blue-500/10 text-blue-500">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Extraindo texto...
                      </Badge>
                    )}
                    {file.status === 'processing' && (
                      <Badge className="text-xs bg-primary/10 text-primary">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processando RAG
                      </Badge>
                    )}
                    {file.status === 'done' && (
                      <Badge className="text-xs bg-success/10 text-success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Concluído
                      </Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge className="text-xs bg-destructive/10 text-destructive">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Erro
                      </Badge>
                    )}
                    {file.file.type === 'application/pdf' && file.metodoOcr && file.status === 'pending' && (
                      <Badge variant="outline" className="text-xs">
                        {metodosOCR.find(m => m.value === file.metodoOcr)?.icon} {file.metodoOcr}
                      </Badge>
                    )}
                  </div>
                  {(file.status === 'uploading' || file.status === 'extracting' || file.status === 'processing') && (
                    <Progress value={file.progress} className="mt-2 h-1" />
                  )}
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                {file.status === 'pending' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
