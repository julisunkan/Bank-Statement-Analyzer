import { useRegister } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/api";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Register() {
  const [, setLocation] = useLocation();
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({ data: { name, email, password } }, {
      onSuccess: (data) => {
        setAuthToken(data.token);
        setLocation("/dashboard");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm p-8 bg-card border rounded-lg shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an Account</h1>
          <p className="text-sm text-muted-foreground mt-2">Join Bank Analyzer Pro today</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Full Name</label>
            <Input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full mt-2" disabled={register.isPending}>
            {register.isPending ? "Creating account..." : "Register"}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
