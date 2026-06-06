/**
 * Extracts an approximate dominant color from an image URL.
 *
 * Loads the image with CORS enabled, draws it onto a tiny canvas and
 * averages the (non-transparent) pixels. Returns an `rgb(...)` string,
 * or undefined if the image can't be read (e.g. a CORS-tainted canvas,
 * a load error, or no canvas support). Always safe: never throws.
 */
export const extractDominantColor = (url: string): Promise<string | undefined> => {
    return new Promise((resolve) => {
        if (!url) {
            resolve(undefined);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const size = 12; // downscale to a tiny canvas for speed
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(undefined);
                    return;
                }

                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);

                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha < 125) continue; // skip transparent pixels
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }

                if (count === 0) {
                    resolve(undefined);
                    return;
                }

                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch {
                // Tainted canvas or any other failure: degrade gracefully.
                resolve(undefined);
            }
        };

        img.onerror = () => resolve(undefined);
        img.src = url;
    });
};
