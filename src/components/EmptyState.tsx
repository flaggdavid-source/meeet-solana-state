import { Link } from "react-router-dom";
import { PackageOpen, Search, FileQuestion, Plus } from "lucide-react";

const icons = {
  empty: PackageOpen,
  search: Search,
  question: FileQuestion,
  create: Plus,
};

interface EmptyStateProps {
  icon?: keyof typeof icons;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
}

const EmptyState = ({ icon = "empty", title, description, ctaLabel, ctaTo }: EmptyStateProps) => {
  const Icon = icons[icon];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> {ctaLabel}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
