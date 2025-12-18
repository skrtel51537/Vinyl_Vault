import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './services/db';
import ImportView from './components/ImportView';
import CollectionView from './components/CollectionView';
import AddVinylForm from './components/AddVinylForm';
import HomeView from './components/HomeView';
import AnalyticsView from './components/AnalyticsView';
import UpdateNotifier from './components/UpdateNotifier';

import { Disc, PlusCircle, LayoutGrid, LogOut, Loader2, BarChart2 } from 'lucide-react';

type ViewState = 'loading' | 'home' | 'import' | 'collection' | 'add' | 'analytics';

const App: React.FC = () => {
  const vinylCount = useLiveQuery(() => db.vinyls.count());
  const [currentView, setCurrentView] = useState<ViewState>('loading');

  useEffect(() => {
    // Wait for Dexie to initialize
    if (vinylCount === undefined) return;

    // Logic 1: Initial Load
    // We only make an automatic decision when the app first loads.
    if (currentView === 'loading') {
      setCurrentView('home');
      return;
    }

    // REMOVED: The safety net that forced redirection to 'import' if vinylCount === 0.
    // This was causing the bug where a successful import (which takes ms to update count)
    // was being interrupted by this check, sending the user back to Import screen
    // while the data was actually there (causing "Already in collection" on retry).

  }, [vinylCount, currentView]);

  const handleExit = () => {
    setCurrentView('home');
  };

  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-[#d6d3d1] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#78350f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d6d3d1] text-stone-800 selection:bg-amber-200 selection:text-amber-900 font-sans">

      {/* Background Texture - Subtle Grain */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23a8a29e' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`
        }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {currentView === 'home' ? (
          <HomeView
            vinylCount={vinylCount || 0}
            onEnter={() => setCurrentView('collection')}
            onImport={() => setCurrentView('import')}
          />
        ) : currentView === 'import' ? (
          <ImportView
            onImportComplete={() => setCurrentView('collection')}
            onBack={() => setCurrentView('home')}
          />
        ) : (
          <>
            {/* Top Navigation Bar - Dark Wood Shelf Look */}
            <div className="sticky top-0 z-30 bg-[#451a03] border-b-4 border-[#78350f] shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3 text-amber-50 font-bold text-xl tracking-tight">
                  <div className="bg-amber-900/50 p-2 rounded-full border border-amber-700/50 shadow-inner">
                    <Disc className="text-amber-500 w-6 h-6" />
                  </div>
                  <span className="text-amber-100 font-serif tracking-wide text-lg">Vinyl Vault</span>
                </div>

                <nav className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView('collection')}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 border ${currentView === 'collection' ? 'bg-[#78350f] border-[#92400e] text-white shadow-md' : 'border-transparent text-amber-200/70 hover:text-white hover:bg-[#78350f]/50'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Collection
                  </button>
                  <button
                    onClick={() => setCurrentView('analytics')}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 border ${currentView === 'analytics' ? 'bg-[#78350f] border-[#92400e] text-white shadow-md' : 'border-transparent text-amber-200/70 hover:text-white hover:bg-[#78350f]/50'}`}
                  >
                    <BarChart2 className="w-4 h-4" />
                    Analytics
                  </button>

                  <button
                    onClick={() => setCurrentView('add')}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 border ${currentView === 'add' ? 'bg-[#78350f] border-[#92400e] text-white shadow-md' : 'border-transparent text-amber-200/70 hover:text-white hover:bg-[#78350f]/50'}`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Record
                  </button>

                  <div className="h-6 w-px bg-amber-800 mx-1"></div>

                  <button
                    onClick={handleExit}
                    className="px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 border border-transparent text-amber-200/50 hover:text-red-200 hover:bg-red-900/20"
                    title="Exit to Import Screen"
                  >
                    <LogOut className="w-4 h-4" />
                    Exit
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow">
              {currentView === 'collection' ? (
                <CollectionView />
              ) : currentView === 'analytics' ? (
                <AnalyticsView />
              ) : (
                <AddVinylForm onCancel={() => setCurrentView('collection')} onSave={() => setCurrentView('collection')} />
              )}
            </div>
          </>
        )}
      </div>
      <UpdateNotifier />
    </div>
  );
};

export default App;