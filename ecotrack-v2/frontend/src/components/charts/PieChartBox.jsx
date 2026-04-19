/**
 * PieChartBox Component (Minimalist Overhaul)
 * Represents simple contextual breakdown cleanly.
 */
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';

export default function PieChartBox({ data, title = "Emission Breakdown" }) {
  // Static color mapping explicitly matching the prompt's defined color rules globally.
  const getColor = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('device')) return '#10b981'; // Green
    if (lower.includes('electricity')) return '#f59e0b'; // Yellow
    if (lower.includes('vehicle')) return '#ef4444'; // Red
    return '#8b5cf6'; // Fallback
  };

  // Custom tool tip generating native percentages reliably
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-sm font-medium">
          <span style={{ color: payload[0].payload.fill }}>{payload[0].name}</span>: {payload[0].value}%
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="flex flex-col h-full min-h-[300px]">
      <h3 className="text-lg font-bold text-slate-100 mb-6">{title}</h3>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={70}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
            >
              {data.map((entry, index) => {
                const color = getColor(entry.name);
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Pie>
            
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        {data.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center text-sm font-medium text-slate-300">
            <div 
              className="w-2.5 h-2.5 rounded-full mr-2" 
              style={{ backgroundColor: getColor(entry.name) }} 
            />
            {entry.name}
          </div>
        ))}
      </div>
    </Card>
  );
}
