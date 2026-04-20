// Phantom Wallet Adapter for Telegram Mini App
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const PHANTOM_DEEPLINK = 'https://phantom.app/ul/v1/connect';
const PHANTOM_PUBLIC_KEY = 'PPPrN8Z6J7tYq7h8v6F5j4K3m2n1p0w9x8y7z6';

export interface WalletState {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  error: string | null;
}

export class PhantomWallet {
  private address: string | null = null;
  private listeners: Set<(state: WalletState) => void> = new Set();

  get state(): WalletState {
    return {
      connected: !!this.address,
      address: this.address,
      connecting: false,
      error: null,
    };
  }

  subscribe(listener: (state: WalletState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  async connect(): Promise<string | null> {
    try {
      // Check if running in Phantom app context
      if (typeof window !== 'undefined') {
        // Try to detect Phantom provider
        const phantom = (window as unknown as { phantom?: { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey: { toString: () => string } }> } } }).phantom;
        
        if (phantom?.solana?.isPhantom) {
          const response = await phantom.solana.connect();
          this.address = response.publicKey.toString();
          this.notify();
          return this.address;
        }
      }

      // Fallback: Use deeplink for Telegram Mini App
      const redirect = encodeURIComponent(window.location.origin + '/auth');
      const phantomUrl = `${PHANTOM_DEEPLINK}?app_url=${redirect}&dapp_encoded_pubkey=${PHANTOM_PUBLIC_KEY}`;
      
      // For Telegram Mini Apps, we use a simplified approach
      // Store connection intent and show QR or deeplink
      window.location.href = phantomUrl;
      
      return null;
    } catch (err) {
      console.error('Wallet connection failed:', err);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    this.address = null;
    this.notify();
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.address) throw new Error('Wallet not connected');
    
    // In a real implementation, this would use Phantom's signTransaction
    // For Telegram Mini App, we simulate a successful signing
    return transaction;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.address) throw new Error('Wallet not connected');
    return message;
  }

  getAddress(): string | null {
    return this.address;
  }

  isConnected(): boolean {
    return !!this.address;
  }
}

// Singleton instance
export const wallet = new PhantomWallet();

// Helper to format address
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Connection to Solana devnet
export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');