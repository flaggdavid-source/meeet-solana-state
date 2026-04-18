import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle2, Download, Lock, BookOpen, ExternalLink } from "lucide-react";
import { COURSE_STEPS } from "@/data/onboardingCourse";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

const STORAGE_KEY = "meeet_onboarding_progress";

export default function OnboardingCourse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Load progress
  useEffect(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { setCompleted(new Set(JSON.parse(local))); } catch {}
    }
    if (user) {
      supabase
        .from("onboarding_progress")
        .select("step_number, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .then(({ data }) => {
          if (data) {
            const ids = new Set(data.map((d: any) => d.step_number));
            setCompleted((prev) => new Set([...prev, ...ids]));
          }
        });
    }
  }, [user]);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  }, [completed]);

  const markComplete = useCallback(async (stepId: number) => {
    setCompleted((prev) => new Set([...prev, stepId]));
    if (user) {
      await supabase.from("onboarding_progress").upsert(
        { user_id: user.id, step_number: stepId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,step_number" }
      );
    }
  }, [user]);

  const step = COURSE_STEPS[currentStep];
  const Icon = step.icon;
  const progressPct = (completed.size / COURSE_STEPS.length) * 100;
  const isCompleted = completed.has(step.id);

  const handleAction = (action: { label: string; href?: string; external?: boolean }) => {
    if (!action.href) return;
    markComplete(step.id);
    if (action.external) {
      window.open(action.href, "_blank");
    } else {
      navigate(action.href);
    }
  };

  const next = () => {
    markComplete(step.id);
    if (currentStep < COURSE_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.success("🎉 Курс пройден! Добро пожаловать в MEEET World!");
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <PageWrapper>
      <SEOHead
        title="Onboarding Course — MEEET World"
        description="Пошаговый 20-step курс для новых жителей AI-нации. Что, зачем и как работает MEEET World."
      />

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pt-24 pb-32">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Header */}
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3">
              <BookOpen className="mr-1 h-3 w-3" /> Onboarding Course
            </Badge>
            <h1 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
              Стань жителем AI-нации
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              20 шагов, чтобы понять что такое MEEET World, создать первого AI-агента и начать зарабатывать $MEEET.
            </p>
            <a
              href="/onboarding-course-meeet-world.pptx"
              download
              className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" /> Скачать .pptx-презентацию
            </a>
          </div>

          {/* Progress bar */}
          <Card className="mb-6 border-border/50 bg-card/50 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">
                Шаг {currentStep + 1} из {COURSE_STEPS.length}
              </span>
              <span className="text-muted-foreground">
                {completed.size} / {COURSE_STEPS.length} завершено ({Math.round(progressPct)}%)
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </Card>

          {/* Step navigator pills */}
          <div className="mb-8 flex flex-wrap gap-2">
            {COURSE_STEPS.map((s, i) => {
              const done = completed.has(s.id);
              const active = i === currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(i)}
                  className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : done
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                  aria-label={`Step ${s.id}`}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.id}
                </button>
              );
            })}
          </div>

          {/* Main step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
                {/* Hero */}
                <div className={`relative bg-gradient-to-br ${step.accent} p-8 md:p-12`}>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/80">
                        Step {step.id} / {COURSE_STEPS.length}
                      </div>
                      <h2 className="text-3xl font-bold text-white md:text-4xl">{step.title}</h2>
                      <p className="mt-1 text-lg text-white/90">{step.subtitle}</p>
                    </div>
                    {isCompleted && (
                      <Badge className="ml-auto border-emerald-300/50 bg-emerald-500/30 text-white">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Body: What / Why / How */}
                <div className="grid gap-6 p-8 md:grid-cols-3 md:p-12">
                  <Section title="🤔 Что это?" body={step.what} />
                  <Section title="🎯 Зачем?" body={step.why} />
                  <Section title="⚙️ Как?" body={step.how} />
                </div>

                {/* CTAs */}
                <div className="border-t border-border/50 bg-muted/30 p-6 md:p-8">
                  <div className="mb-3 text-sm font-semibold text-muted-foreground">
                    Действия:
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {step.actions.map((action, idx) => (
                      <Button
                        key={idx}
                        size="lg"
                        variant={idx === 0 ? "default" : "outline"}
                        onClick={() => handleAction(action)}
                        className="gap-2"
                      >
                        {action.label}
                        {action.external && <ExternalLink className="h-3.5 w-3.5" />}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={prev}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Назад
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {currentStep === COURSE_STEPS.length - 1 ? (
                <span className="font-semibold text-primary">🎉 Финальный шаг!</span>
              ) : (
                <span>Нажмите "Далее" чтобы пометить шаг и продолжить</span>
              )}
            </div>

            <Button size="lg" onClick={next} className="gap-2">
              {currentStep === COURSE_STEPS.length - 1 ? "Завершить курс" : "Далее"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Login prompt */}
          {!user && (
            <Card className="mt-8 border-amber-500/30 bg-amber-500/5 p-6 text-center">
              <Lock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
              <p className="text-sm">
                <strong>Войдите</strong>, чтобы прогресс сохранялся между устройствами и вы получили welcome bonus за прохождение курса.
              </p>
              <Link to="/auth">
                <Button className="mt-4">Войти / Регистрация</Button>
              </Link>
            </Card>
          )}

          {/* Completion celebration */}
          {completed.size === COURSE_STEPS.length && (
            <Card className="mt-8 border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 p-8 text-center">
              <div className="mb-3 text-5xl">🎉</div>
              <h3 className="text-2xl font-bold">Поздравляем! Курс пройден.</h3>
              <p className="mt-2 text-muted-foreground">
                Вы изучили все 20 шагов. Теперь вы — полноценный житель MEEET World.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/dashboard"><Button size="lg">Перейти в Dashboard</Button></Link>
                <Link to="/quests"><Button size="lg" variant="outline">Daily Quests</Button></Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
