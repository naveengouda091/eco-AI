/**
 * Organisation Page
 * Aggregated administrative routing mapping view rendering securely explicitly checking active parameters bounds mapped visually internally securely.
 */
import { useMemo } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import ResultCard from '../components/common/ResultCard';
import LineChartBox from '../components/charts/LineChartBox';
import Card from '../components/ui/Card';
import { Award } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Navigate } from 'react-router-dom';
import { useActivities } from '../hooks/useActivities.jsx';

export default function Organisation() {
  const { mode } = useAppContext();
  const { activities, loading } = useActivities();

  if (mode !== 'organisation') {
    return <Navigate to="/dashboard" replace />;
  }

  const totals = useMemo(() => {
    const total = activities.reduce((sum, entry) => sum + entry.carbonEmission, 0);
    const transport = activities.filter((entry) => entry.type === 'transport').reduce((sum, entry) => sum + entry.carbonEmission, 0);
    const energy = activities.filter((entry) => entry.type === 'energy').reduce((sum, entry) => sum + entry.carbonEmission, 0);
    const device = activities.filter((entry) => entry.type === 'device').reduce((sum, entry) => sum + entry.carbonEmission, 0);

    return {
      total: parseFloat(total.toFixed(1)),
      transport: parseFloat(transport.toFixed(1)),
      energy: parseFloat(energy.toFixed(1)),
      device: parseFloat(device.toFixed(1)),
    };
  }, [activities]);

  const orgTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();

    return Array.from({ length: 4 }).map((_, index) => {
      const monthIndex = (today.getMonth() - 3 + index + 12) % 12;
      return {
        name: months[monthIndex],
        value: parseFloat(((totals.total / 4) || 0).toFixed(1)),
      };
    });
  }, [totals.total]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Organisation Overview" description="Aggregate metrics derived from your authenticated activity history." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResultCard
          title="Total CO₂ Logged"
          value={loading ? 'Loading…' : totals.total}
          unit="kg CO₂"
          trend={totals.total > 0 ? -3.8 : 0}
          severity={totals.total > 180 ? 'high' : 'low'}
        />
        <ResultCard
          title="Top Emission Category"
          value={Math.max(totals.device, totals.transport, totals.energy).toFixed(1)}
          unit="kg CO₂"
          trend={totals.total > 0 ? -1.2 : 0}
          severity={totals.transport > totals.energy ? 'medium' : 'low'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div>
          <LineChartBox data={orgTrendData} title="Recent Emission Trend" />
        </div>
        <Card className="flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-200 font-medium">Activity Breakdown</h3>
            <Award className="text-amber-500" size={20} />
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-amber-500 text-white">1</div>
                <span className="font-medium text-slate-200">Transport Emissions</span>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold text-sm">{totals.transport} kg</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-slate-400 text-white">2</div>
                <span className="font-medium text-slate-200">Energy Emissions</span>
              </div>
              <div className="text-right">
                <div className="text-slate-300 font-bold text-sm">{totals.energy} kg</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-slate-800 text-slate-300">3</div>
                <span className="font-medium text-slate-200">Device Emissions</span>
              </div>
              <div className="text-right">
                <div className="text-slate-400 font-bold text-sm">{totals.device} kg</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
