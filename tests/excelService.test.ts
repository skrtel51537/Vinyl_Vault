import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportCollectionToExcel, parseExcelFile } from '../services/excelService';
import { VinylRecord } from '../types';
import { makeRecord, makeWishlistItem } from './fixtures';

// Capture the workbook instead of triggering a download.
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});

afterEach(() => { vi.clearAllMocks(); });

const sheetFile = (rows: Record<string, unknown>[]) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Sheet1');
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new File([data], 'collection.xlsx');
};

describe('parseExcelFile', () => {
  it('maps the spreadsheet columns to records (and ignores the 1.5.0 "Moods" column)', async () => {
    const [r] = await parseExcelFile(sheetFile([{
      'Artist': 'Pink Floyd', 'Album': 'Animals', 'Genre': 'Rock; Prog', 'Collection': 'Main',
      'Release Year': 1977, 'Country': 'UK', 'Label': 'Harvest / EMI', 'Cat. Number': 'SHVL 815; 11EMI',
      'Condition Sleeve': 'VG', 'Condition Media': 'VG+', 'Sound Quality': 4, 'Rating': '9',
      'Best tracks': 'Dogs; Sheep', 'Others/Comments': 'Gatefold', 'Discogs link': 'https://www.discogs.com/r/1',
      'To be sold': 'yes', 'Moods': 'night; party; unknown',
    }]));

    expect(r).toMatchObject({
      artist: 'Pink Floyd', album: 'Animals', genre: ['Rock', 'Prog'], collection: 'Main', releaseYear: 1977,
      country: 'UK', label: ['Harvest', 'EMI'], catNumber: ['SHVL 815', '11EMI'], conditionSleeve: 'VG',
      conditionMedia: 'VG+', soundQuality: 4, rating: 9, bestTracks: ['Dogs', 'Sheep'], comments: 'Gatefold',
      discogsLink: 'https://www.discogs.com/r/1', toBeSold: true,
    });
    expect(r).not.toHaveProperty('moods');
    expect(r.addedAt).toBeInstanceOf(Date);
  });

  it('fills defaults for empty cells and skips rows without artist and album', async () => {
    const records = await parseExcelFile(sheetFile([
      { 'Artist': 'Only Artist', 'Album': '', 'Release Year': 'unknown', 'To be sold': 'NO' },
      { 'Artist': '', 'Album': '', 'Others/Comments': 'blank row' },
    ]));

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      artist: 'Only Artist', album: 'Unknown Album', genre: [], releaseYear: null, country: '-',
      rating: 0, soundQuality: 0, toBeSold: false,
    });
  });

  it('rejects a file that is not a spreadsheet', async () => {
    await expect(parseExcelFile(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff])], 'bad.xlsx'))).rejects.toThrow();
  });
});

describe('exportCollectionToExcel', () => {
  it('writes the collection in a format parseExcelFile reads back', async () => {
    const original = [
      makeRecord({ album: 'A', genre: ['Rock', 'Pop'], label: ['EMI', 'Harvest'], toBeSold: true }),
      makeRecord({ album: 'B', releaseYear: null, bestTracks: [] }),
    ];

    await exportCollectionToExcel(original);

    expect(XLSX.writeFile).toHaveBeenCalledOnce();
    const [workbook, fileName] = vi.mocked(XLSX.writeFile).mock.calls[0];
    expect(fileName).toMatch(/^Vinyl_Collection_Backup_\d{4}-\d{2}-\d{2}\.xlsx$/);

    const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(new File([data], 'roundtrip.xlsx'));
    // The Excel file holds metadata only: no id, cover, color or date added.
    const metadata = ({ id: _id, addedAt: _addedAt, coverUrl: _cover, dominantColor: _color, ...rest }: VinylRecord) => rest;
    expect(parsed.map(metadata)).toEqual(original.map(metadata));
    expect(workbook.SheetNames).toEqual(['Collection', 'Summary']);
    expect(Object.keys(XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Collection'])[0])).not.toContain('Moods');
  });

  it('adds column widths, a filter and a summary sheet', async () => {
    await exportCollectionToExcel([
      makeRecord({ genre: ['Rock', 'Stoner'], releaseYear: 1994, rating: 8, toBeSold: true }),
      makeRecord({ genre: ['Stoner', 'Blues'], releaseYear: 1971, rating: 0 }),
      makeRecord({ genre: ['Stoner'], releaseYear: 1975, rating: 6 }),
    ]);

    const [workbook] = vi.mocked(XLSX.writeFile).mock.calls[0];
    const collection = workbook.Sheets['Collection'];
    expect(collection['!autofilter']).toEqual({ ref: collection['!ref'] });
    expect(collection['!cols']?.[0]).toEqual({ wch: 'Miles Davis'.length + 2 });

    const summary = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Summary'], { header: 1, blankrows: false });
    expect(summary).toEqual([
      ['Records', 3], ['For sale', 1], ['Average rating (/10)', 7],
      ['Genre (without Rock)', 'Records'], ['Stoner', 3], ['Blues', 1],
      ['Decade', 'Records'], ['1970s', 2], ['1990s', 1],
    ]);
  });

  it('adds the wishlist on its own sheet, which import ignores', async () => {
    const wishes = [
      makeWishlistItem({ album: 'Low one', priority: 'low', maxPrice: null }),
      makeWishlistItem({ album: 'Top one', priority: 'high', maxPrice: 19.99 }),
    ];
    await exportCollectionToExcel([makeRecord()], wishes);

    const [workbook] = vi.mocked(XLSX.writeFile).mock.calls[0];
    expect(workbook.SheetNames).toEqual(['Collection', 'Summary', 'Wishlist']);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Wishlist']);
    expect(rows.map(r => r['Album'])).toEqual(['Top one', 'Low one']);
    expect(rows[0]).toMatchObject({ 'Artist': 'John Coltrane', 'Priority': 'High', 'Max price': 19.99, 'Added': '2025-02-01' });

    const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const parsed = await parseExcelFile(new File([data], 'roundtrip.xlsx'));
    expect(parsed.map(r => r.album)).toEqual(['Kind of Blue']);
  });
});
