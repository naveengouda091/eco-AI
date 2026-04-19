import React from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Globe, AlertTriangle, TrendingUp } from 'lucide-react';
import InsightBox from '../common/InsightBox';

export default function GlobalInsightsPanel() {
  // Mock data for Global Trend area chart
  const globalTrend = [
    { year: '2019', value: 36.4 },
    { year: '2020', value: 34.8 }, // Drop from global slowdown
    { year: '2021', value: 36.3 },
    { year: '2022', value: 36.6 },
    { year: '2023', value: 36.8 },
  ];

  // Specific Sector breakdown strictly scaled to fit 320px
  const sectorData = [
    { name: 'Energy', value: 35, color: '#f59e0b' },
    { name: 'Transport', value: 25, color: '#ef4444' },
    { name: 'Agriculture', value: 20, color: '#10b981' },
    { name: 'Industry', value: 20, color: '#3b82f6' },
  ];

  // Country leaderboard
  const countries = [
    { rank: 1, name: 'China', share: '30.9%' },
    { rank: 2, name: 'USA', share: '13.5%' },
    { rank: 3, name: 'India', share: '7.3%' },
  ];

  return (
    <aside className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center px-6 h-20 border-b border-slate-800 shrink-0">
        <Globe className="text-blue-500 mr-2" size={24} />
        <span className="text-lg font-bold text-slate-100 tracking-wide">Global Insights</span>
      </div>

      {/* Constraints Wrapper */}
      <div className="p-6 space-y-8 pb-12">

        {/* 1. Global CO2 Emissions & 2. Mini Line Chart */}
        <section>
          <div className="mb-2">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Global Output</h4>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-3xl font-bold text-slate-100">36.8</span>
              <span className="text-slate-500 font-medium">B tonnes/yr</span>
            </div>
          </div>
          
          <div className="h-20 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalTrend}>
                <defs>
                  <linearGradient id="globalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#globalColor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 5. Climate Indicator */}
        <section>
          <div className="flex items-start p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5 mr-3" size={20} />
            <div>
              <h4 className="text-red-400 font-bold text-sm">Critical Threshold</h4>
              <p className="text-red-200/80 text-sm mt-1">+1.1°C temperature rise recorded against pre-industrial baselines.</p>
            </div>
          </div>
        </section>

        {/* 3. Sector Breakdown Mini Pie */}
        <section>
          <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Sector Breakdown</h4>
          <div className="flex items-center space-x-4">
            <div className="h-24 w-24 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {sectorData.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="flex items-center text-slate-300">
                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="text-slate-400 font-medium">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Top Emitting Countries */}
        <section>
          <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Top Emitters</h4>
          <div className="space-y-2">
            {countries.map((c) => (
              <div key={c.rank} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-slate-500 font-bold text-xs">0{c.rank}</span>
                  <span className="text-slate-200 font-medium text-sm">{c.name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <TrendingUp size={14} className="text-slate-500" />
                  <span className="text-emerald-400 text-sm font-bold">{c.share}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. User Comparison */}
        <section>
          <InsightBox message="You emit 20% less than the global average of 4.5 tonnes/capita." type="success" />
        </section>
        
      </div>
    </aside>
  );
}
