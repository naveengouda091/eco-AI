import React from 'react';
import Card from '../ui/Card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function MiniStatCard({ title, value, change, data, unit = "kg", isGoodTrend = true }) {
  // Determine colors based on if the trend is positive/negative and if that's "good" or "bad"
  const trendColor = isGoodTrend ? "#10b981" : "#ef4444"; 
  const glowShadow = isGoodTrend ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)";

  return (
    <Card className="flex flex-col relative overflow-hidden" noPadding={false}>
      {/* Text Info Layer */}
      <div className="z-10 flex flex-col justify-between mb-4">
        <h4 className="text-slate-400 text-sm font-medium mb-1">{title}</h4>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-slate-100">{value}</span>
          <span className="text-slate-500 font-medium text-sm">{unit}</span>
        </div>
        <div className={`text-sm font-bold mt-1 ${isGoodTrend ? 'text-emerald-400' : 'text-red-400'}`}>
          {change > 0 ? '+' : ''}{change}%
        </div>
      </div>
      
      {/* Background Sparkline Graphic */}
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-80 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={trendColor} 
              strokeWidth={2.5} 
              dot={false}
              isAnimationActive={true}
              style={{ filter: `drop-shadow(0px 4px 6px ${glowShadow})` }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
