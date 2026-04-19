/**
 * SectionHeader Component (Common Feature)
 * Used at the top of primary routing pages to establish consistent typography 
 * boundaries and page context strings.
 */
import React from 'react';

export default function SectionHeader({ title, description }) {
  return (
    <div className="mb-6">
      {/* <h2> mapping defines semantic HTML headers for accessibility while keeping visual design flat */}
      <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
      
      {/* Conditionally rendered descriptive subtitle text clarifying what the current page achieves */}
      {description && <p className="text-slate-400 mt-1">{description}</p>}
    </div>
  );
}
