import { config } from './shared.js';
import { normalizeLayout } from './layout-model.js';
import { saveConfig } from './storage.js';

export function applyLayout(source = config.layout) {
    const layout = normalizeLayout(source);
    try { localStorage.setItem('newtab_layout', JSON.stringify(layout)); } catch {}
    const root = document.documentElement;
    for (const [key, css] of [['imageWidth', 'image-width'], ['gap', 'layout-gap'], ['pageWidth', 'page-width']]) root.style.setProperty(`--${css}`, `${layout[key]}px`);
    root.style.setProperty('--columns', layout.columns);
    root.style.setProperty('--image-ratio', { natural: 'auto', square: '1', portrait: '3 / 4', landscape: '4 / 3' }[layout.imageRatio]);
    root.style.setProperty('--image-fit', layout.imageFit);
    document.querySelector('main').dataset.imagePosition = layout.imagePosition;
    document.querySelector('.gif-box').classList.toggle('fixed-ratio', layout.imageRatio !== 'natural');
}

export function applyCachedLayout() {
    try {
        const cached = localStorage.getItem('newtab_layout');
        if (cached) applyLayout(JSON.parse(cached));
    } catch {}
}

export function syncLayoutUI() {
    const layout = normalizeLayout(config.layout);
    document.querySelectorAll('[data-layout]').forEach(control => {
        control.value = layout[control.dataset.layout];
        const output = document.querySelector(`output[for="${control.id}"]`);
        if (output) output.textContent = control.value;
    });
    applyLayout();
}

export function setupLayout() {
    document.getElementById('reset-layout').addEventListener('click', () => {
        config.layout = normalizeLayout();
        syncLayoutUI();
        saveConfig();
    });
    document.querySelectorAll('[data-layout]').forEach(control => {
        control.addEventListener('input', () => {
            config.layout = normalizeLayout({ ...normalizeLayout(config.layout), [control.dataset.layout]: control.type === 'range' ? Number(control.value) : control.value });
            syncLayoutUI();
            saveConfig();
        });
    });
}
