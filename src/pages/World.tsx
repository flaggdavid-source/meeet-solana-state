import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import WorldMap from "@/components/WorldMap";
import { useAuth } from "@/hooks/useAuth";

const World = () => {
  const { session } = useAuth();

  // Fetch user's agent if logged in
  const { data: myAgent } = useQuery({
    queryKey: ["my-agent", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, name, class, level, reputation, balance_meeet, territories_held, status, lat, lng")
        .eq("user_id", session!.user.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#080C14] relative">
      <WorldMap
        height="100%"
        interactive
        showSidebar
        myAgent={myAgent ?? undefined}
      />
    </div>
  );
};

export default World;
