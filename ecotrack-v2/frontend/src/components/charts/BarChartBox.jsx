import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from '../ui/Card';

export default function BarChartBox({ data, title = "Weekly Comparison" }) {
  // Custom tooltip to format "This Week" vs "Last Week" nicely if needed
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-sm font-medium text-slate-100 flex flex-col space-y-1">
          <span className="text-slate-400 mb-1">{label}</span>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300">{entry.name}:</span>
              <span className="font-bold">{entry.value} kg</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-full min-h-[300px]">
      <h3 className="text-lg font-bold text-slate-100 mb-6">{title}</h3>
      <div className="flex-1 w-full">
        <ResponsiveContainer width={100} height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={6}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              axisLine={false} 
              tickLine={false} 
              dy={10} 
            />
            <Tooltip cursor={{ fill: '#1e293b', opacity: 0.4 }} content={<CustomTooltip />} />
            
            <Bar 
              dataKey="Last Week" 
              fill="#475569" 
              radius={[4, 4, 0, 0]} 
              animationDuration={1000}
            />
            <Bar 
              dataKey="This Week" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center text-sm font-medium text-slate-400">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600 mr-2" />
          Last Week
        </div>
        <div className="flex items-center text-sm font-medium text-slate-200">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
          This Week
        </div>
      </div>
    </Card>
  );
}
