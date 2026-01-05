import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, UserPlus, Loader2, Shield, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface UsuarioAutorizado {
  id: string;
  email: string;
  autorizado: boolean;
  autorizado_em: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
}

const Usuarios = () => {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioAutorizado[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoEmail, setNovoEmail] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UsuarioAutorizado | null>(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('usuarios_autorizados')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar usuários",
        variant: "destructive"
      });
    } else {
      setUsuarios(data || []);
    }

    // Carregar roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');
    
    if (rolesData) {
      setRoles(rolesData as UserRole[]);
    }

    setLoading(false);
  };

  const handleAutorizar = async (usuario: UsuarioAutorizado) => {
    const { error } = await supabase
      .from('usuarios_autorizados')
      .update({ 
        autorizado: true, 
        autorizado_em: new Date().toISOString() 
      })
      .eq('id', usuario.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao autorizar usuário",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: `${usuario.email} foi autorizado`
      });
      loadUsuarios();
    }
  };

  const handleRevogar = async (usuario: UsuarioAutorizado) => {
    const { error } = await supabase
      .from('usuarios_autorizados')
      .update({ 
        autorizado: false, 
        autorizado_em: null 
      })
      .eq('id', usuario.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao revogar acesso",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: `Acesso de ${usuario.email} foi revogado`
      });
      loadUsuarios();
    }
  };

  const handleAdicionarEmail = async () => {
    if (!novoEmail.trim()) return;

    const emailLower = novoEmail.toLowerCase().trim();
    
    // Verificar se já existe
    const existente = usuarios.find(u => u.email === emailLower);
    if (existente) {
      toast({
        title: "Aviso",
        description: "Este email já está cadastrado",
        variant: "destructive"
      });
      return;
    }

    setAdicionando(true);
    
    const { error } = await supabase
      .from('usuarios_autorizados')
      .insert({ 
        email: emailLower, 
        autorizado: true,
        autorizado_em: new Date().toISOString()
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao adicionar usuário",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: `${emailLower} foi pré-autorizado`
      });
      setNovoEmail("");
      loadUsuarios();
    }
    
    setAdicionando(false);
  };

  const handleExcluir = async () => {
    if (!usuarioParaExcluir) return;

    const { error } = await supabase
      .from('usuarios_autorizados')
      .delete()
      .eq('id', usuarioParaExcluir.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir usuário",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: `${usuarioParaExcluir.email} foi removido`
      });
      loadUsuarios();
    }
    
    setDeleteDialogOpen(false);
    setUsuarioParaExcluir(null);
  };

  const isAdmin = (email: string) => {
    return email === 'navegacaonouniverso@gmail.com';
  };

  return (
    <AppLayout title="Usuários" subtitle="Gerenciamento de acesso ao sistema">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Autorize ou revogue acesso de usuários ao sistema
          </p>
        </div>

        {/* Adicionar novo usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Pré-autorizar Usuário
            </CardTitle>
            <CardDescription>
              Adicione um email para que o usuário possa acessar o sistema quando fizer login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdicionarEmail()}
              />
              <Button onClick={handleAdicionarEmail} disabled={adicionando}>
                {adicionando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
            <CardDescription>
              {usuarios.filter(u => u.autorizado).length} autorizados de {usuarios.length} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : usuarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead>Autorizado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.email}</TableCell>
                      <TableCell>
                        <Badge variant={usuario.autorizado ? "default" : "secondary"}>
                          {usuario.autorizado ? "Autorizado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAdmin(usuario.email) ? (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />
                            Usuário
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(usuario.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {usuario.autorizado_em 
                          ? format(new Date(usuario.autorizado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {!isAdmin(usuario.email) && (
                            <>
                              {usuario.autorizado ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRevogar(usuario)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Revogar
                                </Button>
                              ) : (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleAutorizar(usuario)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Autorizar
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setUsuarioParaExcluir(usuario);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{usuarioParaExcluir?.email}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Usuarios;
