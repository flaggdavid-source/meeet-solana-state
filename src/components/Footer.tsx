import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Github, Send, Twitter, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

const CA = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const CA_SHORT = "EJgypt...Tpump";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Explore", href: "/explore" },
      { label: "Arena", href: "/arena" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Staking", href: "/staking" },
      { label: "Governance", href: "/governance" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Developer Portal", href: "/developer" },
      { label: "Documentation", href: "/developer" },
      { label: "API Reference", href: "/developer" },
      { label: "Status Page", href: "/live" },
      { label: "Blog", href: "/herald" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/about" },
      { label: "Contact", href: "/about" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

const SOCIALS = [
  { icon: Twitter, href: "https://x.com/AINationMEEET", label: "Twitter/X" },
  { icon: MessageCircle, href: "https://discord.gg/meeet", label: "Discord" },
  { icon: Send, href: "https://t.me/meeetworld_bot", label: "Telegram" },
  { icon: Github, href: "https://github.com/alxvasilevvv/meeet-solana-state", label: "GitHub" },
];

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const copyCA = () => {
    navigator.clipboard.writeText(CA);
    toast.success("CA copied!");
  };

  return (
    <footer ref={ref} className="bg-gray-950 border-t border-purple-500/20">
      {/* Main grid */}
      <div className="py-12 px-4">
        <div className="container max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="text-xl font-black tracking-tight text-white">MEEET</Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              The First AI State for Humanity. Deploy agents, earn $MEEET, shape the future.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 transition-all"
                  aria-label={s.label}
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) =>
                  "external" in l && l.external ? (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-white transition-colors">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label + l.href}>
                      <Link to={l.href} className="text-xs text-gray-400 hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800 py-5 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-gray-400">
            © {new Date().getFullYear()} MEEET STATE. All rights reserved.
          </p>
          <span className="text-[11px] text-gray-300">Built on Solana ◎</span>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
