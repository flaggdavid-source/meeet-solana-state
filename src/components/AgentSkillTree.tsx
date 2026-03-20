import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Swords, Shield, Zap, Eye, Heart, Flame } from "lucide-react";
import { toast } from "sonner";

interface Skill {
  id: string;
  name: string;
  icon: React.ReactNode;
  current: number;
  max: number;
  cost: number;
  description: string;
  color: string;
}

interface AgentSkillTreeProps {
  agent: {
    id: string;
    attack: number;
    defense: number;
    hp: number;
    max_hp: number;
    level: number;
    balance_meeet: number;
  };
}

const AgentSkillTree = ({ agent }: AgentSkillTreeProps) => {
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const skills: Skill[] = [
    {
      id: "attack",
      name: "Attack Power",
      icon: <Swords className="w-4 h-4" />,
      current: agent.attack ?? 10,
      max: 100,
      cost: 250,
      description: "Increase damage in duels",
      color: "text-red-400",
    },
    {
      id: "defense",
      name: "Defense",
      icon: <Shield className="w-4 h-4" />,
      current: agent.defense ?? 5,
      max: 80,
      cost: 200,
      description: "Reduce incoming damage",
      color: "text-blue-400",
    },
    {
      id: "max_hp",
      name: "Vitality",
      icon: <Heart className="w-4 h-4" />,
      current: agent.max_hp ?? 100,
      max: 500,
      cost: 300,
      description: "Increase maximum HP",
      color: "text-emerald-400",
    },
    {
      id: "speed",
      name: "Speed",
      icon: <Zap className="w-4 h-4" />,
      current: Math.min(agent.level * 3, 60),
      max: 60,
      cost: 350,
      description: "Complete quests faster",
      color: "text-amber-400",
    },
    {
      id: "perception",
      name: "Perception",
      icon: <Eye className="w-4 h-4" />,
      current: Math.min(agent.level * 2, 40),
      max: 40,
      cost: 400,
      description: "Find rare discoveries",
      color: "text-purple-400",
    },
    {
      id: "fury",
      name: "Fury",
      icon: <Flame className="w-4 h-4" />,
      current: Math.min(agent.level, 20),
      max: 20,
      cost: 500,
      description: "Critical hit chance in duels",
      color: "text-orange-400",
    },
  ];

  const handleUpgrade = async (skill: Skill) => {
    if (skill.current >= skill.max) {
      toast.info(`${skill.name} is already maxed out`);
      return;
    }
    if ((agent.balance_meeet ?? 0) < skill.cost) {
      toast.error(`Not enough $MEEET. Need ${skill.cost}`);
      return;
    }
    setUpgrading(skill.id);
    // Simulate upgrade — in production this would call an edge function
    await new Promise((r) => setTimeout(r, 800));
    toast.success(`${skill.name} upgraded! -${skill.cost} $MEEET`);
    setUpgrading(null);
  };

  return (
    <Card className="bg-card/60 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          ⚡ Skill Tree
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {skills.map((skill) => {
            const pct = Math.min(100, (skill.current / skill.max) * 100);
            const isMaxed = skill.current >= skill.max;

            return (
              <div
                key={skill.id}
                className="bg-muted/30 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={skill.color}>{skill.icon}</span>
                    <span className="text-sm font-medium">{skill.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {skill.current}/{skill.max}
                  </span>
                </div>

                <Progress value={pct} className="h-1.5" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {skill.description}
                  </span>
                  <Button
                    size="sm"
                    variant={isMaxed ? "outline" : "default"}
                    disabled={isMaxed || upgrading === skill.id}
                    onClick={() => handleUpgrade(skill)}
                    className="h-6 text-[10px] px-2"
                  >
                    {upgrading === skill.id
                      ? "..."
                      : isMaxed
                      ? "MAX"
                      : `Upgrade (${skill.cost} M)`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentSkillTree;
