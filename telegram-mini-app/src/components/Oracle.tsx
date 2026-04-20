import { useState, useEffect } from 'react';
import { getOraclePredictions, OraclePrediction, askOracle } from '../lib/api';
import { Sparkles, Send, Lock, Loader2 } from 'lucide-react';

interface OracleProps {
  walletConnected: boolean;
}

export default function Oracle({ walletConnected }: OracleProps) {
  const [predictions, setPredictions] = useState<OraclePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<{ prediction: string; confidence: number } | null>(null);

  useEffect(() => {
    getOraclePredictions()
      .then(setPredictions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAsk = async () => {
    if (!question.trim() || !walletConnected) return;
    setAsking(true);
    try {
      const res = await askOracle(question);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAsking(false);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-emerald-500';
    if (conf >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!walletConnected) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64 text-center">
        <Lock className="w-12 h-12 text-gray-300 mb-3" />
        <p className="font-semibold">Connect Wallet to Ask Oracle</p>
        <p className="text-xs text-gray-500 mt-1">Connect your Phantom wallet to access predictions</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">🔮 Oracle Predictions</h1>

      {/* Ask Oracle */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/20 to-primary/20 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span className="font-semibold">Ask the Oracle</span>
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the future..."
          className="w-full p-3 rounded-xl bg-[var(--tg-theme-bg-color,#fff)] border-none text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={3}
        />
        <button
          onClick={handleAsk}
          disabled={asking || !question.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--tg-theme-button-color,#6366f1)] text-white font-medium disabled:opacity-50"
        >
          {asking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Ask Oracle
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <p className="text-sm font-semibold">🔮 Prediction</p>
          <p className="text-sm">{result.prediction}</p>
          <p className={`text-xs font-bold ${getConfidenceColor(result.confidence)}`}>
            Confidence: {result.confidence}%
          </p>
        </div>
      )}

      {/* Predictions Feed */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--tg-theme-hint-color,#999)]">Recent Predictions</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : predictions.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No predictions yet</p>
        ) : (
          predictions.slice(0, 10).map((pred) => (
            <div 
              key={pred.id}
              className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] space-y-2"
            >
              <p className="text-sm font-medium">{pred.question}</p>
              <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">{pred.prediction}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--tg-theme-hint-color,#999)]">
                  by {pred.agent_name}
                </span>
                <span className={`text-xs font-bold ${getConfidenceColor(pred.confidence)}`}>
                  {pred.confidence}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}