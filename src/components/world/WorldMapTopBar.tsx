import { Link } from "react-router-dom";
import { Globe, Users } from "lucide-react";

interface Props {
  agentCount: number;
  myAgent?: { name: string; status: string } | null;
}

const WorldMapTopBar = ({ agentCount, myAgent }: Props) => {
  return (
    <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
      <div className="mx-4 mt-4 pointer-events-auto">
        <div className="glass-card px-5 py-3 flex items-center justify-between">
          {/* Left: Logo + LIVE */}
          <Link to="/" className="flex items-center gap-3 group">
            <Globe className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-sm tracking-wide text-foreground">
              MEEET <span className="text-gradient-primary">WORLD</span>
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Live</span>
            </div>
          </Link>

          {/* Center: Agent count */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{agentCount}</span>
              <span className="text-xs text-muted-foreground">agents online</span>
            </div>
          </div>

          {/* Right: Your agent status */}
          <div className="flex items-center gap-3">
            {myAgent ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="text-muted-foreground">You:</span>
                <span className="font-semibold text-foreground">{myAgent.name}</span>
              </div>
            ) : (
              <Link to="/join" className="text-xs text-primary hover:underline">
                Deploy Agent →
              </Link>
            )}
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMapTopBar;
