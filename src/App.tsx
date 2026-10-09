import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Sparkles } from "lucide-react";

import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";
import { AppLayout } from "@/components/layout/app-layout";
import App1 from "@/components/ui/app-1";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ALL_LEAVES } from "@/lib/nav";
import { LoginPage, RegisterPage } from "@/pages/auth";
import AcoesPage from "@/pages/acoes";
import TarefasPage from "@/pages/tarefas";
import ExecucoesPage from "@/pages/execucoes";
import ClientesPage from "@/pages/clientes";
import AnunciosPage from "@/pages/anuncios";
import IntegracoesPage from "@/pages/integracoes";
import ContaPage from "@/pages/conta";
import VendasPage from "@/pages/vendas";
import EquipePage from "@/pages/equipe";
import { STATIC_MODE } from "@/lib/api";
import { EmBrevePage, NotFoundPage } from "@/pages/em-breve";

const READY_PATHS = new Set([
  "/",
  "/acoes",
  "/tarefas",
  "/execucoes",
  "/operacao/anuncios",
  "/operacao/clientes",
  "/operacao/vendas",
  "/configuracoes/integracoes",
  "/configuracoes/equipe",
  "/configuracoes/conta",
]);

// GitHub Pages não sabe redirecionar rotas para o index.html → usa endereços com "#"
const Router = STATIC_MODE ? HashRouter : BrowserRouter;

function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <span className="grid size-12 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-sidebar-from to-sidebar-to text-white">
        <Sparkles className="size-6" />
      </span>
    </div>
  );
}

/* Só deixa entrar quem está logado; senão manda para /login e volta depois. */
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function PublicOnly() {
  const { loading } = useAuth();
  return loading ? <Splash /> : <Outlet />;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: "Poppins, sans-serif" } }} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cadastro" element={<RegisterPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<App1 />} />
                <Route path="acoes" element={<AcoesPage />} />
                <Route path="tarefas" element={<TarefasPage />} />
                <Route path="execucoes" element={<ExecucoesPage />} />
                <Route path="operacao/anuncios" element={<AnunciosPage />} />
                <Route path="operacao/clientes" element={<ClientesPage />} />
                <Route path="operacao/vendas" element={<VendasPage />} />
                <Route path="configuracoes/equipe" element={<EquipePage />} />
                <Route path="configuracoes/integracoes" element={<IntegracoesPage />} />
                <Route path="configuracoes/conta" element={<ContaPage />} />
                {ALL_LEAVES.filter((l) => !READY_PATHS.has(l.path) && !l.path.includes("#")).map((l) => (
                  <Route key={l.path} path={l.path.slice(1)} element={<EmBrevePage />} />
                ))}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </Router>
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
