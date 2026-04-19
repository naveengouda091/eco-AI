/**
 * Dashboard Page — compact cards, unchanged logic
 */
import { useMemo } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import ResultCard from '../components/common/ResultCard';
import InsightBox from '../components/common/InsightBox';
import PieChartBox from '../components/charts/PieChartBox';
import BarChartBox from '../components/charts/BarChartBox';
import Card from '../components/ui/Card';
import { useAppContext } from '../context/AppContext';
import { useDeviceUsage } from '../context/DeviceUsageContext.jsx';
import { useActivities } from '../hooks/useActivities.jsx';

const CATEGORY_LABELS = {
  device: 'Devices',
  transport: 'Vehicles',
  energy: 'Home/Office',
  other: 'Other',
};

export default function Dashboard() {
  const { mode } = useAppContext();
  const { activities, loading, error, demoMode: activityDemo } = useActivities();
  const {
    todayHours, todayEnergy, todayCarbon,
    yesterdayHours, last7Days, weeklyBarData,
    trendPhrase, isActive, activeSeconds, syncError, demoMode: deviceDemo,
  } = useDeviceUsage();

  const demoMode = activityDemo || deviceDemo;
  const displayTodayHours     = demoMode ? 4.5  : todayHours;
  const displayTodayEnergy    = demoMode ? 0.23 : todayEnergy;
  const displayTodayCarbon    = demoMode ? 0.19 : todayCarbon;
  const displayYesterdayHours = demoMode ? 4.2  : yesterdayHours;
  const displayDayCards = demoMode
    ? [
        { label: 'Mon', date: '2026-04-07', seconds: 4.4 * 3600, energy: 0.22, carbon: 0.18 },
        { label: 'Tue', date: '2026-04-08', seconds: 4.1 * 3600, energy: 0.20, carbon: 0.16 },
        { label: 'Wed', date: '2026-04-09', seconds: 4.6 * 3600, energy: 0.23, carbon: 0.19 },
      ]
    : last7Days.slice(-3);

  const displayWeeklyBarData = demoMode
    ? [
        { name: 'Mon', 'Last Week': 0.18, 'This Week': 0.22 },
        { name: 'Tue', 'Last Week': 0.16, 'This Week': 0.20 },
        { name: 'Wed', 'Last Week': 0.19, 'This Week': 0.23 },
        { name: 'Thu', 'Last Week': 0.21, 'This Week': 0.24 },
        { name: 'Fri', 'Last Week': 0.25, 'This Week': 0.28 },
        { name: 'Sat', 'Last Week': 0.12, 'This Week': 0.14 },
        { name: 'Sun', 'Last Week': 0.10, 'This Week': 0.11 },
      ]
    : weeklyBarData;

  const summary = useMemo(() => {
    const totalEmissions = activities.reduce((sum, a) => sum + a.carbonEmission, 0);
    const grouped = activities.reduce((acc, a) => {
      const key = a.type || 'other';
      acc[key] = (acc[key] || 0) + a.carbonEmission;
      return acc;
    }, {});
    const emissionsData = Object.entries(grouped).map(([type, value]) => ({
      name: CATEGORY_LABELS[type] || type,
      value: parseFloat(value.toFixed(1)),
    }));
    const trend = activities.length > 1 ? Math.round((totalEmissions / activities.length) * 10) / 10 : 0;
    return {
      totalEmissions: parseFloat(totalEmissions.toFixed(1)),
      trend,
      severity: totalEmissions > 180 ? 'high' : totalEmissions > 60 ? 'medium' : 'low',
      emissionsData: emissionsData.length ? emissionsData : [{ name: 'No data yet', value: 1 }],
    };
  }, [activities]);

  if (loading) return <div className="text-slate-300">Loading your carbon profile...</div>;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Dashboard Overview (${mode === 'personal' ? 'Personal' : 'Organisation'})`}
        description="Your high-level footprint summary and trends from your activity history."
      />

      {demoMode ? (
        <InsightBox message="Backend not reachable. Showing demo data (for visualization)." type="info" />
      ) : error ? (
        <InsightBox message={error} type="warning" />
      ) : activities.length === 0 ? (
        <InsightBox message="No activity has been logged yet. Start by adding device, transport, or energy entries from the side menu." type="info" />
      ) : null}

      {/* Row 1: Total CO2 + Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <ResultCard
            title="Total CO₂ Emissions"
            value={summary.totalEmissions}
            unit="kg CO₂"
            trend={summary.trend}
            severity={summary.severity}
          />
        </div>
        <div className="xl:col-span-1">
          <PieChartBox data={summary.emissionsData} title="Emissions by Category" />
        </div>
      </div>

      {/* Row 2: 3 metric cards + Device Impact card */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultCard
            title="Estimated Device Usage"
            value={displayTodayHours}
            unit="hrs"
            severity={displayTodayHours > 4 ? 'high' : displayTodayHours > 1 ? 'medium' : 'low'}
          />
          <ResultCard
            title="Energy Consumed"
            value={displayTodayEnergy.toFixed(2)}
            unit="kWh"
            severity="low"
          />
          <ResultCard
            title="Device Carbon"
            value={displayTodayCarbon.toFixed(2)}
            unit="kg CO₂"
            severity={displayTodayCarbon > 1 ? 'medium' : 'low'}
          />
        </div>

        {/* Device Impact — compact */}
        <Card className="space-y-3 py-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-slate-100">Device Impact</h3>
              <p className="text-xs text-slate-400 mt-0.5">Estimated session activity for today, aggregated and stored securely.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/70 text-slate-300'}`}>
              {isActive ? 'Active now' : 'Idle'}
            </span>
          </div>

          {demoMode && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
              Demo Data (for visualization)
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2">
              <p className="text-xs text-slate-400">Yesterday</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{Number(displayYesterdayHours).toFixed(2)} hrs</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2">
              <p className="text-xs text-slate-400">Current session</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{(activeSeconds / 3600).toFixed(2)} hrs</p>
            </div>
          </div>

          <InsightBox message="Estimated Device Usage is based on session activity, not full device tracking." type="info" />
          {syncError && <InsightBox message={syncError} type="warning" />}
        </Card>
      </div>

      {/* Weekly bar chart */}
      <div className="grid grid-cols-1 gap-4">
        <BarChartBox data={displayWeeklyBarData} title="Weekly Device Carbon Impact" />
      </div>

      {/* Day cards — compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {displayDayCards.map((day) => (
          <Card key={day.date} className="space-y-1 border border-slate-800 bg-slate-950/80 py-3 px-4">
            <p className="text-xs text-slate-400">{day.label} • {day.date}</p>
            <p className="text-xl font-semibold text-slate-100">{(day.seconds / 3600).toFixed(1)} hrs</p>
            <p className="text-xs text-slate-400">{day.energy.toFixed(2)} kWh • {day.carbon.toFixed(2)} kg CO₂</p>
          </Card>
        ))}
      </div>

      {/* Trend + Smart savings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-2 py-3 px-4">
          <h3 className="text-sm font-medium text-slate-100">Trend Insight</h3>
          <p className="text-sm text-slate-400">{trendPhrase}</p>
        </Card>
        <Card className="space-y-2 py-3 px-4">
          <h3 className="text-sm font-medium text-slate-100">Smart savings guide</h3>
          <p className="text-sm text-slate-400">Reducing 1 hour of browser usage per day saves roughly 0.04 kg CO₂.</p>
        </Card>
      </div>

      <div className="mt-4">
        <InsightBox
          message={
            activities.length > 0
              ? mode === 'personal'
                ? 'Your dashboard is now powered by your own footprint entries. Add more activity to refine your carbon trend.'
                : 'The organization view shares your complete user activity totals in this build.'
              : 'Add your first activity to begin tracking your footprint with real data.'
          }
          type={activities.length > 0 ? 'success' : 'info'}
        />
      </div>
    </div>
  );
}
