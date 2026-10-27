import React from 'react';
import { Disc, FileSpreadsheet, ArrowRight, Music, ShieldAlert } from 'lucide-react';
import { describeBackupAge, getLastBackupDate, isBackupOverdue } from '../services/backupReminder';
import ThemeToggle from './ThemeToggle';

interface HomeViewProps {
    vinylCount: number;
    onEnter: () => void;
    onImport: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ vinylCount, onEnter, onImport }) => {
    const lastBackup = getLastBackupDate();
    const showBackupReminder = vinylCount > 0 && isBackupOverdue(lastBackup);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-20">

            <ThemeToggle className="absolute top-4 right-4 p-2.5 rounded-full border border-stone-300 bg-paper/70 text-stone-500 hover:text-accent hover:border-accent shadow-xs transition-colors" />

            {/* Hero Section */}
            <div className="text-center mb-12 space-y-4 animate-fade-in-down">
                <div className="inline-flex items-center justify-center p-6 bg-[#451a03] rounded-full shadow-2xl border-4 border-[#78350f] mb-8">
                    <Disc className="w-20 h-20 text-amber-500" />
                </div>
                <h1 className="text-6xl font-serif font-bold text-accent-strong tracking-tight drop-shadow-xs">
                    Vinyl Vault
                </h1>
                <p className="text-xl text-stone-600 font-light max-w-md mx-auto">
                    Your personal archive. Digital crate digging for the analog soul.
                </p>
            </div>

            {showBackupReminder && (
                <div role="status" className="mb-8 max-w-4xl w-full flex flex-col sm:flex-row items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 shadow-xs dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700 dark:text-amber-400" />
                    <p className="flex-1 text-center sm:text-left">
                        {lastBackup
                            ? <>Your last backup was <strong>{describeBackupAge(lastBackup)}</strong>. Your collection only lives in this browser — make a fresh backup.</>
                            : <>You haven't made a backup yet. Your collection only lives in this browser — make one to keep it safe.</>}
                    </p>
                    <button
                        onClick={onImport}
                        className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-md transition-colors whitespace-nowrap"
                    >
                        Back up now
                    </button>
                </div>
            )}

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">

                {/* Enter Vault Option */}
                <button
                    onClick={onEnter}
                    disabled={vinylCount === 0}
                    className="group relative bg-paper p-8 rounded-xl shadow-xl border-2 border-[#78350f]/10 hover:border-[#78350f] hover:-translate-y-1 transition-all duration-300 text-left disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-stone-200"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Music className="w-24 h-24 text-accent" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-accent mb-2 font-serif group-hover:text-amber-700 dark:group-hover:text-amber-400">Enter Vault</h2>
                        <div className="text-stone-500 mb-6">
                            {vinylCount > 0 ? (
                                <p>Access your collection of <span className="font-bold text-stone-800">{vinylCount}</span> records.</p>
                            ) : (
                                <p>Your shelf is currently empty.</p>
                            )}
                        </div>

                        <div className={`inline-flex items-center gap-2 font-bold uppercase tracking-widest text-sm ${vinylCount > 0 ? 'text-amber-600 group-hover:text-amber-800 dark:group-hover:text-amber-400' : 'text-stone-400'}`}>
                            {vinylCount > 0 ? 'Open Collection' : 'No Records Found'} <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </button>

                {/* Import Option */}
                <button
                    onClick={onImport}
                    className="group relative bg-[#fffaf5] dark:bg-paper p-8 rounded-xl shadow-xl border-2 border-amber-100 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600 hover:-translate-y-1 transition-all duration-300 text-left"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileSpreadsheet className="w-24 h-24 text-amber-600" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-400 mb-2 font-serif">Import Crate</h2>
                        <p className="text-stone-600 mb-6">
                            Add new records from Excel or Discogs, or manage your database.
                        </p>

                        <div className="inline-flex items-center gap-2 text-amber-600 group-hover:text-amber-800 dark:group-hover:text-amber-400 font-bold uppercase tracking-widest text-sm">
                            Manage Imports <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </button>

            </div>

            <footer className="absolute bottom-6 text-stone-400 text-xs font-mono">
                v{__APP_VERSION__} • Local Storage • No Cloud
            </footer>
        </div>
    );
};

export default HomeView;
