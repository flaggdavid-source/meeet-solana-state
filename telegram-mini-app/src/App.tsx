import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wallet } from './lib/wallet';
import { getGlobalStats } from './lib/api';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Agents from './components/Agents';
import Discoveries from './components/Discoveries';
import Oracle from './components/Oracle';
import Governance from './components/Governance';
import WalletModal from './components/WalletModal';

const queryClient = new QueryClient();

type Tab = 'home' | 'agents' | 'discoveries' | 'oracle' | 'governance';

interface AppProps {
  webApp: typeof window.Telegram.WebApp | null;
}

function AppContent({ webApp }: AppProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [walletState, setWalletState] = useState(wallet.state);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [stats, setStats] = useState({ total_agents: 0, goal: 1000 });

  useEffect(() => {
    const unsubscribe = wallet.subscribe(setWalletState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    getGlobalStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    if (webApp) {
      webApp.ready();
    }
  }, [webApp]);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home stats={stats} />;
      case 'agents':
        return <Agents />;
      case 'discoveries':
        return <Discoveries />;
      case 'oracle':
        return <Oracle walletConnected={walletState.connected} />;
      case 'governance':
        return <Governance walletConnected={walletState.connected} />;
      default:
        return <Home stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color,#fff)] text-[var(--tg-theme-text-color,#000)]">
      <Navbar 
        walletConnected={walletState.connected}
        walletAddress={walletState.address}
        onConnectWallet={handleConnectWallet}
      />
      <main className="pb-20">
        {renderContent()}
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--tg-theme-secondary-bg-color,#f0f0f0)] border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {[
            { id: 'home', label: '🏠', name: 'Home' },
            { id: 'agents', label: '🤖', name: 'Agents' },
            { id: 'discoveries', label: '💡', name: 'Discover' },
            { id: 'oracle', label: '🔮', name: 'Oracle' },
            { id: 'governance', label: '🗳️', name: 'Vote' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                activeTab === tab.id 
                  ? 'text-[var(--tg-theme-button-color,#6366f1)]' 
                  : 'text-[var(--tg-theme-hint-color,#999)]'
              }`}
            >
              <span className="text-lg">{tab.label}</span>
              <span className="text-[10px] font-medium">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>
      {showWalletModal && (
        <WalletModal 
          onClose={() => setShowWalletModal(false)}
          onConnect={async () => {
            await wallet.connect();
            setShowWalletModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function App({ webApp }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent webApp={webApp} />
    </QueryClientProvider>
  );
}