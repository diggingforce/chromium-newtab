export const LAYOUT_DEFAULTS = {
    imageWidth: 440, imageRatio: 'natural', imageFit: 'contain',
    imagePosition: 'left', gap: 48, columns: 2, pageWidth: 980
};

export function normalizeLayout(source = {}) {
    const value = source && typeof source === 'object' ? source : {};
    const result = { ...LAYOUT_DEFAULTS };
    for (const [key, min, max] of [['imageWidth', 120, 600], ['gap', 16, 96], ['columns', 1, 4], ['pageWidth', 700, 1400]]) {
        if (typeof value[key] === 'number' && Number.isFinite(value[key])) result[key] = Math.min(max, Math.max(min, Math.round(value[key])));
    }
    for (const [key, choices] of [['imageRatio', ['natural', 'square', 'portrait', 'landscape']], ['imageFit', ['contain', 'cover']], ['imagePosition', ['left', 'right', 'above']]]) {
        if (choices.includes(value[key])) result[key] = value[key];
    }
    return result;
}
