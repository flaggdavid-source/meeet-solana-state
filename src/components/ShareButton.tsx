import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  text: string;
  url: string;
  className?: string;
}

const ShareButton = ({ text, url, className = "" }: ShareButtonProps) => {
  const { toast } = useToast();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {}
    }

    // Twitter/X fallback
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer,width=600,height=400");
    toast({ title: "Share opened", description: "Sharing via X/Twitter", duration: 2000 });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className={`h-8 px-2 gap-1.5 text-xs text-muted-foreground hover:text-primary ${className}`}
      onClick={handleShare}
      aria-label="Share"
    >
      <Share2 className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
};

export default ShareButton;
