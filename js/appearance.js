import { syncLayoutUI } from './layout.js';
import { gif, showSearchAreaCheck, showGifCheck, showFaviconsCheck, gifSource, autoThemeCheck, bgColorLabel, textColorLabel, lightBgRow, lightTextRow, bgColorPicker, bgColorInput, lightBgColorPicker, lightBgColorInput, textColorPicker, textColorInput, lightTextColorPicker, lightTextColorInput, fontSelect, openNewtabCheck, autohideSettingsCheck, openSettingsBtn, config } from './shared.js';
import { updateGifUploadUI } from './images.js';
import { saveConfig } from './storage.js';

export function isLightColor(color) {
    if (typeof color !== 'string') return false;
    let hex = color.trim().replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128;
}

export function syncSettingsUI() {
    if (!config.settings) config.settings = {};
    if (!config.theme) config.theme = {};

    if (showSearchAreaCheck) showSearchAreaCheck.checked = Boolean(config.settings['show-search-area']);
    if (showGifCheck) showGifCheck.checked = Boolean(config.settings['show-gif']);
    if (showFaviconsCheck) showFaviconsCheck.checked = Boolean(config.settings['show-favicons']);
    if (openNewtabCheck) openNewtabCheck.checked = Boolean(config.settings['open-newtab']);
    if (gifSource) {
        let currentGif = config.gif || 'assets/gif.gif';
        if (currentGif === 'gif.gif') currentGif = 'assets/gif.gif';
        gifSource.value = currentGif;
    }
    if (autohideSettingsCheck) autohideSettingsCheck.checked = Boolean(config.settings['autohide-settings']);

    const isAutoTheme = Boolean(config.theme.auto);
    if (autoThemeCheck) autoThemeCheck.checked = isAutoTheme;

    if (bgColorLabel) bgColorLabel.textContent = isAutoTheme ? 'dark bg color' : 'bg color';
    if (textColorLabel) textColorLabel.textContent = isAutoTheme ? 'dark text color' : 'text color';

    if (lightBgRow) lightBgRow.hidden = !isAutoTheme;
    if (lightTextRow) lightTextRow.hidden = !isAutoTheme;

    const darkBg = config.theme.bg || '#191919';
    const darkText = config.theme.text || '#fafafa';
    const lightBg = config.theme.lightBg || '#fafafa';
    const lightText = config.theme.lightText || '#191919';

    if (bgColorInput) bgColorInput.value = darkBg;
    if (bgColorPicker && /^#[0-9a-f]{6}$/i.test(darkBg)) bgColorPicker.value = darkBg;

    if (textColorInput) textColorInput.value = darkText;
    if (textColorPicker && /^#[0-9a-f]{6}$/i.test(darkText)) textColorPicker.value = darkText;

    if (lightBgColorInput) lightBgColorInput.value = lightBg;
    if (lightBgColorPicker && /^#[0-9a-f]{6}$/i.test(lightBg)) lightBgColorPicker.value = lightBg;

    if (lightTextColorInput) lightTextColorInput.value = lightText;
    if (lightTextColorPicker && /^#[0-9a-f]{6}$/i.test(lightText)) lightTextColorPicker.value = lightText;

    syncLayoutUI();
    updateGifUploadUI();
    applyAutohide(config.settings['autohide-settings']);
    applyTheme(config.theme);
}

export function applyTheme(theme) {
    if (!theme) return;
    try {
        localStorage.setItem('newtab_theme', JSON.stringify(theme));
    } catch (e) {}

    const isSystemDark = !theme.auto || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const activeBg = (theme.auto && !isSystemDark ? theme.lightBg : theme.bg) || (isSystemDark ? '#191919' : '#fafafa');
    const activeText = (theme.auto && !isSystemDark ? theme.lightText : theme.text) || (isSystemDark ? '#fafafa' : '#191919');

    const root = document.documentElement;
    root.style.setProperty('--bg', activeBg);
    root.style.setProperty('--foreground', activeText);

    const isLight = isLightColor(activeBg);
    root.style.setProperty('--bg-over', isLight ? '#f4f4f5' : '#232323');
    root.style.setProperty('--border', isLight ? '#e4e4e7' : '#27272a');
    root.style.setProperty('--border-hover', isLight ? '#d4d4d8' : '#3f3f46');
    root.style.setProperty('--muted', isLight ? '#71717a' : '#71717a');
    root.style.setProperty('--muted-foreground', isLight ? '#52525b' : '#a1a1aa');
    root.style.setProperty('--card-bg', isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.25)');

    if (theme.font) {
        const fontMap = {
            'Departure Mono': "'Departure Mono', monospace",
            'Maple Mono': "'Maple Mono', monospace",
            'monospace': 'monospace',
            'sans-serif': 'system-ui, -apple-system, sans-serif',
            'serif': 'Georgia, serif'
        };
        root.style.setProperty('--font', fontMap[theme.font] || theme.font);
        if (fontSelect) fontSelect.value = theme.font;
    }
}

export function applyAutohide(enable) {
    if (openSettingsBtn) {
        openSettingsBtn.classList.toggle('autohide', Boolean(enable));
    }
}

export function updateTheme(key, value) {
    if (!config.theme) config.theme = {};
    config.theme[key] = value;
    applyTheme(config.theme);
    saveConfig();
}
