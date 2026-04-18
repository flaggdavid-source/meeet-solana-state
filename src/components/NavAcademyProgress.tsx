import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAcademyProgress } from "@/hooks/useAcademyProgress";

const NavAcademyProgress = () => {
  const { data } = useAcademyProgress();
  if (!data || data.totalModules === 0) return null;
  if (data.graduated) {
    return (
      <Link
        to="/academy"
        className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        title="Academy graduate"
      >
        <GraduationCap className="w-3 h-3" />
        <span className="font-semibold">Graduate</span>
      </Link>
    );
  }
  return (
    <Link
      to="/academy"
      className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors group"
      title={`Academy: ${data.completed}/${data.totalModules} modules`}
    >
      <GraduationCap className="w-3.5 h-3.5 text-primary" />
      <div className="flex flex-col gap-0.5 min-w-[50px]">
        <div className="text-[9px] text-muted-foreground leading-none">Academy</div>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
            style={{ width: `${data.pct}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground group-hover:text-foreground">{data.pct}%</span>
    </Link>
  );
};

export default NavAcademyProgress;
