import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { GraduationCap, Send, Sparkles, CheckCircle2, Lock, Trophy, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";

type ModuleRow = {
  id: string; slug: string; track: string; order_index: number;
  title: string; subtitle: string | null; description: string | null;
  level: string; estimated_minutes: number; reward_meeet: number; reward_xp: number;
  content_md: string; action_type: string | null; action_payload: any; is_pro_unlock: boolean;
};
type ProgressRow = { module_slug: string; status: string; reward_claimed: boolean; meeet_awarded: number; };
type CertRow = { certificate_token: string; modules_completed: number; total_meeet_earned: number; trial_pro_expires_at: string | null; };

const TRACKS = [
  { key: "foundations", title: "🌱 Основы", color: "from-emerald-500 to-teal-500" },
  { key: "gameplay", title: "⚔️ Геймплей", color: "from-orange-500 to-red-500" },
  { key: "economy", title: "💰 Экономика", color: "from-yellow-500 to-amber-500" },
  { key: "civilization", title: "🏛 Civilization", color: "from-indigo-500 to-purple-500" },
  { key: "pro", title: "🚀 Pro", color: "from-pink-500 to-rose-500" },
];

const LEVELS = [
  { key: "newbie", title: "Новичок в AI", desc: "Объясняем с нуля: агенты, токены, кошельки" },
  { key: "ai-user", title: "Знаком с AI", desc: "Фокус на MEEET-специфику: $MEEET, стейкинг, governance" },
  { key: "web3", title: "Web3-юзер", desc: "Быстро в агентов, breeding, arena, oracle" },
];

const Academy = () => {
  const { user, loading: authLoading } = useAuth();
  const [level, setLevel] = useState<string | null>(() => localStorage.getItem("academy_level"));
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [certificate, setCertificate] = useState<CertRow | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", class: "warrior" });
  const chatEndRef = useRef<HTMLDivElement>(null);

  const reload = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.functions.invoke("academy-progress", { body: { action: "get_overview" } });
    if (data) {
      setModules(data.modules || []);
      setProgress(data.progress || []);
      setCertificate(data.certificate || null);
    }
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) reload(); }, [authLoading, user]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const completedSlugs = useMemo(() => new Set(progress.filter(p => p.status === "completed").map(p => p.module_slug)), [progress]);
  const totalMeeet = useMemo(() => progress.reduce((s, p) => s + (p.meeet_awarded || 0), 0), [progress]);
  const completionPct = modules.length ? Math.round((completedSlugs.size / modules.length) * 100) : 0;
  const activeModule = modules.find(m => m.slug === activeSlug);

  const chooseLevel = (lvl: string) => { setLevel(lvl); localStorage.setItem("academy_level", lvl); };

  const openModule = async (slug: string) => {
    setActiveSlug(slug);
    setChatMessages([]);
    if (!user) return;
    await supabase.functions.invoke("academy-progress", { body: { action: "start_module", module_slug: slug, level_chosen: level } });
  };

  const completeModule = async (slug: string) => {
    if (!user) return toast.error("Войди, чтобы получить награду");
    const { data, error } = await supabase.functions.invoke("academy-progress", { body: { action: "complete_module", module_slug: slug } });
    if (error) return toast.error("Ошибка: " + error.message);
    if (data?.already_claimed) return toast.info("Уже забрано ✅");
    toast.success(`+${data?.reward_meeet || 0} MEEET • +${data?.reward_xp || 0} XP 🎉`);
    await reload();
  };

  const createStarterAgent = async () => {
    if (!agentForm.name.trim()) return toast.error("Введи имя агента");
    const { data, error } = await supabase.functions.invoke("academy-progress", {
      body: { action: "create_starter_agent", agent_name: agentForm.name, agent_class: agentForm.class },
    });
    if (error) return toast.error(error.message);
    if (data?.status === "already_has_agent") toast.info("Агент уже есть!");
    else toast.success(`Агент "${agentForm.name}" создан + 100 MEEET 🎉`);
    if (activeSlug) await completeModule(activeSlug);
  };

  const graduate = async () => {
    const { data, error } = await supabase.functions.invoke("academy-progress", { body: { action: "graduate", level_chosen: level } });
    if (error) return toast.error(error.message);
    toast.success("🎓 Поздравляем! NFT-сертификат и Trial Pro 7 дней активированы!");
    await reload();
    if (activeSlug) await completeModule(activeSlug);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatStreaming) return;
    const userMsg = { role: "user" as const, content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatStreaming(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academy-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages, module_slug: activeSlug }),
      });
      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantSoFar += delta;
              setChatMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) {
      toast.error("Чат недоступен. Попробуй позже.");
    } finally {
      setChatStreaming(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto p-8"><Loader2 className="animate-spin" /></div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-8 max-w-2xl text-center">
          <GraduationCap className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold mb-3">Академия MEEET World</h1>
          <p className="text-muted-foreground mb-6">Войди, чтобы начать обучение и получать награды.</p>
          <Button asChild size="lg"><a href="/auth">Войти / Зарегистрироваться</a></Button>
        </div>
      </div>
    );
  }

  // Step 1: choose level
  if (!level) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Академия MEEET World — Интерактивный курс" description="Пройди 20 модулей, получи MEEET, NFT-сертификат и Trial Pro." />
        <Navbar />
        <div className="container mx-auto p-8 max-w-3xl">
          <div className="text-center mb-10">
            <GraduationCap className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl font-bold mb-3">Академия MEEET World 🎓</h1>
            <p className="text-muted-foreground text-lg">Выбери свой уровень — мы адаптируем курс под тебя</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {LEVELS.map(l => (
              <Card key={l.key} onClick={() => chooseLevel(l.key)} className="cursor-pointer hover:border-primary transition-all hover:scale-[1.02]">
                <CardHeader><CardTitle className="text-xl">{l.title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{l.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: roadmap or active module
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Академия MEEET World" description="Интерактивный курс из 20 модулей." />
      <Navbar />
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Академия MEEET World</h1>
              <p className="text-sm text-muted-foreground">Уровень: {LEVELS.find(l => l.key === level)?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{completedSlugs.size}/{modules.length} модулей</Badge>
            <Badge variant="secondary">+{totalMeeet} MEEET</Badge>
            {certificate && <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500"><Trophy className="w-3 h-3 mr-1" />Выпускник</Badge>}
          </div>
        </div>

        <Progress value={completionPct} className="mb-8" />

        {!activeModule ? (
          // Roadmap
          <div className="space-y-8">
            {TRACKS.map(track => {
              const trackModules = modules.filter(m => m.track === track.key);
              return (
                <div key={track.key}>
                  <h2 className={`text-xl font-bold mb-3 bg-gradient-to-r ${track.color} bg-clip-text text-transparent`}>{track.title}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {trackModules.map(m => {
                      const done = completedSlugs.has(m.slug);
                      const isGrad = m.action_type === "graduate";
                      const locked = isGrad && completedSlugs.size < 18;
                      return (
                        <Card
                          key={m.slug}
                          onClick={() => !locked && openModule(m.slug)}
                          className={`cursor-pointer transition-all hover:border-primary ${done ? "border-emerald-500/50 bg-emerald-500/5" : ""} ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <span className="text-xs text-muted-foreground">#{m.order_index}</span>
                              {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : locked ? <Lock className="w-4 h-4 text-muted-foreground" /> : null}
                            </div>
                            <CardTitle className="text-sm">{m.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground line-clamp-2">{m.subtitle}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <span className="text-primary">+{m.reward_meeet} MEEET</span>
                              <span className="text-muted-foreground">• {m.estimated_minutes} мин</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Active module: split view
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Content */}
            <div className="lg:col-span-2 space-y-4">
              <Button variant="ghost" onClick={() => setActiveSlug(null)}>← К roadmap</Button>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{activeModule.track} • #{activeModule.order_index}</Badge>
                    <Badge>+{activeModule.reward_meeet} MEEET</Badge>
                  </div>
                  <CardTitle className="text-2xl">{activeModule.title}</CardTitle>
                  {activeModule.subtitle && <p className="text-muted-foreground">{activeModule.subtitle}</p>}
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeModule.content_md}</ReactMarkdown>
                  </div>

                  {/* Interactive actions */}
                  <div className="mt-6 pt-6 border-t">
                    {activeModule.action_type === "create_agent" && !completedSlugs.has(activeModule.slug) && (
                      <div className="space-y-3">
                        <h3 className="font-semibold">🤖 Создай своего агента</h3>
                        <Input placeholder="Имя агента" value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} />
                        <div className="flex flex-wrap gap-2">
                          {(activeModule.action_payload?.classes || []).map((c: string) => (
                            <Button key={c} variant={agentForm.class === c ? "default" : "outline"} size="sm" onClick={() => setAgentForm({ ...agentForm, class: c })}>{c}</Button>
                          ))}
                        </div>
                        <Button onClick={createStarterAgent} className="w-full"><Sparkles className="w-4 h-4 mr-2" />Создать + получить 100 MEEET</Button>
                      </div>
                    )}
                    {activeModule.action_type === "graduate" && (
                      <Button onClick={graduate} size="lg" className="w-full bg-gradient-to-r from-yellow-500 to-amber-500">
                        <Trophy className="w-5 h-5 mr-2" />Получить NFT-сертификат + Trial Pro
                      </Button>
                    )}
                    {!["create_agent", "graduate"].includes(activeModule.action_type || "") && !completedSlugs.has(activeModule.slug) && (
                      <Button onClick={() => completeModule(activeModule.slug)} className="w-full">
                        <CheckCircle2 className="w-4 h-4 mr-2" />Отметить пройденным (+{activeModule.reward_meeet} MEEET)
                      </Button>
                    )}
                    {completedSlugs.has(activeModule.slug) && (
                      <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1" />Модуль пройден</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat with Sara */}
            <Card className="lg:sticky lg:top-4 h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Sara — твой наставник</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-y-auto space-y-3 mb-3 pr-2">
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Спроси что угодно о текущем модуле или MEEET World 👋</p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`p-2 rounded-lg text-sm ${m.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "..."}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Спроси Sara..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                    disabled={chatStreaming}
                  />
                  <Button size="icon" onClick={sendChatMessage} disabled={chatStreaming || !chatInput.trim()}>
                    {chatStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Academy;
