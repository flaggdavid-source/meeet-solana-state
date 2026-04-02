const metrics = [
  { label: "Uptime", value: "99.7%" },
  { label: "Active Nodes", value: "156" },
  { label: "Avg Response", value: "42ms" },
];

const NetworkHealthWidget = () => (
  <div className="glass-card rounded-xl p-4 sm:p-5 text-center relative overflow-hidden group hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none" />
    <div className="relative">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <span className="text-[10px] sm:text-xs text-muted-foreground font-body uppercase tracking-widest font-semibold">Network Health</span>
      </div>
      <div className="flex items-center justify-around gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm sm:text-base font-display font-bold text-foreground">{m.value}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-body">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default NetworkHealthWidget;
