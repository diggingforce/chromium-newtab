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

export function isSectionVisible(settings, section) {
    if (typeof section?.visible === 'boolean') return section.visible;
    const title = typeof section === 'object' ? section.title : section;
    const key = sectionKey(title);
    if (Object.prototype.hasOwnProperty.call(settings, key)) return settings[key] !== false;
    return settings[legacySectionKey(title)] !== false;
}

export function nextCategoryTitle(sections) {
    const titles = new Set(sections.map(section => sectionKey(section.title)));
    let title = 'New Category';
    for (let suffix = 2; titles.has(sectionKey(title)); suffix++) title = `New Category ${suffix}`;
    return title;
}

