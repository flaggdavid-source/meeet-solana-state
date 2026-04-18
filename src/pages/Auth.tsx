import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/runtime-client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Chrome, Apple, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zujrmifaabkletgnpoyw.supabase.co";

const Auth = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || (typeof window !== "undefined" ? localStorage.getItem("meeet_pending_ref") || "" : "");

  useEffect(() => {
    if (!loading && user) {
      // If there's a ref code (from URL or stored from earlier visit), record the referral
      if (refCode) {
        fetch(`${SUPABASE_URL}/functions/v1/referral-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "record", ref_code: refCode, user_id: user.id }),
        })
          .then(() => {
            try {
              localStorage.removeItem("meeet_pending_ref");
              localStorage.removeItem("meeet_pending_ref_at");
            } catch {}
          })
          .catch(() => {});
      }

      supabase.from("profiles").select("is_onboarded").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.is_onboarded) navigate("/dashboard");
        else navigate("/onboarding");
      });
    }
  }, [user, loading, navigate, refCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md glass-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">
            <span className="text-gradient-primary">MEEET</span> {t("auth.title")}
          </CardTitle>
          <CardDescription className="font-body">{t("auth.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Social buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
              }}
            >
              <Chrome className="w-4 h-4" />
              {t("auth.google")}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
              }}
            >
              <Apple className="w-4 h-4" />
              {t("auth.apple")}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-body">{t("auth.or")}</span>
            </div>
          </div>

          {/* Email auth */}
          <EmailAuth />
        </CardContent>
      </Card>
    </div>
  );
};

function EmailAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    const authClient = supabase.auth as any;
    const { error } = await authClient.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    const authClient = supabase.auth as any;
    const { error } = await authClient.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    else setMessage(t("auth.checkEmail"));
    setLoading(false);
  };

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
        <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
      </TabsList>
      <TabsContent value="signin" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label className="font-body">{t("auth.email")}</Label>
          <Input type="email" placeholder="agent@meeet.state" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="font-body">{t("auth.password")}</Label>
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="hero" className="w-full gap-2" onClick={handleSignIn} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {t("auth.signInBtn")}
        </Button>
      </TabsContent>
      <TabsContent value="signup" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label className="font-body">{t("auth.email")}</Label>
          <Input type="email" placeholder="agent@meeet.state" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label className="font-body">{t("auth.password")}</Label>
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-secondary">{message}</p>}
        <Button variant="hero" className="w-full gap-2" onClick={handleSignUp} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {t("auth.createAccount")}
        </Button>
      </TabsContent>
    </Tabs>
  );
}

export default Auth;
