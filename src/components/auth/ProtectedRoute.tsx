import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Verificar autorização de forma assíncrona
          setTimeout(() => {
            checkAuthorization(session.user.email?.toLowerCase() || '');
          }, 0);
        } else {
          setIsAuthorized(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAuthorization(session.user.email?.toLowerCase() || '');
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthorization = async (email: string) => {
    // Admin master sempre autorizado
    if (email === 'navegacaonouniverso@gmail.com') {
      setIsAuthorized(true);
      setLoading(false);
      return;
    }

    // Verificar se está na lista de autorizados
    const { data, error } = await supabase
      .from('usuarios_autorizados')
      .select('autorizado')
      .eq('email', email)
      .single();
    
    if (error || !data || !data.autorizado) {
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
