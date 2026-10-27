import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, Trash2, ArrowLeft, Download, UploadCloud, Disc, Heart } from 'lucide-react';
import { parseExcelFile } from '../services/excelService';
import { db, resetDatabase } from '../services/db';
import { VinylRecord } from '../types';
import { exportFullBackup, importFullBackup } from '../services/backupService';
import { confirmDialog, notify } from '../services/notify';
import { describeBackupAge, getLastBackupDate, isBackupOverdue } from '../services/backupReminder';
import { DiscogsFileError, DiscogsKind, parseDiscogsCollection, parseDiscogsWantlist, splitNewAndExisting } from '../services/discogsCsv';
import DiscogsImportPreview, { DiscogsImportSummary } from './DiscogsImportPreview';

interface ImportViewProps {
  onImportComplete: () => void;
  onWishlistImportComplete?: () => void;
  onBack?: () => void;
}

/** A Discogs import waiting for the user's OK in the preview. */
interface PendingDiscogsImport {
  summary: DiscogsImportSummary;
  save: () => Promise<void>;
}

const fileButtonClass = 'flex items-center gap-2 px-5 py-2.5 bg-paper hover:bg-stone-50 text-amber-800 dark:text-amber-300 font-bold rounded-lg shadow-md border border-amber-300 dark:border-amber-800 transition-all cursor-pointer';

const ImportView: React.FC<ImportViewProps> = ({ onImportComplete, onWishlistImportComplete, onBack }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(getLastBackupDate);
  const [pendingDiscogs, setPendingDiscogs] = useState<PendingDiscogsImport | null>(null);

  // ... (existing processFile, onDrop, onDragOver, onDragLeave, handleFileInput, handleReset logic remains unchanged) ...

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const records = await parseExcelFile(file);
      if (records.length === 0) {
        setError("No valid records found in the file. Please check the format.");
        setIsProcessing(false);
        return;
      }

      // Check for duplicates before adding
      const existingRecords = await db.vinyls.toArray();
      const existingSet = new Set(
        existingRecords.map(r => `${r.artist.toLowerCase().trim()}|${r.album.toLowerCase().trim()}`)
      );

      const newRecords = records.filter(r =>
        !existingSet.has(`${r.artist.toLowerCase().trim()}|${r.album.toLowerCase().trim()}`)
      );

      if (newRecords.length === 0) {
        notify('All records in this file are already in your collection.', 'info');
        onImportComplete(); // Navigate to collection even if duplicates
        return;
      }

      await db.vinyls.bulkAdd(newRecords);

      const skippedCount = records.length - newRecords.length;
      notify(
        `Imported ${newRecords.length} new record${newRecords.length === 1 ? '' : 's'}.` +
        (skippedCount > 0 ? ` Skipped ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'} already in your library.` : ''),
        'success'
      );

      onImportComplete(); // Trigger navigation

    } catch (err: any) {
      console.error(err);
      setError("Failed to process file. Ensure it is a valid Excel file matching the specified format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && (files[0].name.endsWith('.xlsx') || files[0].name.endsWith('.xls'))) {
      processFile(files[0]);
    } else {
      setError("Please drop a valid .xlsx file.");
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirmDialog(
      'This will delete ALL records in your collection. This cannot be undone. Your wishlist is kept.\n\nConsider making a Full Backup first.',
      { title: 'Clear database?', confirmLabel: 'Delete everything', danger: true }
    );
    if (confirmed) {
      setIsProcessing(true);
      const success = await resetDatabase();
      setIsProcessing(false);
      if (success) {
        setError(null);
        notify('Database has been cleared.', 'success');
      }
    }
  };

  const handleFullBackup = async () => {
    setIsProcessing(true);
    try {
      await exportFullBackup();
      setLastBackup(getLastBackupDate());
    } catch (err) {
      console.error(err);
      setError('Failed to create backup.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscogsFile = (kind: DiscogsKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // The same file can be chosen again
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      // file.text() decodes UTF-8, as Discogs writes it (read as plain bytes, accents get garbled).
      const text = await file.text();
      if (kind === 'collection') {
        const parsed = await parseDiscogsCollection(text);
        const { fresh, existing } = splitNewAndExisting(parsed.items, await db.vinyls.toArray());
        setPendingDiscogs({
          summary: { kind, fresh, existing: existing.length, skippedNotVinyl: parsed.skippedNotVinyl, invalid: parsed.invalid },
          save: () => db.transaction('rw', db.vinyls, async () => { await db.vinyls.bulkAdd(fresh); }),
        });
      } else {
        const parsed = await parseDiscogsWantlist(text);
        // Records already owned are not wanted again.
        const saved = [...await db.wishlist.toArray(), ...await db.vinyls.toArray()];
        const { fresh, existing } = splitNewAndExisting(parsed.items, saved);
        setPendingDiscogs({
          summary: { kind, fresh, existing: existing.length, skippedNotVinyl: parsed.skippedNotVinyl, invalid: parsed.invalid },
          save: () => db.transaction('rw', db.wishlist, async () => { await db.wishlist.bulkAdd(fresh); }),
        });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof DiscogsFileError ? err.message : 'Failed to read the Discogs file. Choose the .csv file exported by Discogs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDiscogsImport = async () => {
    if (!pendingDiscogs) return;
    const { summary, save } = pendingDiscogs;
    setIsProcessing(true);
    try {
      await save();
      const count = summary.fresh.length;
      notify(`Imported ${count} record${count === 1 ? '' : 's'} from Discogs into your ${summary.kind === 'collection' ? 'collection' : 'wishlist'}.`, 'success');
      setPendingDiscogs(null);
      if (summary.kind === 'collection') onImportComplete();
      else onWishlistImportComplete?.();
    } catch (err) {
      console.error(err);
      setPendingDiscogs(null);
      setError('Failed to save the imported records. Nothing was changed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const success = await importFullBackup(file);
      if (success) {
        onImportComplete();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to restore backup.');
    } finally {
      setIsProcessing(false);
      // Reset the input so the same file can be selected again
      if (backupInputRef.current) {
        backupInputRef.current.value = '';
      }
    }
  };

  return (
    // min-h (not h): with the Discogs section the card can be taller than the window, and must then scroll.
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-6 pt-20 relative">

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-0 left-0 m-6 text-stone-500 hover:text-accent flex items-center gap-2 font-bold transition-colors z-50 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </button>
      )}

      {/* Utility to clear duplicates if needed */}
      <button
        onClick={handleReset}
        disabled={isProcessing}
        className="absolute top-0 right-0 m-6 text-xs text-stone-400 hover:text-red-600 flex items-center gap-1 transition-colors disabled:opacity-50"
        title="Clear all data and start fresh"
      >
        <Trash2 className="w-3 h-3" /> Clear Database
      </button>

      <div className="max-w-xl w-full text-center space-y-8 bg-paper p-10 rounded-xl shadow-xl border border-stone-200">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-3">Import Collection</h1>
          <p className="text-stone-500 font-light text-lg">Bring your Excel crate into the listening room.</p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            border-2 border-dashed rounded-xl p-12 transition-all duration-300
            flex flex-col items-center justify-center space-y-4 cursor-pointer
            ${isDragging
              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/30'
              : 'border-stone-300 hover:border-amber-500 bg-stone-50 hover:bg-stone-100'}
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-16 h-16 text-amber-700 animate-spin" />
          ) : (
            <FileSpreadsheet className={`w-16 h-16 ${isDragging ? 'text-amber-600' : 'text-stone-400'}`} />
          )}

          <div className="text-center">
            {isProcessing ? (
              <p className="text-lg font-medium text-amber-800 dark:text-amber-400">Processing...</p>
            ) : (
              <>
                <p className="text-lg font-bold text-stone-700">
                  Drop Excel file here
                </p>
                <p className="text-sm text-stone-500 mt-2">
                  or <label className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer font-bold hover:underline decoration-amber-600/50">
                    browse local files
                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileInput} />
                  </label>
                </p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-sm border border-red-200 text-sm dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="text-left text-xs text-stone-500 bg-stone-50 p-4 rounded-sm border border-stone-200 font-mono leading-relaxed">
          <p className="font-bold mb-2 text-stone-700 uppercase tracking-wide">Required Columns (Row 2):</p>
          <p>Artist, Album, Genre, Collection, Release Year, Country, Label, Cat. Number, Condition Sleeve, Condition Media, Sound Quality, Rating, Best tracks, Others/Comments, Discogs link, To be sold</p>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-stone-300"></div>
          <span className="text-stone-400 text-sm font-medium">From Discogs</span>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        {/* Discogs CSV import: collection and wantlist are separate exports */}
        <div className="p-6 rounded-xl border border-stone-200 bg-stone-50">
          <p className="text-sm text-stone-600 mb-4">
            Import the CSV files you export from Discogs. Records you already have are left untouched,
            and you see what will be added before anything is saved.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <label className={fileButtonClass}>
              <Disc className="w-5 h-5" />
              Discogs collection
              <input type="file" className="hidden" accept=".csv,text/csv" onChange={handleDiscogsFile('collection')} disabled={isProcessing} />
            </label>
            <label className={fileButtonClass}>
              <Heart className="w-5 h-5" />
              Discogs wantlist
              <input type="file" className="hidden" accept=".csv,text/csv" onChange={handleDiscogsFile('wantlist')} disabled={isProcessing} />
            </label>
          </div>
          <p className="text-xs text-stone-500 mt-3">Use the .csv file as downloaded: opening and saving it in Excel first can damage it.</p>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-stone-300"></div>
          <span className="text-stone-400 text-sm font-medium">Complete Database Backup</span>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        {/* Backup/Restore Section */}
        <div className="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-6 rounded-xl border border-amber-200 dark:border-amber-900/60">
          <p className="text-sm text-stone-600 mb-4">
            Create a complete backup including all metadata, <strong>cover images</strong> and your wishlist. Use this to safely transfer your collection or protect against data loss.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleFullBackup}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Full Backup
            </button>
            <label className="flex items-center gap-2 px-5 py-2.5 bg-paper hover:bg-stone-50 text-amber-800 dark:text-amber-300 font-bold rounded-lg shadow-md border border-amber-300 dark:border-amber-800 transition-all cursor-pointer">
              <UploadCloud className="w-5 h-5" />
              Restore Backup
              <input
                ref={backupInputRef}
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleRestoreBackup}
                disabled={isProcessing}
              />
            </label>
          </div>
          <p className="text-xs text-stone-500 mt-3">
            Full Backup exports: Excel (.xlsx) + JSON with covers (.json)
          </p>
          <p className={`text-xs mt-1 ${isBackupOverdue(lastBackup) ? 'text-amber-800 dark:text-amber-400 font-bold' : 'text-stone-500'}`}>
            {lastBackup
              ? `Last backup: ${lastBackup.toLocaleDateString()} (${describeBackupAge(lastBackup)})`
              : 'No backup made from this browser yet.'}
          </p>
        </div>
      </div>

      {pendingDiscogs && (
        <DiscogsImportPreview
          summary={pendingDiscogs.summary}
          busy={isProcessing}
          onConfirm={confirmDiscogsImport}
          onCancel={() => setPendingDiscogs(null)}
        />
      )}
    </div>
  );
};

export default ImportView;