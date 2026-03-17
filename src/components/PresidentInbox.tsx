import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Loader2, Eye, Reply, CheckCircle, Clock, Inbox,
} from "lucide-react";

const STATUS_STYLE: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  read:    { label: "Read",    class: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  replied: { label: "Replied", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

function usePetitions() {
  return useQuery({
    queryKey: ["petitions-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petitions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });
}

const PresidentInbox = () => {
  const { data: petitions = [], isLoading } = usePetitions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("petitions")
        .update({ status: "read" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["petitions-inbox"] }),
  });

  const sendReply = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { error } = await supabase
        .from("petitions")
        .update({ status: "replied", reply, replied_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petitions-inbox"] });
      toast({ title: "Reply sent" });
      setExpandedId(null);
      setReplyText("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingCount = petitions.filter((p: any) => p.status === "pending").length;

  return (
    <Card className="glass-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" />
          President's Inbox
          {pendingCount > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs ml-1">
              {pendingCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : petitions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm font-body">No petitions yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {petitions.map((p: any) => {
              const st = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
              const isExpanded = expandedId === p.id;
              return (
                <div
                  key={p.id}
                  className={`glass-card rounded-lg px-4 py-3 transition-all ${
                    p.status === "pending" ? "border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-semibold text-sm truncate">{p.subject}</span>
                        <Badge variant="outline" className={`text-[9px] uppercase ${st.class}`}>
                          {st.label}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-body">
                        From: <span className="text-foreground">{p.sender_name}</span> · {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => markRead.mutate(p.id)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setExpandedId(isExpanded ? null : p.id);
                          setReplyText("");
                        }}
                      >
                        <Reply className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-body mt-2">{p.message}</p>

                  {p.reply && (
                    <div className="mt-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-primary font-body font-semibold mb-0.5">👑 President's Reply</p>
                      <p className="text-xs text-foreground font-body">{p.reply}</p>
                    </div>
                  )}

                  {isExpanded && p.status !== "replied" && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Write your reply..."
                        className="min-h-[60px] text-xs bg-background border-border"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={500}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setExpandedId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="hero"
                          size="sm"
                          className="text-xs h-7"
                          disabled={!replyText.trim() || sendReply.isPending}
                          onClick={() => sendReply.mutate({ id: p.id, reply: replyText })}
                        >
                          {sendReply.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send Reply"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PresidentInbox;
