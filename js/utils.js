export function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeKey(key) {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

export function webUrl(value) {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text || /[\u0000-\u001f\u007f-\u009f\ufeff\u200b-\u200d\u2060]/u.test(text)) return null;
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(text);
    const hasPort = /^[^\s/:]+:\d+(?:[/?#]|$)/.test(text);
    if (hasScheme && !hasPort && !/^https?:\/\//i.test(text)) return null;
    try {
        const url = new URL(/^https?:\/\//i.test(text) ? text : `${text.startsWith('//') ? 'https:' : 'https://'}${text}`);
        return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

export function isSafeUrl(value) {
    return Boolean(webUrl(value));
}

export function getDomain(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
        const hasProto = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl);
        const url = new URL(hasProto ? rawUrl : `https://${rawUrl}`);
        return url.hostname;
    } catch {
        return '';
    }
}


export function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
