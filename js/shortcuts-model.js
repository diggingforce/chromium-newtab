export function sectionKey(title) {
    const slug = String(title ?? '')
        .normalize('NFC')
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    return `show-${slug || 'untitled'}`;
}

export function legacySectionKey(title) {
    return `show-${String(title ?? '').toLowerCase()}`;
}

export function isSectionVisible(settings, title) {
    const key = sectionKey(title);
    if (Object.prototype.hasOwnProperty.call(settings, key)) return settings[key] !== false;
    return settings[legacySectionKey(title)] !== false;
}

