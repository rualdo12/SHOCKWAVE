import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import BlogManager from './managers/BlogManager';
import PortfolioManager from './managers/PortfolioManager';
import ShopManager from './managers/ShopManager';
import ServicesManager from './managers/ServicesManager';
import UserManager from './managers/UserManager';
import RewardsManager from './managers/RewardsManager';
import { listenToActivity } from '../firebase';

const tabs = [
  { key: 'rewards', label: 'Rewards' },
  { key: 'blog', label: 'Blog' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'shop', label: 'Shop' },
  { key: 'services', label: 'Services' },
  { key: 'users', label: 'Users' },
  { key: 'activity', label: 'Activity' },
];

const ActivityFeed = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToActivity((items) => {
      setLogs(items);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    if (ts.toDate) return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-3">
      {loading && <p className="text-gray-400 text-sm">Loading activity...</p>}
      {!loading && logs.length === 0 && <p className="text-gray-400 text-sm">No activity yet.</p>}
      {logs.map((log) => (
        <div key={log.id} className="glass-card border border-gray-800 rounded-xl p-4 flex justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-custom-gold">{log.type || 'event'}</p>
            <p className="text-sm text-white">By {log.email || log.uid || 'unknown user'}</p>
            {log.targetEmail && (
              <p className="text-xs text-gray-400">Target: {log.targetEmail} {log.role ? `(${log.role})` : ''}</p>
            )}
            {log.id && <p className="text-xs text-gray-500">Doc: {log.id}</p>}
          </div>
          <div className="text-xs text-gray-400 text-right whitespace-nowrap">{formatTime(log.createdAt)}</div>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [active, setActive] = useState('blog');
  const { user, role, logout } = useAuth();

  const renderTab = () => {
    switch (active) {
      case 'blog':
        return <BlogManager />;
      case 'portfolio':
        return <PortfolioManager />;
      case 'shop':
        return <ShopManager />;
      case 'services':
        return <ServicesManager />;
      case 'users': 
        return <UserManager />;
      case 'activity':
        return <ActivityFeed />;
      case 'rewards':
        return <RewardsManager />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-custom-dark text-white">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#1a1300] opacity-70 pointer-events-none" />
      <header className="relative border-b border-gray-800 bg-black/70 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-custom-gold uppercase tracking-[0.3em]">Admin</p>
          <h1 className="text-2xl font-bold">Control Panel</h1>
          <p className="text-xs text-gray-400">Signed in as {user?.email} ({role})</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="px-4 py-2 rounded border border-gray-700 text-gray-200 hover:border-custom-gold hover:text-white transition"
          >
            Preview Site
          </a>
          <button
            onClick={logout}
            className="px-4 py-2 rounded border border-custom-gold text-custom-gold hover:bg-custom-gold hover:text-black transition font-bold"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-8">
        <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-4 py-2 rounded-lg border transition ${
                active === t.key
                  ? 'border-custom-gold text-black bg-custom-gold shadow-[0_0_20px_rgba(253,190,51,0.3)]'
                  : 'border-gray-700 text-gray-300 hover:border-custom-gold hover:text-white bg-black/40 backdrop-blur'
              }`}
            >
              {t.label} Manager
            </button>
          ))}
        </div>
        <div className="glass-card border border-custom-gold/20 rounded-2xl p-6">{renderTab()}</div>
      </main>
    </div>
  );
};

export default AdminDashboard;
