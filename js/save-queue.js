export function createSaveQueue(write, onStatus = () => {}, delay = 180) {
    let pending = null;
    let running = false;
    let timer;
    let waiters = [];
    let generation = 0;
    let idleWaiters = [];

    async function flush() {
        clearTimeout(timer);
        timer = null;
        if (running) return;
        running = true;
        while (pending) {
            const snapshot = pending;
            const callbacks = waiters;
            const currentGeneration = generation;
            pending = null;
            waiters = [];
            try {
                await write(snapshot);
                callbacks.forEach(resolve => resolve(currentGeneration === generation));
                if (currentGeneration === generation) onStatus(pending ? 'saving' : 'saved');
            } catch (error) {
                callbacks.forEach(resolve => resolve(false));
                if (currentGeneration === generation) onStatus('error', error);
            }
        }
        running = false;
        idleWaiters.forEach(resolve => resolve());
        idleWaiters = [];
    }

    return {
        save(value) {
            pending = structuredClone(value);
            onStatus('saving');
            clearTimeout(timer);
            timer = setTimeout(flush, delay);
            return new Promise(resolve => waiters.push(resolve));
        },
        flush,
        idle() {
            return running ? new Promise(resolve => idleWaiters.push(resolve)) : Promise.resolve();
        },
        discard() {
            generation++;
            clearTimeout(timer);
            timer = null;
            pending = null;
            waiters.forEach(resolve => resolve(false));
            waiters = [];
        },
        get busy() { return running || pending !== null; }
    };
}

export function configFingerprint(value) {
    return JSON.stringify(value, (_key, item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
        return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
    });
}
