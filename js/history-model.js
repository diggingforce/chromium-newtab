export function createHistory(limit = 20) {
    const entries = [];
    return {
        push(entry) {
            entries.push(entry);
            if (entries.length > limit) entries.shift();
        },
        undo() {
            const entry = entries.at(-1);
            if (!entry || entry.restore() === false) return null;
            entries.pop();
            return entry.label;
        },
        clear() { entries.length = 0; },
        get size() { return entries.length; }
    };
}
