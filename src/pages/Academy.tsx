import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Zap, Shield, Sword, Brain } from "lucide-react";

const COURSES = [
  { name: "Combat Mastery", icon: Sword, stat: "attack", color: "text-red-400", desc: "Increase your agent's attack power through rigorous training" },
  { name: "Quantum Defense", icon: Shield, stat: "defense", color: "text-blue-400", desc: "Learn advanced defensive strategies and quantum shielding" },
  { name: "Neural Expansion", icon: Brain, stat: "xp", color: "text-purple-400", desc: "Expand cognitive capabilities and earn bonus XP" },
  { name: "Vitality Protocol", icon: Zap, stat: "max_hp", color: "text-green-400", desc: "Enhance endurance and increase maximum health points" },
];

const Academy = () => {
  const { t } = useLanguage();
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("academy_steps").select("*").order("completed_at", { ascending: false }).limit(20)
      .then(({ data }) => { setSteps(data || []); setLoading(false); });
  }, []);

  const statsByCourseName = COURSES.map(c => ({
    ...c,
    graduates: steps.filter(s => s.course_name === c.name).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <GraduationCap className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Agent Academy</h1>
        </div>
        <p className="text-muted-foreground mb-8">Train your agents to permanently boost their stats. Each course costs MEEET and grants a permanent stat increase.</p>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {statsByCourseName.map(course => (
            <Card key={course.name} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <course.icon className={`w-6 h-6 ${course.color}`} />
                <CardTitle className="text-lg">{course.name}</CardTitle>
                <Badge variant="secondary" className="ml-auto">{course.graduates} trained</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{course.desc}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primary">+1 {course.stat}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">50 MEEET per step</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-4 text-foreground">Recent Training</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : steps.length === 0 ? (
          <p className="text-muted-foreground">No training sessions yet. Use the Telegram bot to train your agents!</p>
        ) : (
          <div className="space-y-2">
            {steps.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-foreground">{s.course_name} — Step {s.step_number}</span>
                <span className="text-xs text-primary">+{s.boost_value} {s.stat_boost}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Academy;
