/**
 * Card Component (UI Primitive)
 * Acts as a standard wrapper/container creating consistent "glass" styled tiles across the app.
 * By keeping this central, if we ever want to change shadow intensity or background gradients,
 * we only have to change it once here.
 */
import React from 'react';

export default function Card({ children, className = '', noPadding = false }) {
  return (
    <div 
      className={`
        bg-slate-800/80 border border-slate-700 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden 
        ${noPadding ? '' : 'p-6'} /* Conditionally add generic padding */
        ${className}
      `}
    >
      {children}
    </div>
  );
}
