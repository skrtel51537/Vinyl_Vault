import React from 'react';
import { VinylRecord } from '../types';
import { Disc, ExternalLink, DollarSign } from 'lucide-react';
import { sanitizeExternalLink } from '../services/url';

interface VinylTableProps {
  records: VinylRecord[];
  onRowClick: (record: VinylRecord) => void;
}

const VinylTable: React.FC<VinylTableProps> = ({ records, onRowClick }) => {
  return (
    <div className="bg-white rounded-lg border border-[#78350f] shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#451a03] text-amber-50">
            <tr className="text-left uppercase tracking-wider text-xs">
              <th className="px-4 py-3 font-bold w-12"></th>
              <th className="px-4 py-3 font-bold">Album</th>
              <th className="px-4 py-3 font-bold">Artist</th>
              <th className="px-4 py-3 font-bold">Year</th>
              <th className="px-4 py-3 font-bold">Genre</th>
              <th className="px-4 py-3 font-bold text-center">Rating</th>
              <th className="px-4 py-3 font-bold text-center">Sound</th>
              <th className="px-4 py-3 font-bold text-center">Media</th>
              <th className="px-4 py-3 font-bold text-center">Status</th>
              <th className="px-4 py-3 font-bold text-center">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {records.map((record) => {
              const link = sanitizeExternalLink(record.discogsLink);
              return (
                <tr
                  key={record.id}
                  onClick={() => onRowClick(record)}
                  className="hover:bg-amber-50/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2">
                    <div
                      className="w-10 h-10 rounded bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0"
                      style={record.dominantColor ? { borderColor: record.dominantColor } : undefined}
                    >
                      {record.coverUrl ? (
                        <img src={record.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Disc className="w-5 h-5 text-stone-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-bold text-stone-800 font-serif">{record.album}</td>
                  <td className="px-4 py-2 text-stone-600">{record.artist}</td>
                  <td className="px-4 py-2 text-stone-500 font-mono">{record.releaseYear || '—'}</td>
                  <td className="px-4 py-2 text-stone-500">{record.genre.slice(0, 2).join(', ') || '—'}</td>
                  <td className="px-4 py-2 text-center font-bold text-[#78350f]">{record.rating > 0 ? record.rating : '—'}</td>
                  <td className="px-4 py-2 text-center text-cyan-700 font-semibold">{record.soundQuality > 0 ? record.soundQuality : '—'}</td>
                  <td className="px-4 py-2 text-center text-stone-600">{record.conditionMedia || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {record.toBeSold ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs uppercase">
                        <DollarSign className="w-3 h-3" />Sell
                      </span>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-stone-400 hover:text-amber-600 inline-block"
                        title="View on Discogs"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VinylTable;
