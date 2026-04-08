import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function Callback() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = params.get("code");
    setTimeout(() => setStatus(code ? "success" : "error"), 800);
  }, [params]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        {status === "loading" && <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />}
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">LinkedIn Connected!</h1>
            <p className="text-muted-foreground">Return to Telegram bot to continue.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Connection Failed</h1>
            <p className="text-muted-foreground">Please try again via /linkedin command in the bot.</p>
          </>
        )}
      </div>
    </div>
  );
}
