/**
 * Select Component (UI Primitive)
 * A custom-styled dropdown menu bypassing ugly default browser styling.
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({ label, options, className = '', ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <div className="relative">
        <select
          // 'appearance-none' disables the OS/Browser's default dropdown arrow
          className="w-full px-4 py-2 appearance-none bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300"
          {...props}
        >
          {/* Dynamically build out options mapped from an array of simple {value, label} objects */}
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* We place our own completely styled Lucide icon vector over the missing dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
}
