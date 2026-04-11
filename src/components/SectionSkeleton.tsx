import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionSkeletonProps {
  children: React.ReactNode;
  rows?: number;
  delay?: number;
}

const SectionSkeleton = ({ children, rows = 3, delay = 500 }: SectionSkeletonProps) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!ready) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div className="animate-fade-in">{children}</div>;
};

export default SectionSkeleton;
