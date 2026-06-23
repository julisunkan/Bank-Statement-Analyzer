import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { clearAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  ListOrdered, 
  PieChart, 
  Target, 
  TrendingUp, 
  FileBarChart, 
  Store, 
  Tags, 
  Settings, 
  ShieldCheck, 
  LogOut
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/statements", label: "Statements", icon: FileText },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/forecasts", label: "Forecasts", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/merchants", label: "Merchants", icon: Store },
  { href: "/categories", label: "Categories", icon: Tags },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearAuthToken();
        setLocation("/login");
      }
    });
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div className="flex h-screen bg-muted/20">
      <div className="w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground p-4 flex flex-col">
        <div className="font-bold text-xl mb-8 tracking-tight px-3 text-sidebar-primary-foreground">
          Analyzer Pro
        </div>
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          
          <div className="mt-8 mb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Configuration
          </div>
          <Link 
            href="/settings" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
              location === "/settings" 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          
          {isAdmin && (
            <Link 
              href="/admin" 
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                location === "/admin" 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>
        
        <div className="pt-4 mt-4 border-t border-sidebar-border">
          <div className="px-3 py-2 flex flex-col gap-1 mb-2">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</span>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" 
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-14 border-b bg-card flex items-center px-6 justify-between shrink-0">
          <div className="font-semibold text-sm text-muted-foreground capitalize">
            {location.replace("/", "") || "Dashboard"}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
              {user?.plan} plan
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
