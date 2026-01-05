import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Archive,
  ArchiveRestore,
  FileText,
  MessageSquare,
  Search,
  Calendar,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemArquivo {
  id: string;
  nome: string;
  tipo: string;
  tabela: string;
  created_at: string;
}

export default function Arquivo() {
  const [items, setItems] = useState<ItemArquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const allItems: ItemArquivo[] = [];

      // Consultas arquivadas
      const { data: consultas } = await supabase
        .from('consultas')
        .select('id, nome, tipo, created_at')
        .eq('arquivado', true)
        .is('excluido_em', null);
      
      consultas?.forEach(c => allItems.push({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        tabela: 'consultas',
        created_at: c.created_at,
      }));

      // Conversas arquivadas
      const { data: conversas } = await supabase
        .from('conversas')
        .select('id, titulo, created_at')
        .eq('arquivado', true)
        .is('excluido_em', null);
      
      conversas?.forEach(c => allItems.push({
        id: c.id,
        nome: c.titulo,
        tipo: 'conversa',
        tabela: 'conversas',
        created_at: c.created_at,
      }));

      // Documentos arquivados
      const { data: documentos } = await supabase
        .from('documentos')
        .select('id, nome, tipo, created_at')
        .eq('arquivado', true)
        .is('excluido_em', null);
      
      documentos?.forEach(d => allItems.push({
        id: d.id,
        nome: d.nome,
        tipo: d.tipo,
        tabela: 'documentos',
        created_at: d.created_at,
      }));

      // Cadernos arquivados
      const { data: cadernos } = await supabase
        .from('cadernos')
        .select('id, tribunal, data, created_at')
        .eq('arquivado', true)
        .is('excluido_em', null);
      
      cadernos?.forEach(c => allItems.push({
        id: c.id,
        nome: `${c.tribunal} - ${c.data}`,
        tipo: 'caderno',
        tabela: 'cadernos',
        created_at: c.created_at,
      }));

      // Ordenar por data de criação (mais recentes primeiro)
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setItems(allItems);
    } catch (error) {
      console.error("Erro ao carregar arquivo:", error);
      toast({
        title: "Erro ao carregar arquivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (item: ItemArquivo) => {
    try {
      const { error } = await supabase
        .from(item.tabela as any)
        .update({ arquivado: false })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Item desarquivado",
        description: `"${item.nome}" foi movido de volta para a lista ativa.`,
      });
      
      await loadItems();
    } catch (error) {
      console.error("Erro ao desarquivar:", error);
      toast({
        title: "Erro ao desarquivar item",
        variant: "destructive",
      });
    }
  };

  const getIcon = (tabela: string) => {
    switch (tabela) {
      case 'consultas': return Search;
      case 'conversas': return MessageSquare;
      case 'documentos': return FileText;
      case 'cadernos': return Calendar;
      default: return FileText;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const groupedItems = {
    consultas: items.filter(i => i.tabela === 'consultas'),
    conversas: items.filter(i => i.tabela === 'conversas'),
    documentos: items.filter(i => i.tabela === 'documentos'),
    cadernos: items.filter(i => i.tabela === 'cadernos'),
  };

  return (
    <AppLayout
      title="Arquivo"
      subtitle="Itens arquivados para consulta posterior"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{items.length} itens arquivados</Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Arquivo vazio</p>
              <p className="text-sm text-muted-foreground">
                Itens arquivados aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="todos" className="w-full">
            <TabsList>
              <TabsTrigger value="todos">Todos ({items.length})</TabsTrigger>
              <TabsTrigger value="consultas">Consultas ({groupedItems.consultas.length})</TabsTrigger>
              <TabsTrigger value="conversas">Conversas ({groupedItems.conversas.length})</TabsTrigger>
              <TabsTrigger value="documentos">Documentos ({groupedItems.documentos.length})</TabsTrigger>
              <TabsTrigger value="cadernos">Cadernos ({groupedItems.cadernos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="todos">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {items.map((item) => {
                    const Icon = getIcon(item.tabela);
                    return (
                      <Card key={`${item.tabela}-${item.id}`} className="shadow-sm">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-muted p-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{item.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.tabela} • Criado em {formatDate(item.created_at)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnarchive(item)}
                          >
                            <ArchiveRestore className="mr-2 h-3 w-3" />
                            Desarquivar
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {Object.entries(groupedItems).map(([key, groupItems]) => (
              <TabsContent key={key} value={key}>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-2">
                    {groupItems.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        Nenhum item nesta categoria
                      </p>
                    ) : (
                      groupItems.map((item) => {
                        const Icon = getIcon(item.tabela);
                        return (
                          <Card key={`${item.tabela}-${item.id}`} className="shadow-sm">
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-muted p-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium">{item.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Criado em {formatDate(item.created_at)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnarchive(item)}
                              >
                                <ArchiveRestore className="mr-2 h-3 w-3" />
                                Desarquivar
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
