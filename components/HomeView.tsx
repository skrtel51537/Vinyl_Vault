import React from 'react';
import { Disc, FileSpreadsheet, ArrowRight, Music } from 'lucide-react';

interface HomeViewProps {
    vinylCount: number;
    onEnter: () => void;
    onImport: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ vinylCount, onEnter, onImport }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-20">

            {/* Hero Section */}
            <div className="text-center mb-12 space-y-4 animate-fade-in-down">
                <div className="inline-flex items-center justify-center p-6 bg-[#451a03] rounded-full shadow-2xl border-4 border-[#78350f] mb-4">
                    <Disc className="w-20 h-20 text-amber-500" />
                </div>
                <h1 className="text-6xl font-serif font-bold text-[#451a03] tracking-tight drop-shadow-sm">
                    Vinyl Vault
                </h1>
                <p className="text-xl text-stone-600 font-light max-w-md mx-auto">
                    Your personal archive. Digital crate digging for the analog soul.
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">

                {/* Enter Vault Option */}
                <button
                    onClick={onEnter}
                    disabled={vinylCount === 0}
                    className="group relative bg-white p-8 rounded-xl shadow-xl border-2 border-[#78350f]/10 hover:border-[#78350f] hover:-translate-y-1 transition-all duration-300 text-left disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-stone-200"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Music className="w-24 h-24 text-[#78350f]" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-[#78350f] mb-2 font-serif group-hover:text-amber-700">Enter Vault</h2>
                        <div className="text-stone-500 mb-6">
                            {vinylCount > 0 ? (
                                <p>Access your collection of <span className="font-bold text-stone-800">{vinylCount}</span> records.</p>
                            ) : (
                                <p>Your shelf is currently empty.</p>
                            )}
                        </div>

                        <div className={`inline-flex items-center gap-2 font-bold uppercase tracking-widest text-sm ${vinylCount > 0 ? 'text-amber-600 group-hover:text-amber-800' : 'text-stone-400'}`}>
                            {vinylCount > 0 ? 'Open Collection' : 'No Records Found'} <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </button>

                {/* Import Option */}
                <button
                    onClick={onImport}
                    className="group relative bg-[#fffaf5] p-8 rounded-xl shadow-xl border-2 border-amber-100 hover:border-amber-400 hover:-translate-y-1 transition-all duration-300 text-left"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileSpreadsheet className="w-24 h-24 text-amber-600" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-amber-800 mb-2 font-serif">Import Crate</h2>
                        <p className="text-stone-600 mb-6">
                            Add new records via Excel import or manage your database.
                        </p>

                        <div className="inline-flex items-center gap-2 text-amber-600 group-hover:text-amber-800 font-bold uppercase tracking-widest text-sm">
                            Manage Imports <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </button>

            </div>

            <footer className="absolute bottom-6 text-stone-400 text-xs font-mono">
                v1.0.0 • Local Storage • No Cloud
            </footer>
        </div>
    );
};

export default HomeView;
