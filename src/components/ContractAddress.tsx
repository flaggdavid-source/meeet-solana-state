import { useState, forwardRef } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MEEET_CONTRACT_ADDRESS = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
export const PUMP_FUN_URL = `https://pump.fun/coin/${MEEET_CONTRACT_ADDRESS}`;
export const DEXSCREENER_URL = `https://dexscreener.com/solana/${MEEET_CONTRACT_ADDRESS}`;

interface ContractAddressProps {
  variant?: "full" | "compact" | "inline";
  className?: string;
}

const ContractAddress = forwardRef<HTMLButtonElement, ContractAddressProps>(({ variant = "full", className = "" }, ref) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAddress = () => {
    navigator.clipboard.writeText(MEEET_CONTRACT_ADDRESS);
    setCopied(true);
    toast({ title: "Copied!", description: "Contract address copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${MEEET_CONTRACT_ADDRESS.slice(0, 6)}...${MEEET_CONTRACT_ADDRESS.slice(-4)}`;

  if (variant === "inline") {
    return (
      <button
        onClick={copyAddress}
        className={`inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors ${className}`}
        title={MEEET_CONTRACT_ADDRESS}
      >
        <span>CA: {shortAddress}</span>
        {copied ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={copyAddress}
        className={`glass-card px-3 py-1.5 flex items-center gap-2 hover:bg-primary/5 transition-colors rounded-lg group ${className}`}
      >
        <span className="text-[9px] text-muted-foreground font-body uppercase tracking-wider">CA</span>
        <code className="text-[11px] font-mono text-foreground">{shortAddress}</code>
        {copied ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />}
      </button>
    );
  }

  // "full" variant
  return (
    <button
      onClick={copyAddress}
      className={`glass-card px-4 py-2.5 flex items-center gap-3 hover:bg-primary/5 transition-colors rounded-xl group ${className}`}
    >
      <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Contract</span>
      <code className="text-xs font-mono text-foreground">{MEEET_CONTRACT_ADDRESS}</code>
      {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />}
    </button>
  );
});
ContractAddress.displayName = "ContractAddress";
export default ContractAddress;
