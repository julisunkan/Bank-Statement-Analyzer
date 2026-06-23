import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Statements from "./pages/statements";
import Transactions from "./pages/transactions";
import Budgets from "./pages/budgets";
import Goals from "./pages/goals";
import Forecasts from "./pages/forecasts";
import Reports from "./pages/reports";
import Merchants from "./pages/merchants";
import Categories from "./pages/categories";
import Settings from "./pages/settings";
import Admin from "./pages/admin";

import { AppLayout } from "./components/layout/app-layout";
import { useGetMe } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, path, requireAdmin }: { component: any; path: string, requireAdmin?: boolean }) {
  const { data: user, isLoading } = useGetMe({ query: { retry: false } });

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  
  if (requireAdmin && user.role !== "admin" && user.role !== "super_admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Route path={path}><AppLayout><Component /></AppLayout></Route>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/statements" component={Statements} />
      <ProtectedRoute path="/transactions" component={Transactions} />
      <ProtectedRoute path="/budgets" component={Budgets} />
      <ProtectedRoute path="/goals" component={Goals} />
      <ProtectedRoute path="/forecasts" component={Forecasts} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/merchants" component={Merchants} />
      <ProtectedRoute path="/categories" component={Categories} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/admin" component={Admin} requireAdmin={true} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
