import React, { useState } from 'react';
import { VinylRecord } from '../types';
import { db } from '../services/db';
import { Save, X, PlusCircle, Edit, Upload, Image } from 'lucide-react';

interface AddVinylFormProps {
  onCancel: () => void;
  onSave: () => void;
  initialValues?: VinylRecord; // Optional: if provided, we are in Edit mode
  embedded?: boolean; // Optional: removes outer container styling for modal use
}

const AddVinylForm: React.FC<AddVinylFormProps> = ({ onCancel, onSave, initialValues, embedded = false }) => {
  const [formData, setFormData] = useState<Partial<VinylRecord>>(initialValues || {
    artist: '',
    album: '',
    genre: [],
    collection: 'Main',
    releaseYear: new Date().getFullYear(),
    country: '',
    label: [],
    catNumber: [],
    conditionSleeve: 'VG+',
    conditionMedia: 'VG+',
    soundQuality: 5,
    rating: 0,
    bestTracks: [],
    comments: '',
    discogsLink: '',
    coverUrl: '',
    toBeSold: false,
  });

  // Initialize string states from arrays if in edit mode
  const [genreStr, setGenreStr] = useState(initialValues?.genre?.join('; ') || '');
  const [labelStr, setLabelStr] = useState(initialValues?.label?.join('; ') || '');
  const [catStr, setCatStr] = useState(initialValues?.catNumber?.join('; ') || '');
  const [tracksStr, setTracksStr] = useState(initialValues?.bestTracks?.join('; ') || '');
  const [releaseYearStr, setReleaseYearStr] = useState(
    initialValues?.releaseYear !== undefined
      ? (initialValues.releaseYear === null ? '-' : initialValues.releaseYear.toString())
      : new Date().getFullYear().toString()
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else if (name === 'rating' || name === 'soundQuality') {
      // Handle select for numbers
      setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, coverUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.artist || !formData.album) {
      alert("Artist and Album are required.");
      return;
    }

    const recordData: VinylRecord = {
      // Preserve ID and addedAt if editing, otherwise create new
      ...(initialValues || {}),
      id: initialValues?.id,
      addedAt: initialValues?.addedAt || new Date(),

      // Form values
      artist: formData.artist!,
      album: formData.album!,
      genre: genreStr.split(';').map(s => s.trim()).filter(Boolean),
      collection: formData.collection || '',
      releaseYear: (releaseYearStr === '-' || releaseYearStr.trim() === '') ? null : parseInt(releaseYearStr),
      country: formData.country || '-',
      label: labelStr.split(';').map(s => s.trim()).filter(Boolean),
      catNumber: catStr.split(';').map(s => s.trim()).filter(Boolean),
      conditionSleeve: formData.conditionSleeve || '',
      conditionMedia: formData.conditionMedia || '',
      soundQuality: formData.soundQuality || 0,
      rating: formData.rating || 0,
      bestTracks: tracksStr.split(';').map(s => s.trim()).filter(Boolean),
      comments: formData.comments || '',
      discogsLink: formData.discogsLink || '',
      toBeSold: formData.toBeSold || false,
      coverUrl: formData.coverUrl,
    } as VinylRecord;

    try {
      if (initialValues?.id) {
        await db.vinyls.update(initialValues.id, recordData as any);
      } else {
        await db.vinyls.add(recordData);
      }
      onSave();
    } catch (error) {
      console.error("Failed to save record", error);
      alert("Error saving record.");
    }
  };

  const inputClass = "w-full bg-white border border-stone-300 rounded px-4 py-2.5 text-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-colors placeholder-stone-400";
  const labelClass = "text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 block";

  const Container = embedded ? React.Fragment : 'div';
  const containerProps = embedded ? {} : { className: "max-w-4xl mx-auto p-6 pb-24 animate-fade-in-up" };
  const cardClass = embedded ? "" : "bg-[#fcfaf9] border border-stone-200 rounded-xl p-8 shadow-2xl relative overflow-hidden";

  return (
    <Container {...containerProps}>
      <div className={cardClass}>
        {!embedded && (
          <div className="absolute top-0 left-0 w-full h-2 bg-amber-800"></div>
        )}

        <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-4 mt-2">
          <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3">
            {initialValues ? <Edit className="text-amber-700" /> : <PlusCircle className="text-amber-700" />}
            {initialValues ? 'Edit Record' : 'New Entry'}
          </h2>
          {!embedded && (
            <button onClick={onCancel} className="text-stone-400 hover:text-stone-700 transition-colors">
              <X className="w-8 h-8" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Artist *</label>
                <input name="artist" required value={formData.artist} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Album *</label>
                <input name="album" required value={formData.album} onChange={handleChange} className={inputClass} />
              </div>

              {/* Manual Cover Upload for New/Edit */}
              <div className="bg-stone-50 p-4 rounded border border-stone-200">
                <label className={labelClass}>Cover Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-stone-200 rounded border border-stone-300 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.coverUrl ? (
                      <img src={formData.coverUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="text-stone-400 w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white border border-stone-300 rounded text-sm font-bold text-stone-600 hover:bg-stone-50 hover:border-amber-500 transition-colors">
                      <Upload className="w-4 h-4" />
                      Upload File
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-stone-400 mt-1">Accepts JPG, PNG, GIF</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Collection</label>
                <input name="collection" value={formData.collection} onChange={handleChange} placeholder="Main" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Year</label>
                  <input type="text" name="releaseYear" value={releaseYearStr} onChange={(e) => setReleaseYearStr(e.target.value)} className={inputClass} placeholder="YYYY or -" />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input name="country" value={formData.country} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-stone-100" />

          {/* Arrays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Genre (split with ;)</label>
              <input value={genreStr} onChange={e => setGenreStr(e.target.value)} placeholder="Rock; Jazz" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Label (split with ;)</label>
              <input value={labelStr} onChange={e => setLabelStr(e.target.value)} placeholder="Blue Note" className={inputClass} />
            </div>
          </div>

          {/* Conditions Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-5 bg-amber-50/50 rounded border border-amber-100">
            <div>
              <label className={labelClass}>Sleeve</label>
              <select name="conditionSleeve" value={formData.conditionSleeve} onChange={handleChange} className={inputClass}>
                {['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Media</label>
              <select name="conditionMedia" value={formData.conditionMedia} onChange={handleChange} className={inputClass}>
                {['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Sound (/5)</label>
              <select name="soundQuality" value={formData.soundQuality || ''} onChange={handleChange} className={inputClass}>
                <option value="">-</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rating (/10)</label>
              <select name="rating" value={formData.rating || ''} onChange={handleChange} className={inputClass}>
                <option value="">-</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Details */}
          <div>
            <label className={labelClass}>Best Tracks (split with ;)</label>
            <input value={tracksStr} onChange={e => setTracksStr(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Cat. Number</label>
              <input value={catStr} onChange={e => setCatStr(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Discogs Link</label>
              <input name="discogsLink" value={formData.discogsLink} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Comments</label>
            <textarea name="comments" rows={3} value={formData.comments} onChange={handleChange} className={inputClass} />
          </div>

          <div className="flex items-center gap-3 p-4 border border-stone-200 rounded bg-stone-50 w-max">
            <input type="checkbox" id="toBeSold" name="toBeSold" checked={formData.toBeSold} onChange={handleChange} className="w-5 h-5 accent-amber-600 rounded cursor-pointer" />
            <label htmlFor="toBeSold" className="text-stone-700 font-bold cursor-pointer text-sm">Mark for Sale</label>
          </div>

          <div className="flex gap-4 pt-6 border-t border-stone-200 mt-6">
            <button type="submit" className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 px-6 rounded shadow-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm">
              <Save className="w-5 h-5" />
              {initialValues ? 'Update Record' : 'Save to Shelf'}
            </button>
            <button type="button" onClick={onCancel} className="px-6 py-3 border border-stone-300 text-stone-500 hover:text-stone-800 hover:border-stone-500 rounded font-medium transition-all uppercase tracking-wider text-sm">
              Cancel
            </button>
          </div>

        </form>
      </div>
    </Container>
  );
};

export default AddVinylForm;