export function isLocalIcon(value) {
    return typeof value === 'string' && value.length <= 65536 && /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value);
}

export function iconSource(link, source, domain) {
    if (isLocalIcon(link.icon)) return link.icon;
    return source !== 'local' && domain
        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
        : '';
}
