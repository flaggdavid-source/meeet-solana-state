import { Wallet, ExternalLink } from 'lucide-react';
import { shortenAddress } from '../lib/wallet';

interface NavbarProps {
  walletConnected: boolean;
  walletAddress: string | null;
  onConnectWallet: () => void;
}

export default function Navbar({ walletConnected, walletAddress, onConnectWallet }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-[var(--tg-theme-bg-color,#fff)] border-b border-gray-200 px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-lg">MEEET</span>
        </div>
        <div className="flex items-center gap-2">
          {walletConnected && walletAddress ? (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-mono">
              <Wallet className="w-3.5 h-3.5" />
              {shortenAddress(walletAddress)}
            </button>
          ) : (
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--tg-theme-button-color,#6366f1)] text-white text-sm font-medium"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}