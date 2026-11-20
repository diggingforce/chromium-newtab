export function httpUrl(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

export function bangDestination(bang, query = '') {
    const search = httpUrl(bang.url);
    if (!search) return null;
    if (!query.trim()) return httpUrl(bang.home)?.href || `${search.origin}/`;
    return bang.url.includes('{query}')
        ? bang.url.replaceAll('{query}', encodeURIComponent(query))
        : bang.url + encodeURIComponent(query);
}
