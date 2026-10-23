const HUE_BUCKETS = 12; // 30° each
const MIN_SATURATION = 0.25;
const MIN_BRIGHTNESS = 0.2;

/**
 * Pick the most characteristic vivid color from RGBA pixel data.
 *
 * Plain averaging turns most covers into a muddy brown/grey, so instead pixels are
 * grouped by hue and the group with the most "colorfulness" (saturation x brightness)
 * wins; its pixels are averaged. Greys, near-black and transparent pixels are ignored.
 * Covers with no vivid pixels at all (black & white artwork) fall back to the
 * average of every opaque pixel. Returns `rgb(r, g, b)`, or undefined if the image
 * has no opaque pixels.
 */
export const pickVividColor = (data: ArrayLike<number>): string | undefined => {
    const buckets = Array.from({ length: HUE_BUCKETS }, () => ({ score: 0, r: 0, g: 0, b: 0, count: 0 }));
    let allR = 0, allG = 0, allB = 0, allCount = 0;

    for (let i = 0; i + 3 < data.length; i += 4) {
        if (data[i + 3] < 125) continue; // skip transparent pixels
        const r = data[i], g = data[i + 1], b = data[i + 2];
        allR += r; allG += g; allB += b; allCount++;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const brightness = max / 255;
        const saturation = max === 0 ? 0 : (max - min) / max;
        if (saturation < MIN_SATURATION || brightness < MIN_BRIGHTNESS) continue;

        // Hue in [0, 6) sextants, as in the standard RGB -> HSV conversion.
        const delta = max - min;
        let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
        if (hue < 0) hue += 6;
        const bucket = buckets[Math.min(HUE_BUCKETS - 1, Math.floor((hue / 6) * HUE_BUCKETS))];
        bucket.score += saturation * brightness;
        bucket.r += r; bucket.g += g; bucket.b += b; bucket.count++;
    }

    if (allCount === 0) return undefined;

    const best = buckets.reduce((a, b) => (b.score > a.score ? b : a));
    const [r, g, b, count] = best.count > 0
        ? [best.r, best.g, best.b, best.count]
        : [allR, allG, allB, allCount];
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
};

/**
 * Extracts a vivid dominant color from an image URL.
 *
 * Loads the image with CORS enabled, draws it onto a small canvas and picks the
 * color with pickVividColor. Returns an `rgb(...)` string, or undefined if the
 * image can't be read (e.g. a CORS-tainted canvas, a load error, or no canvas
 * support). Always safe: never throws.
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
                const size = 32; // small canvas: enough detail to find accents, still fast
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(undefined);
                    return;
                }

                ctx.drawImage(img, 0, 0, size, size);
                resolve(pickVividColor(ctx.getImageData(0, 0, size, size).data));
            } catch {
                // Tainted canvas or any other failure: degrade gracefully.
                resolve(undefined);
            }
        };

        img.onerror = () => resolve(undefined);
        img.src = url;
    });
};
