import { isPlainObject, isSafeKey, isSafeUrl } from './utils.js';
import { isLocalIcon } from './icon-model.js';
import { normalizeLayout } from './layout-model.js';
import { httpUrl } from './search-model.js';

export function sanitizeImportedConfig(raw) {
    if (!isPlainObject(raw)) return null;

    const source = isPlainObject(raw.config) ? raw.config : raw;
    if (!isPlainObject(source)) return null;

    const result = {};
    if (isPlainObject(source.icons)) result.icons = { source: source.icons.source === 'local' ? 'local' : 'remote' };
    if (isPlainObject(source.layout)) result.layout = normalizeLayout(source.layout);
    let skipped = 0;

    if (typeof source.title === 'string') result.title = source.title;
    if (typeof source.gif === 'string') {
        result.gif = source.gif === 'gif.gif' ? 'assets/gif.gif' : source.gif;
    }

    if (isPlainObject(source.theme)) {
        const theme = {};
        if (typeof source.theme.auto === 'boolean') {
            theme.auto = source.theme.auto;
        }
        ['bg', 'text', 'lightBg', 'lightText', 'font'].forEach(key => {
            if (typeof source.theme[key] !== 'string') return;

            if ((key === 'bg' || key === 'text' || key === 'lightBg' || key === 'lightText') && typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', source.theme[key])) {
                skipped += 1;
                return;
            }

            theme[key] = source.theme[key];
        });
        if (Object.keys(theme).length) result.theme = theme;
    }

    if (isPlainObject(source.settings)) {
        const settings = {};
        Object.entries(source.settings).forEach(([key, value]) => {
            if (!isSafeKey(key) || typeof value !== 'boolean') {
                skipped += 1;
                return;
            }
            settings[key] = value;
        });
        if (Object.keys(settings).length) result.settings = settings;
    }

    if (Array.isArray(source.sections)) {
        const sections = source.sections.filter(isPlainObject);
        skipped += source.sections.length - sections.length;

        result.sections = sections.map(section => {
            const links = Array.isArray(section.links) ? section.links : [];
            const validLinks = links
                .filter(isPlainObject)
                .filter(link => typeof link.name === 'string' && typeof link.url === 'string' && isSafeUrl(link.url))
                .map(link => ({ name: link.name, url: link.url, ...(isLocalIcon(link.icon) ? { icon: link.icon } : {}) }));

            skipped += links.length - validLinks.length;

            return {
                title: typeof section.title === 'string' && section.title.trim() ? section.title : 'Untitled',
                links: validLinks
            };
        });
    }

    if (isPlainObject(source.search)) {
        const search = {};

        if (isPlainObject(source.search.bangs)) {
            const entries = Object.entries(source.search.bangs);
            const bangs = {};

            entries.forEach(([key, bang]) => {
                if (!isSafeKey(key) || !/^![a-z0-9_-]+$/.test(key)) return;
                if (isPlainObject(bang) && typeof bang.name === 'string' && typeof bang.url === 'string' && httpUrl(bang.url)) {
                    bangs[key] = { name: bang.name, url: bang.url, ...(httpUrl(bang.home) ? { home: bang.home } : {}) };
                }
            });

            skipped += entries.length - Object.keys(bangs).length;
            search.bangs = bangs;
        }

        if (typeof source.search.default === 'string') {
            if (isSafeUrl(source.search.default)) {
                search.default = source.search.default;
            } else {
                skipped += 1;
            }
        }

        if (Object.keys(search).length) result.search = search;
    }

    if (!Object.keys(result).length) return null;

    return { config: result, skipped };
}

