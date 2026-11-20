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

export function syncLayoutUI(force = false) {
    const layout = normalizeLayout(config.layout);
    document.querySelectorAll('[data-layout]').forEach(control => {
        control.value = layout[control.dataset.layout];
        const numInput = document.querySelector(`input.layout-number[data-layout-number="${control.dataset.layout}"]`);
        if (numInput && (force || document.activeElement !== numInput)) {
            numInput.value = layout[control.dataset.layout];
        }
    });
    applyLayout();
}

export function setupLayout() {
    document.getElementById('reset-layout').addEventListener('click', () => {
        config.layout = normalizeLayout();
        syncLayoutUI(true);
        saveConfig();
    });
    document.querySelectorAll('[data-layout]').forEach(control => {
        control.addEventListener('input', () => {
            config.layout = normalizeLayout({ ...normalizeLayout(config.layout), [control.dataset.layout]: control.type === 'range' ? Number(control.value) : control.value });
            syncLayoutUI();
            saveConfig();
        });
    });
    document.querySelectorAll('input.layout-number').forEach(numInput => {
        const key = numInput.dataset.layoutNumber;
        const slider = document.querySelector(`[data-layout="${key}"]`);
        const min = Number(numInput.min);
        const max = Number(numInput.max);

        numInput.addEventListener('input', () => {
            const raw = numInput.value.trim();
            if (raw === '') return;
            const val = Number(raw);
            if (Number.isFinite(val) && val >= min && val <= max) {
                config.layout = normalizeLayout({ ...normalizeLayout(config.layout), [key]: val });
                if (slider) slider.value = val;
                applyLayout();
                saveConfig();
            }
        });

        const finalize = () => {
            const current = normalizeLayout(config.layout)[key];
            const raw = numInput.value.trim();
            const val = Number(raw);
            const clamped = Number.isFinite(val) && raw !== '' ? Math.min(max, Math.max(min, Math.round(val))) : current;
            config.layout = normalizeLayout({ ...normalizeLayout(config.layout), [key]: clamped });
            syncLayoutUI(true);
            saveConfig();
        };

        numInput.addEventListener('change', finalize);
        numInput.addEventListener('blur', finalize);
        numInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finalize();
                numInput.blur();
            }
        });
    });
}
