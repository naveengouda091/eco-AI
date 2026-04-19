/**
 * Rewards.jsx
 * Gamification hub — streaks, XP, level, badges, global leaderboard.
 * Top 3 users are highlighted with special crowns.
 */
import { useEffect, useState } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import Card from '../components/ui/Card';
import InsightBox from '../components/common/InsightBox';
import { fetchRewardsProfile, fetchLeaderboard } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const LEVEL_COLORS = {
  1: 'from-slate-600 to-slate-500',
  2: 'from-emerald-700 to-emerald-500',
  3: 'from-teal-700 to-teal-500',
  4: 'from-blue-700 to-blue-500',
  5: 'from-violet-700 to-violet-500',
  6: 'from-amber-600 to-yellow-400',
};

const RANK_STYLES = {
  1: { bg: 'bg-amber-500/20 border-amber-400/40',   text: 'text-amber-300',  crown: '👑', label: '1st' },
  2: { bg: 'bg-slate-400/15 border-slate-400/30',   text: 'text-slate-300',  crown: '🥈', label: '2nd' },
  3: { bg: 'bg-orange-600/15 border-orange-500/30', text: 'text-orange-300', crown: '🥉', label: '3rd' },
};

function XPBar({ xp, level }) {
  const thresholds = [0, 50, 150, 350, 700, 1200, 9999];
  const lo = thresholds[level.num - 1] || 0;
  const hi = thresholds[level.num]     || 9999;
  const pct = Math.min(100, Math.round(((xp - lo) / (hi - lo)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{xp} XP</span>
        <span>{hi === 9999 ? 'MAX' : `${hi} XP`} to level {level.num + 1}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${LEVEL_COLORS[level.num] || LEVEL_COLORS[6]} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StreakFlame({ streak }) {
  const flames = Math.min(streak, 10);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: flames }).map((_, i) => (
        <span key={i} className="text-lg" style={{ opacity: 0.4 + (i / flames) * 0.6 }}>🔥</span>
      ))}
      {streak > 10 && <span className="text-sm text-amber-400 font-bold">+{streak - 10} more</span>}
    </div>
  );
}

export default function Rewards() {
  const { user } = useAuth();
  const [profile,     setProfile]     = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lbLoading,   setLbLoading]   = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    fetchRewardsProfile()
      .then(setProfile)
      .catch(() => setError('Could not load rewards. Make sure Flask backend is running.'))
      .finally(() => setLoading(false));

    fetchLeaderboard()
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, []);

  const myRank = leaderboard.find(
    (e) => e.username?.toLowerCase() === user?.email?.toLowerCase()
  )?.rank;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="🏆 Rewards & Leaderboard"
        description="Earn XP by logging activities, maintain streaks, collect badges, and compete globally."
      />

      {error && <InsightBox message={error} type="warning" />}

      {/* ── My Rewards Panel ── */}
      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">Loading your rewards…</div>
      ) : profile ? (
        <div className="grid gap-4 md:grid-cols-3">

          {/* Level + XP */}
          <Card className="space-y-4 col-span-1">
            <div className="flex items-center gap-3">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${LEVEL_COLORS[profile.level?.num] || LEVEL_COLORS[6]} text-2xl shadow-lg`}>
                {profile.level?.icon}
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Level {profile.level?.num}</p>
                <p className="text-lg font-bold text-slate-100">{profile.level?.name}</p>
                {myRank && <p className="text-xs text-emerald-400">Global Rank #{myRank}</p>}
              </div>
            </div>
            <XPBar xp={profile.xp} level={profile.level} />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2">
                <p className="text-slate-400 text-xs">Total XP</p>
                <p className="text-xl font-bold text-emerald-400">{profile.xp}</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2">
                <p className="text-slate-400 text-xs">CO₂ Saved</p>
                <p className="text-xl font-bold text-teal-400">{profile.total_carbon_saved?.toFixed(2)} kg</p>
              </div>
            </div>
          </Card>

          {/* Streak */}
          <Card className="space-y-4 col-span-1">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-widest">🔥 Activity Streak</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-amber-400">{profile.streak}</span>
              <span className="text-slate-400 text-sm">days</span>
            </div>
            <StreakFlame streak={profile.streak} />
            <InsightBox
              message={
                profile.streak === 0
                  ? 'Log an activity today to start your streak!'
                  : profile.streak < 3
                  ? `${3 - profile.streak} more day${3 - profile.streak > 1 ? 's' : ''} to earn the 🔥 3-Day Streak badge!`
                  : profile.streak < 7
                  ? `${7 - profile.streak} more day${7 - profile.streak > 1 ? 's' : ''} to earn the ⚡ Week Warrior badge!`
                  : `Amazing! ${profile.streak}-day streak. Keep it up!`
              }
              type={profile.streak >= 3 ? 'success' : 'info'}
            />
          </Card>

          {/* Badges */}
          <Card className="space-y-4 col-span-1">
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-widest">🎖️ Badges Earned</h3>
            {profile.badges?.length === 0 ? (
              <p className="text-sm text-slate-400">No badges yet — log activities to unlock them!</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {profile.badges.map((b) => (
                  <div key={b.id} className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/60 px-2 py-3 text-center">
                    <span className="text-2xl">{b.icon}</span>
                    <span className="text-xs font-semibold text-slate-200 leading-tight">{b.name}</span>
                    <span className="text-xs text-slate-500 leading-tight">{b.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {/* ── XP Guide ── */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">💡 How to Earn XP</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { action: 'Log any activity',    xp: '+10 XP', icon: '📝' },
            { action: 'Log vehicle trip',    xp: '+15 XP', icon: '🚗' },
            { action: 'Use calculator',      xp: '+5 XP',  icon: '📊' },
            { action: 'Daily streak bonus',  xp: '+20 XP', icon: '🔥' },
            { action: 'CO₂ saved (per kg)',  xp: '+2 XP',  icon: '♻️' },
          ].map(({ action, xp, icon }) => (
            <div key={action} className="flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-3 text-center">
              <span className="text-xl">{icon}</span>
              <span className="text-xs text-slate-300 leading-tight">{action}</span>
              <span className="text-xs font-bold text-emerald-400">{xp}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Global Leaderboard ── */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">🌍 Global Leaderboard</h3>
          <span className="text-xs text-slate-400">{leaderboard.length} users ranked</span>
        </div>

        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, podiumIdx) => {
              if (!entry) return null;
              const podiumRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
              const style = RANK_STYLES[podiumRank];
              const heights = ['h-20', 'h-28', 'h-16'];
              return (
                <div key={entry.username} className={`flex flex-col items-center gap-1 rounded-2xl border ${style.bg} px-2 py-3 text-center`}>
                  <span className="text-2xl">{style.crown}</span>
                  <span className={`text-lg`}>{entry.level?.icon || '🌱'}</span>
                  <p className={`text-xs font-bold truncate w-full ${style.text}`}>
                    {entry.username.split('@')[0]}
                  </p>
                  <p className="text-xs text-slate-400">{entry.xp} XP</p>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {(entry.badge_icons || []).slice(0, 3).map((ic, i) => (
                      <span key={i} className="text-sm">{ic}</span>
                    ))}
                  </div>
                  <span className={`text-xs font-bold ${style.text}`}>{style.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Full leaderboard table */}
        {lbLoading ? (
          <div className="text-slate-400 text-sm animate-pulse">Loading leaderboard…</div>
        ) : leaderboard.length === 0 ? (
          <InsightBox message="No users ranked yet. Log activities to appear on the leaderboard!" type="info" />
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = entry.username?.toLowerCase() === user?.email?.toLowerCase();
              const rankStyle = RANK_STYLES[entry.rank];
              return (
                <div
                  key={entry.username}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    isMe
                      ? 'border-emerald-500/40 bg-emerald-500/8 ring-1 ring-emerald-500/30'
                      : rankStyle
                      ? `${rankStyle.bg}`
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 text-center font-bold text-sm ${rankStyle ? rankStyle.text : 'text-slate-500'}`}>
                    {rankStyle ? rankStyle.crown : `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base bg-gradient-to-br ${LEVEL_COLORS[entry.level?.num] || LEVEL_COLORS[1]}`}>
                    {entry.level?.icon || '🌱'}
                  </div>

                  {/* Name + level */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-emerald-300' : 'text-slate-100'}`}>
                      {entry.username.split('@')[0]}
                      {isMe && <span className="ml-1 text-xs text-emerald-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-400">{entry.level?.name} • {entry.streak}🔥 streak</p>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-0.5">
                    {(entry.badge_icons || []).slice(0, 4).map((ic, i) => (
                      <span key={i} className="text-sm">{ic}</span>
                    ))}
                  </div>

                  {/* XP */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">{entry.xp}</p>
                    <p className="text-xs text-slate-500">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Top 3 reward note */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          <span className="font-semibold">🏆 Top 3 Reward:</span> Users ranked 1st, 2nd, and 3rd earn the exclusive <strong>Top 3 Global</strong> badge and are featured on the leaderboard podium. Keep logging activities and reducing your carbon footprint to climb the ranks!
        </div>
      </Card>
    </div>
  );
}
