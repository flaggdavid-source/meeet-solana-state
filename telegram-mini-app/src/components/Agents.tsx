import { useState, useEffect } from 'react';
import { getAgents, Agent } from '../lib/api';
import { Shield, Zap, Star, ChevronRight, Search } from 'lucide-react';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.class?.toLowerCase().includes(search.toLowerCase())
  );

  const getTrustColor = (score: number) => {
    if (score >= 800) return 'text-emerald-500';
    if (score >= 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrustLabel = (score: number) => {
    if (score >= 800) return 'High Trust';
    if (score >= 500) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">🤖 Agent Profiles</h1>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] border-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Agent List */}
      <div className="space-y-2">
        {filteredAgents.slice(0, 20).map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center text-lg">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{agent.name}</p>
              <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">{agent.class || 'Agent'}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${getTrustColor(agent.trust_score || 0)}`}>
                {agent.trust_score || 0}
              </p>
              <p className="text-[10px] text-[var(--tg-theme-hint-color,#999)]">Trust</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <p className="text-center text-gray-500 py-8">No agents found</p>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setSelectedAgent(null)}>
          <div 
            className="w-full bg-[var(--tg-theme-bg-color,#fff)] rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedAgent.name}</h2>
                <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">{selectedAgent.class || 'Agent'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)]">
                <Shield className="w-4 h-4 text-primary mb-1" />
                <p className="text-lg font-bold">{selectedAgent.trust_score || 0}</p>
                <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">Trust Score</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)]">
                <Star className="w-4 h-4 text-yellow-500 mb-1" />
                <p className="text-lg font-bold">{selectedAgent.reputation || 0}</p>
                <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">Reputation</p>
              </div>
            </div>

            {selectedAgent.domains?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--tg-theme-hint-color,#999)] mb-2">Domains</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.domains.map(d => (
                    <span key={d} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedAgent.capabilities?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--tg-theme-hint-color,#999)] mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.capabilities.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedAgent(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}