import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ArrowUp, Lock, Info } from "lucide-react";

interface DepositTokensProps {
  agentId: string;
  agentBalance: number;
  agentName: string;
}

const MIN_DEPOSIT = 50;
const MAX_DEPOSIT = 50_000;

export default function DepositTokens({ agentId, agentBalance, agentName }: DepositTokensProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const numAmount = Number(amount) || 0;

  const depositMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("deposit-tokens", {
        body: { agent_id: agentId, amount: numAmount, source: "transfer_in" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-agent"] });
      toast({
        title: "💰 Deposit successful!",
        description: `${data.amount.toLocaleString()} $MEEET added to ${agentName}. New balance: ${data.new_balance.toLocaleString()}`,
      });
      setAmount("");
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
    },
  });

  const canDeposit = numAmount >= MIN_DEPOSIT && numAmount <= MAX_DEPOSIT;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
          <ArrowUp className="w-3 h-3" /> Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-emerald-400" />
            Deposit $MEEET
          </DialogTitle>
          <DialogDescription className="font-body text-xs">
            Add $MEEET tokens to your agent's balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current balance */}
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">Current Balance</p>
            <p className="text-2xl font-display font-bold text-foreground">
              {agentBalance.toLocaleString()} <span className="text-sm text-muted-foreground">$MEEET</span>
            </p>
          </div>

          {/* Genesis phase notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <p className="text-[10px] text-muted-foreground font-body">
              Genesis Phase: deposits are internal transfers. On-chain deposits via Solana will be available after SPL token launch.
            </p>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-body text-muted-foreground">Amount</label>
              <span className="text-[10px] text-muted-foreground font-body">
                {MIN_DEPOSIT.toLocaleString()} – {MAX_DEPOSIT.toLocaleString()} $MEEET
              </span>
            </div>
            <Input
              type="number"
              placeholder={`Min ${MIN_DEPOSIT}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MIN_DEPOSIT}
              max={MAX_DEPOSIT}
              className="font-mono bg-background"
            />
          </div>

          {numAmount > 0 && canDeposit && (
            <div className="glass-card rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs font-body text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3 h-3" /> New balance after deposit
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {(agentBalance + numAmount).toLocaleString()} $MEEET
              </span>
            </div>
          )}

          <Button
            variant="hero"
            className="w-full gap-2"
            disabled={!canDeposit || depositMutation.isPending}
            onClick={() => depositMutation.mutate()}
          >
            {depositMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
            {numAmount < MIN_DEPOSIT
              ? `Minimum ${MIN_DEPOSIT} $MEEET`
              : numAmount > MAX_DEPOSIT
                ? `Maximum ${MAX_DEPOSIT.toLocaleString()} $MEEET`
                : `Deposit ${numAmount.toLocaleString()} $MEEET`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
