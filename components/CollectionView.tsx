import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import VinylCard from './VinylCard';
import VinylDetailModal from './VinylDetailModal';
import { FilterState, VinylRecord } from '../types';
import { exportCollectionToExcel } from '../services/excelService';
import { Search, Filter, Music, Download, Disc, ArrowUpDown, Check, ImagePlus, Loader2 } from 'lucide-react';
import { findAlbumCover } from '../services/itunesService';

type SortOption =
    | 'added_desc'
    | 'artist_asc' | 'artist_desc'
    | 'year_asc' | 'year_desc'
    | 'rating_desc' | 'rating_asc'
    | 'sound_desc' | 'sound_asc';

const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'added_desc', label: 'Recently Added' },
    { id: 'artist_asc', label: 'Artist (A-Z)' },
    { id: 'artist_desc', label: 'Artist (Z-A)' },
    { id: 'year_asc', label: 'Release Year (Oldest)' },
    { id: 'year_desc', label: 'Release Year (Newest)' },
    { id: 'rating_desc', label: 'Rating (High to Low)' },
    { id: 'rating_asc', label: 'Rating (Low to High)' },
    { id: 'sound_desc', label: 'Sound Quality (High to Low)' },
    { id: 'sound_asc', label: 'Sound Quality (Low to High)' },
];

const CollectionView: React.FC = () => {
    const allVinyls = useLiveQuery(() => db.vinyls.toArray());
    const [showFilters, setShowFilters] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('added_desc');
    const [selectedRecord, setSelectedRecord] = useState<VinylRecord | null>(null);

    const [filters, setFilters] = useState<FilterState>({
        search: '',
        genre: null,
        artist: null,
        collection: null,
        releaseYear: null,
        conditionSleeve: null,
        conditionMedia: null,
        toBeSold: null,
    });

    // Extract unique values for filters
    const { uniqueGenres, uniqueArtists, uniqueCollections, uniqueYears, uniqueSleeveConditions, uniqueMediaConditions } = useMemo(() => {
        if (!allVinyls) return {
            uniqueGenres: [],
            uniqueArtists: [],
            uniqueCollections: [],
            uniqueYears: [],
            uniqueSleeveConditions: [],
            uniqueMediaConditions: []
        };

        const genreSet = new Set<string>();
        const artistSet = new Set<string>();
        const collectionSet = new Set<string>();
        const yearSet = new Set<number>();
        const sleeveSet = new Set<string>();
        const mediaSet = new Set<string>();

        allVinyls.forEach(v => {
            v.genre.forEach(g => genreSet.add(g));
            if (v.artist) artistSet.add(v.artist);
            if (v.collection) collectionSet.add(v.collection);
            if (v.releaseYear) yearSet.add(v.releaseYear);
            if (v.conditionSleeve) sleeveSet.add(v.conditionSleeve);
            if (v.conditionMedia) mediaSet.add(v.conditionMedia);
        });

        return {
            uniqueGenres: Array.from(genreSet).sort(),
            uniqueArtists: Array.from(artistSet).sort(),
            uniqueCollections: Array.from(collectionSet).sort(),
            uniqueYears: Array.from(yearSet).sort((a, b) => b - a),
            uniqueSleeveConditions: Array.from(sleeveSet).sort(),
            uniqueMediaConditions: Array.from(mediaSet).sort(),
        };
    }, [allVinyls]);

    // Filter AND Sort Logic
    const processedVinyls = useMemo(() => {
        if (!allVinyls) return [];

        // 1. Filter
        let filtered = allVinyls.filter(record => {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch =
                String(record.album || '').toLowerCase().includes(searchLower) ||
                String(record.artist || '').toLowerCase().includes(searchLower) ||
                record.label.some(l => String(l).toLowerCase().includes(searchLower));

            const matchesGenre = filters.genre ? record.genre.includes(filters.genre) : true;
            const matchesArtist = filters.artist ? record.artist === filters.artist : true;
            const matchesCollection = filters.collection ? record.collection === filters.collection : true;
            const matchesYear = filters.releaseYear ? record.releaseYear === filters.releaseYear : true;
            const matchesSleeve = filters.conditionSleeve ? record.conditionSleeve === filters.conditionSleeve : true;
            const matchesMedia = filters.conditionMedia ? record.conditionMedia === filters.conditionMedia : true;
            const matchesSold = filters.toBeSold === null ? true : record.toBeSold === filters.toBeSold;

            return matchesSearch && matchesGenre && matchesArtist && matchesCollection && matchesYear && matchesSleeve && matchesMedia && matchesSold;
        });

        // 1.5 Special Filter for Rating/Sound Sorts
        // If sorting by rating or sound, exclude items with 0/null values
        if (sortOption.startsWith('rating_')) {
            filtered = filtered.filter(v => (v.rating || 0) > 0);
        } else if (sortOption.startsWith('sound_')) {
            filtered = filtered.filter(v => (v.soundQuality || 0) > 0);
        }


        // 2. Sort
        return filtered.sort((a, b) => {
            switch (sortOption) {
                case 'artist_asc':
                    return a.artist.localeCompare(b.artist);
                case 'artist_desc':
                    return b.artist.localeCompare(a.artist);
                case 'year_asc':
                    return (a.releaseYear || 9999) - (b.releaseYear || 9999);
                case 'year_desc':
                    return (b.releaseYear || 0) - (a.releaseYear || 0);
                case 'rating_desc':
                    return (b.rating || 0) - (a.rating || 0);
                case 'rating_asc':
                    return (a.rating || 0) - (b.rating || 0);
                case 'sound_desc':
                    return (b.soundQuality || 0) - (a.soundQuality || 0);
                case 'sound_asc':
                    return (a.soundQuality || 0) - (b.soundQuality || 0);
                case 'added_desc':
                default:
                    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
            }
        });

    }, [allVinyls, filters, sortOption]);

    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState("");

    const scanCollection = async () => {
        if (!allVinyls) return;

        // Find records without cover
        const missingCovers = allVinyls.filter(v => !v.coverUrl);

        if (missingCovers.length === 0) {
            alert("All records already have covers!");
            return;
        }

        if (!window.confirm(`Found ${missingCovers.length} records without covers. Scan for them now? This may take some time.`)) {
            return;
        }

        setIsScanning(true);
        let foundCount = 0;

        try {
            for (let i = 0; i < missingCovers.length; i++) {
                const record = missingCovers[i];
                setScanProgress(`Scanning ${i + 1}/${missingCovers.length}...`);

                try {
                    // Rate limiting delay (1s) to be safe
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const url = await findAlbumCover(record.artist, record.album);
                    if (url) {
                        await db.vinyls.update(record.id!, { coverUrl: url });
                        foundCount++;
                    }
                } catch (err) {
                    console.error(`Error scanning ${record.album}:`, err);
                }
            }
            alert(`Scan complete! Found covers for ${foundCount} of ${missingCovers.length} records.`);
        } catch (error) {
            console.error("Scan failed:", error);
            alert("Scan process was interrupted.");
        } finally {
            setIsScanning(false);
            setScanProgress("");
        }
    };

    const handleExport = () => {
        if (allVinyls) {
            exportCollectionToExcel(allVinyls);
        }
    };

    const activeInputClass = "bg-[#78350f] text-white border-[#78350f]";
    const inactiveInputClass = "bg-white border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-[#78350f]";

    if (!allVinyls) return <div className="p-12 text-center text-stone-500 font-serif italic text-lg">Dusting off the collection...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-[calc(100vh-100px)]" onClick={() => setShowSortMenu(false)}>

            {/* Search Header */}
            <div className="bg-white p-5 rounded-lg border border-[#78350f] shadow-md flex flex-col md:flex-row gap-6 items-center justify-between z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-stone-100 rounded-full border border-stone-200 flex items-center justify-center">
                        <Music className="text-[#78350f] w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800 font-serif">Shelf Browser</h1>
                        <p className="text-sm text-stone-500 uppercase tracking-widest font-semibold">{processedVinyls.length} Records</p>
                    </div>
                </div>

                <div className="flex-1 w-full md:max-w-xl flex gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-[#78350f] transition-colors" />
                        <input
                            type="text"
                            placeholder="Find in crate (artist, album...)"
                            className="w-full bg-stone-50 border border-stone-300 text-stone-800 pl-10 pr-4 py-3 rounded focus:outline-none focus:border-[#78350f] focus:ring-1 focus:ring-[#78350f]/20 transition-all placeholder-stone-400 text-sm font-medium"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>

                    {/* Sort Button & Dropdown */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); setShowFilters(false); }}
                            className={`p-3 rounded border transition-all ${showSortMenu ? activeInputClass : inactiveInputClass}`}
                            title="Sort Collection"
                        >
                            <ArrowUpDown className="w-5 h-5" />
                        </button>
                        {showSortMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#78350f] overflow-hidden z-50 animate-fade-in">
                                <div className="bg-[#451a03] px-4 py-2 text-xs font-bold text-amber-50 uppercase tracking-wider">
                                    Sort By
                                </div>
                                {sortOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSortOption(opt.id)}
                                        className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-100 flex items-center justify-between group"
                                    >
                                        <span className={sortOption === opt.id ? "font-bold text-[#78350f]" : ""}>{opt.label}</span>
                                        {sortOption === opt.id && <Check className="w-4 h-4 text-[#78350f]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); setShowSortMenu(false); }}
                        className={`p-3 rounded border transition-all ${showFilters ? activeInputClass : inactiveInputClass}`}
                        title="Filters"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExport}
                        className={`p-3 rounded border transition-all ${inactiveInputClass}`}
                        title="Export to Excel"
                    >
                        <Download className="w-5 h-5" />
                    </button>

                    <button
                        onClick={scanCollection}
                        disabled={isScanning}
                        className={`p-3 rounded border transition-all ${isScanning ? 'bg-amber-100 border-amber-300 text-amber-800' : inactiveInputClass}`}
                        title={isScanning ? scanProgress : "Scan Collection for Missing Art"}
                    >
                        {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Expanded Filters Panel */}
            {showFilters && (
                <div
                    className="bg-stone-100 border border-[#78350f] rounded-lg p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-down shadow-inner relative z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Artist Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Artist</label>
                        <select
                            className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#78350f]"
                            value={filters.artist || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, artist: e.target.value || null }))}
                        >
                            <option value="">All Artists</option>
                            {uniqueArtists.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    {/* Genre Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Genre</label>
                        <select
                            className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#78350f]"
                            value={filters.genre || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value || null }))}
                        >
                            <option value="">All Genres</option>
                            {uniqueGenres.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    {/* Release Year Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Release Year</label>
                        <select
                            className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#78350f]"
                            value={filters.releaseYear || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, releaseYear: e.target.value ? parseInt(e.target.value) : null }))}
                        >
                            <option value="">All Years</option>
                            {uniqueYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Collection Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Collection</label>
                        <select
                            className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#78350f]"
                            value={filters.collection || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, collection: e.target.value || null }))}
                        >
                            <option value="">All Collections</option>
                            {uniqueCollections.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Condition Filters */}
                    <div className="md:col-span-2 flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Sleeve Condition</label>
                            <select
                                className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#78350f]"
                                value={filters.conditionSleeve || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, conditionSleeve: e.target.value || null }))}
                            >
                                <option value="">Any</option>
                                {uniqueSleeveConditions.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Media Condition</label>
                            <select
                                className="w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-[#78350f]"
                                value={filters.conditionMedia || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, conditionMedia: e.target.value || null }))}
                            >
                                <option value="">Any</option>
                                {uniqueMediaConditions.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sale Status */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#78350f] uppercase tracking-wider">Status</label>
                        <div className="flex bg-white rounded border border-stone-300 p-0.5">
                            {[
                                { label: 'All', value: null },
                                { label: 'Keep', value: false },
                                { label: 'Sell', value: true }
                            ].map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => setFilters(prev => ({ ...prev, toBeSold: opt.value as any }))}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${filters.toBeSold === opt.value ? 'bg-[#78350f] text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-end justify-end">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFilters({ search: '', genre: null, artist: null, collection: null, releaseYear: null, conditionSleeve: null, conditionMedia: null, toBeSold: null })}
                                className="text-xs text-[#78350f] hover:text-[#451a03] hover:underline underline-offset-4 px-2 font-bold"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid - The Shelf */}
            {processedVinyls.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-12">
                    {processedVinyls.map((record) => (
                        <VinylCard
                            key={record.id}
                            record={record}
                            onClick={() => setSelectedRecord(record)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-stone-400">
                    <Disc className="w-20 h-20 mb-4 opacity-10 text-stone-900" />
                    <p className="text-2xl font-serif text-stone-500 italic">No records found on the shelf.</p>
                    <button
                        onClick={() => setFilters({ search: '', genre: null, artist: null, collection: null, releaseYear: null, conditionSleeve: null, conditionMedia: null, toBeSold: null })}
                        className="mt-6 text-[#78350f] hover:text-[#451a03] text-sm font-bold uppercase tracking-widest border-b-2 border-[#78350f]/30 hover:border-[#78350f] transition-all"
                    >
                        Clear Search
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedRecord && (
                <VinylDetailModal
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                />
            )}
        </div>
    );
};

export default CollectionView;