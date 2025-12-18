import React, { useState } from 'react';
import { VinylRecord } from '../types';
import { Disc, ExternalLink, Star, DollarSign, ImagePlus, Loader2, Volume2 } from 'lucide-react';
import { db } from '../services/db';
import { findAlbumCover } from '../services/itunesService';

interface VinylCardProps {
  record: VinylRecord;
  onClick?: () => void;
}

const VinylCard: React.FC<VinylCardProps> = ({ record, onClick }) => {
  const [loadingImage, setLoadingImage] = useState(false);

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
        alert("Could not find cover image in iTunes.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImage(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-sm flex flex-col h-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-visible cursor-pointer border border-[#78350f]"
    >

      {/* Cover Image Area */}
      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
        {record.coverUrl ? (
          <img
            src={record.coverUrl}
            alt={`${record.album} cover`}
            className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-700 block"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/400/400?grayscale&blur=2';
              (e.target as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
            <div className="relative p-8 border-4 border-stone-200 rounded-full">
              <Disc className="w-16 h-16 opacity-30 text-stone-500" />
            </div>

            <button
              onClick={fetchCover}
              className="mt-4 flex items-center gap-2 px-3 py-1 bg-white border border-stone-300 hover:border-amber-600 hover:text-amber-700 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all shadow-sm"
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
          <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded-sm shadow-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide transform -rotate-2">
            <DollarSign className="w-3 h-3" />
            For Sale
          </div>
        )}
      </div>

      {/* Details Area - Looks like the back or label */}
      <div className="p-4 flex flex-col flex-grow relative bg-white">
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

          {record.discogsLink && (
            <a
              href={record.discogsLink}
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

export default VinylCard;