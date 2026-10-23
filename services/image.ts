/**
 * iTunes artwork URLs encode their pixel size (e.g. ".../600x600bb.jpg") and the CDN
 * serves any size on request. Return the variant at `size`x`size`, so small UI elements
 * don't download the full 600px cover. Other URLs (e.g. uploaded data: images) are
 * returned unchanged.
 */
/** Largest side, in pixels, of covers uploaded by the user (matches iTunes covers). */
export const UPLOADED_COVER_SIZE = 600;

/**
 * Scale `width`x`height` down to fit in a `max`x`max` box, keeping the aspect ratio.
 * Images that already fit are left at their size (never upscaled).
 */
export const fitWithin = (width: number, height: number, max: number): { width: number; height: number } => {
    const scale = Math.min(1, max / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

/**
 * Read an uploaded image file and return it as a JPEG data: URL no larger than
 * `max` pixels per side. A phone photo of several MB becomes ~50-100 KB, which keeps
 * the database and backups small. Transparent areas are filled with white.
 * Rejects if the file can't be decoded as an image.
 */
export const resizeImageFile = (file: File, max = UPLOADED_COVER_SIZE, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
        // Decode through a data: URL; the CSP does not allow blob: images.
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('The file is not a readable image'));
            img.onload = () => {
                try {
                    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, max);
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Canvas is not supported');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch (err) {
                    reject(err);
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });

export const coverAtSize =(url: string | undefined, size: number): string | undefined => {
    if (!url || !/^https:\/\/[^/]*mzstatic\.com\//.test(url)) return url;
    return url.replace(/\/\d+x\d+bb(\.\w+)$/, `/${size}x${size}bb$1`);
};
