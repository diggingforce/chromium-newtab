export function createHistory(limit = 20) {
    const entries = [];
    return {
        push(entry) {
            entries.push(entry);
            if (entries.length > limit) entries.shift();
        },
        undo() {
            for (let index = entries.length - 1; index >= 0; index--) {
                const entry = entries[index];
                if (entry.restore() === false) continue;
                entries.splice(index, 1);
                return entry.label;
            }
            return null;
        },
        clear() { entries.length = 0; },
        get size() { return entries.length; }
    };
}
