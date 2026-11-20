export function createSaveQueue(write, onStatus = () => {}, delay = 180) {
    let pending = null;
    let running = false;
    let timer;
    let waiters = [];

    async function flush() {
        clearTimeout(timer);
        timer = null;
        if (running) return;
        running = true;
        while (pending) {
            const snapshot = pending;
            const callbacks = waiters;
            pending = null;
            waiters = [];
            try {
                await write(snapshot);
                callbacks.forEach(resolve => resolve(true));
                onStatus(pending ? 'saving' : 'saved');
            } catch (error) {
                callbacks.forEach(resolve => resolve(false));
                onStatus('error', error);
            }
        }
        running = false;
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
        discard() {
            clearTimeout(timer);
            timer = null;
            pending = null;
            waiters.forEach(resolve => resolve(false));
            waiters = [];
        },
        get busy() { return running || pending !== null; }
    };
}
