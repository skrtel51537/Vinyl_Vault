# Vinyl Vault

A personal vinyl collection manager that runs entirely in your browser. Import your
collection from Excel, browse it as a grid or a table, search and filter it, see
statistics, and fetch album covers automatically.

- **What should I play tonight?** (sparkles button in the collection): pick a mood
  (Relax, Energy, Night, Party, Melancholy or "Surprise me"), optionally a decade and
  "favorites only", and get one record. Higher-rated records come up more often and
  recent suggestions are not repeated. Moods can be set by hand in each record; when
  a record has none, they are guessed from its genre and decade.
- **Wishlist**: the records you are hunting for, with priority and maximum price.
  It is kept apart from the collection and its statistics. "Got it!" moves an item
  into the collection with its details pre-filled.
- **Light and dark themes**: follows the system setting by default; the button in the
  top bar (or on the home screen) switches between system, light and the dark
  "listening room" theme.

**Your data stays on your computer.** The collection is stored in the browser's
IndexedDB for the address you open the app on (e.g. `http://localhost:3000`). There
is no account, server or cloud sync. The only network requests go to the iTunes
Search API, to look up album covers.

## Requirements

- [Node.js](https://nodejs.org/) 24 (includes npm)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm test` | Run the automated tests (Vitest) |
| `npm run typecheck` | Check TypeScript types |

Note: `preview` serves on a different port than `dev`, and browsers keep a separate
database per port. A collection added on port 3000 will not appear on port 4173.
Use a backup to move it between them.

## Importing from Excel

Go to **Import** and drop an `.xlsx` file. The first sheet is read, with these
columns: Artist, Album, Genre, Collection, Release Year, Country, Label, Cat. Number,
Condition Sleeve, Condition Media, Sound Quality, Rating, Best tracks,
Others/Comments, Discogs link, To be sold, and optionally Moods.
List columns (Genre, Label, Cat. Number, Best tracks, Moods) use `;` as separator.

## Backup and restore

Because everything lives in the browser, clearing the browser's site data deletes
the collection. Make backups regularly:

- **Full Backup** (Import page) downloads two files:
  - a `.json` file with everything, including cover images and the wishlist: this is
    the one to restore from;
  - an `.xlsx` file with the metadata only, handy to read or edit in Excel (the
    wishlist is on a separate "Wishlist" sheet).
- **Restore Backup** loads a `.json` backup and **replaces** the current collection
  (and the wishlist, if the backup has one: backups made before 1.5.0 don't, so the
  current wishlist is kept). The replacement is all-or-nothing: if anything fails,
  the current data is left untouched.

## Versioning

The version shown in the app comes from `package.json`, so a release only needs
`version` bumped there.

## Tech stack

React 19, Vite, Tailwind CSS 4, Dexie (IndexedDB), SheetJS (Excel), Recharts.
Production builds ship a strict Content Security Policy and self-hosted fonts.
