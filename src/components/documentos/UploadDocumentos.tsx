import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUpload {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
}

interface UploadDocumentosProps {
  onUploadComplete?: () => void;
}

export function UploadDocumentos({ onUploadComplete }: UploadDocumentosProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || 
              file.type === 'text/plain' ||
              file.name.endsWith('.txt')
    );
    
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = '';
  }, []);

  const addFiles = (newFiles: File[]) => {
    const fileUploads: FileUpload[] = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }));
    
    setFiles(prev => [...prev, ...fileUploads]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileStatus = (id: string, updates: Partial<FileUpload>) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const processFile = async (fileUpload: FileUpload) => {
    const { file, id } = fileUpload;
    
    try {
      updateFileStatus(id, { status: 'uploading', progress: 10 });
      
      // Extrair texto do arquivo
      let texto = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        texto = await file.text();
      } else if (file.type === 'application/pdf') {
        // Para PDFs, vamos salvar e processar no backend
        // Por agora, criar um placeholder
        toast({
          title: "PDF detectado",
          description: "Processamento de PDF requer OCR no backend. Salvando metadados...",
        });
        texto = `[PDF] ${file.name} - Aguardando processamento OCR`;
      }

      updateFileStatus(id, { progress: 30 });

      // Criar registro do documento
      const { data: documento, error: docError } = await supabase
        .from('documentos')
        .insert({
          nome: file.name,
          tipo: file.name.split('.').pop() || 'txt',
          origem: 'upload',
          tamanho_bytes: file.size,
          status: 'processando',
          conteudo_texto: texto,
        })
        .select()
        .single();

      if (docError) throw docError;

      updateFileStatus(id, { status: 'processing', progress: 50 });

      // Adicionar à fila de processamento RAG
      await supabase
        .from('fila_processamento_rag')
        .insert({
          documento_id: documento.id,
          prioridade: 5,
          status: 'pendente',
        });

      updateFileStatus(id, { progress: 70 });

      // Chamar função de processamento
      const { error: procError } = await supabase.functions.invoke('processar-documento-rag', {
        body: {
          documento_id: documento.id,
          texto: texto,
          titulo: file.name,
        }
      });

      if (procError) {
        console.error('Erro ao processar RAG:', procError);
        // Não falhar completamente, documento foi salvo
      }

      updateFileStatus(id, { status: 'done', progress: 100 });

      toast({
        title: "Upload concluído",
        description: `${file.name} foi processado com sucesso.`,
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      updateFileStatus(id, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
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
  const processingCount = files.filter(f => ['uploading', 'processing'].includes(f.status)).length;

  return (
    <div className="space-y-4">
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
          accept=".pdf,.txt"
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
          PDF e TXT. Máximo 50MB por arquivo.
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
                  </div>
                  {(file.status === 'uploading' || file.status === 'processing') && (
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
