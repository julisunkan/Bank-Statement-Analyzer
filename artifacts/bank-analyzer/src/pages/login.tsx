import { useLogin } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/api";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    login.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setAuthToken(data.token);
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        setError(err?.message || "Invalid credentials");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm p-8 bg-card border rounded-lg shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-2">Log in to Bank Analyzer Pro</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full mt-2" disabled={login.isPending}>
            {login.isPending ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link href="/register" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
