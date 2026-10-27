import { VinylRecord, WishlistItem } from '../types';
import { PRIORITY_LABELS, sortWishlist } from './wishlist';

// xlsx is ~420 KB minified and only needed for Excel import/export, so it is loaded
// on demand (its own chunk) instead of being part of the initial bundle.
const loadXlsx = () => import('xlsx');

// Helper to split strings by delimiters like ";" or "/"
// Updated to handle non-string inputs (like numbers) by casting them first.
const splitAndTrim = (text: any, delimiters: string[] = [';', '/']): string[] => {
  if (text === undefined || text === null) return [];
  const str = String(text);
  if (!str.trim()) return [];

  let result = [str];
  delimiters.forEach(delimiter => {
    result = result.flatMap(item => item.split(delimiter));
  });
  return result.map(item => item.trim()).filter(item => item.length > 0);
};

const parseYesNo = (val: any): boolean => {
  if (!val) return false;
  const str = String(val).toUpperCase().trim();
  return str === 'YES';
};

export const parseExcelFile = async (file: File): Promise<VinylRecord[]> => {
  const XLSX = await loadXlsx();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // The user stated headers start at B1.
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: "", // Default value for empty cells
        });

        const records: VinylRecord[] = jsonData.map((row: any) => {
          const getVal = (keyPart: string) => {
            const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
            return key ? row[key] : undefined;
          };
          // A "Moods" column (exported by 1.5.0) is simply ignored.
          return {
            artist: String(getVal('Artist') || 'Unknown Artist'),
            album: String(getVal('Album') || 'Unknown Album'),
            genre: splitAndTrim(getVal('Genre'), [';']),
            collection: String(getVal('Collection') || ''),
            releaseYear: parseInt(getVal('Release Year')) || null,
            country: String(getVal('Country') || '-'),
            label: splitAndTrim(getVal('Label'), [';', '/']),
            catNumber: splitAndTrim(getVal('Cat. Number'), [';']),
            conditionSleeve: String(getVal('Condition Sleeve') || ''),
            conditionMedia: String(getVal('Condition Media') || ''),
            soundQuality: parseInt(getVal('Sound Quality')) || 0,
            rating: parseInt(getVal('Rating')) || 0,
            bestTracks: splitAndTrim(getVal('Best tracks'), [';']),
            comments: String(getVal('Others/Comments') || ''),
            discogsLink: String(getVal('Discogs link') || ''),
            toBeSold: parseYesNo(getVal('To be sold')),
            addedAt: new Date(),
          };
        });

        const validRecords = records.filter(r => r.artist !== 'Unknown Artist' || r.album !== 'Unknown Album');
        resolve(validRecords);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const exportCollectionToExcel = async (records: VinylRecord[], wishlist: WishlistItem[] = []): Promise<void> => {
  const XLSX = await loadXlsx();
  // Map internal data back to the User's Excel columns
  const excelRows = records.map(r => ({
    'Artist': r.artist,
    'Album': r.album,
    'Genre': r.genre.join('; '),
    'Collection': r.collection,
    'Release Year': r.releaseYear,
    'Country': r.country,
    'Label': r.label.join('; '),
    'Cat. Number': r.catNumber.join('; '),
    'Condition Sleeve': r.conditionSleeve,
    'Condition Media': r.conditionMedia,
    'Sound Quality': r.soundQuality,
    'Rating': r.rating,
    'Best tracks': r.bestTracks.join('; '),
    'Others/Comments': r.comments,
    'Discogs link': r.discogsLink,
    'To be sold': r.toBeSold ? 'YES' : 'NO',
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Collection");

  // The wishlist goes on its own sheet. Import only reads the first sheet, so it
  // never ends up in the collection.
  if (wishlist.length > 0) {
    const wishlistRows = sortWishlist(wishlist).map(w => ({
      'Artist': w.artist,
      'Album': w.album,
      'Label': w.label,
      'Cat. Number': w.catNumber,
      'Release Year': w.releaseYear,
      'Priority': PRIORITY_LABELS[w.priority],
      'Max price': w.maxPrice,
      'Notes': w.notes,
      'Discogs link': w.discogsLink,
      'Added': new Date(w.addedAt).toISOString().split('T')[0],
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(wishlistRows), "Wishlist");
  }

  // Generate file name with date
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Vinyl_Collection_Backup_${dateStr}.xlsx`);
};