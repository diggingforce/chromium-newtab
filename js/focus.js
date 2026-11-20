export function setupFocus() {
    document.addEventListener('keydown', event => {
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            document.documentElement.dataset.keyboardFocus = '';
        }
    }, true);
    document.addEventListener('pointerdown', () => {
        delete document.documentElement.dataset.keyboardFocus;
    }, true);
}
