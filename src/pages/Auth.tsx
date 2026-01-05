import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const email = session.user.email?.toLowerCase();
          setUserEmail(email || null);
          
          // Verificar se é admin ou está autorizado
          const isAuthorized = await checkAuthorization(email || '');
          
          if (isAuthorized) {
            navigate("/");
          } else {
            setPendingApproval(true);
            // Registrar solicitação de acesso
            await registerAccessRequest(email || '');
          }
        }
        setChecking(false);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase();
        setUserEmail(email || null);
        
        const isAuthorized = await checkAuthorization(email || '');
        
        if (isAuthorized) {
          navigate("/");
        } else {
          setPendingApproval(true);
        }
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthorization = async (email: string): Promise<boolean> => {
    // Admin master sempre autorizado
    if (email === 'navegacaonouniverso@gmail.com') {
      return true;
    }
    
    // Verificar se está na lista de autorizados
    const { data, error } = await supabase
      .from('usuarios_autorizados')
      .select('autorizado')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.autorizado === true;
  };

  const registerAccessRequest = async (email: string) => {
    // Verificar se já existe registro
    const { data: existing } = await supabase
      .from('usuarios_autorizados')
      .select('id')
      .eq('email', email)
      .single();
    
    if (!existing) {
      // Criar solicitação pendente
      await supabase
        .from('usuarios_autorizados')
        .insert({ email, autorizado: false });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao conectar com Google",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPendingApproval(false);
    setUserEmail(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Aguardando Autorização</CardTitle>
            <CardDescription>
              Sua solicitação de acesso foi registrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Acesso Pendente</AlertTitle>
              <AlertDescription>
                O administrador do sistema precisa autorizar seu acesso antes que você possa utilizar a plataforma.
                <br /><br />
                <strong>Email:</strong> {userEmail}
              </AlertDescription>
            </Alert>
            
            <p className="text-sm text-muted-foreground text-center">
              Você receberá uma notificação quando seu acesso for liberado.
            </p>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLogout}
            >
              Sair e tentar com outra conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sistema de Intimações</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Entrar com Google
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            O acesso é restrito. Novos usuários precisam de autorização prévia do administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
