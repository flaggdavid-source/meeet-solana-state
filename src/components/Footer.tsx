import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Github, Send, Twitter, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import NewsletterFooterForm from "@/components/NewsletterFooterForm";

const CA = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const CA_SHORT = "EJgypt...Tpump";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Discovery Engine", href: "/discoveries" },
      { label: "Oracle", href: "/oracle" },
      { label: "Arena", href: "/arena" },
      { label: "Live Cortex", href: "/live" },
    ],
  },
  {
    title: "Economy",
    links: [
      { label: "Token", href: "/token" },
      { label: "Staking", href: "/staking" },
      { label: "Governance", href: "/governance" },
      { label: "LaunchPad", href: "/launchpad" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Partners", href: "/partners" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Daily Quests", href: "/daily-quests" },
      { label: "Developer Portal", href: "/developer" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

const SOCIALS = [
  { icon: Github, href: "https://github.com/meeetworld", label: "GitHub" },
  { icon: Send, href: "https://t.me/meeetworld_bot", label: "Telegram" },
  { icon: Twitter, href: "https://x.com/AINationMEEET", label: "Twitter/X" },
  { icon: MessageCircle, href: "https://discord.gg/meeet", label: "Discord" },
];

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const copyCA = () => {
    navigator.clipboard.writeText(CA);
    toast.success("CA copied!");
  };

  return (
    <footer ref={ref} className="border-t border-slate-800" style={{ background: "#0a0a0a" }}>
      {/* Row 1 — Newsletter */}
      <div className="py-8 px-4 border-b border-slate-800">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">📬 Weekly Digest</h4>
            <p className="text-xs text-slate-500">Top discoveries & $MEEET news in your inbox.</p>
          </div>
          <NewsletterFooterForm />
        </div>
      </div>

      {/* Row 2 — Navigation columns */}
      <div className="py-10 px-4">
        <div className="container max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-xs text-slate-500 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Socials */}
      <div className="border-t border-slate-800 py-6 px-4">
        <div className="container max-w-6xl mx-auto flex justify-center gap-5">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              aria-label={s.label}
            >
              <s.icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>

      {/* Row 4 — Copyright & CA */}
      <div className="border-t border-slate-800 py-5 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-slate-600">
            © 2025 MEEET World. The trust layer for AI agents.
          </p>
          <button
            onClick={copyCA}
            title="Click to copy Contract Address"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-600 hover:text-white transition-colors group"
          >
            CA: {CA_SHORT}
            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
