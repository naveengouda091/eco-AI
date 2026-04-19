/**
 * ResultCard Component — compact size, same data
 */
import React from 'react';
import Card from '../ui/Card';
import { Leaf } from 'lucide-react';

export default function ResultCard({ title, value, unit, trend, severity = 'low' }) {
  const getSeverityStyle = () => {
    switch (severity) {
      case 'high':   return 'text-red-500 bg-red-500/10';
      case 'medium': return 'text-amber-500 bg-amber-500/10';
      default:       return 'text-emerald-500 bg-emerald-500/10';
    }
  };

  return (
    <Card className="flex flex-col space-y-2 py-3 px-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className={`p-1.5 rounded-lg ${getSeverityStyle()}`}>
          <Leaf size={16} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-3xl font-bold text-slate-100">{value}</span>
          <span className="text-slate-500 text-sm font-medium">{unit}</span>
        </div>
        {trend && (
          <p className={`text-xs mt-1 font-medium ${trend < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}% vs last month
          </p>
        )}
      </div>
    </Card>
  );
}
