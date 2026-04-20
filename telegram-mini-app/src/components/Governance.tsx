import { useState, useEffect } from 'react';
import { getGovernanceProposals, GovernanceProposal, voteProposal } from '../lib/api';
import { Vote, ThumbsUp, ThumbsDown, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';

interface GovernanceProps {
  walletConnected: boolean;
}

export default function Governance({ walletConnected }: GovernanceProps) {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    getGovernanceProposals()
      .then(setProposals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
    if (!walletConnected) return;
    setVoting(proposalId);
    try {
      await voteProposal(proposalId, vote);
      // Refresh proposals
      const updated = await getGovernanceProposals();
      setProposals(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setVoting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-500 bg-blue-500/10';
      case 'passed': return 'text-emerald-500 bg-emerald-500/10';
      case 'rejected': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-3 h-3" />;
      case 'passed': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  if (!walletConnected) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64 text-center">
        <Lock className="w-12 h-12 text-gray-300 mb-3" />
        <p className="font-semibold">Connect Wallet to Vote</p>
        <p className="text-xs text-gray-500 mt-1">Governance voting requires a connected wallet</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">🗳️ Governance</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12">
          <Vote className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No active proposals</p>
          <p className="text-xs text-gray-400 mt-1">Check back later for governance votes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <div 
              key={proposal.id}
              className="p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] space-y-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm flex-1">{proposal.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${getStatusColor(proposal.status)}`}>
                  {getStatusIcon(proposal.status)}
                  {proposal.status}
                </span>
              </div>
              
              <p className="text-xs text-[var(--tg-theme-hint-color,#999)] line-clamp-2">
                {proposal.description}
              </p>

              {/* Vote Stats */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-500 flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> For
                    </span>
                    <span className="font-semibold">{proposal.votes_for || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(((proposal.votes_for || 0) / ((proposal.votes_for || 0) + (proposal.votes_against || 1))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-red-500 flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" /> Against
                    </span>
                    <span className="font-semibold">{proposal.votes_against || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(((proposal.votes_against || 0) / ((proposal.votes_for || 0) + (proposal.votes_against || 1))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Vote Buttons */}
              {proposal.status === 'active' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleVote(proposal.id, 'for')}
                    disabled={voting === proposal.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Vote For
                  </button>
                  <button
                    onClick={() => handleVote(proposal.id, 'against')}
                    disabled={voting === proposal.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Vote Against
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}