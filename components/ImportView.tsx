import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, Trash2, ArrowLeft, Download, UploadCloud } from 'lucide-react';
import { parseExcelFile } from '../services/excelService';
import { db, resetDatabase } from '../services/db';
import { VinylRecord } from '../types';
import { exportFullBackup, importFullBackup } from '../services/backupService';

interface ImportViewProps {
  onImportComplete: () => void;
  onBack?: () => void;
}

const ImportView: React.FC<ImportViewProps> = ({ onImportComplete, onBack }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

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
        alert("All records in this file are already in your collection.");
        onImportComplete(); // Navigate to collection even if duplicates
        return;
      }

      await db.vinyls.bulkAdd(newRecords);

      const skippedCount = records.length - newRecords.length;
      if (skippedCount > 0) {
        alert(`Imported ${newRecords.length} new records. Skipped ${skippedCount} duplicates that were already in your library.`);
      }

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
    if (window.confirm("Are you sure you want to delete ALL records? This cannot be undone.")) {
      setIsProcessing(true);
      const success = await resetDatabase();
      setIsProcessing(false);
      if (success) {
        setError(null);
        alert("Database has been cleared.");
      }
    }
  };

  const handleFullBackup = async () => {
    setIsProcessing(true);
    try {
      await exportFullBackup();
    } catch (err) {
      console.error(err);
      setError('Failed to create backup.');
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
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-6 relative">

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-0 left-0 m-6 text-stone-500 hover:text-[#78350f] flex items-center gap-2 font-bold transition-colors z-50 cursor-pointer"
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

      <div className="max-w-xl w-full text-center space-y-8 bg-white p-10 rounded-xl shadow-xl border border-stone-200">
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
              ? 'border-amber-600 bg-amber-50'
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
              <p className="text-lg font-medium text-amber-800">Processing...</p>
            ) : (
              <>
                <p className="text-lg font-bold text-stone-700">
                  Drop Excel file here
                </p>
                <p className="text-sm text-stone-500 mt-2">
                  or <label className="text-amber-700 hover:text-amber-800 cursor-pointer font-bold hover:underline decoration-amber-600/50">
                    browse local files
                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileInput} />
                  </label>
                </p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="text-left text-xs text-stone-500 bg-stone-50 p-4 rounded border border-stone-200 font-mono leading-relaxed">
          <p className="font-bold mb-2 text-stone-700 uppercase tracking-wide">Required Columns (Row 2):</p>
          <p>Artist, Album, Genre, Collection, Release Year, Country, Label, Cat. Number, Condition Sleeve, Condition Media, Sound Quality, Rating, Best tracks, Others/Comments, Discogs link, To be sold</p>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-stone-300"></div>
          <span className="text-stone-400 text-sm font-medium">Complete Database Backup</span>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        {/* Backup/Restore Section */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
          <p className="text-sm text-stone-600 mb-4">
            Create a complete backup including all metadata <strong>and cover images</strong>. Use this to safely transfer your collection or protect against data loss.
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
            <label className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-stone-50 text-amber-800 font-bold rounded-lg shadow-md border border-amber-300 transition-all cursor-pointer">
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
        </div>
      </div>
    </div>
  );
};

export default ImportView;