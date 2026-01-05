import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ItemFila {
  id: string;
  documento_id: string | null;
  caderno_id: string | null;
  status: string;
  progresso: number;
  total_chunks: number;
  chunks_processados: number;
  erro_mensagem: string | null;
  created_at: string;
  documento?: { nome: string } | null;
  caderno?: { tribunal: string; data: string } | null;
}

export function FilaProcessamento() {
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFila();
    
    // Atualizar a cada 5 segundos
    const interval = setInterval(loadFila, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadFila = async () => {
    try {
      const { data, error } = await supabase
        .from('fila_processamento_rag')
        .select(`
          *,
          documento:documentos(nome),
          caderno:cadernos(tribunal, data)
        `)
        .in('status', ['pendente', 'processando'])
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      setFila((data as unknown as ItemFila[]) || []);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    } finally {
      setLoading(false);
    }
  };

  const reprocessar = async (item: ItemFila) => {
    try {
      await supabase
        .from('fila_processamento_rag')
        .update({ status: 'pendente', erro_mensagem: null })
        .eq('id', item.id);
      
      if (item.documento_id) {
        await supabase.functions.invoke('processar-documento-rag', {
          body: { documento_id: item.documento_id }
        });
      }
      
      loadFila();
    } catch (error) {
      console.error('Erro ao reprocessar:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fila.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-10 w-10 mx-auto text-success mb-3" />
        <p className="text-muted-foreground">
          Nenhum documento na fila de processamento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fila.map(item => {
        const nome = item.documento?.nome || 
          (item.caderno ? `Caderno ${item.caderno.tribunal} - ${item.caderno.data}` : 'Documento');
        
        return (
          <div 
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <div className={cn(
              "rounded-lg p-2",
              item.status === 'processando' ? "bg-primary/10" :
              item.erro_mensagem ? "bg-destructive/10" :
              "bg-muted"
            )}>
              {item.status === 'processando' ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : item.erro_mensagem ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{nome}</p>
              
              <div className="flex items-center gap-2 mt-1">
                {item.status === 'processando' && (
                  <>
                    <Badge className="text-xs bg-primary/10 text-primary">
                      Processando
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.chunks_processados}/{item.total_chunks} chunks
                    </span>
                  </>
                )}
                {item.status === 'pendente' && (
                  <Badge variant="secondary" className="text-xs">
                    Na fila
                  </Badge>
                )}
              </div>

              {item.status === 'processando' && item.total_chunks > 0 && (
                <Progress 
                  value={(item.chunks_processados / item.total_chunks) * 100} 
                  className="mt-2 h-1" 
                />
              )}

              {item.erro_mensagem && (
                <p className="text-xs text-destructive mt-1 truncate">
                  {item.erro_mensagem}
                </p>
              )}
            </div>

            {item.erro_mensagem && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => reprocessar(item)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
