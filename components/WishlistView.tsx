import React, { useCallback, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Heart, Plus, Edit, Trash2, ExternalLink, PackageCheck, X, Save } from 'lucide-react';
import { db } from '../services/db';
import { WishlistItem, WishlistPriority } from '../types';
import { parsePrice, PRIORITIES, PRIORITY_LABELS, sortWishlist } from '../services/wishlist';
import { sanitizeExternalLink } from '../services/url';
import { confirmDialog, notify } from '../services/notify';
import { useDialog } from './useDialog';

const priorityStyles: Record<WishlistPriority, { bar: string; badge: string }> = {
  high: { bar: 'bg-red-600', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900' },
  medium: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' },
  low: { bar: 'bg-stone-400', badge: 'bg-stone-100 text-stone-600 border-stone-200' },
};

const formatPrice = (price: number) => price.toLocaleString(undefined, { maximumFractionDigits: 2 });

interface WishlistFormProps {
  item: WishlistItem | null; // null = new item
  onClose: () => void;
}

const WishlistForm: React.FC<WishlistFormProps> = ({ item, onClose }) => {
  const dialogRef = useRef<HTMLFormElement>(null);
  // Like the record editor, Escape and backdrop clicks don't close the form, so typed
  // data is never lost by accident: only Cancel / Save do.
  useDialog(dialogRef, onClose, false);

  const [form, setForm] = useState({
    artist: item?.artist ?? '',
    album: item?.album ?? '',
    label: item?.label ?? '',
    catNumber: item?.catNumber ?? '',
    releaseYear: item?.releaseYear ? String(item.releaseYear) : '',
    priority: item?.priority ?? 'medium' as WishlistPriority,
    maxPrice: item?.maxPrice !== null && item?.maxPrice !== undefined ? String(item.maxPrice) : '',
    discogsLink: item?.discogsLink ?? '',
    notes: item?.notes ?? '',
  });
  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artist.trim() || !form.album.trim()) {
      notify('Artist and Album are required.', 'error');
      return;
    }
    if (form.maxPrice.trim() !== '' && parsePrice(form.maxPrice) === null) {
      notify('Max price must be a number, e.g. 25 or 19,99.', 'error');
      return;
    }
    const year = parseInt(form.releaseYear, 10);
    const data: WishlistItem = {
      artist: form.artist.trim(),
      album: form.album.trim(),
      label: form.label.trim(),
      catNumber: form.catNumber.trim(),
      releaseYear: Number.isInteger(year) && year > 0 ? year : null,
      priority: form.priority,
      maxPrice: parsePrice(form.maxPrice),
      discogsLink: form.discogsLink.trim(),
      notes: form.notes.trim(),
      addedAt: item?.addedAt ?? new Date(),
    };
    try {
      if (item?.id !== undefined) await db.wishlist.update(item.id, data);
      else await db.wishlist.add(data);
      onClose();
    } catch (error) {
      console.error('Failed to save wishlist item', error);
      notify('Error saving the wishlist item.', 'error');
    }
  };

  const inputClass = "w-full bg-paper border border-stone-300 rounded-sm px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-hidden transition-colors placeholder-stone-400";
  const labelClass = "text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-form-title"
        tabIndex={-1}
        className="bg-cream w-full max-w-2xl max-h-[92vh] rounded-lg shadow-2xl overflow-hidden flex flex-col border-4 border-[#78350f] outline-hidden"
      >
        <div className="bg-[#451a03] p-4 flex justify-between items-center border-b border-[#78350f] shrink-0">
          <h2 id="wishlist-form-title" className="text-xl font-serif font-bold text-amber-50 flex items-center gap-2">
            <Heart className="w-5 h-5 text-amber-500" />
            {item ? 'Edit wishlist item' : 'Add to wishlist'}
          </h2>
          <button type="button" onClick={onClose} title="Close" aria-label="Close" className="text-amber-200 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 bg-stone-50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label><span className={labelClass}>Artist *</span><input required value={form.artist} onChange={set('artist')} className={inputClass} /></label>
            <label><span className={labelClass}>Album *</span><input required value={form.album} onChange={set('album')} className={inputClass} /></label>
            <label><span className={labelClass}>Label</span><input value={form.label} onChange={set('label')} className={inputClass} /></label>
            <label><span className={labelClass}>Cat. Number</span><input value={form.catNumber} onChange={set('catNumber')} className={inputClass} /></label>
            <label><span className={labelClass}>Year</span><input inputMode="numeric" value={form.releaseYear} onChange={set('releaseYear')} placeholder="YYYY" className={inputClass} /></label>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className={labelClass}>Priority</span>
                <select value={form.priority} onChange={set('priority')} className={inputClass}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </label>
              <label><span className={labelClass}>Max price</span><input inputMode="decimal" value={form.maxPrice} onChange={set('maxPrice')} placeholder="No limit" className={inputClass} /></label>
            </div>
          </div>
          <label className="block"><span className={labelClass}>Discogs link</span><input value={form.discogsLink} onChange={set('discogsLink')} placeholder="https://www.discogs.com/..." className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Notes</span><textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Pressing, where you saw it, condition you'd accept..." className={inputClass} /></label>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-2.5 px-5 rounded-sm shadow-md flex items-center justify-center gap-2 transition-colors uppercase tracking-wider text-sm">
              <Save className="w-4 h-4" /> {item ? 'Update' : 'Add to wishlist'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-stone-300 text-stone-500 hover:text-stone-800 hover:border-stone-500 rounded-sm font-medium transition-colors uppercase tracking-wider text-sm">
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

interface WishlistViewProps {
  /** "Got it!": open the record form pre-filled with this item. */
  onAcquire: (item: WishlistItem) => void;
}

const WishlistView: React.FC<WishlistViewProps> = ({ onAcquire }) => {
  const items = useLiveQuery(() => db.wishlist.toArray());
  // undefined = form closed, null = adding a new item
  const [editing, setEditing] = useState<WishlistItem | null | undefined>(undefined);
  const closeForm = useCallback(() => setEditing(undefined), []);

  const handleDelete = async (item: WishlistItem) => {
    const confirmed = await confirmDialog(
      `"${item.album}" by ${item.artist} will be removed from your wishlist.`,
      { title: 'Remove from wishlist?', confirmLabel: 'Remove', danger: true }
    );
    if (confirmed && item.id !== undefined) await db.wishlist.delete(item.id);
  };

  if (!items) return <div className="p-12 text-center text-stone-500 font-serif italic text-lg">Reading the wishlist...</div>;

  const sorted = sortWishlist(items);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-paper p-5 rounded-lg border border-[#78350f] shadow-md flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-stone-100 rounded-full border border-stone-200 flex items-center justify-center">
            <Heart className="text-accent w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 font-serif">Wishlist</h1>
            <p className="text-sm text-stone-500 uppercase tracking-widest font-semibold">
              {items.length} record{items.length === 1 ? '' : 's'} to hunt
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold uppercase tracking-wider shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" /> Add to wishlist
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400 text-center">
          <Heart className="w-16 h-16 mb-4 opacity-20 text-stone-900" />
          <p className="text-2xl font-serif text-stone-500 italic">Nothing on your wishlist yet.</p>
          <p className="text-sm mt-2 max-w-md">Add the records you're hunting for. They stay apart from your collection and its statistics until you get them.</p>
        </div>
      ) : (
        <ul className="space-y-3 pb-12">
          {sorted.map(item => {
            const link = sanitizeExternalLink(item.discogsLink);
            const details = [item.label, item.catNumber, item.releaseYear].filter(Boolean).join(' · ');
            return (
              <li key={item.id} className="relative bg-paper rounded-lg border border-stone-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden">
                <div className={`absolute inset-y-0 left-0 w-1.5 ${priorityStyles[item.priority].bar}`} aria-hidden="true" />
                <div className="pl-6 pr-4 py-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h2 className="text-lg font-serif font-bold text-stone-900 leading-tight">{item.album}</h2>
                      <span className="text-accent font-medium">{item.artist}</span>
                    </div>
                    {details && <p className="text-sm text-stone-500 font-mono">{details}</p>}
                    {item.notes && <p className="text-sm text-stone-600 italic">{item.notes}</p>}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${priorityStyles[item.priority].badge}`}>
                        {PRIORITY_LABELS[item.priority]} priority
                      </span>
                      {item.maxPrice !== null && (
                        <span className="px-2 py-0.5 rounded-full border border-stone-200 bg-stone-50 text-[11px] font-bold text-stone-600">
                          Max {formatPrice(item.maxPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" title="View on Discogs" aria-label="View on Discogs"
                        className="p-2 rounded-sm text-stone-400 hover:text-amber-600 hover:bg-stone-100 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => setEditing(item)} title="Edit" aria-label={`Edit ${item.album}`}
                      className="p-2 rounded-sm text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item)} title="Remove" aria-label={`Remove ${item.album}`}
                      className="p-2 rounded-sm text-stone-400 hover:text-red-600 hover:bg-stone-100 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onAcquire(item)}
                      title="Add it to your collection"
                      className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
                    >
                      <PackageCheck className="w-4 h-4" /> Got it!
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing !== undefined && <WishlistForm item={editing} onClose={closeForm} />}
    </div>
  );
};

export default WishlistView;
