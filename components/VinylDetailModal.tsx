import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { VinylRecord } from '../types';
import { X, Disc, Music, Calendar, Globe, Tag, DollarSign, ExternalLink, Trash2, Edit, ListMusic, MessageSquare, Loader2 } from 'lucide-react';
import { db, deleteVinylById } from '../services/db';
import AddVinylForm from './AddVinylForm';

interface VinylDetailModalProps {
  record: VinylRecord;
  onClose: () => void;
}

const VinylDetailModal: React.FC<VinylDetailModalProps> = ({ record: initialRecord, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // We use liveQuery to get updates, but fallback to initialRecord if deleted/loading
  const liveRecord = useLiveQuery(
    () => {
      if (initialRecord.id !== undefined) {
        return db.vinyls.get(initialRecord.id);
      }
      return undefined;
    },
    [initialRecord.id]
  );

  // If liveRecord is undefined (deleted), we still show initialRecord until modal closes
  const record = liveRecord || initialRecord;

  const handleDelete = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDeleting) return;

      if (initialRecord.id === undefined || initialRecord.id === null) {
          alert("Error: Cannot delete this record because it has no valid ID.");
          return;
      }

      if (window.confirm(`Delete "${initialRecord.album}" permanently?`)) {
          setIsDeleting(true);
          try {
              const idToDelete = Number(initialRecord.id);
              console.log(`[Modal] Initiating delete for ID: ${idToDelete}`);
              
              await deleteVinylById(idToDelete);
              
              console.log(`[Modal] Delete successful. Closing modal.`);
              // Ensure we close the modal
              onClose();
          } catch (error) {
              console.error("[Modal] Delete failed:", error);
              alert(`Failed to delete record: ${error}`);
              setIsDeleting(false);
          }
      }
  };

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#fcfaf9] w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col relative border-4 border-[#78350f]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#451a03] p-4 flex justify-between items-center border-b border-[#78350f] shrink-0">
          <h2 className="text-xl font-serif font-bold text-amber-50 flex items-center gap-2">
            <Disc className="w-5 h-5 text-amber-500" />
            {isEditing ? 'Editing Record' : 'Record Details'}
          </h2>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  disabled={isDeleting}
                  className="text-amber-200 hover:text-white transition-colors p-2 rounded hover:bg-white/10 flex items-center gap-1 text-sm font-medium disabled:opacity-50"
                  title="Edit Record"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <div className="w-px bg-amber-800 mx-1"></div>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-amber-200 hover:text-red-400 transition-colors p-2 rounded hover:bg-white/10 flex items-center gap-1 text-sm font-medium cursor-pointer z-50 disabled:opacity-50"
                  title="Delete Record"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                 <div className="w-px bg-amber-800 mx-1"></div>
              </>
            )}
            
            <button 
              onClick={onClose}
              className="text-amber-200 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar bg-stone-50 flex-grow">
          {isEditing ? (
             <AddVinylForm 
                initialValues={record} 
                onCancel={() => setIsEditing(false)} 
                onSave={() => setIsEditing(false)} 
                embedded={true}
             />
          ) : (
            <div className={`flex flex-col md:flex-row gap-8 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Left Column */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    <div className="aspect-square w-full rounded-sm shadow-xl bg-white p-1 border border-stone-200 relative overflow-hidden group">
                        {record.coverUrl ? (
                            <img src={record.coverUrl} alt={record.album} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-300">
                                <Disc className="w-24 h-24" />
                            </div>
                        )}
                        {record.toBeSold && (
                            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 text-sm font-bold uppercase tracking-widest shadow-lg transform rotate-3">
                                For Sale
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 rounded border border-stone-200 text-center shadow-sm">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Personal Rating</div>
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-4xl font-serif font-bold text-[#78350f]">
                                {record.rating && record.rating > 0 ? record.rating : '-'}
                            </span>
                            <span className="text-stone-400 text-lg">/10</span>
                        </div>
                    </div>

                    {record.discogsLink && (
                        <a 
                        href={record.discogsLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-sm rounded transition-colors uppercase tracking-wide"
                        >
                        <ExternalLink className="w-4 h-4" />
                        View on Discogs
                        </a>
                    )}
                </div>

                {/* Right Column */}
                <div className="w-full md:w-2/3 space-y-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 leading-tight mb-1">{record.album}</h1>
                        <h2 className="text-xl md:text-2xl font-medium text-[#78350f]">{record.artist}</h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {record.genre.map((g, i) => (
                            <span key={i} className="px-3 py-1 bg-[#78350f]/10 text-[#78350f] rounded-full text-xs font-bold uppercase tracking-wider border border-[#78350f]/20">
                                {g}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded border border-stone-200 shadow-sm">
                        <div>
                            <span className="block text-xs font-bold text-stone-400 uppercase">Release Year</span>
                            <span className="font-semibold text-stone-800">{record.releaseYear || 'Unknown'}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-400 uppercase">Country</span>
                            <span className="font-semibold text-stone-800">{record.country}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-400 uppercase">Label</span>
                            <span className="font-semibold text-stone-800">{record.label.join(', ') || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-400 uppercase">Cat. Number</span>
                            <span className="font-semibold text-stone-800 font-mono">{record.catNumber.join(', ') || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-400 uppercase">Collection</span>
                            <span className="font-semibold text-stone-800">{record.collection}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-stone-400 uppercase">Added On</span>
                            <span className="font-semibold text-stone-800">{new Date(record.addedAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-amber-50 p-3 rounded border border-amber-100 text-center">
                            <span className="block text-[10px] font-bold text-amber-800 uppercase">Sleeve</span>
                            <span className="text-lg font-bold text-[#78350f]">{record.conditionSleeve}</span>
                        </div>
                        <div className="bg-amber-50 p-3 rounded border border-amber-100 text-center">
                            <span className="block text-[10px] font-bold text-amber-800 uppercase">Media</span>
                            <span className="text-lg font-bold text-[#78350f]">{record.conditionMedia}</span>
                        </div>
                        <div className="bg-amber-50 p-3 rounded border border-amber-100 text-center">
                            <span className="block text-[10px] font-bold text-amber-800 uppercase">Sound</span>
                            <span className="text-lg font-bold text-[#78350f]">
                                {record.soundQuality && record.soundQuality > 0 ? record.soundQuality : '-'}/5
                            </span>
                        </div>
                    </div>

                    {record.bestTracks.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ListMusic className="w-4 h-4" /> Best Tracks
                            </h3>
                            <div className="bg-white border border-stone-200 rounded p-4">
                                <ul className="list-disc list-inside space-y-1 text-stone-700">
                                    {record.bestTracks.map((track, i) => (
                                        <li key={i}>{track}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {record.comments && (
                        <div>
                            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Others/Comments
                            </h3>
                            <p className="bg-[#fffef0] p-4 rounded border border-stone-200 text-stone-700 italic text-sm leading-relaxed font-serif">
                                "{record.comments}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VinylDetailModal;