/**
 * Sidebar.jsx — Vehicle Logs restored as standalone nav item.
 * Device Data remains removed.
 */
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Car, BarChart3,
  Lightbulb, Users, LogOut, Calculator, Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchRewardsProfile } from '../../services/api.js';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [rewardSnap, setRewardSnap] = useState(null);

  const isOrg = user?.accountType === 'organisation';

  useEffect(() => {
    fetchRewardsProfile()
      .then(setRewardSnap)
      .catch(() => {});
  }, []);

  const navItems = [
    { name: 'Dashboard',         path: '/dashboard',         icon: LayoutDashboard },
    { name: 'Carbon Calculator', path: '/carbon-calculator', icon: Calculator },
    { name: 'Vehicle Logs',      path: '/vehicle',           icon: Car },        // ← restored
    { name: 'Analytics',         path: '/analytics',         icon: BarChart3 },
    { name: 'Recommendations',   path: '/recommendations',   icon: Lightbulb },
    { name: 'Rewards',           path: '/rewards',           icon: Trophy },
  ];

  if (isOrg) {
    navItems.push({ name: 'Organisation', path: '/organisation', icon: Users });
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">

      {/* Brand */}
      <div className="flex items-center justify-center h-20 border-b border-slate-800">
        <div className="flex items-center space-x-1">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-emerald-400">E</span>
            <span className="text-emerald-300">C</span>
            <span className="text-xl">🌍</span>
          </span>
          <span className="text-xs font-semibold text-slate-400 ml-1 mt-1 tracking-widest uppercase">AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isRewards = item.path === '/rewards';
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <Icon size={20} />
              <span className="flex-1">{item.name}</span>
              {isRewards && rewardSnap?.streak > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                  {rewardSnap.streak}🔥
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: XP snapshot + user info */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {rewardSnap && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{rewardSnap.level?.icon} {rewardSnap.level?.name}</span>
              <span className="text-emerald-400 font-bold">{rewardSnap.xp} XP</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, (rewardSnap.xp % 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-100">Signed in as</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-xs text-emerald-300 hover:bg-slate-800 transition"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
          <p className="mt-2 truncate text-slate-400">{user?.email || 'No email'}</p>
          {user?.accountType && (
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              isOrg ? 'bg-cyan-500/15 text-cyan-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {isOrg ? '🏢 Organisation' : '👤 Personal'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}