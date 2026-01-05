import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Consultas from "./pages/Consultas";
import Resultados from "./pages/Resultados";
import Cadernos from "./pages/Cadernos";
import Chat from "./pages/Chat";
import Documentos from "./pages/Documentos";
import Configuracoes from "./pages/Configuracoes";
import Registros from "./pages/Registros";
import Lixeira from "./pages/Lixeira";
import Arquivo from "./pages/Arquivo";
import Usuarios from "./pages/Usuarios";
import MonitorProcessamento from "./pages/MonitorProcessamento";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/consultas" element={<ProtectedRoute><Consultas /></ProtectedRoute>} />
          <Route path="/resultados" element={<ProtectedRoute><Resultados /></ProtectedRoute>} />
          <Route path="/cadernos" element={<ProtectedRoute><Cadernos /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="/registros" element={<ProtectedRoute><Registros /></ProtectedRoute>} />
          <Route path="/lixeira" element={<ProtectedRoute><Lixeira /></ProtectedRoute>} />
          <Route path="/arquivo" element={<ProtectedRoute><Arquivo /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/monitor" element={<ProtectedRoute><MonitorProcessamento /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
