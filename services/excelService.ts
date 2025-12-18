import * as XLSX from 'xlsx';
import { VinylRecord } from '../types';

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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
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
    reader.readAsBinaryString(file);
  });
};

export const exportCollectionToExcel = (records: VinylRecord[]) => {
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
    'To be sold': r.toBeSold ? 'YES' : 'NO'
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Collection");
  
  // Generate file name with date
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Vinyl_Collection_Backup_${dateStr}.xlsx`);
};