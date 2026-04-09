import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Loader2 } from "lucide-react";

/**
 * Thin wrapper: resolves an agent ID to a name, then renders AgentProfile
 * via redirect so that the comprehensive /agent/:name page is reused.
 */
const AgentById = () => {
  const { agentId } = useParams<{ agentId: string }>();

  const { data: agent, isLoading, isError } = useQuery({
    queryKey: ["agent-by-id", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents_public")
        .select("name")
        .eq("id", agentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent?.name || isError) {
    return <Navigate to="/rankings" replace />;
  }

  return <Navigate to={`/agent/${encodeURIComponent(agent.name)}`} replace />;
};

export default AgentById;
