import { useState } from "react";
import { Share2, Copy, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface ShareMenuProps {
  title: string;
  text: string;
  url: string;
  className?: string;
  variant?: "icon" | "button";
}

const ShareMenu = ({ title, text, url, className = "", variant = "icon" }: ShareMenuProps) => {
  const [copied, setCopied] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `https://meeet.world${url}`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(fullUrl);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: fullUrl });
        return true;
      } catch { /* user cancelled */ }
    }
    return false;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToX = () =>
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank", "noopener,noreferrer,width=600,height=400");

  const shareToTg = () =>
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank", "noopener,noreferrer,width=600,height=400");

  const shareToDiscord = () =>
    window.open(`https://discord.com/channels/@me`, "_blank", "noopener,noreferrer");

  const handleClick = async () => {
    const shared = await handleNativeShare();
    if (shared) return;
    // fallback handled by popover opening
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size={variant === "icon" ? "icon" : "sm"}
          variant="ghost"
          className={`text-muted-foreground hover:text-primary ${variant === "icon" ? "h-9 w-9" : "gap-1.5"} ${className}`}
          aria-label="Share"
          onClick={(e) => {
            if (navigator.share) {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <Share2 className="w-4 h-4" />
          {variant === "button" && <span className="text-xs">Share</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <p className="text-sm font-semibold mb-2">Share</p>
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="ghost" className="justify-start text-xs gap-2" onClick={shareToX}>
            𝕏 Twitter / X
          </Button>
          <Button size="sm" variant="ghost" className="justify-start text-xs gap-2" onClick={shareToTg}>
            ✈️ Telegram
          </Button>
          <Button size="sm" variant="ghost" className="justify-start text-xs gap-2" onClick={shareToDiscord}>
            💬 Discord
          </Button>
          <Button size="sm" variant="ghost" className="justify-start text-xs gap-2" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-secondary" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareMenu;
