/**
 * Button Component (UI Primitive)
 * A fully versatile, reusable button with built-in variants and sizes.
 */
import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  // Base styling applies to all buttons regardless of their specific appearance.
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';
  
  // Style mappings depending on the 'variant' prop passed to the Button.
  const variants = {
    primary: 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-lg shadow-emerald-500/20',
    secondary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 shadow-lg shadow-blue-500/20',
    outline: 'border-2 border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 focus:ring-emerald-500',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-800 focus:ring-slate-700',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };

  // Dimensions based on the 'size' prop.
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Default to 'md' size and 'primary' variant if none is specified
  const sizeClass = sizes[props.size] || sizes.md;
  const variantClass = variants[variant] || variants.primary;

  return (
    <button 
      // Merge all classes together. className allows overwriting/adding specific tweaks externally.
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
