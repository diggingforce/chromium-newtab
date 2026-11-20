import { gif, importSettingsFile, backupStatus, FALLBACK_SETTINGS, FALLBACK_THEME, config, setConfig, defaultConfig, state } from './shared.js';
import { removeUploadedGif } from './images.js';
import { syncSettingsUI } from './appearance.js';
import { sectionKey, legacySectionKey, render, renderCategoryToggles, renderCategoriesEditor } from './shortcuts.js';
import { saveConfig } from './storage.js';

export function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeKey(key) {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

const UNSAFE_URL_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'blob:', 'filesystem:'];

export function isSafeUrl(value) {
    if (typeof value !== 'string') return false;

    const normalized = value
        .replace(/[\s\u0000-\u001f\u007f-\u009f\ufeff\u200b-\u200d\u2060]/g, '')
        .toLowerCase();

    if (!normalized) return false;

    return !UNSAFE_URL_SCHEMES.some(scheme => normalized.startsWith(scheme));
}

export function getDomain(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
        const hasProto = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl);
        const url = new URL(hasProto ? rawUrl : `https://${rawUrl}`);
        return url.hostname;
    } catch {
        return '';
    }
}

export function sanitizeImportedConfig(raw) {
    if (!isPlainObject(raw)) return null;

    const source = isPlainObject(raw.config) ? raw.config : raw;
    if (!isPlainObject(source)) return null;

    const result = {};
    let skipped = 0;

    if (typeof source.title === 'string') result.title = source.title;
    if (typeof source.gif === 'string') {
        result.gif = source.gif === 'gif.gif' ? 'assets/gif.gif' : source.gif;
    }

    if (isPlainObject(source.theme)) {
        const theme = {};
        if (typeof source.theme.auto === 'boolean') {
            theme.auto = source.theme.auto;
        }
        ['bg', 'text', 'lightBg', 'lightText', 'font'].forEach(key => {
            if (typeof source.theme[key] !== 'string') return;

            if ((key === 'bg' || key === 'text' || key === 'lightBg' || key === 'lightText') && typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', source.theme[key])) {
                skipped += 1;
                return;
            }

            theme[key] = source.theme[key];
        });
        if (Object.keys(theme).length) result.theme = theme;
    }

    if (isPlainObject(source.settings)) {
        const settings = {};
        Object.entries(source.settings).forEach(([key, value]) => {
            if (!isSafeKey(key) || typeof value !== 'boolean') {
                skipped += 1;
                return;
            }
            settings[key] = value;
        });
        if (Object.keys(settings).length) result.settings = settings;
    }

    if (Array.isArray(source.sections)) {
        const sections = source.sections.filter(isPlainObject);
        skipped += source.sections.length - sections.length;

        result.sections = sections.map(section => {
            const links = Array.isArray(section.links) ? section.links : [];
            const validLinks = links
                .filter(isPlainObject)
                .filter(link => typeof link.name === 'string' && typeof link.url === 'string' && isSafeUrl(link.url))
                .map(link => ({ name: link.name, url: link.url }));

            skipped += links.length - validLinks.length;

            return {
                title: typeof section.title === 'string' && section.title.trim() ? section.title : 'Untitled',
                links: validLinks
            };
        });
    }

    if (isPlainObject(source.search)) {
        const search = {};

        if (isPlainObject(source.search.bangs)) {
            const entries = Object.entries(source.search.bangs);
            const bangs = {};

            entries.forEach(([key, bang]) => {
                if (!isSafeKey(key)) return;
                if (isPlainObject(bang) && typeof bang.name === 'string' && typeof bang.url === 'string' && isSafeUrl(bang.url)) {
                    bangs[key] = { name: bang.name, url: bang.url };
                }
            });

            skipped += entries.length - Object.keys(bangs).length;
            if (Object.keys(bangs).length) search.bangs = bangs;
        }

        if (typeof source.search.default === 'string') {
            if (isSafeUrl(source.search.default)) {
                search.default = source.search.default;
            } else {
                skipped += 1;
            }
        }

        if (Object.keys(search).length) result.search = search;
    }

    if (!Object.keys(result).length) return null;

    return { config: result, skipped };
}

export function pruneStaleCategorySettings() {
    const keep = new Set(['show-search-area', 'show-gif']);
    config.sections.forEach(section => {
        keep.add(sectionKey(section.title));
        keep.add(legacySectionKey(section.title));
    });

    Object.keys(config.settings).forEach(key => {
        if (key.startsWith('show-') && !keep.has(key)) {
            delete config.settings[key];
        }
    });
}

export function applyImportedConfig(imported) {
    const base = Object.keys(defaultConfig).length
        ? JSON.parse(JSON.stringify(defaultConfig))
        : {};

    setConfig({
        ...base,
        ...imported,
        settings: {
            ...(base.settings || {}),
            ...(imported.settings || {})
        },
        theme: {
            ...(base.theme || {}),
            ...(imported.theme || {})
        }
    });

    if (!Array.isArray(config.sections)) config.sections = [];
    if (!config.settings || !Object.keys(config.settings).length) {
        config.settings = { ...FALLBACK_SETTINGS };
    }
    if (!config.theme || !Object.keys(config.theme).length) {
        config.theme = { ...FALLBACK_THEME };
    }

    pruneStaleCategorySettings();
    saveConfig();
    syncSettingsUI();
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
}

export function setBackupStatus(message, isError = false) {
    if (!backupStatus) return;

    backupStatus.textContent = message;
    backupStatus.classList.toggle('error', Boolean(isError));

    if (state.backupStatusTimer) clearTimeout(state.backupStatusTimer);
    state.backupStatusTimer = setTimeout(() => {
        backupStatus.textContent = '';
        backupStatus.classList.remove('error');
    }, 6000);
}

export function exportSettings() {
    const payload = {
        app: 'chromium-newtab',
        version: 1,
        exportedAt: new Date().toISOString(),
        config
    };

    try {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `chromium-newtab-settings-${date}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setBackupStatus('settings exported');
    } catch (e) {
        console.warn('Could not export settings:', e);
        setBackupStatus('export failed', true);
    }
}

export async function handleImportFile(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const sanitized = sanitizeImportedConfig(JSON.parse(text));

        if (!sanitized) {
            console.warn('Import rejected: no recognized settings in file');
            setBackupStatus('import failed: invalid settings file', true);
            return;
        }

        const confirmed = window.confirm('Import these settings? This will replace your current theme, shortcuts and preferences.');
        if (!confirmed) {
            setBackupStatus('import cancelled');
            return;
        }

        const removedUpload = await removeUploadedGif({ silent: true });
        if (!removedUpload) {
            setBackupStatus('import failed: could not clear uploaded image', true);
            return;
        }

        applyImportedConfig(sanitized.config);

        const skippedSuffix = sanitized.skipped
            ? ` (${sanitized.skipped} invalid item${sanitized.skipped === 1 ? '' : 's'} skipped)`
            : '';
        setBackupStatus(`settings imported from ${file.name}${skippedSuffix}`);
    } catch (e) {
        console.error('Could not import settings:', e);
        setBackupStatus(`import failed: ${e?.message || 'invalid settings file'}`, true);
    } finally {
        if (importSettingsFile) importSettingsFile.value = '';
    }
}

export function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
