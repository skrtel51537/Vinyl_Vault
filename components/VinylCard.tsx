import React, { useState, useEffect } from 'react';
import { VinylRecord } from '../types';
import { Disc, ExternalLink, Star, DollarSign, ImagePlus, Loader2, Volume2 } from 'lucide-react';
import { db } from '../services/db';
import { findAlbumCover } from '../services/itunesService';
import { sanitizeExternalLink } from '../services/url';
import { extractDominantColor } from '../services/color';
import { coverAtSize } from '../services/image';
import { notify } from '../services/notify';

interface VinylCardProps {
  record: VinylRecord;
  onSelect?: (record: VinylRecord) => void;
}

const VinylCard: React.FC<VinylCardProps> = ({ record, onSelect }) => {
  const [loadingImage, setLoadingImage] = useState(false);
  const [imgError, setImgError] = useState(false);

  // A new cover (e.g. after "Find Art") gets a fresh chance to load.
  useEffect(() => {
    setImgError(false);
  }, [record.coverUrl]);

  // Lazily compute and persist the dominant cover color (backfills existing records).
  useEffect(() => {
    let cancelled = false;
    if (record.coverUrl && !record.dominantColor && record.id !== undefined) {
      extractDominantColor(coverAtSize(record.coverUrl, 100)!).then(color => {
        if (!cancelled && color) {
          db.vinyls.update(record.id!, { dominantColor: color });
        }
      });
    }
    return () => { cancelled = true; };
  }, [record.coverUrl, record.dominantColor, record.id]);

  const fetchCover = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loadingImage) return;

    setLoadingImage(true);
    try {
      const url = await findAlbumCover(record.artist, record.album);
      if (url) {
        // Update DB
        await db.vinyls.update(record.id!, { coverUrl: url });
      } else {
        notify(`Could not find a cover for "${record.album}" in iTunes.`, 'info');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImage(false);
    }
  };

  return (
    <div
      onClick={() => onSelect?.(record)}
      className="group bg-white rounded-xs flex flex-col h-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-visible cursor-pointer border border-[#78350f]"
    >

      {/* Cover Image Area */}
      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
        {record.coverUrl && !imgError ? (
          <img
            src={coverAtSize(record.coverUrl, 400)}
            alt={`${record.album} cover`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale-10 group-hover:grayscale-0 transition-all duration-700 block"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
            <div className="relative p-8 border-4 border-stone-200 rounded-full">
              <Disc className="w-16 h-16 opacity-30 text-stone-500" />
            </div>

            <button
              onClick={fetchCover}
              className="mt-4 flex items-center gap-2 px-3 py-1 bg-white border border-stone-300 hover:border-amber-600 hover:text-amber-700 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all shadow-xs"
            >
              {loadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {loadingImage ? "Digging..." : "Find Art"}
            </button>
          </div>
        )}

        {/* Sound Quality Badge - Cyan/Speaker style */}
        {record.soundQuality > 0 && (
          <div className="absolute top-2 left-2 px-2 h-7 rounded-full bg-cyan-600/90 text-white flex items-center justify-center gap-1 font-bold text-xs shadow-md border-2 border-white/20" title={`Sound Quality: ${record.soundQuality}/5`}>
            <Volume2 className="w-3 h-3" />
            <span>{record.soundQuality}</span>
          </div>
        )}

        {/* Rating Badge - Gold stamp style */}
        {record.rating > 0 && (
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-amber-500/90 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white/20" title={`Rating: ${record.rating}/10`}>
            {record.rating}
          </div>
        )}

        {/* To Be Sold Badge - Sticker style */}
        {record.toBeSold && (
          <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded-xs shadow-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide transform -rotate-2">
            <DollarSign className="w-3 h-3" />
            For Sale
          </div>
        )}
      </div>

      {/* Dominant-color accent strip (record label spine) */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: record.dominantColor || '#78350f' }}
      />

      {/* Details Area - Looks like the back or label */}
      <div className="p-4 flex flex-col grow relative bg-white">
        <h3 className="font-bold text-lg text-stone-900 leading-tight mb-1 font-serif line-clamp-2 group-hover:text-amber-800 transition-colors" title={record.album}>{record.album}</h3>
        <p className="text-stone-500 text-sm font-semibold uppercase tracking-wide truncate mb-3 border-b border-stone-100 pb-2" title={record.artist}>{record.artist}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {record.genre.slice(0, 2).map((g, idx) => (
            <span key={idx} className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {g}
            </span>
          ))}
        </div>

        <div className="mt-auto flex justify-between items-center pt-2">
          <span className="text-xs text-stone-400 font-mono font-medium">
            {record.releaseYear} • {record.country !== '-' ? record.country : 'Unk'}
          </span>

          {sanitizeExternalLink(record.discogsLink) && (
            <a
              href={sanitizeExternalLink(record.discogsLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-amber-600 transition-colors bg-stone-50 p-1 rounded-full"
              title="View on Discogs"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div >
  );
};

// useLiveQuery returns fresh record objects on every DB change, so compare the fields
// the card actually renders instead of object identity. Without this, any single
// change (e.g. a dominant color being saved) re-rendered every card in the collection.
const sameCard = (prev: VinylCardProps, next: VinylCardProps): boolean => {
  const a = prev.record, b = next.record;
  return prev.onSelect === next.onSelect
    && a.id === b.id
    && a.album === b.album
    && a.artist === b.artist
    && a.coverUrl === b.coverUrl
    && a.dominantColor === b.dominantColor
    && a.releaseYear === b.releaseYear
    && a.country === b.country
    && a.rating === b.rating
    && a.soundQuality === b.soundQuality
    && a.toBeSold === b.toBeSold
    && a.discogsLink === b.discogsLink
    && a.genre.join('\u0000') === b.genre.join('\u0000');
};

export default React.memo(VinylCard, sameCard);