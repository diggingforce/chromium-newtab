import { sanitizeImportedConfig } from './config-model.js';
import { clearUndo } from './undo.js';
import { renderBangsEditor } from './bangs.js';
import { gif, importSettingsFile, backupStatus, FALLBACK_SETTINGS, FALLBACK_THEME, config, setConfig, defaultConfig, state } from './shared.js';
import { removeUploadedGif } from './images.js';
import { syncSettingsUI } from './appearance.js';
import { sectionKey, legacySectionKey } from './shortcuts-model.js';
import { render, renderCategoryToggles, renderCategoriesEditor } from './shortcuts.js';
import { saveConfig } from './storage.js';

export function pruneStaleCategorySettings() {
    const keep = new Set(['show-search-area', 'show-gif', 'show-favicons']);
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

export async function applyImportedConfig(imported) {
    clearUndo();
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
    const saved = await saveConfig();
    syncSettingsUI();
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
    renderBangsEditor();
    return saved;
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

        const saved = await applyImportedConfig(sanitized.config);
        if (!saved) {
            setBackupStatus('settings applied but could not be saved. resolve the save status above.', true);
            return;
        }

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
