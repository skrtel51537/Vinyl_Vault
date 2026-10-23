export interface VinylRecord {
  id?: number; // Auto-incremented by Dexie
  artist: string;
  album: string;
  genre: string[];
  collection: string;
  releaseYear: number | null;
  country: string;
  label: string[];
  catNumber: string[];
  conditionSleeve: string;
  conditionMedia: string;
  soundQuality: number; // 1-5
  rating: number; // 1-10
  bestTracks: string[];
  comments: string;
  discogsLink: string;
  toBeSold: boolean;
  coverUrl?: string; // Optional field for the fetched cover
  dominantColor?: string; // Extracted color from cover
  moods?: Mood[]; // Set by hand; when absent, moods are guessed from genre/decade
  addedAt: Date;
}

export type Mood = 'Relax' | 'Energy' | 'Night' | 'Party' | 'Melancholy';

export enum ViewMode {
  GRID = 'GRID',
  TABLE = 'TABLE',
}

export interface FilterState {
  search: string;
  genre: string | null;
  artist: string | null;
  collection: string | null;
  releaseYear: number | null; // Added field
  conditionSleeve: string | null;
  conditionMedia: string | null;
  toBeSold: boolean | null; // null = show all
}