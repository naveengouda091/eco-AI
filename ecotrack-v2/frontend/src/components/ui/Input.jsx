/**
 * Input Component (UI Primitive)
 * General purpose text/number field styled consistently with our dark theme.
 */
import React from 'react';

export default function Input({ label, className = '', ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {/* If a label is provided, render it cleanly mapped above the input field. */}
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      
      <input
        // Built-in standardized styling for generic text/number inputs
        className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300"
        {...props} // Spreads all expected native input attributes (like onChange, value, type) onto this element natively.
      />
    </div>
  );
}
