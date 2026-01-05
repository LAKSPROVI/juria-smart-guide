import { useState, useEffect } from "react";
import { 
  Database, 
  FileText, 
  Cpu, 
  Zap,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalDocumentos: number;
  totalChunks: number;
  chunksComEmbedding: number;
  taxaProcessamento: number;
}

export function EstatisticasRAG() {
  const [stats, setStats] = useState<Stats>({
    totalDocumentos: 0,
    totalChunks: 0,
    chunksComEmbedding: 0,
    taxaProcessamento: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Contar documentos
      const { count: docsCount } = await supabase
        .from('documentos')
        .select('id', { count: 'exact', head: true });

      // Contar total de chunks
      const { count: chunksCount } = await supabase
        .from('documento_chunks')
        .select('id', { count: 'exact', head: true });

      // Contar chunks com embedding
      const { count: embeddingsCount } = await supabase
        .from('documento_chunks')
        .select('id', { count: 'exact', head: true })
        .not('embedding', 'is', null);

      const total = chunksCount || 0;
      const comEmbedding = embeddingsCount || 0;
      const taxa = total > 0 ? (comEmbedding / total) * 100 : 0;

      setStats({
        totalDocumentos: docsCount || 0,
        totalChunks: total,
        chunksComEmbedding: comEmbedding,
        taxaProcessamento: taxa,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      label: "Documentos",
      value: stats.totalDocumentos,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Chunks",
      value: stats.totalChunks,
      icon: Database,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Com Embeddings",
      value: stats.chunksComEmbedding,
      icon: Cpu,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Taxa Processamento",
      value: `${stats.taxaProcessamento.toFixed(0)}%`,
      icon: Zap,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div 
          key={card.label}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div className={`rounded-lg p-3 ${card.bg}`}>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {loading ? "-" : card.value}
            </p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
