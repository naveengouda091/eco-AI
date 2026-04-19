/**
 * InsightBox Component (Common Feature)
 * A generic UI snippet designed to surface "AI Tips", recommendations, or warnings 
 * natively within the user's workflow. 
 */
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function InsightBox({ message, type = 'info' }) {
  // We use key-based mappings instead of messy if-statements to dictate styles natively.
  const styles = {
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start space-x-3 ${styles[type] || styles.info}`}>
      {/* Sparkles icon communicates that this is an AI/System-generated message. */}
      <Sparkles className="mt-0.5 shrink-0 opacity-80" size={20} />
      <div className="text-sm font-medium leading-relaxed">
        {message}
      </div>
    </div>
  );
}
