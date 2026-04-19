/**
 * LineChartBox Component (Upgraded to AreaChart)
 * Renders a smooth curve with a subtle linear gradient fill below the active line
 * to create a rich SaaS aesthetic.
 */
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';

export default function LineChartBox({ data, title = "Weekly Emission Trend", subtitle = "Last 7 days", dataKey = 'value' }) {
  return (
    <Card className="flex flex-col h-full min-h-[300px]">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
      </div>
      
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            {/* SVG Gradient Definition */}
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            {/* Extremely subtle, minimal grid framework */}
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            
            <XAxis 
              dataKey="name" 
              stroke="#475569" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#475569" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
              cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              // Add glowing active dot
              activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 3, style: { filter: 'drop-shadow(0px 0px 4px rgba(16,185,129,0.8))' } }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
