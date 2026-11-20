export function bangKeys(search) {
    const bangs = search?.bangs || {};
    return [...new Set([...(search?.bangOrder || []), ...Object.keys(bangs)])]
        .filter(key => Object.hasOwn(bangs, key));
}
