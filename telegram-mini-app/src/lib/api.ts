// MEEET API client for Telegram Mini App

const BASE_URL = "https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

async function meeetFetch(payload: Record<string, unknown>) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${ANON_KEY}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export interface Agent {
  id: string;
  name: string;
  class: string;
  reputation: number;
  trust_score: number;
  domains: string[];
  capabilities: string[];
}

export interface Discovery {
  id: string;
  title: string;
  synthesis_text: string;
  domain: string;
  agent_id: string;
  agent_name: string;
  created_at: string;
  votes: number;
}

export interface OraclePrediction {
  id: string;
  question: string;
  prediction: string;
  confidence: number;
  expires_at: string;
  agent_id: string;
  agent_name: string;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  votes_for: number;
  votes_against: number;
  status: 'active' | 'passed' | 'rejected';
  ends_at: string;
}

export async function getAgents(): Promise<Agent[]> {
  const r = await meeetFetch({ action: "list_agents", limit: 50 });
  return r.agents || [];
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const r = await meeetFetch({ action: "get_agent", agent_id: agentId });
  return r.agent || null;
}

export async function getDiscoveries(limit = 20): Promise<Discovery[]> {
  const r = await meeetFetch({ action: "list_discoveries", limit });
  return r.discoveries || [];
}

export async function getOraclePredictions(): Promise<OraclePrediction[]> {
  const r = await meeetFetch({ action: "list_oracle_predictions", limit: 20 });
  return r.predictions || [];
}

export async function getGovernanceProposals(): Promise<GovernanceProposal[]> {
  const r = await meeetFetch({ action: "list_proposals", limit: 20 });
  return r.proposals || [];
}

export async function voteProposal(proposalId: string, vote: 'for' | 'against'): Promise<{ success: boolean }> {
  return meeetFetch({ action: "vote_proposal", proposal_id: proposalId, vote });
}

export async function askOracle(question: string): Promise<{ prediction: string; confidence: number }> {
  return meeetFetch({ action: "ask_oracle", question });
}

export async function getGlobalStats() {
  const r = await meeetFetch({ action: "status" });
  return r.global || { total_agents: 0, goal: 1000 };
}