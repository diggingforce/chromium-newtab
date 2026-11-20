export function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeKey(key) {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

const UNSAFE_URL_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'blob:', 'filesystem:'];

export function isSafeUrl(value) {
    if (typeof value !== 'string') return false;

    const normalized = value
        .replace(/[\s\u0000-\u001f\u007f-\u009f\ufeff\u200b-\u200d\u2060]/g, '')
        .toLowerCase();

    if (!normalized) return false;

    return !UNSAFE_URL_SCHEMES.some(scheme => normalized.startsWith(scheme));
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
