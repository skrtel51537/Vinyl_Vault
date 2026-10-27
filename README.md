# Vinyl Vault

A personal vinyl collection manager that runs entirely in your browser. Import your
collection from Excel or from the CSV files Discogs exports, browse it as a grid or a
table, search and filter it, see statistics, and fetch album covers automatically.

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
Others/Comments, Discogs link, To be sold. List columns (Genre, Label, Cat. Number,
Best tracks) use `;` as separator. The "Moods" column of files made with 1.5.0 is
ignored. Records already in the collection (same artist and album) are skipped.

## Importing from Discogs

On Discogs, export your collection and/or your wantlist (CSV). Then, on the
**Import** page, use **Discogs collection** or **Discogs wantlist**: each one only
accepts its own export. Use the `.csv` file as downloaded, without opening and saving
it in Excel first. The app reads the file only; it never connects to Discogs.

A preview shows what will be added before anything is saved. Records already saved
(same Discogs release, or same artist and album when there is no link) are left
untouched, and formats that are not vinyl (CD, cassette, file…) are skipped.
Wantlist items go to the wishlist, except those you already have.

What changes on the way in:
- Discogs does not export genres or countries: add them from each record's page.
- The " (2)", " (3)"… Discogs adds to some artist and label names is removed.
- Labels and catalog numbers are kept as two lists (Discogs does not keep them paired).
- Star ratings (1–5) become ratings out of 10; condition grades become M, NM, VG+…
- The Discogs folder becomes the record's collection; notes and custom fields go to
  the comments.

## Backup and restore

Because everything lives in the browser, clearing the browser's site data deletes
the collection. Make backups regularly:

- **Full Backup** (Import page) downloads two files:
  - a `.json` file with everything, including cover images and the wishlist: this is
    the one to restore from;
  - an `.xlsx` file with the metadata only, handy to read or edit in Excel, with a
    "Summary" sheet (totals, records per genre and decade) and the wishlist on a
    separate "Wishlist" sheet. It can be imported again.
- **Export Discogs CSV** (Import page) downloads the collection with the columns of
  the Discogs collection export. It only has what Discogs has a column for (no genre,
  country, sound quality, best tracks, "for sale", covers or wishlist), so it is not
  a backup.
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
