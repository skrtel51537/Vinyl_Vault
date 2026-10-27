import React, { useRef } from 'react';
import { Disc, Heart } from 'lucide-react';
import { DiscogsKind } from '../services/discogsCsv';
import { useDialog } from './useDialog';

export interface DiscogsImportSummary {
  kind: DiscogsKind;
  fresh: { artist: string; album: string }[]; // What will be added
  existing: number;
  skippedNotVinyl: number;
  invalid: number;
}

interface DiscogsImportPreviewProps {
  summary: DiscogsImportSummary;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** What a Discogs import will do, before anything is saved. */
const DiscogsImportPreview: React.FC<DiscogsImportPreviewProps> = ({ summary, busy, onConfirm, onCancel }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onCancel, !busy);
  const isCollection = summary.kind === 'collection';
  const count = summary.fresh.length;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discogs-preview-title"
        className="bg-cream w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden border-4 border-[#78350f] animate-fade-in-up focus:outline-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#451a03] px-5 py-3 flex items-center gap-2 border-b border-[#78350f]">
          {isCollection ? <Disc className="w-5 h-5 text-amber-500" /> : <Heart className="w-5 h-5 text-amber-500" />}
          <h2 id="discogs-preview-title" className="text-lg font-serif font-bold text-amber-50">
            {isCollection ? 'Import Discogs collection' : 'Import Discogs wantlist'}
          </h2>
        </div>

        <div className="px-5 py-4 text-sm text-stone-700 leading-relaxed overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <strong>{plural(count, 'new record')}</strong> {count === 1 ? 'goes' : 'go'} to your {isCollection ? 'collection' : 'wishlist'}.
            </li>
            {summary.existing > 0 && (
              <li>{plural(summary.existing, 'record')} already in your {isCollection ? 'collection' : 'wishlist or collection'}: left untouched.</li>
            )}
            {summary.skippedNotVinyl > 0 && (
              <li>{plural(summary.skippedNotVinyl, 'record')} skipped: not vinyl (CD, cassette, file…).</li>
            )}
            {summary.invalid > 0 && <li>{plural(summary.invalid, 'row')} skipped: no artist or title.</li>}
          </ul>
          {isCollection && count > 0 && (
            <p className="text-xs text-stone-500 mt-3">Discogs does not export genres or countries: add them from each record's page.</p>
          )}
          {count > 0 && (
            <ol className="mt-3 max-h-64 overflow-y-auto rounded-sm border border-stone-200 bg-paper divide-y divide-stone-100">
              {summary.fresh.map((r, i) => (
                <li key={i} className="px-3 py-1.5">
                  <span className="font-semibold text-stone-800">{r.artist}</span> — {r.album}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-5 py-4 flex justify-end gap-3 border-t border-stone-200">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-sm border border-stone-300 text-stone-600 hover:text-stone-900 hover:border-stone-500 text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {count > 0 ? 'Cancel' : 'Close'}
          </button>
          {count > 0 && (
            <button
              onClick={onConfirm}
              disabled={busy}
              className="px-4 py-2 rounded-sm bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold uppercase tracking-wider shadow-md transition-colors disabled:opacity-50 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
            >
              {busy ? 'Importing…' : `Import ${count}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscogsImportPreview;
