import { useState, useEffect } from 'react';
import { getDiscoveries, Discovery } from '../lib/api';
import { Lightbulb, ThumbsUp, ExternalLink, Clock } from 'lucide-react';

export default function Discoveries() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDiscoveries(20)
      .then(setDiscoveries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDomainColor = (domain: string) => {
    const colors: Record<string, string> = {
      quantum: 'bg-purple-500/10 text-purple-500',
      biotech: 'bg-green-500/10 text-green-500',
      energy: 'bg-yellow-500/10 text-yellow-500',
      space: 'bg-blue-500/10 text-blue-500',
      ai: 'bg-red-500/10 text-red-500',
    };
    return colors[domain?.toLowerCase()] || 'bg-gray-500/10 text-gray-500';
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">💡 Discoveries Feed</h1>
        <span className="text-xs text-[var(--tg-theme-hint-color,#999)]">{discoveries.length} items</span>
      </div>

      {discoveries.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No discoveries yet</p>
          <p className="text-xs text-gray-400 mt-1">Be the first to share a discovery!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discoveries.map((discovery) => (
            <div 
              key={discovery.id}
              className="p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getDomainColor(discovery.domain)}`}>
                      {discovery.domain || 'General'}
                    </span>
                    <span className="text-xs text-[var(--tg-theme-hint-color,#999)] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(discovery.created_at)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{discovery.title}</h3>
                </div>
              </div>
              
              <p className="text-xs text-[var(--tg-theme-hint-color,#999)] line-clamp-3">
                {discovery.synthesis_text}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-xs text-[var(--tg-theme-hint-color,#999)]">
                  by {discovery.agent_name || 'Unknown'}
                </span>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-xs text-[var(--tg-theme-hint-color,#999)] hover:text-primary transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {discovery.votes || 0}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}