export interface ITunesResult {
    artworkUrl100: string;
    artistName: string;
    collectionName: string;
}

export const findAlbumCover = async (artist: string, album: string): Promise<string | null> => {
    try {
        const term = encodeURIComponent(`${artist} ${album}`);
        const url = `https://itunes.apple.com/search?term=${term}&entity=album&limit=1`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.resultCount > 0 && data.results[0].artworkUrl100) {
            // The API returns 100x100 by default. Replace with a higher resolution (600x600).
            const lowResUrl: string = data.results[0].artworkUrl100;
            return lowResUrl.replace('100x100bb', '600x600bb');
        }

        return null;
    } catch (error) {
        console.error("Error fetching from iTunes:", error);
        return null;
    }
};
