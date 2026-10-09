import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileBarChart,
  History,
  Home,
  LineChart,
  Megaphone,
  MessageCircle,
  MessageCircleQuestion,
  Package,
  PackageCheck,
  Plug,
  Rocket,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Target,
  UserCircle,
  Users,
  UsersRound,
  Warehouse,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavLeaf = { label: string; path: string; icon: LucideIcon; ready?: boolean };
export type NavGroup = { label: string; icon: LucideIcon; children: NavLeaf[] };

/* ready: true → página funcional. As demais mostram a tela "Em breve". */
export const NAV_MAIN: NavLeaf[] = [
  { label: "Hoje", path: "/", icon: Home, ready: true },
  { label: "Ações prioritárias", path: "/acoes", icon: Zap, ready: true },
  { label: "Tarefas", path: "/tarefas", icon: ClipboardList, ready: true },
  { label: "Execuções", path: "/execucoes", icon: History, ready: true },
];

export const NAV_GESTAO: NavGroup[] = [
  {
    label: "Operação",
    icon: Store,
    children: [
      { label: "Anúncios", path: "/operacao/anuncios", icon: Tag, ready: true },
      { label: "Produtos / SKUs", path: "/operacao/produtos", icon: Package },
      { label: "Estoque & Full", path: "/operacao/estoque", icon: Warehouse },
      { label: "Compras", path: "/operacao/compras", icon: ShoppingBag },
      { label: "Vendas", path: "/operacao/vendas", icon: ShoppingCart, ready: true },
      { label: "Clientes", path: "/operacao/clientes", icon: Users, ready: true },
      { label: "Separação de pedidos", path: "/operacao/separacao", icon: PackageCheck },
    ],
  },
  {
    label: "Crescimento",
    icon: LineChart,
    children: [
      { label: "Metas", path: "/crescimento/metas", icon: Target },
      { label: "Precificação", path: "/crescimento/precificacao", icon: BarChart3 },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    children: [{ label: "Campanhas", path: "/marketing/campanhas", icon: Megaphone }],
  },
  {
    label: "Atendimento",
    icon: MessageCircle,
    children: [
      { label: "Perguntas", path: "/atendimento/perguntas", icon: MessageCircleQuestion },
      { label: "Mensagens", path: "/atendimento/mensagens", icon: MessageCircle },
    ],
  },
  {
    label: "Análises",
    icon: Boxes,
    children: [{ label: "Relatórios", path: "/analises/relatorios", icon: FileBarChart }],
  },
  {
    label: "Configurações",
    icon: Settings2,
    children: [
      { label: "Preparar operação", path: "/configuracoes/preparar", icon: Rocket },
      { label: "Integrações", path: "/configuracoes/integracoes", icon: Plug, ready: true },
      { label: "Acesso da equipe", path: "/configuracoes/equipe", icon: UsersRound, ready: true },
      { label: "Minha conta", path: "/configuracoes/conta", icon: UserCircle, ready: true },
    ],
  },
];

export const ALL_LEAVES: (NavLeaf & { group?: string })[] = [
  ...NAV_MAIN,
  ...NAV_GESTAO.flatMap((g) => g.children.map((c) => ({ ...c, group: g.label }))),
];

export function findLeaf(pathname: string) {
  return ALL_LEAVES.find((l) => l.path === pathname);
}
