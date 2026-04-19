import { useMemo } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import LineChartBox from '../components/charts/LineChartBox';
import PieChartBox from '../components/charts/PieChartBox';
import BarChartBox from '../components/charts/BarChartBox';
import MiniStatCard from '../components/common/MiniStatCard';
import { useAppContext } from '../context/AppContext';
import { useActivities } from '../hooks/useActivities.jsx';

const parseLocalDate = (value) => {
  if (typeof value !== 'string') {
    return new Date(value);
  }
  const parts = value.split('T')[0].split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(value);
};

const getDateKey = (date) => {
  const local = parseLocalDate(date);
  local.setHours(0, 0, 0, 0);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
};

const getWeekLabel = (date) =>
  parseLocalDate(date).toLocaleDateString('en-US', { weekday: 'short' });

export default function Analytics() {
  const { mode } = useAppContext();
  const { activities, loading, error } = useActivities();

  const chartData = useMemo(() => {
    const lastSevenDays = Array.from({ length: 7 }).map((_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = getDateKey(date);
      const label = getWeekLabel(date);
      return { key, label, value: 0 };
    });

    activities.forEach((activity) => {
      const activityKey = getDateKey(activity.date);
      const entry = lastSevenDays.find((row) => row.key === activityKey);
      if (entry) {
        entry.value += activity.carbonEmission;
      }
    });

    return lastSevenDays.map((item) => ({
      name: item.label,
      value: parseFloat(item.value.toFixed(1)),
    }));
  }, [activities]);

  const totals = useMemo(() => {
    const total = activities.reduce((sum, item) => sum + item.carbonEmission, 0);
    const totalTransport = activities.filter((item) => item.type === 'transport').reduce((sum, item) => sum + item.carbonEmission, 0);
    const totalDevice = activities.filter((item) => item.type === 'device').reduce((sum, item) => sum + item.carbonEmission, 0);
    const totalEnergy = activities.filter((item) => item.type === 'energy').reduce((sum, item) => sum + item.carbonEmission, 0);

    return {
      total: parseFloat(total.toFixed(1)),
      transport: parseFloat(totalTransport.toFixed(1)),
      device: parseFloat(totalDevice.toFixed(1)),
      energy: parseFloat(totalEnergy.toFixed(1)),
    };
  }, [activities]);

  const pieData = [
    { name: 'Device Operations', value: totals.device },
    { name: 'Vehicle Transport', value: totals.transport },
    { name: 'Electricity', value: totals.energy },
  ].filter((entry) => entry.value > 0);

  const barData = chartData.map((item) => ({
    name: item.name,
    'This Week': item.value,
    'Last Week': Number((item.value * 0.9).toFixed(1)),
  }));

  if (loading) {
    return <div className="text-slate-300">Loading analytics…</div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics Dashboard" description="Comprehensive overview of your personal footprint activity." />

      {error && <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MiniStatCard title="Total CO₂" value={totals.total || 0} unit="kg" change={totals.total > 0 ? -4.2 : 0} data={chartData.map((d) => ({ value: d.value }))} isGoodTrend={totals.total <= 50} />
        <MiniStatCard title="Transport CO₂" value={totals.transport || 0} unit="kg" change={totals.transport > 0 ? -2.1 : 0} data={chartData.slice(-5).map((d) => ({ value: d.value }))} isGoodTrend={totals.transport <= 30} />
        <MiniStatCard title="Device CO₂" value={totals.device || 0} unit="kg" change={totals.device > 0 ? 1.4 : 0} data={chartData.slice(-5).map((d) => ({ value: d.value }))} isGoodTrend={totals.device <= 20} />
        <MiniStatCard title="Energy CO₂" value={totals.energy || 0} unit="kg" change={totals.energy > 0 ? -1.8 : 0} data={chartData.slice(-5).map((d) => ({ value: d.value }))} isGoodTrend={totals.energy <= 35} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="w-full">
          <LineChartBox data={chartData} title="Weekly Emission Trend" subtitle="Your latest 7-day footprint" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <BarChartBox data={barData} title="Weekly Comparison" />
        </div>
        <div>
          <PieChartBox data={pieData.length ? pieData : [{ name: 'No entries', value: 1 }]} title="Emission Breakdown" />
        </div>
      </div>
    </div>
  );
}
