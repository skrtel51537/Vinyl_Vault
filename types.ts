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
  addedAt: Date;
}

export type WishlistPriority = 'high' | 'medium' | 'low';

/** A record the user wants to buy. Kept apart from the collection and its statistics. */
export interface WishlistItem {
  id?: number; // Auto-incremented by Dexie
  artist: string;
  album: string;
  label: string;
  catNumber: string;
  releaseYear: number | null;
  discogsLink: string;
  notes: string;
  priority: WishlistPriority;
  maxPrice: number | null; // In the user's currency; null = no limit
  addedAt: Date;
}

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