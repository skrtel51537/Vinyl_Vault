/**
 * iTunes artwork URLs encode their pixel size (e.g. ".../600x600bb.jpg") and the CDN
 * serves any size on request. Return the variant at `size`x`size`, so small UI elements
 * don't download the full 600px cover. Other URLs (e.g. uploaded data: images) are
 * returned unchanged.
 */
export const coverAtSize = (url: string | undefined, size: number): string | undefined => {
    if (!url || !/^https:\/\/[^/]*mzstatic\.com\//.test(url)) return url;
    return url.replace(/\/\d+x\d+bb(\.\w+)$/, `/${size}x${size}bb$1`);
};
