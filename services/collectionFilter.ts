import { FilterState, VinylRecord } from '../types';

export type SortOption =
    | 'added_desc'
    | 'artist_asc' | 'artist_desc'
    | 'year_asc' | 'year_desc'
    | 'rating_desc' | 'rating_asc'
    | 'sound_desc' | 'sound_asc';

/**
 * Apply the collection view's search, filters and sort order. Returns a new array;
 * the input is not modified. Sorting by rating or sound quality also hides records
 * that have no value for it (0), so unrated records don't crowd the list.
 */
export const filterAndSortVinyls = (
    records: VinylRecord[],
    filters: FilterState,
    sortOption: SortOption,
): VinylRecord[] => {
    const searchLower = filters.search.toLowerCase();

    // 1. Filter
    let filtered = records.filter(record => {
        const matchesSearch =
            String(record.album || '').toLowerCase().includes(searchLower) ||
            String(record.artist || '').toLowerCase().includes(searchLower) ||
            record.label.some(l => String(l).toLowerCase().includes(searchLower)) ||
            record.genre.some(g => String(g).toLowerCase().includes(searchLower)) ||
            String(record.releaseYear || '').includes(searchLower) ||
            record.bestTracks.some(t => String(t).toLowerCase().includes(searchLower));

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
};
