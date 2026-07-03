import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LogIn, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const navigate = useNavigate();

  const handleLoginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast({ title: "Atenção", description: "Digite sua senha para entrar.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      toast({ 
        title: "Erro ao fazer login", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({ title: "Atenção", description: "Digite seu e-mail para receber o Magic Link.", variant: "destructive" });
      return;
    }
    setMagicLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      toast({ 
        title: "Link enviado!", 
        description: "Verifique sua caixa de entrada para acessar o sistema." 
      });
      setPassword("");
    } catch (err: any) {
      toast({ 
        title: "Erro ao tentar enviar o link", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-2">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">LFA Soluções</CardTitle>
          <CardDescription className="text-sm">
            Acesso corporativo seguro. Faça login com sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginWithPassword} className="space-y-4">
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="seu.email@lfasolucoes.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
              <Input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            
            <div className="space-y-3 pt-2">
              <Button type="submit" className="w-full h-11 text-md font-medium" disabled={loading || magicLoading}>
                {loading ? "Entrando..." : "Entrar com Senha"}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 text-sm" 
                onClick={handleMagicLink}
                disabled={loading || magicLoading}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {magicLoading ? "Enviando..." : "Entrar com Magic Link"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
