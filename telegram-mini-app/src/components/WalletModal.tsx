import { X, Wallet } from 'lucide-react';

interface WalletModalProps {
  onClose: () => void;
  onConnect: () => void;
}

export default function WalletModal({ onClose, onConnect }: WalletModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div 
        className="w-full bg-[var(--tg-theme-bg-color,#fff)] rounded-t-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Connect Wallet</h2>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--tg-theme-hint-color,#999)] mb-4">
          Connect your Solana wallet to access governance voting and Oracle predictions.
        </p>

        <button
          onClick={onConnect}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] hover:bg-primary/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <span className="text-xl">👻</span>
          </div>
          <div className="text-left">
            <p className="font-semibold">Phantom</p>
            <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">Connect via app or QR</p>
          </div>
        </button>

        <p className="text-[10px] text-center text-[var(--tg-theme-hint-color,#999)] mt-4">
          By connecting, you agree to MEEET World Terms of Service
        </p>
      </div>
    </div>
  );
}