import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Disc, Eye, Shuffle, Sparkles, X } from 'lucide-react';
import { Mood, VinylRecord } from '../types';
import { decadeOf, effectiveMoods, FAVORITE_RATING, matchesPick, MOODS, pickRecord, rememberPick } from '../services/moods';
import { coverAtSize } from '../services/image';
import { useDialog } from './useDialog';

interface TonightPickerProps {
  records: VinylRecord[];
  /** Ids of the latest suggestions; kept by the parent so reopening the picker doesn't repeat them. */
  recentPicks: React.MutableRefObject<number[]>;
  onClose: () => void;
  onOpenRecord: (record: VinylRecord) => void;
}

const TonightPicker: React.FC<TonightPickerProps> = ({ records, recentPicks, onClose, onOpenRecord }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onClose);

  const [mood, setMood] = useState<Mood | null>(null);
  const [decade, setDecade] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [pick, setPick] = useState<VinylRecord | null>(null);

  const decades = useMemo(() => {
    const set = new Set<number>();
    records.forEach(r => { const d = decadeOf(r.releaseYear); if (d !== null) set.add(d); });
    return Array.from(set).sort((a, b) => a - b);
  }, [records]);

  const options = { mood, decade, favoritesOnly };
  const candidateCount = records.filter(r => matchesPick(r, options)).length;

  const draw = () => {
    const next = pickRecord(records, options, recentPicks.current);
    setPick(next);
    if (next?.id !== undefined) recentPicks.current = rememberPick(recentPicks.current, next.id);
  };

  // A new suggestion whenever the mood or filters change (and on open). Not when the
  // collection itself changes (e.g. a cover color being saved in the background).
  useEffect(draw, [mood, decade, favoritesOnly]);

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${active
      ? 'bg-amber-800 border-amber-800 text-white shadow-xs'
      : 'bg-white border-stone-300 text-stone-600 hover:border-amber-500'}`;

  const pickMoods = pick ? effectiveMoods(pick) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tonight-title"
        tabIndex={-1}
        className="bg-[#fcfaf9] w-full max-w-2xl max-h-[92vh] rounded-lg shadow-2xl overflow-hidden flex flex-col border-4 border-[#78350f] outline-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#451a03] p-4 flex justify-between items-center border-b border-[#78350f] shrink-0">
          <h2 id="tonight-title" className="text-xl font-serif font-bold text-amber-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            What should I play tonight?
          </h2>
          <button onClick={onClose} title="Close" aria-label="Close" className="text-amber-200 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 md:p-6 bg-stone-50 space-y-5">
          {/* Mood */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mood">
            <button type="button" aria-pressed={mood === null} onClick={() => setMood(null)} className={chipClass(mood === null)}>
              Surprise me
            </button>
            {MOODS.map(m => (
              <button key={m} type="button" aria-pressed={mood === m} onClick={() => setMood(m)} className={chipClass(mood === m)}>
                {m}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-stone-600">
              <span className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Decade</span>
              <select
                value={decade ?? ''}
                onChange={(e) => setDecade(e.target.value ? Number(e.target.value) : null)}
                className="bg-white border border-stone-300 rounded-sm px-2 py-1.5 text-sm text-stone-700 focus:outline-hidden focus:border-[#78350f]"
              >
                <option value="">Any</option>
                {decades.map(d => <option key={d} value={d}>{d}s</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-stone-700 font-medium cursor-pointer">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} className="w-4 h-4 accent-amber-600 cursor-pointer" />
              Favorites only (rating {FAVORITE_RATING}+)
            </label>
            <span className="ml-auto text-xs text-stone-400 font-mono">
              {candidateCount} record{candidateCount === 1 ? '' : 's'} to pick from
            </span>
          </div>

          {/* Suggestion */}
          {pick ? (
            <div key={pick.id} className="flex flex-col sm:flex-row gap-6 items-center sm:items-start animate-fade-in" aria-live="polite">
              <div
                className="w-56 h-56 sm:w-64 sm:h-64 shrink-0 rounded-xs overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center"
                style={{ boxShadow: `0 18px 50px -12px ${pick.dominantColor || 'rgba(69, 26, 3, 0.6)'}` }}
              >
                {pick.coverUrl ? (
                  <img src={coverAtSize(pick.coverUrl, 600)} alt={`${pick.album} cover`} className="w-full h-full object-cover" />
                ) : (
                  <Disc className="w-24 h-24 text-stone-300" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 leading-tight">{pick.album}</h3>
                  <p className="text-lg font-medium text-[#78350f]">{pick.artist}</p>
                  <p className="text-sm text-stone-500 mt-1">
                    {[pick.releaseYear, pick.genre.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                    {pick.rating > 0 && <> · <span className="font-bold text-amber-700">{pick.rating}/10</span></>}
                  </p>
                </div>
                {pickMoods && pickMoods.moods.length > 0 && (
                  <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                    {pickMoods.moods.map(m => (
                      <span key={m} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pickMoods.auto ? 'border-dashed border-stone-300 text-stone-500' : 'border-amber-300 text-amber-800'}`}>
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-2">
                  <button
                    onClick={draw}
                    disabled={candidateCount < 2}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold uppercase tracking-wider shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shuffle className="w-4 h-4" /> Another
                  </button>
                  <button
                    onClick={() => onOpenRecord(pick)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-stone-300 text-stone-600 hover:text-stone-900 hover:border-stone-500 text-sm font-bold uppercase tracking-wider transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-stone-500" aria-live="polite">
              <Disc className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-serif italic text-lg">Nothing on the shelf matches.</p>
              <p className="text-sm mt-1">Try another mood or loosen the filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TonightPicker;
