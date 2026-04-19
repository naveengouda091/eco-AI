import React, { useMemo, useState } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import Card from '../components/ui/Card';
import InsightBox from '../components/common/InsightBox';
import { Target, Zap, Server, Car, Leaf, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useActivities } from '../hooks/useActivities.jsx';
import { fetchTrendingSolutions, fetchOrgTrendingSolutions } from '../services/api.js';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High':   return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Low':    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default:       return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

function difficultyBadge(d) {
  if (d === 'easy')   return 'bg-emerald-500/15 text-emerald-400';
  if (d === 'medium') return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

const TABS = ['Smart Recommendations', 'Trending Solutions'];

export default function Recommendations() {
  const { mode } = useAppContext();
  const { activities, loading } = useActivities();
  const [activeTab, setActiveTab]   = useState('Smart Recommendations');
  const [trending, setTrending]     = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

  const totals = useMemo(() => {
    return activities.reduce(
      (acc, activity) => {
        acc.total += activity.carbonEmission;
        acc[activity.type] = (acc[activity.type] || 0) + activity.carbonEmission;
        return acc;
      },
      { total: 0, transport: 0, energy: 0, device: 0, other: 0 },
    );
  }, [activities]);

  const recs = useMemo(() => {
    if (loading) return [];
    if (mode === 'personal') {
      return [
        {
          title: 'Reduce Vehicle Trips',
          text: totals.transport > totals.energy
            ? 'Your transport emissions are highest. Try carpooling or public transit for shorter journeys.'
            : 'Track shorter trips and combine errands to lower transport impact.',
          priority: 'High', icon: Car,
        },
        {
          title: 'Optimize Device Usage',
          text: totals.device > 0
            ? 'Lower screen brightness and close background apps to reduce device emissions.'
            : 'Keep device runtime low and unplug unused chargers.',
          priority: 'Medium', icon: Zap,
        },
        {
          title: 'Improve Home Energy Efficiency',
          text: totals.energy > 0
            ? 'Adjust heating or cooling by one degree to save energy each month.'
            : 'Consider energy-saving settings for appliances and lighting.',
          priority: 'Medium', icon: Target,
        },
      ];
    }
    return [
      {
        title: 'Shift to Renewable Energy',
        text: totals.energy > totals.transport
          ? 'Your energy profile is strong. Evaluate renewable plans for the facility.'
          : 'Focus organizational energy contracts on clean suppliers.',
        priority: 'High', icon: Server,
      },
      {
        title: 'Fleet Electrification Strategy',
        text: totals.transport > 0
          ? 'Your transport emissions are significant. Start planning EV substitutions for business travel.'
          : 'Review vehicle usage by department and incentivize low-emission modes.',
        priority: 'High', icon: Car,
      },
      {
        title: 'Equipment Lifecycle Policy',
        text: 'Standardize device refresh cycles and choose high-efficiency laptops to reduce long-term footprint.',
        priority: 'Medium', icon: Zap,
      },
    ];
  }, [mode, totals, loading]);

  const handleLoadTrending = async () => {
    setTrendLoading(true);
    try {
      const category = totals.total > 180 ? 'High' : totals.total > 60 ? 'Medium' : 'Low';
      let data;
      if (mode === 'organisation') {
        data = await fetchOrgTrendingSolutions({ users: [], org_category: category });
      } else {
        data = await fetchTrendingSolutions({
          screen_time: 4, usage_type: 'normal', charging_freq: 2,
          distance: 20, fuel_type: 'petrol', category,
        });
      }
      setTrending(data);
    } catch {
      setTrending({ trending_solutions: [], count: 0 });
    } finally {
      setTrendLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Trending Solutions' && !trending) handleLoadTrending();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Recommendations"
        description="Actionable tasks tied to your authenticated activity history, plus global trending sustainability solutions."
      />

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-2xl border border-slate-700 bg-slate-950 p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => handleTabChange(tab)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}>
            {tab === 'Trending Solutions' ? <TrendingUp size={14} /> : <Leaf size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB: Smart Recommendations ── */}
      {activeTab === 'Smart Recommendations' && (
        <>
          {!activities.length && !loading ? (
            <InsightBox message="Record a few activities first to receive tailored recommendations based on your real carbon footprint." type="info" />
          ) : null}
          <div className="space-y-4">
            {recs.map((rec, i) => {
              const Icon = rec.icon;
              return (
                <Card key={i} className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                      <Icon className="text-emerald-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">{rec.title}</h3>
                      <p className="text-slate-400 mt-1">{rec.text}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getPriorityColor(rec.priority)}`}>
                      {rec.priority} PRIORITY
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── TAB: Trending Solutions ── */}
      {activeTab === 'Trending Solutions' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Real-world sustainability trends from the ECO🌍 AI catalogue.
            For personalised trending solutions, run the AI Carbon Calculator first.
          </p>
          {trendLoading && <div className="text-slate-400 text-sm animate-pulse">Loading trending solutions…</div>}
          {trending && trending.trending_solutions?.length === 0 && (
            <InsightBox message="No trending solutions loaded. Make sure the Flask /api/trending endpoint is running." type="info" />
          )}
          {trending && trending.trending_solutions?.map((ts) => (
            <Card key={ts.id} className="space-y-3 hover:bg-slate-800 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                  <Leaf size={15} className="text-emerald-400 shrink-0" />
                  {ts.title}
                </h3>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 capitalize ${difficultyBadge(ts.difficulty)}`}>
                  {ts.difficulty}
                </span>
              </div>
              <p className="text-sm text-slate-400">{ts.trend_msg}</p>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg bg-slate-950 px-3 py-2">
                  <p className="text-slate-400 mb-0.5">Impact</p>
                  <p className="text-emerald-400">{ts.impact}</p>
                </div>
                <div className="rounded-lg bg-slate-950 px-3 py-2">
                  <p className="text-slate-400 mb-0.5">Global Stat</p>
                  <p className="text-slate-300">{ts.global_stat}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(ts.tags || []).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">#{tag}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
