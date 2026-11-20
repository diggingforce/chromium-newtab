export function setupFocus() {
    document.addEventListener('keydown', event => {
        if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
            document.documentElement.dataset.keyboardFocus = '';
        }
    }, true);
    document.addEventListener('pointerdown', () => {
        delete document.documentElement.dataset.keyboardFocus;
    }, true);
}
