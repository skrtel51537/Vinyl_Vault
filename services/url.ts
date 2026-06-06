/**
 * Returns the URL only if its scheme is http: or https:.
 * Blocks javascript:, data:, and any other potentially dangerous schemes.
 * Returns undefined for empty, null, or unsafe inputs.
 */
export const sanitizeExternalLink = (url: string | undefined | null): string | undefined => {
    if (!url) return undefined;
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return url;
        }
        return undefined;
    } catch {
        return undefined;
    }
};
