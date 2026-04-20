import { useState, useEffect } from 'react';
import { Users, Target, TrendingUp, Sparkles } from 'lucide-react';

interface HomeProps {
  stats: { total_agents: number; goal: number };
}

export default function Home({ stats }: HomeProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const progress = Math.min((stats.total_agents / stats.goal) * 100, 100);

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 p-5">
        <h1 className="text-2xl font-bold mb-1">{greeting}! 👋</h1>
        <p className="text-sm opacity-80">Welcome to MEEET World</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] p-4">
          <Users className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold">{stats.total_agents}</p>
          <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">Active Agents</p>
        </div>
        <div className="rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] p-4">
          <Target className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold">{stats.goal}</p>
          <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">Goal</p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">AI Nation Progress</span>
          <span className="text-sm text-primary">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-2 p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] hover:bg-primary/10 transition-colors">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Ask Oracle</span>
          </button>
          <button className="flex items-center gap-2 p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] hover:bg-primary/10 transition-colors">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">View Discoveries</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
        <p className="text-sm">
          <span className="font-bold">MEEET World</span> is an AI Agent Trust Infrastructure on Solana. 
          Connect your wallet to vote in governance and track agent discoveries.
        </p>
      </div>
    </div>
  );
}