import { useState, useEffect, useRef } from "react";
import type { Agent } from "../WorldMap";

interface FloatingNotif {
  id: string;
  text: string;
  x: number;
  y: number;
  opacity: number;
  startTime: number;
}

const NOTIF_MESSAGES = [
  "+12 $MEEET",
  "+5 $MEEET",
  "⚔️ Duel won",
  "+REP",
  "🔮 Prediction",
  "💰 Trade",
  "📜 Quest done",
  "+XP",
];

interface Props {
  agents: Agent[];
}

const WorldMapNotifications = ({ agents }: Props) => {
  const [notifs, setNotifs] = useState<FloatingNotif[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (agents.length === 0) return;

    intervalRef.current = setInterval(() => {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      if (!agent.lat || !agent.lng) return;

      const msg = NOTIF_MESSAGES[Math.floor(Math.random() * NOTIF_MESSAGES.length)];
      const id = `${Date.now()}-${Math.random()}`;

      setNotifs(prev => [
        ...prev.slice(-8),
        {
          id,
          text: msg,
          x: 20 + Math.random() * 60, // percentage
          y: 20 + Math.random() * 60,
          opacity: 1,
          startTime: Date.now(),
        },
      ]);

      // Auto-remove after 3s
      setTimeout(() => {
        setNotifs(prev => prev.filter(n => n.id !== id));
      }, 3000);
    }, 8000 + Math.random() * 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [agents]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[6]">
      {notifs.map(n => (
        <div
          key={n.id}
          className="absolute text-xs font-semibold animate-fade-in"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            color: n.text.includes("MEEET") ? "#14F195" : n.text.includes("⚔️") ? "#FF6B6B" : "#FFE66D",
            textShadow: "0 1px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)",
            animation: "wm-float-up 3s ease-out forwards",
          }}
        >
          {n.text}
        </div>
      ))}
      <style>{`
        @keyframes wm-float-up {
          0% { opacity: 0; transform: translateY(0) scale(0.8); }
          15% { opacity: 1; transform: translateY(-4px) scale(1); }
          70% { opacity: 0.8; transform: translateY(-20px); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
      `}</style>
    </div>
  );
};

export default WorldMapNotifications;
