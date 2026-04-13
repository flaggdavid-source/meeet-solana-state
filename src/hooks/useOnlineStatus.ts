import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Shows a toast when going offline/online. Call once near the app root. */
export function useOnlineStatus() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const goOffline = () => {
      wasOffline.current = true;
      toast.warning("You're offline. Some features may be limited.", { duration: Infinity, id: "offline" });
    };
    const goOnline = () => {
      toast.dismiss("offline");
      if (wasOffline.current) {
        toast.success("Back online!", { duration: 3000 });
        wasOffline.current = false;
      }
    };

    if (!navigator.onLine) goOffline();

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);
}
