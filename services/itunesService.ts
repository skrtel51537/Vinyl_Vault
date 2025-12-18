/**
 * Simple JSONP implementation to bypass CORS when using iTunes API in the browser.
 */
const jsonp = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const callbackName = 'itunes_callback_' + Math.round(100000 * Math.random());
        const script = document.createElement('script');

        // Define global callback
        (window as any)[callbackName] = (data: any) => {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };

        // Handle errors
        script.onerror = () => {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };

        // Construct URL
        const connector = url.includes('?') ? '&' : '?';
        script.src = `${url}${connector}callback=${callbackName}`;
        document.body.appendChild(script);
    });
};

export interface ITunesResult {
    artworkUrl100: string;
    artistName: string;
    collectionName: string;
}

export const findAlbumCover = async (artist: string, album: string): Promise<string | null> => {
    try {
        const term = encodeURIComponent(`${artist} ${album}`);
        // We limit to 1 result, entity album.
        const url = `https://itunes.apple.com/search?term=${term}&entity=album&limit=1`;

        const data = await jsonp(url);

        if (data.resultCount > 0 && data.results[0].artworkUrl100) {
            // The API returns 100x100 by default. We can hack the URL to get a higher resolution (e.g., 600x600).
            const lowResUrl = data.results[0].artworkUrl100;
            return lowResUrl.replace('100x100bb', '600x600bb');
        }

        return null;
    } catch (error) {
        console.error("Error fetching from iTunes:", error);
        return null;
    }
};
