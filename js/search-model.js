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

export function findShortcuts(sections, query, limit = 6) {
    const normalize = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const needle = normalize(query.trim());
    if (!needle || needle.startsWith('!')) return [];
    return (sections || []).flatMap(section => (section.links || []).map(link => ({ ...link, category: section.title })))
        .filter(link => httpUrl(link.url) && normalize(`${link.name} ${link.url} ${link.category}`).includes(needle))
        .sort((a, b) => Number(normalize(b.name).startsWith(needle)) - Number(normalize(a.name).startsWith(needle)))
        .slice(0, limit);
}
