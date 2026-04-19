/**
 * MainLayout Component
 * Triple-column SaaS architecture tracking left navigation and right global insights statically.
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalInsightsPanel from './GlobalInsightsPanel';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950">
      
      {/* 256px wide Left Navigation Block */}
      <Sidebar />
      
      {/* 
        Squeezed Central Content Frame
        - ml-64 compensates for the Left Sidebar (256px)
        - mr-80 compensates for the Right Global Insights Panel (320px) 
      */}
      <main className="flex-1 ml-64 mr-80 min-h-screen overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-8 lg:p-10">
          <Outlet />
        </div>
      </main>

      {/* 320px wide Persistent Right Insights Block */}
      <GlobalInsightsPanel />

    </div>
  );
}
