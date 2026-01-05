import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  RotateCcw,
  FileText,
  MessageSquare,
  Search,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ItemLixeira {
  id: string;
  nome: string;
  tipo: string;
  tabela: string;
  excluido_em: string;
}

export default function Lixeira() {
  const [items, setItems] = useState<ItemLixeira[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<ItemLixeira | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const allItems: ItemLixeira[] = [];

      // Consultas excluídas
      const { data: consultas } = await supabase
        .from('consultas')
        .select('id, nome, tipo, excluido_em')
        .not('excluido_em', 'is', null);
      
      consultas?.forEach(c => allItems.push({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        tabela: 'consultas',
        excluido_em: c.excluido_em,
      }));

      // Conversas excluídas
      const { data: conversas } = await supabase
        .from('conversas')
        .select('id, titulo, excluido_em')
        .not('excluido_em', 'is', null);
      
      conversas?.forEach(c => allItems.push({
        id: c.id,
        nome: c.titulo,
        tipo: 'conversa',
        tabela: 'conversas',
        excluido_em: c.excluido_em,
      }));

      // Documentos excluídos
      const { data: documentos } = await supabase
        .from('documentos')
        .select('id, nome, tipo, excluido_em')
        .not('excluido_em', 'is', null);
      
      documentos?.forEach(d => allItems.push({
        id: d.id,
        nome: d.nome,
        tipo: d.tipo,
        tabela: 'documentos',
        excluido_em: d.excluido_em,
      }));

      // Cadernos excluídos
      const { data: cadernos } = await supabase
        .from('cadernos')
        .select('id, tribunal, data, excluido_em')
        .not('excluido_em', 'is', null);
      
      cadernos?.forEach(c => allItems.push({
        id: c.id,
        nome: `${c.tribunal} - ${c.data}`,
        tipo: 'caderno',
        tabela: 'cadernos',
        excluido_em: c.excluido_em,
      }));

      // Ordenar por data de exclusão (mais recentes primeiro)
      allItems.sort((a, b) => new Date(b.excluido_em).getTime() - new Date(a.excluido_em).getTime());
      
      setItems(allItems);
    } catch (error) {
      console.error("Erro ao carregar lixeira:", error);
      toast({
        title: "Erro ao carregar lixeira",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: ItemLixeira) => {
    try {
      const { error } = await supabase
        .from(item.tabela as any)
        .update({ excluido_em: null })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Item restaurado",
        description: `"${item.nome}" foi restaurado com sucesso.`,
      });
      
      await loadItems();
    } catch (error) {
      console.error("Erro ao restaurar:", error);
      toast({
        title: "Erro ao restaurar item",
        variant: "destructive",
      });
    }
  };

  const handleDeletePermanent = async (item: ItemLixeira) => {
    try {
      const { error } = await supabase
        .from(item.tabela as any)
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Item excluído permanentemente",
        description: `"${item.nome}" foi removido definitivamente.`,
      });
      
      setConfirmDelete(null);
      await loadItems();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro ao excluir item",
        variant: "destructive",
      });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      // Excluir permanentemente todos os itens
      await Promise.all([
        supabase.from('consultas').delete().not('excluido_em', 'is', null),
        supabase.from('conversas').delete().not('excluido_em', 'is', null),
        supabase.from('documentos').delete().not('excluido_em', 'is', null),
        supabase.from('cadernos').delete().not('excluido_em', 'is', null),
      ]);

      toast({
        title: "Lixeira esvaziada",
        description: "Todos os itens foram excluídos permanentemente.",
      });
      
      await loadItems();
    } catch (error) {
      console.error("Erro ao esvaziar lixeira:", error);
      toast({
        title: "Erro ao esvaziar lixeira",
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
    return new Date(date).toLocaleString("pt-BR");
  };

  const groupedItems = {
    consultas: items.filter(i => i.tabela === 'consultas'),
    conversas: items.filter(i => i.tabela === 'conversas'),
    documentos: items.filter(i => i.tabela === 'documentos'),
    cadernos: items.filter(i => i.tabela === 'cadernos'),
  };

  return (
    <AppLayout
      title="Lixeira"
      subtitle="Itens excluídos que podem ser restaurados ou removidos permanentemente"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{items.length} itens</Badge>
          </div>
          {items.length > 0 && (
            <Button variant="destructive" onClick={handleEmptyTrash}>
              <Trash2 className="mr-2 h-4 w-4" />
              Esvaziar Lixeira
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Lixeira vazia</p>
              <p className="text-sm text-muted-foreground">
                Itens excluídos aparecerão aqui
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
                                {item.tabela} • Excluído em {formatDate(item.excluido_em)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(item)}
                            >
                              <RotateCcw className="mr-2 h-3 w-3" />
                              Restaurar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete(item)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
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
                                    Excluído em {formatDate(item.excluido_em)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(item)}
                                >
                                  <RotateCcw className="mr-2 h-3 w-3" />
                                  Restaurar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setConfirmDelete(item)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
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

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Excluir Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item "{confirmDelete?.nome}" será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDeletePermanent(confirmDelete)}
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
